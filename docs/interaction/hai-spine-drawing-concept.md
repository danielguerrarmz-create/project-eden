# Spine drawing — a faux HAI concept for the Eden creation engine

Author: Sai (Product Designer) · 2026-07-08 · Docs-only, no source touched, FAUX/CONCEPT
ONLY. This is Daniel's design direction for the creation engine, made concrete enough to mock up and share: how a
user and the engine converse while a shape is being invented, not refined. It does not
design, spec, or estimate the intent-inference internals (gesture classification,
confidence scoring, any ML) — those are explicitly out of scope per the ask. Where an
internal is needed to make the interaction legible, it is named at tinker-level, one
sentence, and flagged as faux, not designed.

Builds directly on `docs/interaction/sculpt-canvas-spec.md` (this session, same branch)
and the two gesture specs it in turn extends, `docs/design/sculpting-gestures.md` and
`docs/design/direct-manipulation.md`. None of those are re-derived here — cited by
section where reused. Also grounds against `docs/research/form-finding-method.md`
(Senku, 2026-07-07): the RESOLVE stage below assumes the XPBD-family relaxation that
brief already specifies is what's running under the hood; this doc does not re-argue
that choice, only borrows its visible behavior (constraints as felt resistance, settle
as the real math, never staged).

## 0. Where this sits: the illoca gap, closed

Illoca's own pitch is explore-first, 2D-fast, precise-parametric one layer down. Daniel's
correction, and the reason this is worth a second concept doc rather than folding into
the sculpt canvas: illoca's explore phase is still fundamentally 2D, and Daniel's read is
that most people don't think in 2D profiles, they think in the actual 3D thing. Spine
drawing is the answer to that specific gap, not a reskin of sculpting: **you don't
sketch a profile that gets extruded, you gesture the thing itself** (an arch's own arc,
an opening's own boundary, a rib's own path) and the engine reads that gesture as
already being 3D intent, not a flat drawing waiting to be lifted. §2 below is the whole
case for why that's honest rather than a claim, not just a slogan.

## 1. The core loop — DRAW → INFER → GATE → RESOLVE → REFINE

Five named stages, one continuous motion from the user's side (draw, watch, maybe
redirect, watch again) even though the engine's side changes character completely at
each one. This section is the heart of the concept: getting GATE right is the entire
difference between "the engine is a collaborator" and "the engine is a guessing black
box," so it gets the most detail.

| Stage | User does | Engine shows | Duration |
|---|---|---|---|
| **DRAW** | One continuous stroke (press, drag, release) across the 3D site — never a sequence of placed points, that's the parameter world we're leaving | A live, unstyled ink trace only, following wherever the stroke actually lands (§2 covers how a flat gesture finds a 3D point). No geometry, no color, no guess. | as long as the stroke takes |
| **INFER** | Nothing — this stage is entirely the engine's, triggered by pointer-up | The raw stroke reclassified into one proposed reading (arch / aperture / rib, §2) plus a rough parameter set, rendered as a translucent ghost | instant on release |
| **GATE** | Nothing, by default — the deciding moment is a window to redirect, not a form to fill in | The ghost, one anchored mono line naming the read (`arch · span 3.2m`), and, only if genuinely ambiguous, up to two alternate-reading chips | ~400–600ms window, tunable, not blocking |
| **RESOLVE** | Watches | The ghost visibly hardens into finished, rendered geometry — position is already correct from the first ghost frame, only surface treatment (wireframe → matte → grain) animates | ~2s |
| **REFINE** | Grabs any node on the now-resolved spine and pulls, exactly per `sculpt-canvas-spec.md` §2 | The full Option A/B sculpt vocabulary, unchanged | open-ended |

### 1.1 DRAW — withholding the guess on purpose

Showing a resolved guess while the user is still mid-stroke would fight their hand —
they haven't finished deciding what they're gesturing, and a shape appearing under the
cursor mid-decision reads as the engine finishing your sentence before you've said it.
So DRAW shows nothing but the trace itself: a thin `inkBlack` line at reduced opacity,
the same weight register as the falloff ring's dashed rim in `sculpt-canvas-spec.md`
§2.2, deliberately NOT `accentOlive` yet, because accent means "alive, being touched,"
and at this instant nothing has been touched into existence.

