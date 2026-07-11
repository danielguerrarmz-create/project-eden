# Hero video — 3-keyframe plan (computed → built → living)

The hero is a short clip built from THREE photoreal keyframe stills of the SAME dome, then
motion generated between them in Higgsfield. The narrative maps to the product story:

| # | Keyframe | Seed (engine) | Paste-only prompt |
|---|----------|---------------|-------------------|
| 1 | **Computed** — top-down plan, bare lattice rosette | `docs/seed-shot1-topdown.png` | `docs/prompts/shot-1-topdown.txt` |
| 2 | **Built** — oblique, structure | `docs/seed-shot2-oblique.png` | `docs/prompts/shot-2-built.txt` |
| 3 | **Living** — oblique, clothed in plants | `docs/seed-shot3-grown.png` | `docs/prompts/shot-3-living.txt` |

## Prompt style: geometry-SILENT (lean on the seed)

Describing the dome in words backfired — with no denoise lock, Fuser just draws its own dome
each time, so the shots come out as different buildings. The prompts are back to the verbose
"**preserve the exact input structure, re-skin materials only**" style: geometry-silent, so
Fuser leans on the seed image instead of inventing. Fuser still can't hard-lock shape, so:
**nail Shot 2 (built) first as the anchor, then feed that winning output as an extra reference
when generating Shots 1 and 3** so all three match the same building.

## Consistency rule (critical for the video)

All three prompts share identical material / light / setting / lens language. Only the
CAMERA and the GROWTH differ. Keep it that way, or Higgsfield's interpolation between shots
will morph the timber/garden and look wrong.

## Regenerating the seeds

`?capture=1` freezes the hero at its resolved frame; add `&view=top` for the plan seed and
`&grown=1` for the living seed. Hide the nav/copy, screenshot. (These three seeds were made
that way.)

## Next

Step 3: feed the 3 stills to Higgsfield image→video as keyframes and generate the motion
between them (plan → tilt to oblique → plants grow in). Then Step 4: wire the clip as the
`<video>` hero.
