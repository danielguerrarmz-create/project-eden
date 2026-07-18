# 2026-07-17 — Round 4 brief: lighter watercolor, sky background, finish fast

**START HERE if you are the next session.** This is Daniel's feedback on round 3 seen live,
plus the exact repo state and everything still in flight. Round 3's own brief is
`2026-07-17-round-3-brief.md`; its spec is `docs/design/2026-07-17-round-3-spec.md`; the NPR
research is `docs/research/2026-07-17-npr-watercolor.md`. All three are committed.

## Daniel's round-4 feedback (2026-07-17, verbatim in intent)

1. **The sketch/watercolor style is progressively better** — direction confirmed, keep it.
2. **Outlines are way too thick.** The heavy ink contours kill the light watercolor feel.
   Make the outlines smaller/thinner and slightly more legible, and shift the visual work
   onto **texture and color** instead of line weight. (The ink constants are in
   `src/scene/npr/inkShader.ts` — EDGE_LO/HI thresholds and the Sobel edge weight are
   eyeball constants that were never live-tuned; this is exactly the tuning pass they were
   waiting for.)
3. **Background: think Enscape.** Today the sky is flat paper. Daniel wants what Enscape
   does by default — likely **a beautiful blue sky, the default Enscape sky**. This
   partially answers Sai's open question 1 (warm umber vs Enscape cool blue): at minimum
   the BACKGROUND goes sky-blue; whether the shadow tint also goes cool is still his call
   (`WASH_SHADOW_COOL` sits ready at `inkShader.ts:34`). NOTE: the house "no decorative
   blue marks" rule is about UI marks, not about rendering a sky; a watercolor sky is
   content, not decoration.
4. **Deadline: finish ASAP, under an hour of work.** Cut accordingly: outlines + sky are
   the round; everything else only if it fits.

## Where things stand

- **Worktree** `C:\Users\danie\restless-egg\engine-session`, branch **`engine-draw`**,
  tip at pause: `9f150ac` plus possibly one fix-1 commit (see below). **Nothing pushed**
  (deliberate: repo is PUBLIC, Daniel decides when origin gets it).
- **History:** `201772d` (round-3 brief) → `682d92c` Part A watercolour pass → `825f171`
  Part D joinery conceal + curved rings → `f384a3c` Parts B+C species rail + engine growth
  → `9f150ac` Parts E+F figure dimension + onboarding.
- **Gates at 9f150ac:** `npx tsc --noEmit` 0 · `npx vitest run` 612/612 · `npm run build`
  clean · three chunk **1066.35 kB** against the 1100 kB hard ceiling (33.65 kB headroom;
  the whole composer/InkPass chain cost only ~8 kB).
- **In flight at pause:** Edward's fix-round work (fixes 1 through 5, partial, across ten
  files including a new `plantPlacement.ts` + test) was PAUSED mid-flight and preserved as
  **`stash@{0}`** ("round-4 fix round in flight"), leaving the tip green. It is unverified
  and possibly red: `git stash pop`, run the gates, and either finish it or
  `git checkout -- . && git clean -fd src/pages/draw` it away; do not assume it works.
- **Safety branch `backup-all-six-parts`** (`f3b9d48`) duplicates the six-part build from
  before a history rewrite mixup; tree-identical to `9f150ac`. Delete once Daniel signs off
  on round 4. A leftover review worktree from Lain may exist under
  `C:\Users\danie\restless-egg\app\.claude\worktrees\agent-a751505514c1e9480` (read-only,
  unchanged, safe to remove with `git worktree remove`).

## Round-3 QA findings still OPEN (fold into round 4 where the hour allows)

Priority order from the live Chrome pass:

1. **Petal/bloom color does not read** (fix 1, possibly landed — verify live). Wisteria
   grows correct pendant raceme forms but renders timber-tan with only stray purple facets;
   clematis shows bare tan pegs, no pink. Ivy's dark green DOES survive the wash, so color
   can carry. This is the heart of Daniel's "botanically recognizable per species" ask.
2. **Floating foliage:** growth clusters hang detached in mid-air (worst on ivy and
   wisteria). Placement should hug members; kill or snap stray cells.
3. **Dimension callout illegible:** the 1.78 m label beside the scale figure is unreadable
   at demo framing (and the string appears 4x nested in the DOM; dedupe).
4. **Studio overlays:** `#/studio` still mounts StrutHeatmap + old GrowthOverlay blobs by
   default; under the wash they read as muddy berries. Team-lead ruling: default both OFF
   in the studio (flagged to Daniel here, not yet applied).
5. **A11y nit:** the seven species-rail cards are unnamed buttons; add aria-labels.
6. **Guidance-rail contrast:** pre-bake, its text can sit on the sketched horizon line.

Also unmeasured: **explode/bake framerate under the InkPass double render** (Kuwahara is
~64 taps/px and the scene renders twice per frame). It could not be measured because the
Chrome window was hidden, which stalls rAF — QA GOTCHA for next time: animation timing and
FPS are only measurable with the window visibly foregrounded; stills via CDP are fine.
Verify 60fps at filming size before calling it done, and if it drops, the documented
fallback ladder is in `inkShader.ts` (shrink Kuwahara radius, then drop the wash stage).

## Open questions for Daniel (carried + new)

- Shadow tint: warm umber (current default) vs Enscape cool blue — partially answered by
  the sky ruling above; the one-line switch is `inkShader.ts:34`.
- Joinery concealment subtlety: collars currently sleeve EVERY node; bulk vs honesty at
  tight zoom is a taste call (see Lain's risk 6).
- Scale-figure options ordering (Sai's Part E alternatives) and the green explode-readout
  line ("ground up · 4 rings · crown last") register check.
- Price anchor: draws at/below ~14 m² read a flat £150,000 (unchanged from round 2).

## Constraints that do not move

- Gates stay green; three chunk under **1100 kB**.
- NO em/en dashes as punctuation in user-facing copy; no decorative blue UI marks (a sky
  is fine, see above). Panel register: serif figures, lowercase mono labels, vellum.
- `src/engine/*` solver logic untouched (additive plumbing fine).
- Repo is PUBLIC; candid strategy talk stays out of commits and docs here.
- Commit locally in the repo voice; **do not push without Daniel's say-so.**
- Explode/bake stays smooth; hardware/fastener path stays switchable
  (`Folly.tsx` `hardwareVisible`, default false everywhere per Daniel's joinery ruling).

## Fleet routing that worked (keep the shape)

Senku researched (NPR doc) → Sai specced → Edward built all six parts → Lain ran the
independent adversarial review in an isolated worktree (verdict: green, spec-faithful,
zero engine/* edits, hardware preserved) → team lead live-QA'd in Chrome via stills.
Round 4 is small enough for Sai-tune-constants → Edward-apply → live check, or Edward
directly with Daniel eyeballing; the hour budget says skip ceremony, keep gates.

## Dev habits

- Server: `npx vite --port 5199 --strictPort` (port may already be serving from a prior
  session; a 200 on `http://localhost:5199/` means reuse it).
- Demo arc: `#/draw` → drag two crossing lines → bake it → species rail right side →
  YR 0/1/3 → explode/reassemble. Studio at `#/studio`.
