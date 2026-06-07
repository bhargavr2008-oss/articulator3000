# Implementation Plan

Build order is **risk-first**, not feature-first. The headline feature (hand-tracking
air-draw) is the only true unknown; everything else is plumbing. Prove the unknown first.

See [SPEC.md](./SPEC.md) for the locked spec.

---

## Step 0 — GATE: prototype the air-draw in isolation ⚠️

**Do this before any app scaffolding.** A throwaway single-page prototype:

- Webcam preview + **MediaPipe Hands** → track index fingertip.
- **Pinch-to-draw** (thumb–index distance threshold) → strokes on a `<canvas>` overlay.
- Visible cursor dot showing pen-up/pen-down; undo; jitter debounce.

**Exit criteria:** drawing a recognizable truck in the air _feels good_ and isn't a jittery
mess. **If it doesn't feel good here, stop** — fall back to voice + upload + type as the
narrative and re-plan the video. Better to learn this in hour 1 than day 3.

## Step 1 — Next.js scaffold + state machine

- Replace the Vite starter with **Next.js App Router** (TS, React, Tailwind, Zod).
- Reducer-based session state machine:
  `setup → capturing → synthesizing → grilling → confirming → generating → complete | error`.
- `POST /api/sessions`, server-only OpenAI client, env wiring, and Vercel Blob-backed share
  snapshots.
- Deploy a hello-world to Vercel early so deployment is never a last-minute surprise.

## Step 2 — Capture studio

- Permission setup (separate camera/mic, skip/retry) + the "sent to OpenAI" consent notice.
- Port the proven **air-draw** from Step 0 into the studio overlay.
- **Voice + live transcript** via OpenAI realtime over WebRTC (`POST /api/realtime-token` issues
  the ephemeral credential server-side).
- **Typed input** pane.
- Composite-frame buffering at ~2 fps while a hand is detected + the optional capture hotkey.

## Step 3 — Synthesis → IdeaModel

- `POST /api/sessions/:id/synthesize`: send transcript + selected keyframes (composite frames) +
  typed notes to the vision model with **Structured Outputs**.
- Produce the canonical **IdeaModel** with per-field **confidence** + **evidence refs**.
- Zod-validate; **retry once** on malformed output.

## Step 4 — Grill loop

- `POST /api/sessions/:id/grill`: take the latest answer, update the model + confidences, pick
  the **lowest-confidence foundational field**, return **one** next question.
- Hard cap **5 questions**; early-stop at ~0.7 confidence across foundational fields.
- Question UI: spoken (browser speech synth) + visible; answer by type; escape hatches
  ("Why asking?" / "Don't know" / "Wrong assumption").
- Browser-side speech synthesis reads each question; text-only fallback.

## Step 5 — Confirmation

- `POST /api/sessions/:id/confirm`: "Here's what I understand" screen; creator confirms or
  edits sections; lock the approved interpretation. Unresolved fields → **open decisions**.

## Step 6 — Result page (text core)

- `POST /api/sessions/:id/generate`: returns **text artifacts immediately** and renders the full
  page — title, one-liner, summary, problem, solution, user, workflow, differentiator, open
  decisions. Editable sections.

## Step 7 — Async visuals

- **Hero image** (GPT Image) + **reconstructed sketch** (clean redraw of the ink layer) generate
  **in the background**, each with independent status + per-artifact retry, popping into
  placeholders. Never block the page.

## Step 8 — Audience switcher

- "Package it for…" — teammates / technical engineering. **On-demand per click**, generating
  a group-chat message or a detailed engineering email. "Copy for chat" copies the tailored
  blurb + link.

## Step 9 — Sharing + send-to-group-chat

- `POST /api/sessions/:id/share`: persist a **frozen snapshot** (text + hero URL + sketch +
  share-card URL), return `/share/{unguessableToken}`.
- **Share-card image:** server-render an SVG card that embeds hero + reconstructed sketch +
  title; set it as the page's `og:image`.
- Server-rendered share page with Open Graph tags + `noindex`. Manual **delete now** button +
  "temporary link" copy. **No expiry cron.**
- **"Copy for chat"**: copies a 2–4 sentence blurb + link (unfurls into the share card on paste).
- **"Share with images"** via Web Share API on mobile; desktop fallback downloads images + copies
  the blurb. No multi-image clipboard promise.

## Step 10 — Tests + polish

- Unit tests: Grill selection/cap/threshold, confidence updates, Zod + retry path, state
  machine. Providers mocked.
- Visual polish on the studio + result page (this is what the video shows).

---

## If time is short, cut in this order

1. Audience switcher → ship teammate-only output.
2. Reconstructed sketch → hero image alone.
3. Speech-synthesis question reading → text-only.
4. Editable result sections → read-only.

## If time is plentiful, add back (highest ROI first)

1. A single before/after or elevator-pitch text artifact.
2. File/image upload as an extra input.
3. One diagram (user-flow) as structured data.

## Pre-record checklist (for the video)

- [ ] Deployed app works end-to-end on a clean browser profile.
- [ ] Hero image for the staged idea pre-cached (deployed app still generates for real).
- [ ] Good lighting + plain background so hand-tracking is crisp.
- [ ] Share link live and opens on a phone.
- [ ] Rehearsed the air-draw + forearm-gesture moment until it's smooth.
