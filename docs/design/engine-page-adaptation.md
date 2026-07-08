# Engine-page → splash adaptation spec

Author: Sai (Product Designer) · 2026-07-07 · Docs-only, no source touched.
Target: `src/pages/engine/EnginePage.tsx` (+ `src/pages/splash/HowItWorks.tsx`,
which it renders verbatim), joining the shared chrome `SplashPage.tsx` and the
new `AboutPage.tsx` already established today (2026-07-07 handoffs). This is
purely the field-color documentation layer — do not pull any of this into the
studio (`App.tsx`), which intentionally stays the separate warm-paper system
(`tailwind.config.js` says as much: field colors are "additive: never used
inside the warm-paper studio").

## 0. Where EnginePage sits in the IA today, and the gap

Three destinations already exist and are each individually well-formed:

- `#/` (Splash) — condensed engine section, anchor `#how-it-works`.
- `#/engine` (EnginePage → `HowItWorks`) — the full six-section walkthrough.
- `#/studio` (App.tsx) — the interactive configurator.

`SplashPage` and `AboutPage` both already share one fixed, transparent,
no-background-rectangle nav (`SplashHeader`), matching type scale
(`typeScale.ts`), field-color sections (`EngineSection`), and the hairline
diagram vocabulary (`hairline.tsx`). `EnginePage` is the one page that never
got the memo: it still renders its own bespoke, non-fixed header (small
`BowerMark`, two links: "home" / "the studio", no "about", a different mono
size/weight than `SplashHeader`'s nav links). That's the actual gap — the
*content* sections (`HowItWorks.tsx`) already import the shared `H1/H2/BODY`
and `EngineSection`/`Eyebrow`/`AnnotationStrip`, so they're already on-system.
This is a chrome fix, not a content rebuild, with one real content call-out
(§3).

## 1. Nav: adopt `SplashHeader`, don't rebuild it

Delete `EnginePage`'s own `<header>` block and its private `navLink` class +
`BowerMark` import (lines 29–44 today). Replace with `<SplashHeader />`,
exactly the one-line pattern `AboutPage.tsx` already uses. This gets
`EnginePage` the "about" link and the underline-grow hover it was missing for
free, and removes a second, drifting nav implementation from the codebase.

**`SplashHeader` needs one small enhancement to survive being shared across
more than one page**: right now it has no notion of "current page" — every
`NavLink` only distinguishes hover/focus. Once it's mounted on Splash, About,
*and* Engine, add active-route awareness: read `useRoute()` (already exported
by `routing.ts`, currently only consumed by `Root.tsx`) and give the matching
`NavLink` `aria-current="page"` plus a persistent (not just hover) underline.
Small change, but without it a visitor on `#/engine` has zero visual
confirmation of where they are in a three-destination nav — a real
usability gap once the nav stops being single-page.

## 2. Fixed nav needs top clearance it doesn't currently have

`SplashHeader` is `position: fixed`, no background. On `SplashPage` and
`AboutPage` that's free — the hero (`HeroReveal`, full `min-h-screen`) or the
centered `About` copy both naturally start below the nav's footprint, and the
one place the splash *does* let a heading pass transiently under the floating
nav mid-scroll is an accepted, already-documented tradeoff (2026-07-07 round-2
handoff).

`EnginePage` has no hero. `HowItWorks`'s first section (`Eyebrow` + `H1`) sits
at the very top of the page on load — under the transparent-background fixed
nav, permanently, not transiently, until the visitor scrolls. That reads as
broken on arrival, not as an accepted overlap. Add real clearance to the
first section only: either a `pt-24 md:pt-28` addition to that one
`EngineSection`'s content (safely above the section's own `py-20 md:py-32`,
which was never sized to also clear a floating nav) or an explicit spacer
matching the nav's actual rendered height. Every section after the first
already has 80–128px of its own vertical padding, which is enough margin for
the transient mid-scroll case to keep reading fine — only the very first
screenful needs the fix.

## 3. Content: cut the section eyebrows — precedent already set

`HowItWorks.tsx` still carries an `Eyebrow` on every one of its six sections:
"What the engine actually does," "Solar geometry," "Planting-informed
parametrics," "Establishment, shown, not claimed," "What is real and what is
a rule of thumb." These are the *exact* strings Daniel already flagged as
"random titles" and had removed from `SplashPage`'s own condensed engine
section in the same-day round-2 simplification pass
(`docs/handoffs/2026-07-07-hero-timed-nav-float-simplify.md`, item 7). That
cut just never propagated to the full walkthrough these eyebrows were
originally extracted from. Recommend cutting them here too, for the same
stated reason ("value simplicity for the sake of disseminating complexity") —
the `H1`/`H2` headings already carry the section's point on their own; the
eyebrow was restating it as a label above the sentence that says it.

Keep everything else in `HowItWorks.tsx` as-is: it's the deliberately fuller
version of the splash's condensed pitch (the splash's own doc comment says as
much — "the full six-section walkthrough... lives at the standalone /engine
route"), and the prose there earns its length by being the deep-dive, not the
teaser. No section reordering, no diagram changes.

## 4. Close every page the same way

`SplashPage` ends on one deliberate monument: a viewport-wide lowercase
`bower` wordmark in a bordered footer. `EnginePage` currently has no closing
beat at all — it just stops after section six's "Shape your own Eden →" link.
Extract that footer block into a small shared component (e.g.
`src/ui/BrandFooter.tsx`) and mount it at the end of both `SplashPage` and
`EnginePage`. Two reasons, not just consistency for its own sake: (1) it
gives a page that's otherwise all reasoning and diagrams a clear "you've
reached the end of this document" cue, which a deep-dive page especially
needs since there's no natural next-section cue like a hero has; (2) leaving
the raw JSX duplicated across two pages is how the two wordmarks quietly
drift apart six months from now — one shared component is the correct
default here regardless of the visual argument.

## 5. The nav-label decision the 2026-07-07 handoffs left open

Round 2's own "Left/open" flagged this explicitly: `SplashHeader`'s "engine"
link currently points at `#/studio` (the configurator), a relabel of the old
"the studio" link, with the open question of whether it should point at
`#/engine` (the walkthrough) instead. Now that `EnginePage` is joining the
shared nav as a real, first-class destination, this can't stay ambiguous —
both routes need a place in the nav, and "engine" can only honestly point at
one of them.

**Recommendation**: "engine" should mean the engine explainer (`#/engine`) —
that's what the word says, and it's what a first-time, evaluation-minded
visitor (still the priority audience per `config.ts`'s
`CTA_PRIMARY_EVALUATOR`) is looking for when they click a word like that. Give
the configurator its own honest, verb-forward label instead of overloading
"engine" for it — `config.ts` already has the right words on hand
(`CTA_PRIMARY_BUYER = 'Shape your Eden'`); a nav-scaled version of that, e.g.
**"shape yours,"** reads as an action, not a synonym for "engine." Resulting
nav: *how it works · engine · shape yours · about* — four items, each mapping
1:1 to a genuinely distinct destination, which fits the site's honesty
posture better than a three-item nav where one label quietly does double
duty. This is a copy/IA call, not just a visual one — flagging it for
Daniel's sign-off same as the handoff did, rather than deciding it silently
in source.

## 6. Minor cleanup notes (not urgent, flagging for Edward)

- `HowItWorks.tsx`'s file-level doc comment is stale — it still describes
  itself as "folded into the home page as one in-page band." That stopped
  being true when `SplashPage` got its own separate condensed section;
  `HowItWorks` is now used exclusively by `EnginePage`. Worth a comment
  update whenever this file is next touched, since a wrong doc comment at
  the top of a shared component is exactly the kind of thing that causes a
  second person to compose it wrong.
- Both `HowItWorks`'s first section and `SplashPage`'s own condensed section
  use `id="how-it-works"`. They're never mounted on the same page today (no
  collision), and `SplashHeader`'s "how it works" link always resolves to
  the home page's copy of that id via the router's unknown-route fallback —
  so this is inert duplication, not a bug, but worth a rename on
  `HowItWorks`'s copy (e.g. drop the id there, since it's never the actual
  anchor target while mounted on `#/engine`) next time that file is edited.

## 7. Explicit non-goals

- `App.tsx` / the studio keeps its own `Navbar.tsx` and warm-paper token set.
  Do not merge it into `SplashHeader` or the field-color system — that
  separation is deliberate and documented in `tailwind.config.js`.
- No new diagrams, no new sections, no reordering of `HowItWorks`'s six
  sections. This is chrome + one copy cut, not a rewrite.

## Files this spec expects to touch

`src/pages/engine/EnginePage.tsx` (replace bespoke header with
`<SplashHeader />`, add top-clearance to the first section, mount the shared
footer) · `src/pages/splash/SplashHeader.tsx` (active-route awareness via
`useRoute()`, nav label/route decision per §5) · `src/pages/splash/
HowItWorks.tsx` (remove the six `Eyebrow` lines, stale doc comment, `id`
cleanup) · `src/ui/BrandFooter.tsx` (new, extracted from `SplashPage.tsx`'s
existing footer JSX) · `src/pages/SplashPage.tsx` (swap inline footer for the
extracted component, no visual change).
