"use client";

import { useCallback, useRef, useState } from "react";

export type TranscriptSegment = {
  id: string; // OpenAI item id
  text: string;
  final: boolean;
  at: number; // ms since the capture studio opened
};

export type TranscriptionStatus =
  | "idle"
  | "connecting"
  | "live"
  | "stopped"
  | "error";

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

/**
 * Live microphone transcription via OpenAI Realtime over WebRTC.
 *
 * Flow: mint an ephemeral token from our server route → open a WebRTC peer
 * connection straight to OpenAI with that token → receive incremental
 * transcription events on the data channel. The real API key never reaches the
 * browser; only the short-lived `ek_...` secret does.
 */
export function useRealtimeTranscription(timelineOriginMs: number) {
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [error, setError] = useState("");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);

  const upsert = useCallback(
    (id: string, delta: string, final: boolean) => {
      setSegments((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx === -1) {
          return [
            ...prev,
            { id, text: delta, final, at: Date.now() - timelineOriginMs },
          ];
        }
        const next = [...prev];
        const seg = next[idx];
        next[idx] = {
          ...seg,
          text: final && delta ? delta : seg.text + delta,
          final: final || seg.final,
        };
        return next;
      });
    },
    [timelineOriginMs],
  );

  const handleEvent = useCallback(
    (raw: string) => {
      let msg: {
        type?: string;
        delta?: string;
        transcript?: string;
        item_id?: string;
      };
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      const id = msg.item_id ?? "current";
      switch (msg.type) {
        case "conversation.item.input_audio_transcription.delta":
          upsert(id, msg.delta ?? "", false);
          break;
        case "conversation.item.input_audio_transcription.completed":
          upsert(id, msg.transcript ?? "", true);
          break;
        default:
          break;
      }
    },
    [upsert],
  );

  const stop = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    setStatus((s) => (s === "error" ? s : "stopped"));
  }, []);

  const start = useCallback(async () => {
    setStatus("connecting");
    setError("");
    try {
      const tokenRes = await fetch("/api/realtime-token", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Could not get a transcription token.");
      const { value } = (await tokenRes.json()) as { value: string };

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.addTrack(mic.getAudioTracks()[0], mic);

      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (e) => handleEvent(e.data);

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          setError("Connection lost.");
          setStatus("error");
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(REALTIME_CALLS_URL, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${value}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpRes.ok) throw new Error("Realtime handshake failed.");

      await pc.setRemoteDescription({
        type: "answer",
        sdp: await sdpRes.text(),
      });
      setStatus("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
      stop();
    }
  }, [handleEvent, stop]);

  const reset = useCallback(() => {
    setSegments([]);
  }, []);

  return { status, error, segments, start, stop, reset };
}
