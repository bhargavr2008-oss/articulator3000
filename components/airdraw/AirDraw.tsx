"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { KeyframeInput } from "@/lib/synthesis/schema";

// Pinned to the installed @mediapipe/tasks-vision version to avoid API/WASM mismatch.
const TASKS_VISION_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// MediaPipe hand landmark indices.
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;

type Point = { x: number; y: number }; // normalized [0,1], already mirrored for selfie view
type Stroke = Point[];
type Status = "idle" | "loading" | "ready" | "error";

const STROKE_COLORS = ["#a855f7", "#22d3ee", "#f472b6", "#fbbf24", "#34d399"];

type AirDrawProps = {
  onKeyframe?: (frame: KeyframeInput) => void;
  timelineOriginMs?: number;
  startLabel?: string;
  onStartRequested?: () => void | Promise<void>;
  captionOverlay?: ReactNode;
  showHud?: boolean;
  showTuning?: boolean;
  compact?: boolean;
  autoStart?: boolean;
};

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function AirDraw({
  onKeyframe,
  timelineOriginMs = 0,
  startLabel = "Enable camera & start",
  onStartRequested,
  captionOverlay,
  showHud = true,
  showTuning = true,
  compact = false,
  autoStart = false,
}: AirDrawProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositeRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastKeyframeAtRef = useRef(0);
  const startInFlightRef = useRef(false);
  const onKeyframeRef = useRef(onKeyframe);
  const timelineOriginRef = useRef(timelineOriginMs);

  // Drawing state (kept in refs so the rAF loop reads live values without re-subscribing).
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const penDownRef = useRef(false);
  const smoothedRef = useRef<Point | null>(null);
  const colorIdxRef = useRef(0);

  // Tunables (live-adjustable so we can find what *feels* good — the Step 0 exit criteria).
  // Defaults below are the values that felt good during the Step 0 hand-test.
  const downThreshRef = useRef(0.21); // pinchRatio below this => pen down
  const upThreshRef = useRef(0.33); // pinchRatio above this => pen up (hysteresis)
  const smoothingRef = useRef(0.15); // EMA alpha; higher = snappier, lower = smoother
  const handSeenRef = useRef(false); // whether a hand was present on the last detection

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [hud, setHud] = useState({ fps: 0, pinch: 0, pen: false, hand: false });
  const [downThresh, setDownThresh] = useState(0.21);
  const [upThresh, setUpThresh] = useState(0.33);
  const [smoothing, setSmoothing] = useState(0.15);
  const [strokeCount, setStrokeCount] = useState(0);

  useEffect(() => {
    onKeyframeRef.current = onKeyframe;
  }, [onKeyframe]);

  useEffect(() => {
    timelineOriginRef.current = timelineOriginMs;
  }, [timelineOriginMs]);

  const undo = useCallback(() => {
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
  }, []);
  const clear = useCallback(() => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setStrokeCount(0);
  }, []);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker) return;

    const ctx = canvas.getContext("2d")!;
    let frames = 0;
    let fpsLast = performance.now();
    let fps = 0;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (video.readyState < 2) return;

      // Match canvas backing store to its displayed size.
      const w = video.clientWidth;
      const h = video.clientHeight;
      if (w === 0 || h === 0) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      // Only run detection on a fresh video frame.
      let pinchRatio = 0;
      let handSeen = false;
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const res = landmarker.detectForVideo(video, performance.now());
        const lm = res.landmarks?.[0];
        if (lm) {
          handSeen = true;
          handSeenRef.current = true;
          const tip = lm[INDEX_TIP];
          const thumb = lm[THUMB_TIP];
          const handScale = dist(lm[WRIST], lm[INDEX_MCP]) || 0.0001;
          pinchRatio = dist(tip, thumb) / handScale;

          // Mirror x for selfie view so the cursor tracks the user's real hand.
          const raw: Point = { x: 1 - tip.x, y: tip.y };
          const a = smoothingRef.current;
          const prev = smoothedRef.current;
          const sm: Point = prev
            ? {
                x: prev.x + (raw.x - prev.x) * a,
                y: prev.y + (raw.y - prev.y) * a,
              }
            : raw;
          smoothedRef.current = sm;

          // Hysteresis pinch detection.
          if (!penDownRef.current && pinchRatio < downThreshRef.current) {
            penDownRef.current = true;
            colorIdxRef.current =
              (colorIdxRef.current + 1) % STROKE_COLORS.length;
            currentStrokeRef.current = [sm];
            strokesRef.current.push(currentStrokeRef.current);
          } else if (penDownRef.current && pinchRatio > upThreshRef.current) {
            penDownRef.current = false;
            currentStrokeRef.current = null;
          } else if (penDownRef.current && currentStrokeRef.current) {
            currentStrokeRef.current.push(sm);
          }
        } else {
          // Lost the hand — lift the pen so strokes don't snap across gaps.
          handSeenRef.current = false;
          penDownRef.current = false;
          currentStrokeRef.current = null;
          smoothedRef.current = null;
        }
      }

      // Render: clear, redraw all strokes, draw cursor.
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 5;
      const strokes = strokesRef.current;
      for (let s = 0; s < strokes.length; s++) {
        const stroke = strokes[s];
        if (stroke.length < 1) continue;
        ctx.strokeStyle = STROKE_COLORS[s % STROKE_COLORS.length];
        ctx.beginPath();
        ctx.moveTo(stroke[0].x * w, stroke[0].y * h);
        for (let i = 1; i < stroke.length; i++)
          ctx.lineTo(stroke[i].x * w, stroke[i].y * h);
        if (stroke.length === 1)
          ctx.lineTo(stroke[0].x * w + 0.1, stroke[0].y * h);
        ctx.stroke();
      }

      // Cursor dot: drawn every frame from the last known fingertip position
      // (not just on detection frames) so it never blinks at the camera/refresh
      // rate mismatch. Hollow when pen up, filled+glowing when pen down.
      const cursor = handSeenRef.current ? smoothedRef.current : null;
      if (cursor) {
        const cx = cursor.x * w;
        const cy = cursor.y * h;
        const down = penDownRef.current;
        ctx.beginPath();
        ctx.arc(cx, cy, down ? 11 : 9, 0, Math.PI * 2);
        if (down) {
          ctx.fillStyle = STROKE_COLORS[colorIdxRef.current];
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 18;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = "#e7e5e4";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.lineWidth = 5;
        }
      }

      const now = performance.now();
      if (
        handSeenRef.current &&
        onKeyframeRef.current &&
        now - lastKeyframeAtRef.current >= 500
      ) {
        lastKeyframeAtRef.current = now;
        const composite =
          compositeRef.current ?? document.createElement("canvas");
        compositeRef.current = composite;
        composite.width = w;
        composite.height = h;
        const compositeCtx = composite.getContext("2d");
        if (compositeCtx) {
          compositeCtx.save();
          compositeCtx.translate(w, 0);
          compositeCtx.scale(-1, 1);
          compositeCtx.drawImage(video, 0, 0, w, h);
          compositeCtx.restore();
          compositeCtx.drawImage(canvas, 0, 0);
          onKeyframeRef.current({
            id: crypto.randomUUID(),
            imageDataUrl: composite.toDataURL("image/jpeg", 0.72),
            at: Date.now() - timelineOriginRef.current,
            reason:
              "Automatic composite frame captured while a hand was present.",
          });
        }
      }

      // FPS + HUD (throttled to ~4Hz to avoid React churn).
      frames++;
      if (now - fpsLast > 250) {
        fps = Math.round((frames * 1000) / (now - fpsLast));
        frames = 0;
        fpsLast = now;
        setHud({
          fps,
          pinch: pinchRatio,
          pen: penDownRef.current,
          hand: handSeen,
        });
      }
    };
    tick();
  }, []);

  const start = useCallback(async () => {
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;
    setStatus("loading");
    setErrorMsg("");
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      let landmarker: HandLandmarker;
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
        });
      } catch {
        // Some machines have no usable GPU delegate — fall back to CPU.
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 1,
        });
      }
      landmarkerRef.current = landmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus("ready");
      loop();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      startInFlightRef.current = false;
    }
  }, [loop]);

  const requestStart = useCallback(() => {
    void onStartRequested?.();
    void start();
  }, [onStartRequested, start]);

  useEffect(() => {
    if (autoStart && status === "idle") void start();
  }, [autoStart, start, status]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      cancelAnimationFrame(rafRef.current);
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  return (
    <div className={compact ? "airdraw airdraw--compact" : "airdraw"}>
      {showHud && (
        <header className="airdraw__bar">
          <div>
            <strong>Air-draw studio</strong>
            <span className="airdraw__sub"> — pinch to draw in the air</span>
          </div>
          <div className="airdraw__hud">
            <span className={hud.hand ? "ok" : "off"}>
              hand {hud.hand ? "✓" : "—"}
            </span>
            <span className={hud.pen ? "ok" : "off"}>
              pen {hud.pen ? "DOWN" : "up"}
            </span>
            <span>pinch {hud.pinch.toFixed(2)}</span>
            <span>{hud.fps} fps</span>
            <span>{strokeCount} strokes</span>
          </div>
        </header>
      )}

      <div className="airdraw__stage">
        <video ref={videoRef} className="airdraw__video" playsInline muted />
        <canvas ref={canvasRef} className="airdraw__canvas" />
        {captionOverlay}

        {status !== "ready" && (
          <div className="airdraw__overlay">
            {status === "idle" && (
              <>
                <p>
                  Pinch your thumb and index finger together to draw in the air.
                </p>
                <button onClick={requestStart}>{startLabel}</button>
              </>
            )}
            {status === "loading" && <p>Loading hand-tracking model…</p>}
            {status === "error" && (
              <>
                <p className="airdraw__err">Couldn’t start: {errorMsg}</p>
                <button onClick={requestStart}>Retry</button>
              </>
            )}
          </div>
        )}

        {status === "ready" && (
          <div className="airdraw__coach">pinch to draw · release to lift</div>
        )}
      </div>

      <div className="airdraw__controls">
        <div className="airdraw__buttons">
          <button onClick={undo}>Undo</button>
          <button onClick={clear}>Clear</button>
        </div>
        {showTuning && (
          <>
            <label>
              pen-down &lt; {downThresh.toFixed(2)}
              <input
                type="range"
                min={0.2}
                max={0.7}
                step={0.01}
                value={downThresh}
                onChange={(e) => {
                  const v = +e.target.value;
                  setDownThresh(v);
                  downThreshRef.current = v;
                }}
              />
            </label>
            <label>
              pen-up &gt; {upThresh.toFixed(2)}
              <input
                type="range"
                min={0.3}
                max={0.9}
                step={0.01}
                value={upThresh}
                onChange={(e) => {
                  const v = +e.target.value;
                  setUpThresh(v);
                  upThreshRef.current = v;
                }}
              />
            </label>
            <label>
              smoothing {smoothing.toFixed(2)}
              <input
                type="range"
                min={0.15}
                max={1}
                step={0.05}
                value={smoothing}
                onChange={(e) => {
                  const v = +e.target.value;
                  setSmoothing(v);
                  smoothingRef.current = v;
                }}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
