# Mobile About redesign — spec (2026-07-20)

Design only. No code touched. Grounded in `AboutIntro.tsx`, `MobileTimeline.tsx`,
`CrossPathsTimeline.tsx`, `AboutPage.tsx` (title/intro wiring ~2078–2213, mobile project
stack ~1156–1170), `clusters.ts`, and the three `about-center` screenshots at 375/390/430.

---

## 1. ASCII wireframe — full flow, top to bottom

```
┌─────────────────────────────────┐  t=0     VEIL (full-bleed paperVellum)
│                                   │          "Bower is new." rises, centred
│         Bower is new.            │          on the page (unchanged mechanic)
│                                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐  t=800ms  TITLE takes over, still centred
│                                   │
│   We've been chasing it          │
│      for five years.             │
│                                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐  t=2000ms SETTLE — title travels to its
│                                   │           landed position, which is now
│   We've been chasing it          │           CENTRED on mobile (law change,
│      for five years.             │           see §2) instead of the desktop
│                                   │           left-slot rect
└─────────────────────────────────┘

┌─────────────────────────────────┐  t≈2960ms REVEAL — veil clears, page
│  ══ header (SplashHeader) ══     │           shows through beneath
│                                   │
│      We've been chasing it       │  ← h1, centred, static from here on
│         for five years.          │
│                                   │
│   QUESTION ONE                   │  ← both questions visible immediately,
│   How can architecture be        │    same beat as the title landing —
│   grown, not only built?         │    nothing about them is deferred
│                                   │
│   QUESTION TWO                   │
│   How does designing alongside   │
│   AI reshape what we can make?   │
│                                   │
├───────────────────────────────────┤  ← a held beat (~450ms, see §3) —
│                                   │    nothing moves here on purpose
│              𝗒                  │  ← TWIST GLYPH fades/settles in —
│              │                   │    the spine is "born" here
│              │● 2021             │
│         ┌──┐ │                   │  ← plate hugs the SPINE side of
│         │▪▪│ │                   │    its half-column, small, FIT_FRAME
│         └──┘ │                   │    ratio, generous paper around it
│              │                   │
│              │● 2022             │
│              │  ┌──┐              │
│              │  │▪▪│              │
│              │  └──┘              │
│              │  RESEARCH PAPER    │  ← mono caption, only where authored
│              │                   │
│              │● 2023 ...         │  ← cards keep alternating, each one
│              ⋮                   │    revealing on its own as it crosses
│              │                   │    into view (IntersectionObserver,
│              │● 2025             │    "once" semantics — no re-hide)
│              │                   │
│              │                   │
│              ╱ ╲                 │  ← OCULUS MARK fades/settles in
│             bower                │  ← wordmark, finale bookend
├───────────────────────────────────┤
│  THE WORK                        │  ← reformatted project gallery (§4),
│  ─────────────────               │    same restrained register as the
│  [ plate ]  2025 · Robots        │    timeline above it — no register
│  [chip][chip]                    │    jump from "small and quiet" to
│  Project copy…                   │    "photo dump"
│                                   │
│  [ plate ]  2024 · Plentify      │
│  …                                │
├───────────────────────────────────┤
│  THE FOUNDERS.                   │  ← unchanged (dual-tree, already
│  [ Daniel dual-tree ]            │    resolved) — not in scope
│  [ Clay dual-tree ]              │
├───────────────────────────────────┤
│  garland coda — "the obsession   │  ← unchanged, out of scope
│  is real, and it is old."        │
└───────────────────────────────────┘
```

Staging order, restated as a list (this is the part Edward should treat as sequence,
the wireframe above is the spatial reading):

1. Veil → setup line → title, centred throughout (existing `AboutIntro` mechanic,
   one law change: the landed position is centre, not the desktop header slot).
2. Veil clears. Title (now static, centred) + both questions are visible in the SAME
   reveal beat — nothing about the questions is staged or deferred relative to each other.
3. A short held beat, then the twist glyph + spine "grow" starts (§3).
4. Cards reveal one at a time as the user scrolls, each independently.
5. Finale lockup reveals like any other card when it crosses into view.
6. Projects gallery, founders, coda — unchanged in sequence, projects reformatted in style only.

---

## 2. Title: centred, persistently

