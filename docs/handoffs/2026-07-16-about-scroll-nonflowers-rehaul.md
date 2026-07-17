# Handoff — the hanging-scroll About rehaul (painterly nonflowers)

**Date:** 2026-07-16
**Branch:** `about-v2-nonflowers` (off `main` @ `0b337fb`). Nothing committed — review first.
**Author:** Clay (via Claude Code, multi-agent design panel + build). **Next editor: Clay/Daniel.**

---

## What

A ground-up About page draft at **`#/about/scroll`** — the shipped About at `#/about` is
untouched; the two hang side by side until the studio picks one.

The page is composed as a **hanging scroll**: dated inscriptions, the twelve project
plates, and **exactly seven commissioned paintings** alternating with empty vellum. The
paintings are grown live, in the browser, by a faithful TypeScript port of **Lingdong
Huang's nonflowers** (MIT, 2018 — procedurally painted Gongbi-style flowers), each from a
permanent seed string, so every commission is the same painting forever.

**The design was chosen by a 3-judge panel over 4 competing concepts** (editorial folio /
hanging scroll / Swiss catalog / motion garden). The scroll won 2 of 3 votes; the build
grafts in the jury's mandated steals: the *underdrawing* loading state (the existing
one-ink SVG engine sketches each slot instantly in INK_BLUE, then cross-fades to the
finished painting — the engine signing its own process), always-typeset provenance
captions (zero layout shift), the plates-index frontmatter, and `#2F607F` as the AA-safe
small-text blue.

### New surfaces

- **`src/vendor/nonflowers/`** — the port: instance-scoped (`createFlora(seed)`), zero
  globals, OffscreenCanvas-ready, **bit-identical genome parity with upstream** (golden
  numbers in its README + tests). Upstream source vendored verbatim alongside; MIT LICENSE
  and full transformation log included.
- **`src/engine/gongbi/`** — the painting room: a worker pool (≤3) paints commissions
  off-thread; `quality.ts` is the **deterministic curation gate** (the genome
  distribution includes washed-out ghosts — gate on dark-ink fraction, re-roll through a
  fixed seed ladder, same winner every visit) plus bbox **matting** so paintings fill
  their mounts. Per-candidate timing/stat ledger logs at `console.debug`.
- **`src/pages/scroll/`** — the page: hero (Bodoni title, branch cropped by the frame),
  dated colophon 2021–2026 (all facts sourced from `projects.ts`/`TEAM`), plates index,
  founder diptychs (headshot · facts · the herbal grown from their name), three work
  sections with frontispiece fans + full plate anatomy (videos via `useAutoplayVideo`,
  paper downloads, "What we learned"), closing Eden branch behind the BowerMark.
  `paintings.ts` is the commission ledger — **changing a seed is a design review, not a
  refactor.**
- **`src/pages/lab/GongbiLab.tsx`** at **`#/lab/gongbi`** — the curation room: browse a
  seed family by archetype with measured stats printed under each take; pin winners into
  the ledger.

### Touched existing files (minimal)

- `Root.tsx` + `routing.ts` — two routes added; **no nav changes** (draft is by-URL only).
- `AboutPage.tsx` — one-word change: `QUESTIONS` exported so the two pages share copy.
- `package-lock.json` — benign: `npm install` restored missing `d3-shape` and npm
  normalized stale `peer` flags. No dependency added or changed.

## Why

Clay: "Full rehaul. Focus on aesthetics, based exclusively on LingDong's nonflowers —
pull the code in, elegant and beautiful." Design rules the page binds itself to (from the
panel): aged paper only inside mounts; INK_BLUE never at body size; pigment stays in the
frame; one painting per moment; no scripts/ornament. Body voice is Source Serif; labels
IBM Plex Mono; one Bodoni moment.

## Verify

- Gates green at handoff: `npm run typecheck` 0 · `npx vitest run` **303 pass** (277
  pre-existing + port parity + gate/ledger tests) · `npm run build` clean.
- Live QA'd headless-Chromium at 1440×900 (screenshots section-by-section): all 7
  commissions paint in ~20–25s cold (pool of 3, ~3–9s each), sketch→painting crossfade,
  zero console errors, zero layout shift on arrival.
- Known timings: paper tile ~600ms once (main thread); a full-page dud ladder worst-case
  ~6 paints. `bower/eden` pinned to take `/5` (earlier takes fail the ink gate).

## Left (open)

1. **Curation pass by taste** (the lab exists for exactly this): the eden colophon plant
   reads a touch shaggy; hero could sit ~2% further left; founders' seeds are fine but
   unreviewed by Daniel.
2. **Contact line** in the colophon — deliberately not shipped (no public address
   confirmed; slot is trivial to add).
3. **Which About answers the door** — swap `#/about` ↔ `#/about/scroll` is a two-line
   Root.tsx change when decided.
4. Reduced-motion: entrances settle, crossfades snap, videos poster-only — implemented,
   not yet OS-verified.
5. iOS Safari not yet tested (OffscreenCanvas path needs 16.4+; main-thread fallback
   exists).

## Files

New: `src/vendor/nonflowers/*` (port + upstream + LICENSE + README), `src/engine/gongbi/
{quality,paintCore,paintWorker,painter}.ts` (+ tests), `src/pages/scroll/{ScrollPage,
FanPainting}.tsx`, `src/pages/scroll/paintings.ts` (+ test), `src/pages/lab/GongbiLab.tsx`.
Modified: `src/Root.tsx`, `src/routing.ts`, `src/pages/AboutPage.tsx` (export only),
`package-lock.json` (benign).
