# Session close — 2026-07-16: the About hybrid, shipped

**Read this first. It is the session-level record.** The per-round detail lives in
`2026-07-16-about-hybrid.md` (Edward's, continuously updated). This document exists because four
agents worked this branch today and three of them died mid-task — twice losing work or instructions
that only existed in someone's head.

**State at close:**

| | |
|---|---|
| `main` | `93ace31` — **pushed to origin, deployed via Vercel** |
| `about-hybrid-sepia` | `8171fda` — merged into main, fully contained (`main..about-hybrid-sepia` is empty) |
| `engine-geometry` | `0b337fb` — **untouched all day.** Worktree at `../engine-session`. Never started. |
| Gates at merge | typecheck 0 · **vitest 354** · build clean · gitleaks clean |
| Archive tags | `archive/backup-pre-strip-2026-07-12`, `archive/manufacturable-component-model` (local, unpushed) |

---

## What happened

The day opened as a review of Clay's `about-v2-nonflowers` branch and became a full rebuild of the
About page, then the Home page's becoming section. 43 commits, all live.

**The decision that framed everything.** Clay's branch carried two About drafts (`#/about/scroll`,
`#/about/ascent`) plus a genuinely good generative engine — a faithful TypeScript port of Lingdong
Huang's *nonflowers* (MIT, 2018), a worker pool, a curation gate. A design critique (Sai) and a live
pass concluded: **Daniel's page wins as a page; Clay's engine wins as an engine.** The drafts were
deleted; the engine was harvested as ornament. Both drafts are recoverable from
`about-v2-nonflowers`.

Why the drafts lost, in one line each — worth knowing so nobody re-proposes them:
- **The Ascent never showed the work.** Walk its climb end to end and you see two portraits and four
  painted flowers; every real project sits behind a click.
- **Its metaphor was a scroll-direction toggle**, not structure. Daniel's ink line *is* the geometry:
  one continuous stroke, twist-fused at 2021, unravelling into the Oculus, arc-length conserved.
- **Its climax was structurally broken.** `matRect` base-anchors every plant to the mat's bottom row;
  the Summit put the wordmark at the frame's base. They collide by construction, for every seed. That
  rule still stands: **never overlay the BowerMark on a painting.**

---

## The shape of the work (chronological)

1. **The hybrid** — Daniel's spine, Clay's organs grown along *his* polyline, re-keyed INK_BLUE → sepia.
2. **Founders** — Clay's composition ported wholesale, then the spine made to open into a
   **parenthesis** around the two of them.
3. **Decoupling** — projects unpinned from the branches. Branches became pure ornament.
4. **The growth engine** — space colonization (Runions et al. 2007) seeding attractors into the
   negative space the layout leaves.
5. **Media** — rows not columns; a plate is a box built to its image; hero in region 1, supporting in
   region 2.
6. **Motion** — one reveal for the whole page: plants draw on, plates fade, as one gesture.
7. **Home** — bare frame → green → in bloom, in the becoming section.

---

## The load-bearing rules (do not violate; each was learned the hard way)

- **Ornament reads layout and never feeds back.** A branch carries nothing. If a branch and a plate
  disagree, *the branch loses*. The old system let ornament dictate layout and it produced every
  collision this page has ever had.
- **A plate is a box built to its image, not an image squeezed into a box.** Tiers are *area budgets*,
  not shapes. `object-fit: cover` is banned on heroes — it was silently cropping 21% off Plentify.
- **Colour (amended today):** structure is **sepia `#8A6A4A`** (`INK_SEPIA_TEXT #6F5439` at reading
  size); **pigment is permitted on painted botanicals only** — founder specimens, garland organs,
  founder vines, coda garlands. **Nothing blue survives on About.** Colour-coding by person remains
  banned.
- **A seed is a design review, not a constant.** `passesGate` is a FLOOR, not a parity check: two
  seeds can both pass and hang as a full plant next to a weed. Curate in `#/lab/gongbi`.
- **Per-refresh variation draws from a CURATED POOL, never the raw genome.** The worst possible render
  must be one already approved by eye.
