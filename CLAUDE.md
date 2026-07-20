# Bower (project-eden) — working notes

Loaded automatically at the start of every session in this repo. Keep it short.

## Where the work is — read this first

**Current: mobile Phase 1 shipped LIVE on `main` (2026-07-20). Handoff:
`docs/handoffs/2026-07-20-mobile-phase1.md`.** Below `lg` the About timeline is now a DOM tree
(`src/pages/about/MobileTimeline.tsx`); responsive `srcset` is live across About/Splash/Engine.
Open D3 (rail vs center spine) and Phase 2 (WP4–6) are in that handoff. **Base new work on
`origin/main`** — the old `about-round-10` branch is 52 commits behind and carries an unrelated
`/lab/seeds` dev-rig WIP.

Prior desktop-About work: round 11, `docs/handoffs/2026-07-17-round-11.md` (the timeline/founders
laws below still hold).

Round 11 shipped items 1, 3+4, 6 (content), then 5 (intro stagger: colonization precomputed to
`subBranches.generated.json`, byte-identical), 8 (the Bower mark enlarged ~1.4x, stroke unchanged),
2 (a scroll cue on the finale pin), and 7 (the founders' parenthesis is now a CLOSED BOWER — the two
arms meet at the content centre; `parenthesis.ts` no longer describes the old open form). **The
former "known red" `qa/hero-lockup.mjs` is fixed** — it reads `[data-timeline-viewport]` now, re-derives
its camY honestly, and adds a mark-stroke invariant.

**Still open / needs Daniel:** the bower's BASE curve carries no foliage (reads as a clean binding —
offered to lush it, his call); the spine garland's 900ms mount timer (check it is even live before
spending — `SpineGarland` returns null when `!url`). **Keep this section a POINTER; the round log is
the record.**