Today `AboutIntro` measures `[data-about-title]`'s real rect and flies the narration
copy onto it — on desktop that rect is left-aligned in the header slot, so "settle"
lands the title back at the left. The mobile ask is that the **landed** state itself
reads centred, not just the mid-flight state (which is already centred today, since
`centerX`/`centerY` are computed independent of the target rect).

**Design intent:** below `lg`, the `h1[data-about-title]` should be `text-center` and
full-width in its column, not left-aligned. Concretely this changes what `AboutIntro`
measures (the rect it flies onto is now a centred box) — I'd flag one implementation
detail for Edward rather than assume it: the flying `<motion.p>` currently hardcodes
`textAlign: 'left'` on both the setup line and the title (a deliberate choice, commented
in the file, so centring is done by moving the box rather than toggling alignment
mid-flight — right instinct, wrong constant for mobile). For the title to land
convincingly centred, the flown line needs to render centre-aligned at the same width as
the landed `h1`, not left-aligned inside a box that then snaps to centred text on
handoff. That's a one-line follow of the existing pattern (thread the target's own
`textAlign` through instead of hardcoding it), not a redesign of the mechanic.

No other timing changes to `AboutIntro` — `T.title` / `T.settle` / `T.reveal` / `T.done`
stay as authored.

---

## 3. Reveal choreography

**Principle:** no scroll-scrubbed camera on mobile (the file's own stated reason for
existing as a separate tree — a fixed viewBox meets scaled to illegibility). So "growth"
here is **IntersectionObserver, reveal-once, per discrete unit** — matching Framer's
`whileInView` / `viewport={{ once: true }}` primitive, not a hand-rolled scroll listener.
One clock per unit, each armed independently. This is deliberately the *simpler* of the
two paths (scroll-camera vs. per-item IO) because CLAUDE.md's own recorded lesson on
this page is that extra clocks are where the mobile tree's bugs have lived (the two-clock
garland bug, the autoplay-driving-the-camera bug) — IO sidesteps that class entirely.

**Sequencing relative to the intro / questions**

- Title + both questions are NOT gated behind anything — they appear in the same
  `revealed` fade the page already does (`AboutPage.tsx:2121`, the existing
  `opacity: revealed ? 1 : 0` on `<motion.main>`). Daniel's "questions appear first" is
  satisfied by them being unconditionally visible from the moment the page reveals —
  the ordering comes from putting the timeline's *animated* start AFTER that beat, not
  from staging the questions themselves.
