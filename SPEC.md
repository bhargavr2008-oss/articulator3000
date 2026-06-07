# The Articulator 3000 — Specification

This is the **locked** spec. Decisions here were resolved through a full design grilling; each
is intentional. See [CONTEXT.md](./CONTEXT.md) for why this is scoped the way it is.

---

## 1. Core interaction — webcam-as-canvas

- The webcam preview is a **transparent AR overlay**. The user's **fingertip is the pen**
  (air-drawing), tracked **client-side** via MediaPipe Hands (or equivalent). No model call
  for tracking.
- **Pinch-to-draw**: thumb + index tip touching = pen down, release = pen up. A visible
  on-screen **cursor dot** changes color/size to show pen state. Includes **undo** and a
  jitter/debounce so micro-movements don't start phantom strokes.
- The drawing lives in **webcam coordinate space** — so the user's hands and the drawing share
  one space. The frame sent to the model for any demonstration moment is the **composite**
  (webcam video + ink burned in).
- **Air-draw is optional, never required.** Voice + typed input is the always-on substrate.
  Abstract ideas (e.g. "a fraud-detection model") work fine on voice+type; air-draw degrades
  to optional box-and-arrow diagramming.

## 2. Inputs (capture studio)

- **Voice + live timestamped transcript** (OpenAI realtime transcription over WebRTC, via a
  short-lived **server-issued** token).
- **Typed notes/corrections** (also the keyboard-only fallback).
- **Air-draw canvas** (above).
- Frame capture: buffer composite frames at **~2 fps while a hand is detected**; at synthesis
  time auto-select a small keyframe set (final drawing state + frames near deictic/
  demonstration spans in the transcript). One optional "capture" hotkey as insurance.
- **Consent:** separate camera/mic permission prompts with skip/retry; a one-line "selected
  evidence is sent to OpenAI for processing" notice before capture; explicit confirm before
  publishing a share link.

> **Cut:** continuous video streaming, 5s sampling, perceptual dedup, 40-frame budget,
> phrase-trigger bursts, screen sharing, file/PDF upload pipeline (voice+air-draw+type cover it).

## 3. Understanding — the gesture fusion

"Gesture understanding" = **multimodal fusion**, narrated by the user:

- The **transcript carries the meaning** ("forearm = ladder, swings up from the cab").
- The **composited frame(s)** confirm the spatial relationship (arm positioned next to the
  drawn truck).
