# Site selection — the entry face

Author: Sai (Product Designer) · 2026-07-07 · Docs-only, no source touched.
Companion to `docs/design/sculpting-gestures.md`. Reuses and extends the existing
`HeroReveal.tsx` timed reveal (`src/pages/splash/HeroReveal.tsx`) and the shared
`SplashHeader` chrome; targets a new route ahead of `#/shape` in `routing.ts`.

## 0. What this replaces and why it's now real

`src/data/config.ts`'s `SITE` constant is currently fixed and honestly labeled as
such: `latitudeDeg: 51.5, // London-ish` with a comment reading `no site import in
this demo`. The sun-path math it feeds (`src/engine/sunpath.ts`) is already real
astronomy — declination, hour angle, exposure-by-sector — it just runs against a
placeholder location and a placeholder true north (`northDeg: 0`). Committing to
site selection as the entry face means that stub becomes live input: a real address
resolves to a real latitude (sun path) and a real true-north bearing (aperture
orientation reads against actual morning/evening light on *your* garden, not a
generic London approximation). This is the same honesty discipline the rest of the
app already runs on (every GRAMMAR number is a named, sourced constant) — site data
should be real the moment it's collectible, not a decorative map dropped on top of
a still-fake sun path.

## 1. The two doors

The splash home today is one continuous scroll: hero → `HowItWorks` → (link to
`#/engine` and `#/studio`/`#/shape`). Site selection inserts a fork *before* the
shaping tool, not before the pitch — nobody should have to give an address to read
about the engine. The fork appears at the same call-to-action moment the splash
already has (the point today's copy hands off to `#/shape`/`#/studio`):

```
┌─────────────────────────────────────────────────────────────┐
│  splash hero + How It Works  (unchanged, no address asked)   │
└───────────────────────────────┬───────────────────────────────┘
                                 │
                     "shape a canopy" moment
                                 │
                 ┌───────────────┴───────────────┐
                 │                                 │
        [ I have a site ]                 [ just explore ]
                 │                                 │
        #/site  (this flow)              #/shape with SITE
                 │                          defaults (today's
        resolves lat + north               fixed London-ish
        from a real address                constant), no address
                 │                          ever asked
                 └───────────────┬───────────────┘
                                 │
                     #/shape — sculpting engine
                     (same tool either way; only
                      the sun-path input differs)
```

- **"I have a site"** — the address → aerial → patch-placement flow below (§2–§6).
  For someone with an actual garden who wants their real orientation and real
  seasonal sun.
- **"Just explore"** — skips straight to `#/shape` with the existing `SITE` constant
  (or a small set of preset locales, see §7) as a sun-path stand-in, clearly labeled
  as illustrative. This door has to stay genuinely equal-weight, not a demoted "skip"
  link in small type — Bower's whole pitch runs on "you can build this in your
  garden," but plenty of visitors are evaluating the *idea* before they have a garden
  in mind, and making them type an address to see the shape at all would be a
  needless wall in front of the actual product (the generative engine).
- Both doors are buttons of equal visual weight, side by side, mono labels matching
  the splash's existing CTA voice (compare `HeroReveal.tsx`'s copy register: plain,
  declarative, lowercase-led). Neither is pre-selected/highlighted as default.

## 2. Address input

A single field, not a form. Same restrained register as everything else on the
splash: one serif question line, one input, one primary action.

```
┌──────────────────────────────────────────────────────────────┐
│                                                                 │
│              Where's the garden?                               │
│                                                                 │
│   ┌──────────────────────────────────────────┐  [ find it ]   │
│   │  start typing an address…                 │                │
│   └──────────────────────────────────────────┘                │
│                                                                 │
│   we use this once, to find your plot and its true north.      │
│   we don't store it. ›  details                                │
│                                                                 │
└──────────────────────────────────────────────────────────────┘
```