### 1.2 INFER — reading the drawing behavior, honestly scoped

This is the one stage where Daniel's brief explicitly asks for engine internals ("read
the drawing behavior... propose assumptions about intent") and this doc explicitly
declines to design them. What can be stated honestly at tinker-level, no more: a
handful of cheap geometric signals are legible from any stroke without anything that
deserves the word "AI" — total arc length, where it started and ended (ground plane?
existing shell surface? open air?), whether its curvature bows consistently one way
(arch-shaped) or closes back near its own start within some tolerance (aperture
-shaped), and whether it stays roughly planar or wanders in depth (rib-shaped, tracking
a surface rather than describing a profile). A real system needs an actual classifier
tuned against real messy human strokes, not four heuristics; this doc is naming the
kind of signal available, not claiming to have solved reading intent. Output, faux:
`{ kind: 'arch' | 'aperture' | 'rib', confidence, roughParams }`.

The proposal renders immediately as a translucent ghost in `accentOlive` at the same
low alpha (0.08–0.10) as the influence bubble it's borrowing the device from
(`sculpt-canvas-spec.md` §2.2) — direct reuse, not a new visual language for "this is
a live proposal, not yet real."

### 1.3 GATE — the heart of it: collaborative, never a black box, never naggy

Three properties define whether a gate feels like a conversation or an interrogation.
This system commits to all three:

1. **The gate never blocks.** There is no dialog to dismiss, no "confirm?" the user
   must answer before anything continues. The ghost from INFER is already resolving
   (§1.4) the instant the gate window opens; the gate is a window of time to redirect
   before that resolve finishes, not a gatekeeper standing in front of it.
2. **Silence is acceptance, and that's the common case.** Do nothing for the ~400–600ms
   window and the ghost simply finishes becoming the thing it proposed. This is the
   whole point of the wording "gate," not "prompt" — a gate you walk through by
   continuing to exist on the other side of it, not one you have to unlock.
3. **Redirect is drawing, not clicking a wrong-answer button.** If the read is off, the
   user doesn't hunt for an undo affordance mid-gesture — they just start drawing
   again. A new stroke beginning during the gate window discards the ghost and starts a
   fresh INFER for the new stroke. This is the one interaction in the whole loop that
   has to feel instant and cheap, because it's the failure-recovery path and failure
   -recovery paths that feel expensive get avoided, which just pushes the correction
   later and more expensive (§5).

The alternate-reading chips (`arch` / `rib`, say) are the exception path, shown only
when INFER's confidence is genuinely low, never as a routine "did I get this right?"
prompt on every single stroke — a gate that asks a question every time it runs is the
exact naggy failure mode the brief calls out, and this system is designed so the
common, confident case never shows a question at all, only a statement (`arch · span
3.2m`) that happens to still be revisable for a beat.

**Wrong guesses that survive the gate** (the read looked right at the time, turns out
wrong once fully resolved and looked at from another angle) are not handled by a
special "undo the AI" flow — that would be inventing a second undo system next to the
one that already exists. They're handled by the exact same scrubbable history
`sculpt-canvas-spec.md` §3.3 already specs: one committed spine is one history entry,
scrubbing back past it removes it like any other gesture. Wrong guesses are just
gestures you take back, not a category of error requiring its own UI.

### 1.4 RESOLVE — the reference-video beat, done honestly

This is the moment Daniel named directly: rough intent hardening into finished, rendered
geometry in front of you, the "draw a rough teacup, watch it become the real one" feel.
Two things keep it honest rather than theatrical:

