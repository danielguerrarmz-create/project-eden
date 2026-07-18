# 2026-07-17 — The guidance rail, and the tool is called sculpt

Built to Sai's SPEC 1 (`docs/design/2026-07-17-guidance-and-skin-spec.md`), plus Daniel's
naming ruling. SPEC 2 (the skin) shipped separately in `25944b6`.

**Branch `engine-draw`**, on top of the lead's `f154f17`. **Nothing pushed.**

Gates: **`npx tsc --noEmit` = 0 · `npx vitest run` 521/521 · `npm run build` clean.**
Bundle: `three` **1058.37 kB, unchanged.** App chunk 374.8 → 374.9 kB.

## What shipped

1. **The guidance rail.** The single orbit hint moved from bottom-center to the left edge,
   vertically centered, and gained a second line ("scroll to zoom"). A relocation and an
   extension of the existing mechanism at `DrawPage.tsx:208-216` — not a new component, not a
   tutorial overlay.
2. **The sculpt hint now names both directions**: *"drag up to raise it, down to lower it"*.
   Sai is right that this is the highest-leverage line in the spec, and it is one string.
3. **The rail dismisses when obeyed**, wired to `OrbitControls`' existing `onStart`.
4. **The re-arm bug is fixed** — see below, it was a live film-day bug.
5. **The tool is called `sculpt`.** Label and hint only; the id stays `pushpull`.

## The hint was the bug, not the UI

The rail's two lines are things you can survive not knowing: you can still make something
without being told how to orbit. **Not knowing the tool goes both ways deletes half of what the
product can do.** And the hint is not a toast that can be missed — it is displayed
*continuously* while the tool is selected, so "press on it and pull up" was actively telling
every user, at all times, that the down direction did not exist. Fixing words in place beats
teaching once and hoping it is remembered.

## Sai's re-arm catch was a real film-day bug, and tonight is film night

`hintShown` latched true and nothing ever cleared it — not even "start over". So the guidance
appeared on the FIRST take of a session and never again; **a second take shot without a page
reload silently lost all of it.** Daniel takes more than one take. Folded into the existing
start-over effect, which is where it belongs: that effect exists precisely so the next take
opens where the last one did, and "reproducible" has to include the second take. Same reason
the hint is deliberately not persisted to localStorage.

## Judgement calls

- **`onStart`, not `onChange`, and Sai flagged why.** `onStart` fires only on genuine
  pointer/wheel input; `onChange` also fires on the programmatic camera moves the framing
  effects make, which would dismiss the rail before anyone read it. Taken as specced, not
  substituted. This is `fromDrawing.ts:205-207`'s rule ("an engine that only talks when it
  overrules you reads as a validator") applied to chrome: guidance answers to being FOLLOWED,
  not only to a clock, so a confident take clears the frame the instant the viewer acts.
- **Dropped Sai's `delay-500` on the second rail line.** It is inert: the opacity transition is
  on the PARENT, so a delay utility on a child with no transition of its own does nothing. An
  inert class is worse than no class, because the next reader believes the stagger works. If
  the stagger is wanted, each line needs its own `transition-opacity` — which also staggers the
  fade-OUT, and that is a design call, not a fix. Flagged rather than invented.
- **Extracted `TOOLS` (and the rail's lines) into `src/pages/draw/toolCopy.ts` + test.** This is
  the one thing beyond the spec. The precedent is today's `priceCopy.ts`: copy inside a
  component that imports R3F is copy the DOM-free suite cannot pin, and **this is the exact
  string that was silently wrong for months.** `Tool` is imported as a TYPE only, so it erases
  at runtime and the module stays pure. 10 tests, including one that fails if anyone tightens
  the hint back to a single direction — which is the drift that caused this, because "pull up"
  genuinely does read cleaner. It also reads false.
- **`max-w-[24ch]` not Sai's `22ch`.** Same reasoning as the comment already in this file: `ch`
  under-measures tracked uppercase text, and the longer line ("right-drag, or hold space, to
  turn it") is the one that wraps badly. Unverified visually — see below.

## The label/id mismatch is deliberate

`label: 'sculpt'` over `id: 'pushpull'`. Daniel's ruling, and per the lead the engine is NOT
renamed again: `Edit.kind: 'pushpull'` stays as shipped in `57b79c1`. It costs nothing —
`Edit.kind` is not serialized (verified before the first rename), so nothing outside this repo
has an opinion — and a second engine-wide rename on deadline day is churn with real regression
risk. Pinned by a test so nobody "fixes" the mismatch later.

Rationale worth keeping: push/pull is Rhino's and SketchUp's vocabulary, and escaping that room
is the whole thesis. Sculpt is the material's own word, and `DrawPage`'s header already used it.

## Verify

- **521/521**, +10. `toolCopy.test.ts` pins: the hint names both directions, never reverts to
  "press on it and pull up", the label is sculpt, the id stays pushpull, the rail is exactly two
  lines, both turn paths are named, and no em/en dashes anywhere in on-camera strings.
- **NOT verified live.** No browser tooling in this context. This is pure layout + copy, so the
  logic is pinned, but **the rail's POSITION is unverified**: whether `left-4 top-1/2` reads
  cleanly at 1440x900, whether either line wraps, and whether it collides with anything. Reasoned:
  the nudge panel is `left-4 top-4` and post-bake (the rail is `!baked`, so they never coexist),
  and the price panel is `bottom-4 left-4`, well clear of a vertically-centered block.
  **Daniel is eyeballing the handles anyway — this is in the same frame, so it costs one glance.**
- **`25944b6`'s skin ink is also unverified live and is the bigger risk.** A shader either
  compiles or the canopy vanishes. The same glance covers it: if `#/draw` renders a canopy at
  all, the shader compiled.

## Left

- **`slice(0, 3)`**: untouched, per spec. Separate audit-trail gap, owned by redlining.
- **`MIN_POLAR`** still 30°. Sai's follow-on is to relax it from a photographed measurement
  after the skin ships — explicitly not a guess. Now unblocked, needs someone who can photograph.
- **`docs/design/2026-07-17-guidance-and-skin-spec.md` and `-visual-impact-spec.md` are
  untracked** and now referenced by three committed handoffs, so those references dangle for
  anyone who clones. Neither is candid (they are design specs, no pricing material). Not staged:
  not mine to decide, and the ignore scheme just got tightened for good reason.
- Confirmed the `bower-docs` mirror of the redlining doc DOES carry my `kind: 'pushpull'`
  correction, so the private copy does not describe a dead type.

## Files

- `src/pages/draw/toolCopy.ts` + `.test.ts` — **NEW.** Toolbar + rail copy, 10 tests.
- `src/pages/DrawPage.tsx` — rail JSX (left edge, two lines), `onStart` dismiss, start-over
  re-arm, `TOOLS` moved out.