- **Never overlay the BowerMark on a painting** (see `matRect`, above).
- **Bios restate project facts by hand and nothing links them to `projects.ts`.** This is a live
  defect — see "Known traps" #6.

---

## The five measurement traps (the session's real yield)

Every one of these is a case where *the instrument lied*. Collected here because they rhyme:

1. **The wrong-shape box.** A fixed-aspect container reports success while the image inside it is
   letterboxed or cropped.
2. **The linear resample.** `garland.ts` resamples at 4px and interpolates *linearly* — every authored
   control point becomes a corner it drives straight through. Sample arcs off smooth curves.
3. **The starved rAF.** A busy main thread made a hero-lockup seek read as a layout bug.
4. **The box that is too big for its text.** A `<p>` 1100px wide carrying a 110px string reports a
   vine "crossing text" when it sails through empty paper. **Measure glyph runs with a Range**, not
   the element's rect.
5. **The box that is too small for its content.** The supporting rail's own rect *fits its region by
   definition* (`h-full`), while its children spilled `(n−1) × gap` past it. Measure
   `scrollHeight - clientHeight`.

**The generalisation, which is the thing to remember:** *a container's rect tells you about the
container, not about what's inside it.* Traps 4 and 5 are the same error with opposite signs.

**And a sixth, about tests rather than pixels:** the year-label tests were **passing while measuring
nothing** — they asserted a label at `y=2022` *pixels* (the top of the drawing, where nothing can
collide), so "clears everything at every year" was true and vacuous. A test that asserts nothing and
reports success is worse than no test. When a test proves a claim, **sabotage the code and confirm the
test fails.** Edward did exactly that for the rail guard and it's the model to follow.

---

## Known traps / open items

1. **Plentify's hero is 48.4% white paper. Resia's is 34.6%. Patterns 9.2%.** Measured on real pixels.
   **This is an asset problem, not a layout problem** — no box can remove white that lives *inside* the
   image, and cropping it out violates "don't lose the context". **NEEDS DANIEL: re-export.** Do not
   "fix" this in CSS; that's how the crop bug got in.
2. **The orientation Zoom photo** (`public/assets/about/timeline/2021-orientation-zoom.jpg`) shows
   ~40 identifiable students **with their names printed under their faces**, and this repo is
   **PUBLIC**. **NEEDS DANIEL: rule before it ships.** Mitigating fact: it's a screenshot, only 828px
   wide across ~40 tiles, so the captions may already be illegible — measure, don't assume.
3. **The Forsite clause is unverified.** "Forsite" appears nowhere in the repo; the line is Daniel's
   own words with nothing invented. He said ship it. `TODO(Daniel)` remains at the site.
4. **`Project.discipline` is inert** — authored, test-validated, drawn nowhere since the index went
   flat. Kept because deleting authored content is Daniel's call.
5. **The blue tripwire lost half its coverage** — it asserted things about code that has since been
   deleted.
6. **Bios duplicate project facts with no link to the ledger.** The desk-lamp misattribution happened
   because a 2026-07-15 re-attribution moved LLO to Clay in `projects.ts` and nothing propagated to
   Daniel's bio. **It will happen again on the next re-attribution.** A cheap guard (a test asserting
   no bio claims a project attributed elsewhere) is proposed, not built.
7. **Mobile / Firefox / WebKit unverified.** Reduced-motion is the only mode where the timeline camera
   is deterministic, so the QA harness pins it — meaning **the harness structurally cannot see the
   growth animation.** Use the `MOTION=1` switch and verify by eye.

---

## RESUME POINT — pick up exactly here

**Edward stopped mid-round-9: wiring the five timeline photos into `CrossPathsTimeline.tsx`.**

**There is an UNCOMMITTED, COMPILING edit in the working tree** — `src/pages/about/CrossPathsTimeline.tsx`,
+49/−6. **Do not discard it. It is the resume point.** Last commit is `8171fda`; this sits on top.

`git diff src/pages/about/CrossPathsTimeline.tsx` shows the state of his thinking. What's done:

