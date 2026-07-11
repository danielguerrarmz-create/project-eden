# Hero beauty still — v1

The single pre-rendered image the home hero cross-fades into at the end of its timed
reveal (Option 1: free procedural three.js motion → one Fuser render). Referenced by
`src/pages/splash/heroStill.ts` (`HERO_STILL.src = '/hero/v1/pavilion.jpg'`).

## Status: PLACEHOLDER

`pavilion.jpg` is currently our aesthetic-reference render (golden-hour garden). Its
geometry is a barrel-vault, which is WRONG for us — it is only here so the cross-fade is
visible while we produce the real render. Replace it in place (same filename) when ready.

## How to produce the real still

1. **Capture the endpoint (structure lock).** Open the home with `?capture=1`
   (e.g. `http://localhost:5333/?capture=1#/`). The hero freezes at its final frame.
   Once the scene has settled, run `__captureHero()` in the browser console → downloads
   `hero-endpoint.png`: the exact dome geometry from the exact hero camera + framing.
2. **Generate one Fuser render.** Feed `hero-endpoint.png` as the structural / img2img /
   depth conditioning image (this locks the geometry + camera), and use the prompt +
   settings in `docs/hero-fuser-prompt.md`. Iterate a handful of times; reject any gen
   with wrong geometry, wrong camera, plastic timber, or an overblown flare.
3. **Drop it in.** Export ~2560px wide, save as `public/hero/v1/pavilion.jpg` (overwrite),
   and set `placeholder: false` in `heroStill.ts`.

## Versioning

Bump to `public/hero/v2/` and point `heroStill.ts` at it to reland a new render (e.g. after
a geometry change). Re-capture the endpoint at the same camera so the cross-fade still lines
up. One image per version, fully reproducible.
