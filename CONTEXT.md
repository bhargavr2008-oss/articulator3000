# Context

## What this is

**The Articulator 3000** — a hackathon project for IndyHax 2026.

Express a rough idea by **talking, typing, and air-drawing with your hands** in front of
your webcam. The app interviews you with a few sharp questions, then produces a polished,
shareable "here's what I understand" page.

**Core promise:** _Show, say, or draw your idea — The Articulator 3000 turns it into something
others understand._

**The differentiator:** the webcam becomes a canvas and your **fingertip is the pen**. You
draw in the air, then use your body as a prop — draw a truck, then move your forearm as its
articulating ladder — and the app understands the mechanism you're demonstrating.

## This is a hackathon, not a product

Decisions on this project are made to win a hackathon, not to ship a SaaS. That means:

- **Judged surface = a 5-minute recorded video + a deployed app judges may run themselves +
  the repo (code review).** All three matter. The video is the primary artifact; the
  deployed app must work for a judge's _own_ idea; the code must read cleanly.
- **Ruthless scope.** Every feature we don't show on the video or that a judge won't touch is
  a candidate for cutting. We nail a few things instead of half-building twenty.
- **Risk-first build order.** The unproven headline feature (hand-tracking air-draw) is
  prototyped _first_, in isolation. If it doesn't feel good early, we fall back to voice +
  upload + type and re-narrate. Everything else is comparatively low-risk plumbing.
- **One clean take, not live resilience.** Because the demo is recorded, we don't need
  graceful live provider-failure handling — we re-record. We need the happy path to look
  polished, and to _genuinely_ work when a judge clicks the deployed link.

## The honest version of the magic

"The app understands my gestures" is really **multimodal fusion**: your **voice narrates the
meaning** ("I'm using my forearm as a ladder that swings up from the cab"), the **composited
webcam+drawing frame** confirms the spatial relationship, and the model fuses them. We never
rely on silent gesture recognition — that's the thing most likely to break on a judge's
machine, so we engineered around it.

## What we deliberately are NOT building

- Continuous video-to-model streaming, 5s frame sampling, perceptual dedup, 40-frame budgets,
  phrase-trigger frame bursts (replaced by hand-tracking + canvas).
- Screen sharing, emotion detection, sign-language translation, autonomous implementation.
- Accounts, collaboration, comments, version history, permanent project library.
- 24-hour auto-expiry / cleanup cron (it would risk our own share link going dark _during
  judging_). We keep manual delete + noindex + unguessable token instead.
- Diagrams, storyboards, FAQ, objections, pitch audio, demo scripts, exports (PDF/JSON/image).
- The full browser/integration test matrix.

See [SPEC.md](./SPEC.md) for the locked specification and [PLAN.md](./PLAN.md) for the build
sequence.