- Autocomplete suggestions appear below the field as a plain list (hairline dividers,
  no card shadow), same visual family as the rest of the app's lists — this is a
  geocoding autocomplete (provider TBD with Edward/Doraemon — Google Places,
  Mapbox, or a lighter OSM/Nominatim option; the design doesn't depend on which),
  not a map picked at this step.
- **No pin-drop-only option is offered here** — text input is the primary path
  because most people know their address faster than they can find themselves on an
  unlabeled aerial. The pin/patch placement is the *next* step (§4), once we're
  already looking at their actual plot from above.
- Primary action `find it` only enables once a suggestion is selected (not on raw
  text — geocoding needs a resolved point, not a guess at free text).
- The privacy line is always visible, not a footnote — see §8.

## 3. Aerial / satellite view

On resolving the address, the view transitions to a top-down aerial centered on the
coordinate, at a zoom level that comfortably frames a typical residential plot
(roughly a 40–60m span across the frame — enough to see the whole garden and its
neighbors for orientation, not just the house footprint).

- **Primary source**: Google Photorealistic 3D Tiles, oblique-capable, high-detail —
  this is what makes the pan-and-tilt in §6 a real 3D asset rather than a flat image
  being faked into perspective.
- **Flat-aerial fallback** (see §7 for when this triggers): a straight top-down
  satellite/aerial image (any standard tile provider), no 3D — the patch-placement
  and orientation flow in §4–§5 work identically on a flat image; only the final
  hero-style tilt-down transition (§6) loses its "real 3D" depth and instead
  cross-fades from flat aerial straight to the rendered 3D shell, which is still an
  honest, legible handoff, just a harder cut instead of a continuous camera move.
- North is indicated on the aerial itself throughout (a small compass mark, same
  visual language as `SiteEnvelopeDiagram.tsx`'s existing plan-view compass glyph —
  triangle + "N" in mono, reused directly rather than inventing a new compass mark
  for this surface), so the user is oriented before they're asked to place anything.
- Standard pan/zoom gestures (drag to pan, scroll/pinch to zoom) — no orbit yet;
  orbit only becomes meaningful once we tilt into 3D at handoff (§6).

## 4. Placing the buildable patch

Auto-detecting "the backyard" from an aerial image alone is not reliable — parcel
boundaries, structures, tree cover, and garden vs. yard vs. patio all vary too much
to guess confidently, and a wrong auto-guess is worse than no guess (it either
requires a correction step anyway, or silently gets it wrong and produces a shape
sized for the wrong ground). So this step asks the user directly, framed as drawing,
not correcting:

```
   "Trace the patch where you'd put it"

    ┌────────────────────────────────────────┐
    │            [ aerial photo ]              │
    │                                           │
    │     house  ▭▭▭                           │
    │            ▭▭▭                           │
    │                    ╭┄┄┄┄┄┄╮               │
    │                    ┊      ┊  ← drag to    │
    │                    ┊      ┊    draw/resize │
    │                    ╰┄┄┄┄┄┄╯    the patch   │
    │                       lawn                │
    └────────────────────────────────────────┘
              [ looks right → ]
```

- Default interaction: drag out a rectangle (simplest, fastest, matches "a buildable
  patch" being a bounded footprint envelope, not a freeform garden outline — the
  shell's actual footprint is an ellipse derived from `footprintM2` regardless, so
  the patch only needs to establish *available ground*, not a precise final
  silhouette). A rotate handle at one corner lets the rectangle align with a fence
  line or the house wall, since gardens are rarely aligned to true north.
- The rectangle starts at a reasonable default size (roughly the grammar's max
  footprint span, so it previews "does my garden even fit this") and resizes freely;
  a small live label reads its span in meters (mono, tabular, same register as every
  other dimension callout in the app) so sizing feels grounded, not abstract.
  Undersized patches aren't blocked here — the grammar's own footprint minimum
  (`GRAMMAR.minFootprintM2`) is enforced downstream in the shaping tool itself,
  exactly where the existing rim-handle/sculpt resistance (§4 of
  `sculpting-gestures.md`) already communicates limits; this step doesn't need a
  second copy of that logic.
- No zoning/setback checking, no "is this legally buildable" claim anywhere in this
  flow — the app's honesty discipline (grammar limits are structural/fabrication
  facts, stated as such) would be broken by implying a planning check that isn't
  happening. If a copy line is needed near the patch step, it says only what's true:
  "this sets the ground your shell sits on — planning rules aren't checked here."

