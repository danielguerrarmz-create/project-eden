# Round 11 — the About page, 2026-07-17 (INTERRUPTED)

Branch `about-round-10` (round 11 never got its own branch). **Nothing committed. HEAD is still
`5a5bd37`.** Edward hit a session limit mid-item-5 and died; this handoff was written by the
orchestrator from the working tree, not by the author, so it reports what the FILES show, not what
Edward intended. Where Edward's intent is unknown it says so.

Round 11's brief was six items from Daniel, plus two more raised mid-round from marked-up
screenshots (items 7 and 8). Daniel invoked `/remote-control continue` after Edward died.

## What — the honest state, verified in the tree

| item | state | verified how |
|---|---|---|
| 1 — graduation photo to the LEFT, by 2026 | **DONE** | `clusters.ts:496` "IT SITS LEFT (…round 11 item 1)"; `graduation` node + 2026-plate geometry in `CrossPathsTimeline.tsx`. |
| 3+4 — the ACM DIS lie | **DONE, and done right** | live `venue: 'CAADRIA 2026 · accepted'`; description + both bios corrected; real paper title added; all 6 remaining "ACM DIS" strings are recorded corrections NAMING the lie, per repo culture. No live claim survives. |
| 6 — awards | **DONE, all four to spec** | Plentify `'Fall 2023 Design Excellence Nominee'`; Dougherty `'Spring 2024 Design Excellence Nominee'`; Hydraulic `'Fall 2024…'` left ALONE (Daniel confirmed); Origami `'President's Award for Global Learning, The University of Texas at Austin'`. |
| QA hardening (not a Daniel item) | **DONE** | 14 harnesses now default their port through new `qa/base.mjs`; `capture-seeds.mjs` promoted from a scratch probe. See "the port trap" below. |
| 2 — scroll cue | **NOT STARTED. Spec resolved to (B).** | no cue code in the tree. |
| 5 — intro stagger | **DIAGNOSED, fix identified, NOT BUILT.** | `spaceColonization.ts` untouched in the diff. |
| 7 — parenthesis does not connect | **NOT STARTED.** | `parenthesis.ts` not in the diff. |
| 8 — scale the mark ~1.4x | **NOT STARTED.** | `MARK_K` unchanged from HEAD. |

**So three of Daniel's six shipped (1, 3+4, 6) plus the QA/port work. Items 2, 5, 7, 8 remain.**
The +87 lines in `CrossPathsTimeline.tsx` are item 1's graduation-plate geometry and the DIS
correction commentary, NOT item 7 or 8 — do not mistake them for started work.

## Why it stopped here

Edward worked the three content items and the QA harness port fix to green, then began item 5 and
ran out of session before writing a line of the fix or committing anything. **The single biggest
risk right now is that all of round 11 is uncommitted.** It is backed up as a patch (see Files) but
it is not in git history. A resumed Edward (session resets 11:50am America/Chicago) or a fresh
session should commit the verified slice FIRST, then continue.

## The four open items, fully specified so resume needs no re-derivation

**Item 5 — intro stagger. The cause is NOT the intro text (it is 1.6%). Do not "optimize the
text".** Two independent profiling passes agree: `colonize()` in `src/pages/about/spaceColonization.ts`
runs synchronously during React render via `useMemo(() => subBranchPolylines(), [])` at
`CrossPathsTimeline.tsx:1407`; `dist` alone is ~50% of the main thread and the biggest blocking task
is ~2.2s at 1x on Daniel's machine, starting ~300ms after nav. The texts teleport because the main
thread is frozen — they are the victim. **Fix: precompute `subBranchPolylines()` at build time to
JSON.** It takes no args, `SUB_SEED = 'bower/spine-2'` is hardcoded, and it makes ZERO DOM/window
reads, so it is byte-identical every load and the precompute CANNOT change a pixel (which also
honours "a seed is a design review, not a constant"). Control that proves the diagnosis: disabling
the intro entirely leaves the stagger fully intact.

**Item 2 — scroll cue. Resolved to (B): the ABOUT page's finale mark.** Discard the clause "only if
the user has not already scrolled" (it was the orchestrator's wording, not Daniel's, and it is
incoherent at `PIN_FRAC` = 720/1080). Build: after the finale mark winds fully shut, IF the user
stops, show a sepia cue (no bounce, respect reduced-motion, do not interrupt the finale); fade it on
their next scroll. Rationale: the finale reads as an ending but ~1/3 of the page is still below it.
Gate on the mark being fully wound (true only AT `p = PIN_FRAC`; wait for the THING not a clock;
stillness alone cannot tell "not started" from "finished"). Interacts with item 8 — time it against
the mark's real assembly AFTER the scale lands.

**Item 7 — the founders' parenthesis DOES NOT CONNECT (Daniel, red-pen on a live screenshot).** He
marked three spots: the left and right arm termini (do not reach the garlands) and the centre (where
the two arms should MEET and do not). His standing law: "the stems at the top must connect with the
stem that's unraveling from the bower logo." **The instrument is the trap here:**
`qa/founder-parenthesis.mjs` quotes that exact rule but pins the TRUNK SEAM (descent→trunk), never
the arms' termini and never the centre meeting — so its green has stood in for Daniel's eye on a join
it does not look at (the `heroCrop` pattern). Resume: MEASURE the three gaps in the rendered page at
Daniel's wide viewport (~1920, NOT the harness's 1440) first; fix the join not the number
(`parenthesis.ts` is placed by eye, shape is a judgement call but the CONNECTION is a fact); extend
the harness to pin the arm joins as a SEPARATE concern from the trunk seam, named so it says which
join it measures. Beware: authored anchors handed straight to `garland.ts` become visible kinks
(`sampleCatmullRom` is the fix); do not close a gap by adding a kink.