- The model fuses them and records the claim **with its evidence** (e.g. _"frame @ 0:42 +
  transcript: user demonstrated an extending ladder from the cab"_).
- **Never silent gesture recognition.** The model must not be relied on to decode a wordless
  mime.

### Canonical IdeaModel

A structured object with **foundational fields**, each carrying a **confidence score (0–1)**
and **evidence references** (source + timestamp):

`title, oneLiner, summary, problem, targetUser, solution, coreWorkflow, differentiator,
desiredOutcome` + `openDecisions[]`, `assumptions[]`, `evidence[]`.

- Visual interpretation describes gestures **contextually**; no emotion/intent-certainty/
  sign-language claims.
- Contradictions stay **explicit** until the creator resolves them.

## 4. The Grill engine

- **Up to 5 questions, hard cap.** Stops early once foundational fields clear ~**0.7**
  confidence.
- Each turn: ask the single question that most raises the **lowest-confidence foundational
  field**. (The "dependency tree" collapses to weakest-field-first — no literal tree to build.)
- References evidence directly: _"When you pointed at the top of the truck, did you mean the
  ladder pivot?"_
- Never asks for what evidence already established.
- Offers: "Why are you asking?", "I don't know yet", "Skip", "That assumption is wrong".
- Fields still below threshold at stop → surfaced as **open decisions** (a feature, not a
  failure).
- Always ends with the **"Here's what I understand"** confirmation screen; creator confirms or
  corrects sections.

## 5. Output / communication package

- **Text core** (the IdeaModel, formatted — nearly free): title, one-liner, plain-language
  summary, problem, solution, target user, workflow, differentiator, **open decisions**.
- **Showpieces (async, never block the page):**
  - **One hero concept image** (GPT Image).
  - **Reconstructed clean sketch** (the ink layer alone, redrawn cleanly — ties directly to the
    air-draw differentiator).
  - Each has independent status + per-artifact retry. Page renders the text **immediately**;
    images **pop into placeholders** when ready.
- **"Explain it to…" switcher:** 3 audiences — **teammate, investor, coding-agent/Claude Code
  handoff** — generated **on-demand per click**, rephrasing one-liner + summary only.
- Users can edit any text section.

> **Cut:** all diagrams (user-flow/system), 3-step storyboard, FAQ, objections, before/after,
> analogy, 60s pitch audio, demo script, presentation outline, one-pager-as-format, full
> implementation-handoff doc, all exports (PDF/JSON/image-bundle).

## 6. Sharing

- Read-only result at **`/share/{unguessableToken}`**, **server-rendered** (correct Open Graph
  preview).
- The share page is a **frozen snapshot** — persisted at share time (text bundle + hero image
  URL + sketch + share-card URL). It never reads live session state, so it can't break later.
- **No auto-expiry, no cleanup cron** (so the link survives judging). Keep: unguessable token,
  `noindex`, working **manual "delete now"** button, "temporary link" copy.

### Send-to-group-chat (one click → one paste)

The goal: the creator clicks once, pastes once into Discord/Slack/iMessage, and teammates see
**a couple sentences + the visuals**. Built around link-unfurling, because you **cannot**
reliably put text + multiple images on the clipboard and have them paste across chat apps.

- **Share-card image:** at generate/share time, composite the **hero image + reconstructed
  sketch + title** into a **single graphic**. This is set as the page's `og:image`.
- **"Copy for chat"** copies a **2–3 sentence blurb + the share link**. When pasted, the chat
  app **auto-unfurls** the link into a rich card showing the share-card image (both visuals) +
  title + summary. One click, one paste, images appear — everywhere unfurling works.
- **"Share with images"** (mobile): Web Share API attaches the actual image files + text to the
  chosen app where supported.
- **Desktop fallback:** download the images + copy the blurb. Do **not** promise multi-image
  clipboard paste.

## 7. Architecture

- **Next.js App Router** (TypeScript, React, Tailwind, Zod), **replacing the Vite starter**.
- **Vercel Postgres** (sessions + share records) + **Vercel Blob** (evidence + generated
  assets). Deploy on Vercel.
- **Server-only OpenAI access** — keys never in browser code.
- Client **reducer-based session state machine**:
  `setup → capturing → synthesizing → grilling → confirming → generating → complete | error`.
- A configurable **low-latency vision-capable Responses API model** with **Structured Outputs**
  for synthesis, grilling, and artifacts. **GPT Image** for the hero image. Browser speech
  synthesis reads questions aloud (text-only fallback).
- **Validate every AI response against Zod; retry once on malformed output.**

### API routes

| Route                               | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `POST /api/sessions`                | create session; return id                                      |
| `POST /api/realtime-token`          | issue ephemeral transcription credential                       |
| `POST /api/sessions/:id/synthesize` | produce/update the canonical IdeaModel                         |
| `POST /api/sessions/:id/grill`      | accept latest answer; return updated model + one next question |
| `POST /api/sessions/:id/confirm`    | lock the creator-approved interpretation                       |
| `POST /api/sessions/:id/generate`   | stream artifact status + results (text first, images async)    |
| `POST /api/sessions/:id/share`      | create the share token + frozen snapshot                       |
| `DELETE /api/sessions/:id`          | delete session data + assets                                   |

### Core types

`Session, EvidenceItem, TranscriptSegment, IdeaModel, UnderstandingField, GrillQuestion,
GrillAnswer, AudienceProfile, ArtifactBundle, ShareRecord`.

## 8. Testing (for code-review judges)

Focused unit tests on the **deterministic core worth reviewing**, providers mocked:

- Grill weakest-field selection + 5-question cap + early-stop threshold.
- Confidence updates.
- Zod schema validation incl. the **retry-once-on-malformed** path.
- Session state-machine transitions.

> **Skip:** full per-route integration matrix, browser/permission-denial matrix,
> refresh-recovery, expiry tests.

## 9. Accessibility (cheap wins only)

Keyboard-accessible controls, visible focus, captions on transcript, labeled media controls,
reduced-motion support, sufficient contrast. The full "works entirely on keyboard with all
media denied" guarantee is **not** a v1 acceptance gate.