## 5. Deriving footprint bound + true north

Two numbers come out of the traced patch, both computed, both shown:

- **Footprint bound**: the patch's drawn extents become an upper bound the shaping
  tool respects going forward — not a new hard limit layered on top of the grammar
  (the grammar's `maxFootprintM2` still governs what's *buildable*), but a "your
  actual ground" ceiling shown alongside it, so if someone's garden is smaller than
  the grammar's max family, the tool can say so honestly rather than letting them
  sculpt a shape their lawn can't hold. Presented the same way grammar bounds are
  presented everywhere else: a quiet mono line, not a warning.
- **True north**: derived from the geocoded coordinate (real north for that location
  — not a copy of the patch rectangle's rotation) and written into the engine's
  `SITE.northDeg` in place of the current fixed `0`. The rectangle's *rotation*
  (how it sits relative to fences/house) is separate from this and is used only to
  orient the patch preview — the aperture's actual compass bearing continues to be a
  sun-relative decision made in the shaping tool itself (§2.5 of
  `sculpting-gestures.md`'s twist gesture), now correctly anchored to real north
  instead of an assumed one.
- Both values appear in a small confirm panel before the handoff, mono/tabular,
  matching the live-readout register used throughout: `plot · 14.2 × 11.6 m` /
  `true north · rotated 12° from patch` — so a user sees exactly what they're
  handing the engine before it commits, and can go back and redraw.

## 6. The handoff — aerial becomes plan becomes shell

This is the flow's signature move, and it works because the codebase already built
the exact camera language it needs: `HeroReveal.tsx`'s `AutoHero` plays a timed
top-down → oblique tilt while a flat 2D mark resolves into a 3D render (`TILT:
[0.2, 0.5]`, `RESOLVE: [0.5, 0.76]` in `HERO_THRESHOLDS`). Site selection reuses that
exact structure with one substitution: the flat 2D layer that resolves into 3D is no
longer an abstract Oculus mark over a generic ground — it's the user's own traced
aerial patch, so the transition reads as "your lawn becomes the plan view, then
becomes your pavilion," not a generic demo animation replaying with a new location
tag on it.

```
p 0.00            p 0.20                 p 0.50                p 0.76           p 1.0
┌─────────┐      ┌─────────┐            ┌─────────┐          ┌─────────┐      ┌─────────┐
│ aerial,  │      │ aerial   │            │ camera    │          │ wireframe │      │ solid render,│
│ patch    │  →   │ cross-   │   →        │ tilts     │   →      │ resolves  │  →   │ shell sits    │
│ confirmed│      │ fades to │            │ top-down  │          │ to solid  │      │ on the real   │
│ (§5)     │      │ plan-view│            │ → oblique │          │ + shell   │      │ traced patch, │
│          │      │ ellipse  │            │ (patch    │          │ grows in  │      │ ready to      │
│          │      │ on the   │            │ boundary  │          │           │      │ sculpt        │
│          │      │ patch    │            │ becomes   │          │           │      │               │
│          │      │          │            │ ground)   │          │           │      │               │
└─────────┘      └─────────┘            └─────────┘          └─────────┘      └─────────┘
```

- **p 0.00 → 0.20**: the confirmed aerial (with the traced patch outline still
  visible, same dashed-rectangle treatment as §4) cross-fades into a plan-view
  ellipse at the grammar's default footprint, centered inside the patch — this beat
  reuses `HeroReveal`'s `OCULUS_OUT`/`CANVAS_IN` crossfade mechanics, substituting
  "aerial photo" for "flat Oculus mark" as the thing that fades out while the R3F
  canvas fades in underneath it.
- **p 0.20 → 0.50**: camera tilt, identical timing/easing to the existing hero
  (`TILT` range, `easeInOutCubic`) — the plan-view ellipse is now sitting on a ground
  plane textured with the actual aerial imagery (or a desaturated stand-in derived
  from it, if licensing/perf rules out draping the live tile imagery — a design
  decision to confirm with Edward once the tiles integration is scoped, §7) so the
  tilt genuinely reads as "this exact patch of ground is tipping into view," not a
  generic grass texture.
- **p 0.50 → 0.76**: the existing wireframe → solid + plants-grow-in resolve
  (`RESOLVE` range), unchanged mechanically from `HeroReveal.tsx` — this is the
  proof that the shell is real geometry settling in, same as the home hero.
  Orientation is now correct: the aperture direction that resolves is whatever the
  default/last-used bearing is, shown against the *real* compass the true-north
  derivation (§5) established, so if the copy anywhere says "opens toward morning
  light," it is now actually true for this address, not London's morning light.
- **p 0.76 → 1.0**: settle, then a short beat, then control hands directly to the
  sculpting tool (`sculpting-gestures.md`) — no separate loading screen, no "get
  started" button in between. The reveal's last frame *is* the sculpting tool's first
  frame; the falloff-ring hover affordance (§3 of that spec) becomes available the
  instant the settle completes.
- **Flat-aerial fallback path** (§3): same beat structure, but p 0.20–0.50 collapses
  to a straight cross-fade (flat aerial → plan ellipse-on-ground) instead of a tilt,
  since there's no 3D tile depth to tilt through. Still one continuous reveal, still
  ends on the same p 0.76–1.0 resolve — the visible difference is smaller than it
  sounds, because the *resolve* (wireframe → solid shell) is the beat that sells
  "your structure," and that beat is identical either way.
- **Reduced motion**: matches `HeroReveal.tsx`'s existing `staticRender` mode exactly
  — no tilt, no timed reveal; the final settled shell renders directly on the traced
  patch, static, with the confirm-panel numbers (§5) shown beside it. No new
  reduced-motion logic needed; this flow inherits the pattern wholesale.

## 7. The honest snags

Two real integration risks, stated plainly rather than smoothed over, per the app's
existing constants-driven honesty discipline (`config.ts`'s own header: "every number
that is a placeholder is a NAMED CONSTANT... never a magic number buried"). The
design has to degrade gracefully on both, not assume the ideal path:

- **Auto-detecting the backyard is hard.** Parcel data, structure footprints, and
  "which patch of green is actually usable" don't resolve reliably from imagery
  alone across arbitrary addresses (dense urban plots, irregular lots, shared
  gardens). Rather than attempt and often fail at auto-detection, §4 asks the user
  to trace directly — this is a deliberate design choice to *not* build the
  auto-detect feature at all for v1, not a fallback for when it fails. If auto-detect
  ever becomes reliable enough to trust, it should offer a *pre-filled* rectangle the
  user can accept-or-adjust — never a silent, uncorrectable guess.
- **3D-tiles coverage and cost.** Google Photorealistic 3D Tiles doesn't cover every
  address at usable fidelity, and it's a metered/priced API — both a coverage gap and
  a cost-control concern, not just a nice-to-have toggle. The flat-aerial fallback
  (§3, §6) has to be a first-class path, not an error state: same flow, same
  patch-tracing UI, same handoff structure, just without the depth in the tilt. The
  UI never tells the user "3D unavailable" as a failure message — it simply is the
  flat-aerial experience for that address, presented as normally as the 3D one. A
  practical trigger rule for choosing which path to request: attempt 3D tiles only
  once an address is confirmed (not during autocomplete-typing, to avoid paying for
  every keystroke's worth of speculative area), and fall back silently to flat aerial
  on any tiles-coverage or load failure.
- Neither snag should ever surface to the user as an apology or a broken-feeling
  state — both are simply two versions of the same flow, chosen automatically, and
  the "just explore" door (§1) exists precisely so neither snag is ever a hard
  blocker to seeing the product.

## 8. Privacy handling

The address is used once, in-browser, to resolve a coordinate and orient a scene —
it is never a stored field on any persisted design.

- The privacy line in §2 is always visible at the input step, not a linked policy
  page — one sentence, plain: "we use this once, to find your plot and its true
  north. we don't store it." with a `› details` disclosure for anyone who wants the
  longer explanation (geocoding provider used, that only the resolved lat/long +
  derived north bearing persist in the session's design state, the raw address
  string is discarded once resolved).
- **What persists**: `latitudeDeg`, `northDeg` (or the equivalent site-derived
  values feeding `sunpath.ts`), and the traced patch's *dimensions* (for the
  footprint-bound display in §5) — not the address string, not the geocoded name,
  not a map screenshot tied to an identifiable location, unless the user explicitly
  chooses to save/share a design later (a separate, out-of-scope-here feature that
  would need its own explicit consent moment).
- No account/login is implied or required anywhere in this flow — site selection is
  a same-session input, consistent with the rest of the app's no-persistence-layer
  posture today (`zustand` store, no backend persistence visible in the current
  scaffold).
- If geocoding is proxied through a backend at some point (rather than a pure
  client-side API call), the same "resolve, don't log" discipline applies
  server-side — flagged for Edward/Doraemon when that integration is scoped, since
  it's an implementation detail this spec can't fully guarantee from the design
  layer alone.

## 9. "Just explore" door, detailed

Not just a skip link — a real second path with its own small decision:

- Lands directly in `#/shape` with the existing `SITE` constant values as the sun
  path input, OR, as a slightly richer option worth considering with Edward: a small
  set of 3–4 preset locales (e.g., London, a US Sun Belt city, a Nordic city) picked
  as a lightweight illustrative dropdown rather than a full address flow — cheap to
  add, gives "just exploring" visitors a sense that orientation *does* meaningfully
  change the shell, without asking for anything personal. This is proposed as a nice
  addition, not required for the door to be honest and complete; the constant alone
  is a legitimate v1.
- Whichever preset (or the fixed constant) is active is labeled quietly in the
  shaping tool's existing spec-strip area — mono, small, e.g. `sun path · london
  (illustrative)` — so it's never ambiguous that this session isn't using a real
  traced site, matching the app's constants-are-named-and-visible discipline.

## 10. Scope note

- New surface: a `#/site` route (or similar; final hash TBD with Edward against
  `routing.ts`'s existing pattern) sitting between the splash's CTA moment and
  `#/shape`. `routes.shape` in `routing.ts` already exists as the handoff target and
  needs no change; only a new entry point route and the two-door moment on the
  splash need adding.
- Reused, not reinvented: `SplashHeader`, `HERO_THRESHOLDS`/`AutoHero`'s tilt-resolve
  camera choreography, `heroMode()`'s poster/staticRender/scrub fallback logic,
  `SiteEnvelopeDiagram.tsx`'s compass glyph, the mono/tabular live-readout register
  used throughout `hairline.tsx` and `ShapePage.tsx`.
- Net-new: address autocomplete input + geocoding call (provider TBD), aerial/3D-
  tiles viewer + patch-tracing interaction (net-new component, no existing
  precedent in the codebase to reuse), the `SITE`-constant-becomes-live-input wiring
  in `config.ts`/`sunpath.ts` (an engine-layer change, Edward's call on
  implementation, not touched by this doc).
- No dependency on this flow exists yet in `package.json` (no maps/geocoding/tiles
  SDK currently installed) — confirming §7's fallback-first framing is a real
  constraint today, not a hedge.

## Open questions for Daniel / Edward

- Geocoding + 3D-tiles provider selection (cost, coverage, licensing for draping
  tile imagery onto the ground plane during the tilt) — a build-cost/vendor decision
  outside this spec's scope.
- Whether "just explore" gets the richer preset-locale picker (§9) or ships v1 with
  just the fixed constant, labeled illustrative.
- Whether patch dimensions (not the address) are worth persisting across sessions at
  all in v1, or whether every visit re-derives from scratch (simpler, more honestly
  "we don't store anything" — my default recommendation absent a stated need to
  return to a saved site).
