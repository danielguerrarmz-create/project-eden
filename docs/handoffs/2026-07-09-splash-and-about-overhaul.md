# Handoff — Splash hero + About/projects overhaul (2026-07-09)

## What

A large pass over the Eden landing (`#/`) and a brand-new dedicated projects page (`#/about`),
plus header/logo work shared across all chrome pages.

**Splash hero (`HeroReveal.tsx`, `heroStill.ts`, `AdaptiveCursor.tsx`)**
- Adaptive cursor: render the blend-difference disc at 60px and only ever scale *down* (all
  states ≤ 1×) so it stays a crisp perfect circle; logo/link hover grows it to ~56px.
- "Eden" wordmark: replaced the hand-authored single-stroke SVG path (which filled into an
  ink blob) with real text in the cursive Dancing Script face, revealed by a left-to-right
  clip wipe.
- Beauty still: dropped in the real golden-hour render as `public/hero/v3/pavilion.jpg`
  (3:2, 5056×3392) and enabled it (`heroStill.placeholder=false`). Full-bleed `object-cover`
  with `object-bottom` so the foreground is always visible and only the sky headroom crops
  on short/wide windows.
- Hero copy over the photo: luminous cream (the Eden cursive inherits the headline colour) +
  a soft feathered dark scrim + text-shadow; the vellum poster fallback keeps dark ink.

**Header / logo (`SplashHeader.tsx`, `BowerIntro.tsx`)**
- Removed the "living architecture for the garden" tagline.
- "how it works" nav now points to the dedicated `#/engine` walkthrough page (was an in-page
  anchor that just scrolled the splash; the walkthrough already existed but was orphaned).
- Logo enlarged and placed in its own frosted-glass pill matching the nav, so it's distinct
  and legible on any ground (hero photo or vellum). Intro flying-wordmark size matched (19px).

**About / projects page (`AboutPage.tsx`, `about/projects.ts`, `about/AboutIntro.tsx`)**
- New dedicated page modelled on cathydolle.com: a LIST / SLIDER toggle over one project set.
- One-time narration intro that plays on **every visit** (reduced-motion opts out): a setup
  line ("We built this in two weeks.") then the title ("We've been chasing it for five
  years.") rises into the header. Both lines render from the *identical* box + spec, so they
  are pixel-identical in size and placement; the title is a pure vertical translation onto
  the header (no scale, no re-align).
- Title == narration payoff line (shared `TITLE`); the header title uses the narration spec
  (`clamp(1.6rem,4.4vw,3rem)`, `font-medium`), not an oversized heading.
- Copy in first person ("We"), covering **both fronts**: grown-not-built architecture AND
  designing alongside AI.
- LIST is a master-detail (no individual project pages): slim numbered index on the left,
  and on the right the selected project's curated **1–4 images** (blank frames for now), a
  description, and a big **"What we learned"** takeaway. Image column now dominant (~60%),
  wider page + bigger margins (`max-w-[1360px]`, `px-8 md:px-16`).
- Scroll-to-top on mount (the hash router doesn't reset scroll; also keeps the intro's
  measure/fly-in correct).

## Why

- The hero ended on low-poly geometry with no real "payoff"; the render gives it a finish.
- The old logo disappeared against the dark hero canopy; the pill fixes legibility.
- "how it works" was a broken-feeling in-page scroll; a real page is better IA.
- The About page was a placeholder; it now tells the Clay + Daniel five-year story and is
  ready for real project images/copy to be dropped in.

## Verify

- `npm run test` → 126/126 pass. `npm run build` (tsc + vite) clean.
- `#/` — let the reveal play; it ends on the full-bleed render, bottom visible, cream copy
  legible, logo pill readable top-left.
- `#/about` — narration plays every load; the two lines match in size/placement and the
  title nests into the header; LIST shows the image-heavy master-detail with "What we
  learned"; SLIDER drags/arrows/counter work.
- `#/engine` — reachable from the "how it works" nav item.

## Left / next

- Curate the real **1–4 images per project** and swap the `BlankFrame`s; the data model
  (`about/projects.ts`) already carries `images` counts, `description`, and `learned`.
- Fill in real project descriptions + "What we learned" takeaways (current copy is plausible
  placeholder).
- Optimise the hero still (2.6MB JPEG; consider a `.webp` / smaller export for first paint).
- Mobile: the LIST detail panel is desktop-only (`lg+`); narrow screens browse via SLIDER.
  Decide whether mobile needs an inline detail too.
- The old `public/hero/v1` placeholder + README are now unused (kept for history).

## Files

- `src/pages/splash/HeroReveal.tsx`, `heroStill.ts`, `AdaptiveCursor.tsx`, `BowerIntro.tsx`,
  `SplashHeader.tsx`
- `src/pages/AboutPage.tsx`, `src/pages/about/projects.ts`, `src/pages/about/AboutIntro.tsx`
- `src/pages/SplashPage.test.ts`, `src/pages/engine/EnginePage.test.ts` (assertions updated
  for the tagline removal + nav repoint)
- `public/hero/v3/pavilion.jpg` (new render)
