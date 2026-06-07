# Design-tool prompt — The Articulator 3000 UI

Paste the block below into Claude (frontend-design / artifacts) to generate the UI.

---

Design and build the UI for a web app called **The Articulator 3000**. Build it as a
**Next.js App Router + React + TypeScript + Tailwind CSS** app (no other UI libraries unless
necessary; use plain Tailwind). Generate clean, componentized, production-quality code with
realistic placeholder data — this is a hackathon demo that must look polished on a recorded
video and when a judge clicks through it themselves. Wire up screen-to-screen navigation with
mock state; do NOT implement the AI/backend — stub it with fake data and timeouts.

## What the product does (context)

Users explain an idea by **talking, typing, and air-drawing with their finger** in front of
their webcam (the webcam is a canvas; their fingertip is the pen). The app then asks a few
sharp questions and produces a shareable "here's what I understand" page. The headline,
must-be-beautiful moment is the **air-draw capture studio**.

## Aesthetic direction

- Confident, modern, slightly playful "creative tool" feel — think Linear/Figma crispness
  meets a spatial/AR drawing app. Dark studio surfaces with a vivid accent (electric
  violet/cyan gradient) for the "ink" and active states. High contrast, generous spacing.
- Motion matters but keep it tasteful; respect `prefers-reduced-motion`. Smooth, confident
  transitions between steps.
- The brand name "The Articulator 3000" should feel fun-but-premium (subtle retro-futurist
  wink in the wordmark is welcome, but keep the app chrome clean).
- Fully responsive; the share page must look great on a phone.
- Accessible: keyboard-navigable, visible focus rings, sufficient contrast, labeled controls,
  captions area for transcript.

## Screens to design (a stepped flow)

1. **Landing** — one-screen hero explaining the promise: _"Show, say, or draw your idea — The
   Articulator 3000 turns it into something others understand."_ A single primary CTA
   ("Start" — no account). A short 3-step "how it works" strip. Visually hint at the air-draw
   magic (an illustrative glowing finger-drawn sketch).

2. **Permission setup** — request **camera and microphone separately**, each as its own card
   with allow / skip / retry. Make clear the app still works with skipped permissions (degrades
   to type-only). A one-line privacy note: "Selected evidence is sent to OpenAI for processing."

3. **Capture Studio (THE CENTERPIECE)** — full-bleed **live webcam feed** with a **transparent
   drawing overlay on top, in the same space as the user's hands** (AR style). Include:
   - A **cursor dot** that follows the fingertip; it visibly changes color/size between
     "pen up" (hollow) and "pen down / pinching" (filled, glowing). Show an ink trail.
   - A slim floating tool rail: **undo, clear, color, a pen-state indicator, and an optional
     "capture moment" button**. Keep it out of the way of the video.
   - A **live transcript panel** (timestamped lines streaming in) docked to one side, with a
     mic-active indicator and an edit affordance.
   - A **typed-notes** input.
   - A subtle "pinch to draw" coach hint that fades after first use.
   - A prominent **"I'm done — analyze this"** primary action.
   - This screen should look genuinely magical and be the screenshot/hero shot.

4. **The Grill** — a focused, calm one-question-at-a-time screen. Show **one question**
   (large, also "spoken" — show a speaker/playing indicator), an answer area (voice OR type),
   and four secondary chips: **"Why are you asking?", "I don't know yet", "Skip", "That
   assumption is wrong."** Show subtle progress (e.g. "question 2 of up to 5") and, when a
   question references the drawing, show a small thumbnail of the relevant frame/sketch.

5. **"Here's what I understand" (Confirmation)** — a structured card showing the understood
   idea in sections (title, one-liner, summary, problem, solution, target user, workflow,
   differentiator) each **inline-editable**, plus an **"Open decisions"** list for unresolved
   items. Per-section confidence shown subtly (e.g. a small bar/dot). Primary action:
   "Looks right — generate."

6. **Result page** — the polished output. Renders **text immediately**; the two **images load
   into placeholder slots with a shimmer** then pop in: a **hero concept image** and a
   **reconstructed clean sketch** (labeled "your air-drawing, cleaned up"). Include an
   **"Explain it to…" switcher** (segmented control: Teammate / Investor / Coding agent) that
   swaps the one-liner + summary wording. Text sections are editable. A **Share** button.

7. **Share dialog + public share page** — a dialog with **"Copy for chat"** (copies blurb +
   link), **"Share with images"**, a **manual "Delete now"**, and a "temporary link" note.
   Then the public read-only **/share** page itself: clean, mobile-first, shows title, summary,
   the hero image, the reconstructed sketch, and a **composite "share card"** preview (hero +
   sketch + title in one graphic) representing what unfurls in a group chat.

## Cross-cutting UI requirements

- A consistent top stepper/breadcrumb showing the flow: Capture → Grill → Confirm → Result.
- Clear **empty, loading, and error** states for every async area (transcript, analysis,
  image generation), with **per-item retry** — one failure must not blank the screen.
- A small "your data is temporary" / privacy reassurance present but unobtrusive.
- Reduced-motion fallback for all animations.

Deliver it as navigable screens with mock data and fake async (setTimeouts) so the whole flow
can be clicked through end-to-end. Prioritize making the **Capture Studio** stunning.