- The timeline body (twist glyph + spine + first card) starts in a **pre-grown, held
  state** — not tied to its own scroll position — so a short phone viewport that already
  shows the timeline's top on load still reads title → questions → *then* growth, rather
  than everything arriving in one flat instant. Concretely: the twist glyph / spine-grow
  trigger fires once, ~450ms after `revealed` becomes true (one `setTimeout`-scale delay,
  same register as `AboutIntro`'s own beat-based timing) — a small deliberate pause, not
  a wait-for-scroll.
- From the spine's first grow onward, every subsequent card and year node is purely
  scroll-driven: it reveals when it individually crosses into the viewport. A fast
  scroller sees things pop in near the fold; a slow reader sees them arrive as they read
  — both are correct, neither needs staggering beyond what natural scroll speed already
  provides.

**Per-item animation**

| Unit | Motion | Duration | Easing |
|---|---|---|---|
| Twist glyph | opacity 0→1, scale 0.92→1 | 500ms | `[0.16,1,0.3,1]` (existing `EASE_LINE`) |
| Spine | scaleY 0→1, transform-origin top | 900ms | `[0.16,1,0.3,1]` |
| Year node (dot + label) | opacity 0→1, y +8→0 | 400ms | `[0.16,1,0.3,1]` |
| Card (plate + caption) | opacity 0→1, y +16→0, scale 0.96→1 | 450ms | `[0.16,1,0.3,1]` |
| Finale lockup | same treatment as a card | 450ms | `[0.16,1,0.3,1]` |

All durations and the ease family are the page's own existing vocabulary
(`AboutIntro.tsx`'s `EASE_LINE`, and the same curve `AboutPage.tsx` uses for its
`revealed` fade) — nothing new is introduced, the mobile tree just starts using it for
its own reveals instead of appearing fully assembled.

**Reduced-motion fallback**

`useReducedMotion()` is already threaded into `AboutPage` and passed to sibling
components — reuse it here. When reduced: skip every observer, render the spine at full
height and every card/year node/glyph at its resting state immediately, no transforms,
no delay. This is consistent with the file's own stated position ("No camera, no
autoplay, no reduced/motion split: the composition is identical either way") — the base
composition stays identical, the addition is that the MOTION version now has one to
turn off, where before there was none.

The intro itself already opts out of playing entirely on reduced motion
(`shouldPlayAboutIntro`), so on that path the title is already centred and static and
the whole page is just present — no interaction with the above needed.

---

## 4. Center-spine layout: spine, alternation, year labels, thumbnail sizing

**Spine.** Unchanged treatment from the current `center` variant: 2px sepia
(`INK_SEPIA`), dead-centre, bracketed top and bottom by the twist glyph and the finale
lockup. This part of the current center variant already reads correctly in the
screenshots — do not touch it beyond adding the grow-in from §3.

**Year labels.** Unchanged: centred dot + mono year directly on the spine, between
clusters. This also already reads correctly in the screenshots — small, legible,
doesn't compete with the plates. No change.

**The actual problem, precisely stated.** It is not that the *photographs* are too
detailed — it's that the current center variant gives every plate `w-full` inside a
`w-[calc(50%-1rem)]` column (`MobileTimeline.tsx:224`), so each image stretches to fill
roughly half the viewport (155–193px across the three screenshots), and when a cluster
authors more than one image (the 2023 research-paper node, several of the 2024 nodes)
those stack as a tall column of near-half-width photos, one after another, with no
outer restraint. That's what reads as "way too large" — not the pixels, the box.

**Fix: a small, fixed-size plate, not a stretched column.**

| Viewport | Plate max-width | ~% of viewport |
|---|---|---|
| 375px | 80px | ~21% |
| 390px | 84px | ~22% |
| 430px | 96px | ~22% |

Height follows the image's own intrinsic ratio (`aspectRatio: media.ratio`, same
`FIT_FRAME` discipline `TimelinePlate` already uses — no crop, no letterbox, this
doesn't change). At these widths a landscape photo lands roughly 53–64px tall: enough
pixels to read as "that's a robot," "that's a growing building," "that's a research
plot" — a silhouette and a colour mass — without inviting anyone to study it. That's the
literal read of "you only have to absorb about 10% of the photo": it's a specimen mark
along the spine, not a document. Full detail stays available on tap (see the open
question below on wiring these into the existing `Lightbox`).

**Placement within the half-column.** The plate hugs the SPINE-side edge of its
half-column — right-aligned for a left-side card, left-aligned for a right-side card —
rather than stretching to fill the column. This is what makes it read as *sprouting off
the spine* (echoing the desktop timeline's own "plates stand alongside the line at their
year" language) instead of floating in its own box. The rest of the half-column is left
as paper. Caption, where authored, sits directly below the plate at the same edge, in
the existing mono/uppercase treatment (`MobileTimeline.tsx:208-215`) — unchanged.

**Multiple images per cluster.** Show only the cluster's first authored node
(`cluster.nodes[0]`) at the plate size above. If a cluster has more images, render them
as a tight row of smaller "chip" thumbnails beside/beneath the primary plate — about
half the plate's width (≈40–48px) — reading as a small huddle of specimens rather than
a stacked photo reel. This is the one place I'd want Daniel to look at a real render
before calling it final: whether the extra images are worth showing at chip size at all,
or whether the primary plate alone is enough and the rest should simply not render on
mobile (the desktop timeline doesn't show every supporting image either — it shows
plates at their year, chosen for the composition). My read: chips, because a cluster
authored those images for a reason and dropping them silently is a data decision
disguised as a layout one — but it's a legitimate open question, not a law.

**Vertical rhythm.** With plates this small, the spine needs generous space between
clusters to avoid feeling under-filled — `my-8` to `my-10` between cards (up from the
current `mb-8` on cards / `my-6` on year nodes) is the right direction; exact numbers
want a real render at 375/390/430 before pinning, same as everything else on this page
that's ever been "tuned by eye" (see `CrossPathsTimeline.tsx`'s own commit history —
Edward, capture and compare rather than guess once).

**Colour.** No change to the colour law. Photographs render in their own native colour
(already the case — "there is no colour here but sepia plus the photographs' own," per
the file's own header comment); nothing here introduces a second UI colour or any blue.

---

## 5. Projects gallery reformat (`AboutPage.tsx:1156-1170`, "The Work" section)

This is a different asset class than the timeline plates — these are the real
case-study photographs, the entry point into `Lightbox`, and they carry information
worth actually seeing (not archival evidence, the work itself). So the fix here is not
"shrink to a specimen mark" — it's **register consistency**: right now this block sits
directly under a timeline that (post-redesign) reads quiet and small, and a full-size
photo gallery immediately after will read as a jarring escalation, heavy where the page
just spent itself being light.

**Direction, not exact numbers** (I haven't measured `Gallery`/`SupportingRow`'s current
rendered sizes, and this page's own recorded lesson is to measure before resizing rather
than guess a number that goes stale — Edward should capture the current render at
375/390/430 before setting targets):

- **Frame the hero like a plate, not a photo dump.** A thin 1px sepia rule (`INK_SEPIA`
  at low opacity) around the hero with a small paperVellum/paperDeep mat inset — the
  same "mounted specimen" register the timeline plates and the founder paintings already
  use elsewhere on this page, rather than the hero bleeding edge-to-edge.
- **Tighten `SupportingRow` into smaller, evenly-sized chips** with a hairline sepia
  divider between them, echoing the timeline's new chip language from §4 rather than
  reading as a second, larger photo grid.
- **Keep the mono metadata line as-is** (`AUTHOR_LABEL[p.by]` · year, already sepia —
  `authorColor`/`authorTextColor` are already collapsed to always return `INK_SEPIA`, so
  there's no colour-by-person law tension here to fix).
- **Do not shrink these to specimen scale.** They're tap-to-lightbox already; the job is
  restraint and framing, not miniaturization. Losing legible detail on the one place
  users go to actually look at the work would be the wrong trade.

**Open question for Daniel:** should the timeline's small plates (§4) also open
`Lightbox` on tap? Today `TimelinePlate` is a bare `<img>`, not a button — nothing there
currently supports it. Wiring it in would resolve the "but I want to actually see the
photo" tension that shrinking otherwise creates, using a component that already exists
rather than inventing a second lightbox. I'd recommend it, but it's new interactive
scope beyond "make the images smaller," so it's a call, not an assumption I've baked in.

---

## 6. What stays vs. changes

**Stays:**
- The intro mechanic and timing (`AboutIntro.tsx`) — only its LANDED alignment changes on mobile.
- Spine treatment, year-label treatment, twist glyph, finale lockup — visual design unchanged.
- The `center` spine variant's column-alternation-by-`packSide` structure.
- Founders section (dual-tree), coda garland — out of scope, already resolved per CLAUDE.md.
- `FIT_FRAME` / no-crop discipline for every image, timeline or gallery.
- Sepia-only structure, pigment-only-on-painted-botanicals, no colour-by-person.

**Changes:**
- `center` becomes the shipped default, replacing `rail` (Daniel's direction, stated in the brief).
- Title lands centred on mobile, not left (§2) — needs `AboutIntro`'s hardcoded `textAlign` unblocked.
- Timeline plates shrink from `w-full` in a half-column to a small fixed-size plate hugging the spine edge (§4).
- Multi-image clusters collapse to one primary plate + optional chip row, instead of a stacked column.
- The whole timeline gains a reveal-on-scroll choreography it doesn't have today (§3); the base tree currently has none.
- Projects gallery gets a restrained "mat/plate" framing pass for register consistency with the lighter timeline above it (§5) — sizing itself mostly unchanged.

**Flag for Daniel:**
1. Chips-vs-drop for a cluster's non-primary images (§4) — my recommendation is chips, want it confirmed on a real render.
2. Whether timeline plates should open `Lightbox` on tap (§5) — recommended, but new scope.
3. The `AboutIntro` textAlign detail (§2) is Edward's to execute, not a design decision, but flagging it so it isn't missed and someone doesn't "fix" it by re-adding a centre→left snap mid-flight (the exact glitch the file's own comments warn against).