- **Position never moves during resolve, only surface treatment does.** The ghost's
  geometry from INFER is already the final position; RESOLVE only animates material
  fidelity (wireframe → matte gray → finished timber grain, echoing the reference
  video's flat-to-rendered arc). If the shape itself kept shifting during this
  animation it would read as the engine still guessing, undermining GATE's whole
  point that the decision already happened.
- **This is the one moment in the whole system allowed to be a little more staged than
  the sculpt canvas's own "no fake computation" rule permits elsewhere** — because
  there is a genuine wizard step upstream of it (a real read of ambiguous intent, not
  fake), the material ramp is a legitimate translation of uncertainty visibly
  collapsing, not empty theater layered on top of nothing happening. It still needs
  restraint to not tip into the anti-Jarvis line: fixed ~2s duration, no growing glow,
  no particle bloom, just grain and shading resolving in.

### 1.5 REFINE — the hand-off, not a mode switch

The moment RESOLVE completes, the spine's control points are ordinary shell nodes.
There is no "exit drawing mode" button because there was never a separate mode to be
in — grabbing a node on a just-drawn arch and grabbing a node on a shell that's been
open for ten minutes are the same gesture, same hover-highlight, same influence
bubble, same grain-color limit feedback, all cited from `sculpt-canvas-spec.md` §2/§3
unchanged. The loop closes by staying open: a new stroke can start at any time,
resolved geometry stays live and sculptable in the background, sessions are additive.

## 2. The spine vocabulary

A spine is the drawn curve that IS the generative intent, not a profile waiting to be
extruded into intent. Three kinds, distinguished by INFER (§1.2), each with a
different answer to "how does a flat gesture become a 3D thing."

### 2.1 Arch spine

**What it is**: the centerline of an arch, drawn as its actual silhouette, foot to
crown to foot. The spine IS the arch's own visible arc, not a side-view profile of one.

**How it commits to 3D**: this is the case with no existing geometry to anchor to (the
blank-site case, storyboard frame 1–3), so the engine has to infer a sketch-plane from
the stroke itself rather than raycasting against a mesh. The stroke's start and end
points, wherever they touch the ground plane, define a chord; the sketch-plane is
vertical, containing that chord. This is not a new trick invented for this doc — it's
the same "infer a plane, then project pointer motion onto it" pattern already live in
the codebase (`CageHandles.tsx`'s camera-facing plane through the grab point,
`SculptShell.tsx`'s `toPlane`), just run once at draw-time instead of continuously
during a drag. If the stroke never returns to the ground (an open arc, or a stroke that
reads as a rib instead, §2.3), the plane falls back to camera-facing, the same default
`CageHandles.tsx`'s vertical-drag handles already use.

**Editing after resolve**: the arch's spine nodes (crown, and points along both legs)
are grabbable exactly like any other shell node — pull the crown to raise it, pull a
leg point to widen the span, both already legible from `sculpt-canvas-spec.md` §2's
existing grab-and-pull, with the same grain-stiffening at the fab band.

### 2.2 Aperture spine

**What it is**: a closed (or near-closed) loop marking where material opens rather
than where a member runs — the drawn equivalent of `sculpting-gestures.md` §2.1's
push-in gesture, except stated up front by the shape of the stroke instead of
discovered by drag depth mid-gesture.

**How it commits to 3D**: unlike the arch, an aperture is almost always drawn ON
existing shell surface (storyboard frame 5), so every point of the stroke is a raycast
hit against the live mesh as it's drawn — the "2D gesture, 3D result" tension mostly
dissolves here, because the pen is tracing real geometry, not open air; there's no
plane to infer, the surface itself is already 3D. If drawn before any shell exists
(an aperture on the blank site, an edge case, not the primary path), it falls back to
the same ground-plane inference as §2.1, sized to the loop's own footprint.

**Editing after resolve**: the loop's boundary nodes are grabbable, and pucker/inflate
per `sculpt-canvas-spec.md` §2.3–2.4 apply unchanged — this is in fact the same
underlying capability, the aperture spine is just how you FOUND an oculus by drawing
one from scratch, instead of finding it by scrolling one open on a crown ring that
already existed.

### 2.3 Rib spine

**What it is**: an open stroke traced along existing shell surface, proposing extra
structural emphasis along that path (a splice line, a reinforced bay boundary) rather
than a new opening or a whole new form.

**How it commits to 3D**: same as the aperture case, raycast-against-live-mesh at
every sampled point, because a rib only makes sense drawn onto something that already
exists. Not available on the blank site (there's nothing to rib yet); the earliest a
rib spine can be drawn is right after the first arch or aperture resolves.

**Editing after resolve**: the rib's own points are grabbable, same vocabulary,
nothing new.

### 2.4 The one thing all three share

None of the three ever ask "which plane are you drawing on" as an explicit UI
question. The plane (or lack of one, when the surface itself supplies the third
dimension) is always inferred from where the stroke starts and what it touches — this
is the actual resolution to Daniel's 2D-vs-3D tension, stated plainly: **a spine drawn
in open air is lifted by an inferred plane; a spine drawn on real geometry is already
3D the instant it lands, because the surface it's touching is.** The second case is
the more common one after the first element exists, which is also why the concept
gets more confident and less inference-dependent the longer a session runs.

## 3. Relation to the sculpt canvas — same object, same spectrum, different end

Spine drawing and sculpting are **the CREATION act and the REFINEMENT act on the same
object**, not two tools. Positioned on the playdough ↔ parametricism spectrum
`sculpt-canvas-spec.md` §0 already stakes out:

```
playdough                                                          parametricism
  ◀────────────────────────────────────────────────────────────────────▶
   spine drawing         sculpt (grab/pull, §2 of              reveal the
   (DRAW, §1.1)          sculpt-canvas-spec)                    numbers panel
   the most gesture-                                            (sculpt-canvas-spec
   only, most ambiguous,                                        §1)
   least numeric moment
   in the product
```

Spine drawing sits FURTHER toward playdough than sculpting does, not beside it,
because it starts from nothing — there is no existing buildable object to be honest
against yet, only a proposal (§1.2's INFER) that GATE and RESOLVE turn into one. Sculpt
starts one step later, already grounded against a real, already-buildable shell,
adjusting a known-good thing region by region. The reveal-numbers panel is the same
fixed point on the parametricism end regardless of which act got you there — it's a
mirror, not an input, and it reads whatever the current committed geometry is whether
that geometry arrived by spine or by pull.

One session moves left to right and back freely: draw an arch (playdough) → gate/
resolve (crosses into committed, buildable) → sculpt it (still playdough-feeling, but
now refining not proposing) → reveal the numbers to check span/rise (parametricism, on
demand) → draw a second spine (back to the far left) → and so on. Nothing about this
requires a mode toggle; §1.5 already establishes there isn't one.

## 4. Storyboard — one session, 7 frames

Written precisely enough to build into a visual mock. Palette throughout: `paperVellum`
ground, `inkBlack` line work, `accentOlive` the one accent (proposal ghosts, hover,
active drag), amber only at a fab limit, matching every prior spec's color contract.

**Frame 1 — Blank site.** Ground plane, faint dashed site-envelope guide (reused
verbatim from `sculpt-canvas-spec.md` §3.2, already-specified geometry, not a new
device), compass mark, no shell anywhere. One centered mono instruction line, same
register as `SculptPage.tsx`'s existing top instruction text: `draw a spine to begin`.

**Frame 2 — Mid-draw (DRAW).** A thin unfilled ink trace arcs up from one ground
contact point, through open air, back down to a second ground contact point — the
literal gesture of an arch, drawn as itself. No color, no volume, nothing resolved.
Cursor mid-stroke, pressed.

**Frame 3 — Release (INFER + GATE).** Pointer has lifted. A translucent `accentOlive`
-tinted ghost arch now sits exactly along the drawn arc, thickened into a rough rib
volume. One anchored mono readout beside it: `arch · span 3.2m`. Nothing else on
screen has changed; the ghost is mid-gate, not yet final.

**Frame 4 — Resolve, caught mid-transition (RESOLVE).** The same arch, now visibly
split in its material treatment along its length: the left half already reads as
finished cut timber with real cross-section and a soft cast shadow, the right half is
still translucent wireframe-ghost. This is the single frame that most directly shows
the reference-video beat Daniel named, caught mid-sweep rather than at either end.

**Frame 5 — Settled, additive (loop reopens).** The arch sits fully resolved, casts a
real shadow on the paper ground, the sun-path ghost guide from `sculpt-canvas-spec.md`
§3.2 is faintly visible nearby. A SECOND stroke is already underway, a tighter closed
loop being traced directly on the arch's crown surface, this time visibly conforming
to the crown's curve as it's drawn (the aperture case, §2.2, raycasting onto real
geometry instead of inferring a plane).

**Frame 6 — Refine (REFINE, tying to sculpt-canvas-spec).** The user has grabbed a
point partway along the resolved arch's own spine — now an ordinary shell node — and
is pulling it outward. Visible: the hover-highlight and influence-bubble treatment
from `sculpt-canvas-spec.md` §2.1–2.2 exactly as spec'd there, plus one nearby strut
already shifted toward the amber grain-color end as it nears its fab band, proving in
one frame that spine-created geometry obeys the identical sculpt rules as anything
else.

**Frame 7 — Scrub back (wrong guess, taken back).** A horizontal history strip is open
along the bottom of the frame (`sculpt-canvas-spec.md` §3.3's scrub UI), its handle
sitting one tick before the aperture spine from Frame 5 was drawn. The aperture is
ghosted/removed in the live view, HUD stats dimmed to signal "browsing history," no
confirmation dialog anywhere on screen — illustrating that a wrong read is just a
gesture you scrub past, the same way you'd take back any pull.

## 5. Honest boundaries — faux vs. real, and the hard questions still open

**What's genuinely faux in this concept, named plainly:**

- INFER's classification (§1.2) is a sketch of the KIND of signal available (arc
  length, contact surface, curvature sign, closure), not a designed or estimated
  classifier. A real system needs one; this doc does not attempt it, per the explicit
  scope boundary in the ask.
- The confidence value gating whether alternate-reading chips appear (§1.3) is
  asserted for this concept, not derived from anything. A real threshold needs tuning
  against real strokes from real people, which don't exist yet.
- RESOLVE's material ramp (§1.4) is a deliberate visual device translating a real
  decision (the gate closing) into motion. It is close to, but a step short of, the
  "never fake computation" line the sculpt canvas holds absolutely — flagged
  explicitly in §1.4 rather than quietly excepted.

**Hard HCI questions this concept surfaces but does not resolve:**

- **Confidently wrong, not just uncertain.** The chip-based disambiguation in GATE only
  helps when the engine itself knows it's unsure. The harder failure is a confident,
  wrong read — no amount of gate design fixes that; it depends entirely on inference
  quality, which is out of scope here by design.
- **Correction at scale.** This doc solves taking back one wrong spine via scrub-undo.
  It does not solve a user wanting to recategorize three of ten already-drawn spines
  at once — likely needs a persistent, editable log of "what the engine read each
  spine as," not just an ephemeral gate moment. Flagged as a v2 question, not answered
  here.
- **Gate fatigue at the edges of "fast."** The timings proposed (400–600ms gate
  window, ~2s resolve) are starting points, not measured. Even a fully silent, never
  -blocking gate can still feel naggy if the resolve animation itself is long or
  visually loud every single time a user draws — needs a real feel-pass once anything
  is built, the same caveat both prior specs already carry for their own numbers.
- **Discoverability with zero onboarding.** Daniel's no-coachmark stance is easy to
  hold for sculpting (grab-and-pull has an everyday-object precedent, clay, cloth).
  "Draw a spine" has no comparable prior for a first-time user. The single instruction
  line in Frame 1 is the proposed minimum, not a confirmed-sufficient answer.
- **Multi-stroke composition.** Two spines drawn close together, or overlapping (two
  arches sharing a foot, a rib crossing an aperture boundary) — does the engine merge
  them, treat them independently, or gate a merge decision too? Not designed here;
  needs its own pass once single-spine behavior is proven, not before.

## Open questions for Daniel / Clay

- Whether GATE's alternate-reading chips are worth building at all for a first
  version, or whether shipping only the silent-accept / redraw-to-correct paths (§1.3,
  points 2–3) is enough to prove the loop before adding the exception-path UI.
- Whether RESOLVE's ~2s material ramp is the right register for Daniel's reference feel,
  or whether it should be faster/more abrupt once seen live — this is exactly the kind
  of thing that reads very differently as a moving mock than as a written spec.
- Whether rib spines (§2.3) are worth including in a first storyboard/build at all, or
  whether proving arch + aperture is enough to validate the whole loop before adding a
  third kind.