*An 81-line round-2/round-3 task list stood here and was cut on 2026-07-17: it described a dead branch
(`about-hybrid-sepia`, "seven commits", "132 vitest"), a finale that no longer exists (the woven
bower; it is an unravel into the mark now), bios that have since been rewritten, and TODOs that were
resolved rounds ago (Rogers' dates among them). A stale map at the top of the file every session reads
first is worse than no map. Recover: `git show <this commit>^ -- CLAUDE.md`. Keep this section a
POINTER; the round log is the record.*

## Things worth knowing

- **This repo is PUBLIC.** Candid internal material (audits, stress tests, accelerator drafts,
  reviews of Clay's work) belongs in the private `bower-docs` repo. See `.gitignore`.
- **The About page is one colour: SEPIA.** `INK_SEPIA` (`#8A6A4A`) in `CrossPathsTimeline.tsx`,
  with `INK_SEPIA_TEXT` (`#6F5439`) for small text — the same colour at reading weight, because
  `INK_SEPIA` does not clear AA on the selected list row's own 8% tint. Amended 2026-07-16: the
  page was `INK_BLUE` (`#3E7CA8`), which appears nowhere in the splash hero (warm gold Austin
  light, timber, green foliage, wisteria purple). **Nothing blue survives on About.**
  - **PIGMENT is permitted on EVERY PAINTED BOTANICAL** — the founder specimens, the spine garland's
    organs, the sub-branches' organs, the founders' arms and the coda garlands (the gongbi genome's
    own palette). **RULED 2026-07-16**: this was "the botanical specimens only", and whether a
    painted *vine* counted was flagged rather than widened quietly. Daniel extended it. If the
    gongbi brush painted it, it may be in pigment.
    - **STRUCTURE IS ALWAYS SEPIA** — the spine, the sub-branch stems, the founders' arms' stems,
      the mark, rules, labels. That half is unchanged and is what the law is actually for. The line
      is: *the composer's brush may have colour; the page's own pen may not.*
    - The discipline frontispieces were deleted in round 2.
  - The old Clay-blue / Daniel-green / shared-olive split was removed on 2026-07-13 — **do not
    reintroduce colour-coding by person.** That prohibition stands unchanged.
- **A seed is a design review, not a constant.** Every commission in `about/paintings.ts` and the
  spine garland's `GARLAND_SEED` was curated by sweeping takes and comparing them, because
  `passesGate` (`engine/gongbi/quality.ts`) is a FLOOR, not a parity check: two seeds can both
  "pass" and still hang as a full plant next to a weed. Curate in `#/lab/gongbi` before pinning.
- **A year label must fit its gutter.** `YEAR_LABEL_OFFSET + YEAR_LABEL_W <= OFFSET_X` in
  `CrossPathsTimeline.tsx` (there is a test). When it didn't, every year with a plate on the
  label's side put the numerals on the photograph and the label's vellum halo cut the branch
  underneath in half. No choice of side can save a label wider than the space it lives in.
- **STOP FORCING GEOMETRY ONTO SOMETHING THAT ALREADY KNOWS ITS OWN SHAPE.** This is the page's
  most repeated bug and the answer has been the same every time: give the thing its own shape back.
  It has now shipped five ways — the hero in a 505x557 portrait box (Daniel: "natively landscape but
  displayed in portrait mode"); `unfurl()` opening every plate from `scale(0.92, 0.64)`; a founder
  vine upscaled 1.8x by `object-cover`; every project hero on `fit: 'cover'` in a region of the
  wrong ratio, silently cropping (Plentify lost **21% of its width** off the sides, and a cropped
  photo still looks like a photo, so nobody notices); and a trunk with a hardcoded stroke that
  matched the spine's position exactly and still stepped 46% in width at the join.
  - The fix is never a better number. `fill` hands a picture a box and resolves the disagreement
    with object-fit (cover crops, contain letterboxes); `FIT_FRAME` lets the replaced element size
    itself from its intrinsic ratio under max-width/max-height, so the element IS the picture and
    object-fit has nothing left to resolve.
  - **THIS LINE USED TO SAY "Measured: hero crop 0% across all twelve" AND IT WAS FALSE FOR ROUNDS.**
    It was true about object-fit, which is genuinely 0, and the word it used was "crop". Round 10
    measured the other way the page can hide a picture and found **all TWELVE heroes clipped at
    1440x760, worst 47.7% of Synthetic Vision; three at 900, worst 22.3% of Origami.** Not by
    object-fit. By the button's own `overflow-hidden`: `FIT_FRAME`'s `max-h-full` resolves against the
    button, `items-start` left the button's height `auto`, and **a percentage max-height against an
    indefinite containing block computes to `none`** — so the constraint silently evaporated and the
    image took its full natural height behind a clip. Fixed by stretching the button (`items-stretch`
    on `[data-project-hero]`); verified 0 clipped and 0 ratio deviation at both heights.
  - **AND THE PROBE AGREED WITH THE COMMENT, WHICH IS WHY IT SURVIVED.** `qa/project-media.mjs`
    computes crop from `|rect.width/rect.height − naturalRatio|`, and **a clipped `<img>` keeps its
    natural ratio in `getBoundingClientRect()`** — the element reports the size it wants to be and
    the clip happens on an ancestor's paint. So the instrument was not broken; it was answering a
    different question and its answer was quoted for the question nobody asked. Overflow clipping is
    only visible by comparing the IMAGE's rect to the **button's** rect: `qa/hero-clip.mjs`.
  - The clip depends on the REGION's ratio, which rises as the window shortens, which is why Daniel
    saw this and a 1440x900 harness never did. **Check a short viewport.**
  - **`project-media.mjs` NO LONGER SAYS "crop" (round 10), because that word was the bug.** It is now
    `heroRatioPct` (object-fit: the element's own rect vs natural) and `heroClipPct` (overflow: the
    IMAGE's rect vs the **BUTTON's**). Two mechanisms; **neither implies the other**; name the question
    in the variable or the next person quotes one answer for the other question. It takes a viewport
    height and width now.
  - **AND THE BANNED PATTERN WAS STILL LIVE ON MOBILE THE WHOLE TIME — reported THREE times, measured
    zero times, fixed round 10.** `Gallery` passed its hero neither `fit` nor `fill`, so it hit
    ProjectImg's default `object-cover` inside a hardcoded `aspect-[3/2]`. **Measured at 390x844:
    ELEVEN of twelve heroes cropped, worst 28.4% (Patterns), Robotic Factory 22.6%, Flowerfield 21.4%
    — MORE than the 21% Plentify loss that banned `cover` in the first place.** It survived because
    every instrument on this page runs at 1440, where that tree is `lg:hidden` and its rects are
    meaningless. **It was not hidden by subtlety. It was hidden by a viewport nobody measured.**
    `qa/mobile-hero.mjs` now guards it and takes a width.
  - **A HERO MAY CROP ONLY IF IT NAMES ITSELF: `ProjectImage.fillHero`, and exactly ONE asset has it**
    (Robots' KUKA loop, 20.1% of width, licensed by Daniel twice, explicitly, to hold the uniform
    region). **It is a LICENCE, NOT A PRECEDENT** — the number is a whisker off the banned 21%, so the
    only thing separating them is that it stays on one asset. `projects.test.ts` pins it BY SRC (a
    moved licence keeps the count at 1 — the count alone will not catch it), and
    `data-licensed-crop` lets the probes allow it there and nowhere else. **A second one is Daniel's
    decision, not yours.**
  - Before sizing any image region, check the aspect against the real asset — the ratios are
    authored in `projects.ts`, and `qa/` has probes.
- **THE DIVIDER IS PINNED BY GEOMETRY, NOT BY A NUMBER (round 10, item 7).** The band is `shrink-0`
  and the media region is the REMAINDER (`flex-1`), so `dividerY = detail.bottom − band.height` and
  **no hero change can move it** — chasing it by cropping heroes is the fake fix. Every project's band
  renders into ONE grid cell with the inactive ones `invisible` (NOT `display:none`, which collapses
  the cell and pins nothing; NOT `min-h-[302px]`, because 302.1 was a measurement at ONE viewport and
  re-wraps at any other width). Daniel ruled **pin at the longest, lose no text**, and accepted that
  Archipedia's line rises ~74px from where he called it correct. **Clamping the band is FORBIDDEN** —
  tried and reverted once; it hid 61px of awards behind an undiscoverable scrollbar. Guard:
  `qa/divider.mjs` (takes a height AND a width; verified 0.00px spread at 1280/1440/1680/1920).
- **`Project` HAS NO STABLE KEY.** `n` is display order and renumbers on merge; `title` is display
  copy and has been rewritten twice. Round 10 wrote a bio guard keyed on **`p.id`, a field that does
  not exist** — every lookup returned undefined and it passed green while checking nothing, inside the
  file written to catch exactly that. **Match on `src`**, or author a real `id`. See the note above
  `interface Project`.
- **RESOLVED (2026-07-17), kept for the lesson: Origami's rail was EIGHT sheets at 53px.** Daniel cut
  it to four (120px, clears `MIN_CELL` 60 by 2x). **They were not cut because they did not fit** — a
  twelve-step instruction manual (cut lines, tab dimensions, A/B/C/D panels) was never legible in a
  supporting rail at ANY width. "It did not fit" is a reason that expires the moment the rail gets
  wider; "a rail was the wrong place for it" does not. **When a constraint forces a content cut, ask
  whether the content was ever right, and say THAT.** `MIN_CELL` stays 60; widening a guard to make it
  pass is tuning the instrument to fit the result.
- **WAIT FOR THE THING, NOT THE CLOCK.** Two agents hit this the same night in different files without
  seeing each other: `qa/growth-timing.mjs` slept 450ms after seeking and measured a camera that had
  not arrived (`camY` 148, 148, 148, 965, 3702, 4439 — stuck for three stops; at 1800ms it tracks),
  and `qa/divider.mjs` measured Archipedia before the page settled, false-positive one run in three.
  **It had a guard and the guard passed**: it asked whether the SCROLL landed, and `scrollY` lands
  instantly — the question is whether the CAMERA arrived. **Guard the quantity the measurement depends
  on, not the one you set.** It also got newly wrong with no edit, because the page got heavier (438
  ornament runs, was 195), so a fixed sleep is a bug waiting for the page to slow down.
  - **Polling for STILLNESS cannot tell "not started" from "finished"** — it reported "settled at 0"
    twice. **Wait for MOVEMENT first, then stillness**, and discard as a HARNESS failure if it never
    moves. This sentence was already in the round-7 doc and was read the same session and walked into
    anyway: **reading the warning does not inoculate you.**
  - **AND WAITING FOR *A* THING IS NOT WAITING FOR *THE* THING. This page has several clocks.** I
    reported "the sub-branch twigs render bare" twice, put it in a commit message and filed it — and
    it was FALSE. My probe waited for the CAMERA correctly (movement, then stillness, tight
    threshold); the camera settles in ~2s. **The sub-branch garland is a painted bitmap that arrives
    at ~7.7s**, and every screenshot was taken at 3.5s. **There are TWO garlands on different clocks**
    (the spine's narrow strip lands early; the sub-branches' 1200-wide strip lands late), so a
    half-loaded page showed organs on the spine and none on the twigs — **a coherent, plausible, wrong
    picture that does not look broken, it looks like a design decision.** Wait for the SPECIFIC
    1200-wide `<image>`, never for "some image" and never for a count to stop rising. Also **cancel
    the autoplay BEFORE any long wait** (`AUTOPLAY_MS` 24000ms, after a 2500ms `AUTOPLAY_LEAD_IN_MS`;
    it is a linear descent, NOT 14s and NOT eased) or it drives the camera underneath it (measured:
    sought 30% of the track, got camY 4934 — the pin). And **pin `?species=`**: `PAGE_SPECIES` rolls per
    load, so an unpinned A/B measures the species, not the change. **The tell I ignored: I could not
    explain WHY the twigs were bare when a passing test said their stations exist. An unexplained
    contradiction between a green test and your own eyes is evidence against your INSTRUMENT.**
- **A CONFLATION IS NOT A CONSTRAINT: check whether X was DEFINED from Y before refusing over "X sets
  Y".** Item 1a (a thinner spine) was refused twice, correctly on the evidence, because
  `MARK_K = SPINE_W / MARK_STROKE` meant thinning the spine shrank the Oculus from the 241px Daniel
  approved to 71px. Every word true; the conclusion false. `MARK_K` had TWO jobs — the mark's SIZE,
  and the ratio making the mark's stroke equal the spine's. **Only the second is a real invariant (the
  join must not step in width), and it is a claim about two STROKES, not about a diameter.** The 241px
  was a CONSEQUENCE Daniel later approved as a fact, and **an approved consequence had become a
  constraint on its own input.** Pin the size, free the weight: nothing was traded — mark still 241px,
  `MARK_R`/`TAIL_LEN`/every point of the finale unchanged, only the ink's width. **This will recur
  every time he says "that size is great, don't change it" about something derived.** Same shape as
  the frame being both the camera's window AND the ink's clip (item 1b), and as `heroCrop` naming two
  mechanisms.
- **A COMMENT CANNOT FAIL. IT CAN ONLY BE BELIEVED.** Changing `SPINE_W` by 3.4x and rewriting
  `MARK_K`'s definition **broke no test** — neither the mark's approved 241px nor the
  spine-equals-mark-stroke identity was guarded anywhere. That is why the conflation above survived two
  rounds: the relationship lived only in prose, and **the prose was CORRECT, which is exactly what made
  it authoritative enough to veto a user's instruction with.** If a comment states a relationship
  load-bearing enough to refuse a ruling over, **it must be a test before the refusal is credible.**
  Corollary: after a change big enough that you expected something to fail, **an all-green run is a
  finding about your coverage, not a pass.**
- **A TEAMMATE'S CHARACTERIZATION OF A THIRD PARTY IS A LEAD, NOT A FACT.** I built a lesson on "the
  escalation offered only two of three levers", got it from a briefing, never checked the handoff — a
  file I had read that same session — and **quoted the refutation inside my own claim** ("cut content
  from 2024, *or give up equal bands*… he took the third, give up equal bands"). Both escapes had been
  named; the analysis was complete. **A borrowed frame is invisible: it arrives feeling like a
  conclusion you reached.** Open the source before repeating it, especially before attributing a
  mistake to someone who is not in the conversation.
  - **AND THE FALSE-POSITIVE HALF IS THE DANGEROUS ONE, which is why `divider.mjs` mattered more than
    its bug.** A guard that intermittently cries wolf does not get investigated — **it gets WEAKENED**,
    because the natural response to a flaky failure is to raise a tolerance or delete the check. That
    is the exact mechanism by which a good guard silently becomes a bad one, and it is how a threshold
    gets relaxed for the wrong reason. So a flake is never cosmetic: **an intermittent FAIL is a bug in
    the instrument, and it must be fixed at the wait, not at the threshold.**
- **A SINGLE GREEN RUN IS NOT EVIDENCE FOR A SUITE COVERING PROCEDURAL OUTPUT. Re-run before you quote
  a number.** "vitest 388" was written into ~20 commit messages tonight as a verdict; measured, the
  suite failed **1 run in 3-4**. `reveal.test.ts` asserted an emergent space-colonization depth
  `toBeGreaterThan(10)` and `maxOrder` landed *exactly* on 10, so the assert was a coin flip nobody had
  flipped twice. **This is the same proxy error one level up:** "this run passed" was checked, "the
  suite passes" was claimed. Anything covering emergent/seeded/procedural output (space colonization,
  the gongbi genome, generated geometry) needs **3-5 runs before its number means anything** — and any
  assert whose threshold came from observing one run (`> 10`, `> 100`, `> 1.5`) is a latent flake **even
  while green**, because it pinned a MEASUREMENT as a LAW.
- **IF A GUARD FILTERS ITS INPUTS, CHECK WHETHER THE SCREEN CAN THROW AWAY THE PROOF.** The
  no-crowding test filtered `if (g <= GAP + 1) continue` — "a ~40px gap must be one cluster's own
  stack". True of a healthy lane, **false of exactly the lane it guards**, because a *crowded* gap is
  also small. It discarded every gap that was too tight and asserted only on the ones already fine, so
  **it could not fail** — and sat green over 15.1px crowding shipped one commit after claiming that
  property fixed. Proof: with the broken page live, the old filter passed all 58 and the fixed one
  failed instantly. **Filter by a FACT (`clusterId`), never by a MAGNITUDE — the magnitude that looks
  like noise can BE the failure.**
- **WHEN DANIEL RULES ON A SCREENSHOT, CHECK THE STATE HE SAW WAS VALID BEFORE EXECUTING.** He was
  shown the axis at `SLOPE` 1150 — a value below its own 1280 floor, crowding 2024 — and ruled "tighten
  the bands". The honest answer was **looser**. Complying would have made it worse *on his
  instruction*. **A ruling made on a broken render is unexecutable, and you only find out by measuring
  the thing he was reacting to.**
- **WHITE MARGINS AROUND A HERO MAY BE THE ASSET, NOT THE LAYOUT — measure before "fixing" it.**
  Measured on the real pixels: Plentify's 1920x1080 hero poster has 451 fully-white columns on the
  left and 478 on the right — **48.4% of the picture is white paper**. Resia's hero is **34.6%**,
  Patterns 9.2%. No box can remove white that lives inside the image, and cropping it out is exactly
  what "no cropping, do not lose context" forbids. This was diagnosed twice as a layout bug and is
  not one. **It wants a re-export of the asset (Daniel's call, his files).** Do not "fix" it in CSS.
- **A BOUNDING BOX IS NOT WHERE THE TEXT IS.** The no-go rule (ornament must not touch text) is only
  as good as its idea of "occupied". "The founders." is a `<p>` in a full-width column — its box is
  1100px wide for a ~110px string, so a box-based probe reports a vine "crossing text" while it
  sails through empty paper a foot away, and would fail forever wherever the ornament went. Measure
  the **glyph runs** (a `Range` over the text node, `getClientRects()`), as `qa/founder-frame.mjs`
  does. With that, one reported collision was a false positive and exactly one was real.
- **A grid row is as tall as its tallest column, and in the work detail that height comes out of the
  hero.** So `ProjectInfoBand`'s column split is a height budget, not a style choice — and MORE
  columns makes it taller, not shorter (narrower columns wrap more). Measured: 3 cols stacked wrong
  = 319px, 4 cols = 465px, 3 cols balanced = ~195px.
- **Do not overlay the BowerMark on a painting.** `matRect` (`engine/gongbi/quality.ts`)
  base-anchors every plant so its densest region sits on the mat's bottom pixel row; anything
  placed at the frame's bottom collides with it by construction, for every seed.
- **THE FOUNDER BIOS RESTATE PROJECT FACTS BY HAND, AND NOTHING LINKS THEM TO THE LEDGER.** This is
  live and it will bite again. `LLO: Dream Machine` was re-attributed to Clay in `projects.ts` on
  2026-07-15; the sentence claiming it sat in **Daniel's** bio until round 5 found it. One fact, two
  places, one owner. Misattributing a cofounder's work on the company's own About page is the worst
  class of bug this page has, and it is silent — nothing fails, it just reads wrong.
  - **Whenever you touch a `by:` attribution, grep `TEAM` for the project's nouns.**
  - Cheap fix if it recurs (proposed, not built): a test asserting no `TEAM` fact mentions a project
    whose `by:` excludes that founder — a noun list per project is enough to catch the class.
  - The mirror of it is just as bad: wording a **shared** project (`by: 'clay+daniel'`, e.g.
    `Plentify`) as sole authorship in one founder's bio. Say what someone did, not what they own.
- **`toBlob` ON THE MAIN THREAD WILL EAT THE PAGE.** "The painting is in a worker" is not the same
  as "the page is off-thread". Handing back an `ImageBitmap` made all four callers draw and
  PNG-encode it themselves: **6,291ms of main-thread self time, 51.9% of everything**, while the
  painters idled. The worker encodes now (`OffscreenCanvas.convertToBlob`) and `requestGarland`
  returns a **URL**, which is session-cached and **must not be revoked by callers** — the next mount
  would get a dead URL. Measured at 4x CPU throttle: blocking 23.3s → 7.3s, scroll 11fps → 48fps.
  Profile with `qa/perf-about.mjs <throttle>` before optimising anything here; the CPU profile named
  this in one run and no amount of guessing would have.
- **Do not wrap the project detail panel in `AnimatePresence mode="wait"`.** It deadlocks against
  the `layoutId` shared-element images inside it: the exit never completes, the incoming panel
  never mounts, and the detail silently freezes on whichever project rendered first while the list
  highlights another. It shipped that way once. There is a comment at the site.