**Item 8 — scale the Bower mark ~1.4x, centre UNCHANGED.** Daniel's red target circle measured
concentric with the mark (centre 3px off in x, 0 in y): "scale it, do not move it", from his own
hand. 489×471 circle vs 360×327 mark ≈ 1.40 → the approved 241px becomes ~335px. **~1.4x is derived
from a hand-drawn circle; land it by eye in the 1.36–1.44 band, do NOT enshrine 335.0 as a law.**
Rulings: wordmark STAYS BELOW, stays lowercase mono "bower" (he rejected the horizontal serif lockup
from the brand board); `MARK_CENTER_X = CX` STAYS (mark on the axis; moving it would force
re-derivation of the finale's wind). Cheap now ONLY because round 10 decoupled `MARK_K` (scale) from
`SPINE_W` (stroke). **The stroke must NOT scale with the mark** — the join must not step in width,
the one real invariant here, and round 10's log warns coverage on it is thin (changing `SPINE_W` 3.4x
broke no test). Check the enlarged mark still clears the frame at 1440×900 AND a short viewport (item
1b: the frame is both camera window and ink clip; do NOT fix a clip by resizing the frame). Item 3's
organs sit on `MARK_RING_R` and will scale — check they still read as grown, not as a sparse
necklace. `qa/hero-lockup.mjs` is KNOWN RED and its `want ~3806.1` is stale; this change moves it
legitimately — fix it to read `[data-timeline-viewport]`, re-derive its constant honestly, do NOT
tune the tolerance to pass.

## Left — decisions and hazards for whoever resumes

- **COMMIT THE VERIFIED SLICE FIRST, selectively.** Ours: `src/pages/AboutPage.tsx`,
  `src/pages/about/{CrossPathsTimeline.tsx,CrossPathsTimeline.test.ts,bios-vs-ledger.test.ts,clusters.ts,projects.ts}`,
  all of `qa/` (14 modified + new `qa/base.mjs`, `qa/capture-seeds.mjs`). Run the full gates first
  (typecheck both programs, build, `npm run test` ×3–5 for the procedural asserts, gitleaks) — this
  handoff did NOT run them; "verified" above means the CONTENT is correct, not that the suite is
  green.
- **DO NOT `git add` the contamination.** Pre-existing splash/seeds WIP from another agent, on this
  same dirty tree: `src/Root.tsx`, `src/pages/splash/HeroScene.tsx`, `src/routing.ts`,
  `src/scene/util.ts`, `src/pages/seeds/`, and untracked `docs/handoffs/2026-07-16-repo-cleanup-proposal.md`,
  `docs/prompts/eden-typology-composition-prompts.md`. Adding them corrupts that branch's history.
- **`restless-egg` IS THREE SEPARATE GIT REPOS, not one** (`app`, `engine-session` worktree on
  branch `engine-draw`, and a third). Any instruction to "grep the whole repo" that assumes one repo
  will under-grep — that is how the DIS lie survived in four places outside `app/`.
- **engine-draw carries the DIS lie and Daniel ruled LEAVE IT, FLAG IT LOUDLY.** The flag must land
  somewhere an `engine-draw` merger will actually SEE (its own repo/docs, not `app/CLAUDE.md` — a
  different repo they never read). Name it as a LIE, not a stale fact, so the merger cannot mistake it
  for something that just needs refreshing. Do NOT edit that branch's source. Edward reported he
  handled the other three DIS sites and left only engine-draw open — verify against his final report
  if recoverable.
- **The port trap, now fixed but worth keeping:** `vite.config.ts` pins port 5333 with
  `strictPort: true`, and the `engine-session` worktree holds 5333, so this app's `npm run dev`
  cannot take its own canonical port and comes up on 5173. Every harness that defaulted to 5333 was
  profiling `engine-draw`. `qa/base.mjs` now routes the port; keep new harnesses going through it.
- **CLAUDE.md correction still owed:** it says "the 14s autoplay"; it is `AUTOPLAY_MS = 24000` with a
  2500ms lead-in. Not yet fixed in the tree.
- **Do not trust green here.** Round 10's log is six examples of green checks meaning nothing; any
  threshold taken from one observed run is a latent flake even while green; procedural asserts need
  3–5 runs before a number means anything.

## Files

- Backup of ALL uncommitted tracked changes (reappliable patch) +the two new qa files:
  `…/scratchpad/round11-backup/` (`round11-tracked-changes.patch`, `base.mjs`, `capture-seeds.mjs`).
- Changed (ours): `src/pages/AboutPage.tsx` (+5), `src/pages/about/CrossPathsTimeline.tsx` (+87, item
  1 geometry + correction notes), `CrossPathsTimeline.test.ts` (+85, new), `bios-vs-ledger.test.ts`
  (+83, new), `clusters.ts` (+31, item 1), `projects.ts` (+81, items 3+4+6), `qa/*` (port routing).
- Untouched, so NOT started: `spaceColonization.ts` (item 5), `parenthesis.ts` (item 7); `MARK_K`
  unchanged (item 8).
