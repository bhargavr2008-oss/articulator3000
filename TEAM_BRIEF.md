# Team Brief

## Quick text message for non-technical teammates

> 🚀 **What we're building: The Articulator 3000**
>
> You know how it's really hard to explain an idea that's in your head? The Articulator 3000
> lets you just **talk, type, and DRAW IN THE AIR with your finger** in front of your webcam.
> You sketch, say, a truck — then move your arm like it's the truck's ladder — and the app
> actually _understands_ what you're showing it.
>
> Then it asks you a couple of smart questions, and spits out a clean, shareable page that
> explains your idea to anyone: a teammate, an investor, even a coding AI.
>
> Think: **"draw your idea with your hands, and it turns into something other people get."**
> That's the whole thing. The hand-drawing-in-the-air part is the wow moment. 🪄

(Copy-paste ready. Shorten by deleting the last two lines if you need it tighter.)

---

## The 5-minute video — how to record it, what to say & do

The video is the #1 thing judges see. Goal: make the **air-draw moment** unforgettable, and
show that a real, working page comes out the other end.

### Setup before recording

- **Good lighting, plain background** — hand tracking is way crisper. Sit so your upper body +
  hands are clearly in frame.
- Use the **deployed app** on a clean browser profile (so judges believe it's real).
- **Pre-cache the hero image** for the idea you'll pitch (the live app still generates for real
  if a judge tries it — this is just to keep the video tight).
- Pick a **spatial product with a moving part** to draw — e.g. a **truck with an extending
  ladder**, a folding cargo drone, or a transforming desk. Something you can demonstrate with
  your arm.
- **Rehearse the air-draw + arm-gesture until it's smooth.** This is the shot everything rests
  on.

### The script (≈5 minutes)

**0:00–0:30 — The problem (hook).**
Talk to camera: _"Everyone has ideas stuck in their head that are really hard to explain. You
end up writing long docs nobody reads. What if you could just… show it?"_

**0:30–1:00 — Introduce The Articulator 3000 + open the app.**
_"This is The Articulator 3000. You talk, you type, and you draw your idea in the air with your
finger."_ Show the capture studio, webcam live.

**1:00–2:15 — THE MONEY SHOT: air-draw + gesture.** 🪄

- Pinch your fingers and **draw the truck in the air** — narrate as you go: _"So I'm sketching a
  delivery truck here…"_
- Then **use your forearm as the ladder**: _"…and this is the key part — there's a ladder that
  extends and pivots up from the cab, like this"_ (move your arm).
- Keep narrating clearly — your **voice is what makes the app understand the gesture**, so say
  what your hand/arm means out loud.

**2:15–3:00 — The Grill.**
The app asks 1–3 short questions. Answer a couple by **voice**, and for one, click **"That
assumption is wrong"** to show it adapts. Point out: _"It's not just transcribing me — it's
asking the questions a good co-founder would."_

**3:00–3:20 — Confirm.**
Hit confirm on the "Here's what I understand" screen.

**3:20–3:35 — Tiny code glimpse.**
Cut briefly to the codebase: show the **MediaPipe pinch detection** in
`components/airdraw/AirDraw.tsx`, then flash the realtime voice hook or session state machine.
Say: _"Under the hood, we're combining live hand landmarks, realtime voice, and a state machine
that turns the raw capture into a structured idea."_ Keep this to **10–15 seconds**—show only a
few relevant lines, with the important code already highlighted and zoomed in.

**3:35–4:30 — The payoff: the result page.**
Show the generated page: title, summary, the **hero image**, and the **reconstructed clean
sketch** (point out: _"that's my air-drawing, cleaned up"_). Click the **"Explain it to…"**
switcher — flip from **teammate** to **coding agent** to **investor** and show the wording
change.

**4:30–5:00 — Share + close.**
Click **share**, open the live `/share` link **on your phone** to prove it's real and
shareable. Close: _"From a rough idea and some hand-waving, to something anyone can understand —
in under five minutes. That's The Articulator 3000."_
_(Optional clever line: "We actually pitched this idea to The Articulator 3000 itself.")_

### Do / Don't

- ✅ **Narrate every gesture out loud** — the voice carries the meaning.
- ✅ Keep energy up; let the air-draw breathe (don't rush the wow moment).
- ✅ It's recorded — **do as many takes as you need** and splice the best.
- ✅ Pre-select and zoom the code before recording; the code shot should be readable instantly.
- ❌ Don't silently mime and expect the app to read it — always say what you're showing.
- ❌ Don't scroll through files or explain implementation details during the code glimpse.
- ❌ Don't demo a feature that isn't built; stick to: air-draw, voice, Grill, result page,
  audience switcher, share.
- ❌ Don't pick an abstract software idea for the video — choose something **physical you can
  draw**, so the air-draw shines.