- **Assets converted and in place** — `public/assets/about/timeline/`, all five as webp:
  `2021-orientation-zoom.webp` (53KB) · `studio-desks.webp` (65KB) · `dac-pinup.webp` (57KB) ·
  `resia-pitch.webp` (67KB) · `2026-graduation.webp` (69KB). **6.7MB → 311KB.**
- **Originals moved out of the repo** to `restless-egg/_photo-originals/timeline/` (untracked, safe).
- **A `T` asset-path constant and a new timeline-photo block** are written, with alt text drafted.

**What remains:** finish wiring the five into their `CLUSTERS` slots (they fill the ones rendering
"IMAGE TO COME"), measure the ratios, verify live, commit, and merge to `main` by the same route as
today (`--no-ff` merge commit, gates green first).

Daniel's placements, verbatim:

| asset | dims | ratio | placement |
|---|---|---|---|
| `2021-orientation-zoom` | 828×527 | 1.571 | **FIRST** — "our school orientation" |
| `studio-desks` | 2048×1365 | 1.500 | early / "one of our beginning placeholders" |
| `dac-pinup` | 2880×2160 | 1.333 | "around our DAC project" |
| `resia-pitch` | 2160×2880 | **0.750 portrait** | "next to Resia" |
| `2026-graduation` | 2160×2880 | **0.750 portrait** | **LAST** — "we just graduated" |

**Read the placement as an arc, because that's what it is:** the page opens on a Zoom grid where
nobody has met yet — forty strangers in boxes — and closes on the two of them graduating. That is
"crossed paths" told in photographs, bracketing the timeline the way *"Bower is new."* and *"The
obsession is real, and it is old."* bracket the copy. **First and last are load-bearing.**

Constraints that still apply:
- Two are portrait. No fixed-aspect boxes, no cover-crop, let the element size itself.
- The Resia photo shows **Clay** presenting; `Resia` is `by: 'clay'`. Caption accordingly; do not let
  it imply Daniel.
- **Keep the Zoom asset trivially swappable** pending Daniel's ruling (open item #2). Do not sink
  curation effort into it until he rules.

**Also unfinished:** some of the six `public/hero/v4/` Eden images are placed — the becoming sequence
landed in `ce8bdd7`. Check `SplashPage.tsx` for which remain and where.

---

## The other thread — untouched

**The Eden geometry engine was never started.** Daniel opened the day with it:

> *"Both the designing with and the actual output (right now the geometry is really sloppy and it is
> painfully obvious)."*

A worktree and a full brief are ready and unused:
- **Worktree:** `C:\Users\danie\restless-egg\engine-session`, branch `engine-geometry` (off `main`).
- **Prompt:** `engine-session\SESSION-PROMPT.md` — paste it as the first message of a session started
  in that directory. Run `npm install` first, and `npm run dev -- --port 5344` (**not 5333**).
- **It says: look before you theorize.** Screenshot the render, ask Daniel to mark up what reads as
  sloppy, don't reason about geometry quality from source alone.
- **Prior art:** `origin/manufacturable-component-model` (archived as a tag) is a paused 10-commit arc
  on joints, node graphs and a BOM system. Skim before re-solving.

**Daniel wanted to record the Eden demo walkthrough on the morning of 2026-07-17.** That video shows
the engine. The engine is untouched. **That's a live scheduling decision, not a technical one.**

---

## Process notes (for whoever runs the agents next)

- **Three Edwards died mid-task today** — one mid-refactor leaving a non-compiling tree, one on a rate
  limit, one silently. **Every death cost a full re-brief, and one lost an instruction entirely**
  (Daniel's setup line was decided, then evaporated between agents, and he noticed before we did).
  Commit each coherent chunk; never leave the tree broken; write decisions down rather than carrying
  them in context.
- **Do not mutate the working tree while an agent is live in it.** A `git checkout main` landed **four
  seconds** after Edward's commit while he had work in flight. He was mid-QA so nothing was lost. Pause
  the agent, get explicit confirmation it's parked, *then* touch the tree.
- **Daniel watches the page hot-reload while agents work.** A half-applied refactor in his browser
  reads as a broken page and costs a round trip. This happened.
