# Design calls, 2026-07-05

Four open items from the configurator overhaul handoff. For Daniel to rule on; Edward executes once a call is made.

## (a) Recommended steer after a species is touched

**Recommendation:** keep a quiet text tag on the recommended pill after it is touched, but drop the olive ring.

**Rationale:** the ring means "you have not decided yet," which is honestly over the moment a pill is touched. Keeping the ring alive forever would make accent-olive mean two different things at once (untouched default, and permanent favorite), which breaks the "one accent, one job" rule. The plain-text tag is not an accent, so it can survive as ambient information for someone reconsidering, without re-lighting the "look here" signal.

**Implementation:** in `src/steps/StepDesign.tsx`, both the size group (lines 90 to 97) and the species group (lines 135 to 139) currently render their `recommended` mono tag as a caption below the whole pill row, gated on `!sizeTouched` / `!speciesTouched`. Move each tag onto its own pill instead of the row caption, matching how the species pill already carries a trailing habit tag (line 124 to 130):
- Add a trailing `<span>` inside the `Standard` size button and the honeysuckle species button, `font-mono text-[9px] uppercase tracking-[0.08em] text-inkBlack/45`, reading `recommended`, rendered whenever `k === 'standard'` / `sp.id === DEFAULT_SPECIES_ID` (no touched gate).
- Keep the ring class exactly as is (`recommended && !active` where `recommended = !sizeTouched && k === 'standard'` / `!speciesTouched && sp.id === DEFAULT_SPECIES_ID`), so the ring still retires on touch.
- Delete the two caption paragraphs (lines 90 to 97's trailing span, lines 135 to 139) now that the tag lives on the pill.

## (b) Curved gray horizon mass in the 3D scene

**Recommendation:** lighten, do not remove. The surrounding ground disc still needs to catch `ContactShadows`; the problem is its color, not its presence.

**Rationale:** `src/scene/GardenContext.tsx` line 63 fills the ground disc (`circleGeometry args={[26, 48]}`) with `#EFEBDD`, a warm gray-beige that sits noticeably darker and cooler than the vellum background and fog color (`#FBF9F3`, set in `src/scene/Scene.tsx` lines 35 to 36). That value gap is exactly what reads as a curved gray mass at the disc's silhouette edge: a drawing sheet should fade to nothing at its perimeter, not resolve into a visible ring.

**Implementation:**
- `src/scene/GardenContext.tsx` line 63: change the ground disc color from `#EFEBDD` to something within a couple of steps of `paperVellum`, e.g. `#F7F4E9`, so it reads as a barely-there tint rather than a distinct material.
- `src/scene/Scene.tsx` line 36: tighten the fog range from `[20, 46]` to roughly `[10, 30]` so the disc's edge (radius 26) is substantially fogged into the background color before it is visible, instead of only entering fog in its outer quarter.
- Leave the disc's radius and the `ContactShadows` call (line 55) untouched; this is a color and fog-distance fix only.

## (c) North marker cone reads chunky

**Recommendation:** replace the solid 3-sided cone with a flat, unlit pennant, matching the line-plus-knob language the 2D `PlotMapper` already uses for the same marker.

**Rationale:** the cone (`src/scene/GardenContext.tsx` lines 96 to 99, `coneGeometry args={[0.28, 0.6, 3]}`, `meshStandardMaterial roughness={0.6}`) is a lit, faceted solid. At grazing angles its three flat faces catch the directional light unevenly and it reads as a chunky blob, the opposite of the hairline, flat-fill vocabulary the rest of the system uses. A thin unlit plane reads as a mark, not an object, at every camera angle, and it directly echoes `PlotMapper.tsx`'s own north indicator (a line to a small accent-olive knob, lines 220 to 231).

**Implementation:** in `src/scene/GardenContext.tsx`, replace the cone mesh (lines 95 to 100) with two thin, unlit pieces inside the same rotated group:
- A pole: a thin cylinder, `cylinderGeometry args={[0.012, 0.012, 0.6, 6]}`, `meshBasicMaterial color="#17160F"`, standing at the marker position, matching the ink-line language of the timber structure.
- A pennant: a flat triangular plane at the pole's top, built from a small custom `THREE.BufferGeometry` (three vertices), `meshBasicMaterial color="#ACC13A" side={THREE.DoubleSide}`, no roughness or metalness props since `meshBasicMaterial` ignores lighting entirely, which is what keeps it crisp at every angle.
- `meshBasicMaterial` is the key change: it removes the light-and-shade read that made the cone look solid, consistent with the "flat tints, no gradients" rule for hairline diagrams (`DESIGN-DIRECTION.md` section 4).

## (d) Black planting discs are heavy

**Recommendation:** restyle from filled discs to thin ring outlines, with only a faint fill wash if any fill survives at all.

**Rationale:** the beds (`src/scene/GardenContext.tsx` lines 87 to 92, `circleGeometry args={[0.3, 16]}`, opaque `#2A2419`) are the one place in the scene still rendered as a solid dark shape. Everything else in the system that marks a position (the plot boundary, the north knob, the leader-line convention documented in `DESIGN-DIRECTION.md` section 4, "terminating in a small open circle rather than an arrowhead") is a line or a ring, never a filled blob. Ten solid near-black discs ringing the base read as heavy punctuation against a scene that is otherwise all hairline and near-neutral fill.

**Implementation:** in `src/scene/GardenContext.tsx`, replace each bed's filled `circleGeometry` mesh (lines 87 to 92) with a thin ring:
- Swap `circleGeometry args={[0.3, 16]}` for `ringGeometry args={[0.26, 0.3, 20]}` (a thin annulus instead of a solid disc), color `#17160F`, and drop the fill opacity to something closer to the plot's own whisper-fill treatment (`transparent opacity={0.5}` on the ring itself reads fine since a ring is already thin, unlike a full fill).
- Optional: keep a very faint literal-soil read underneath by adding a second, larger `circleGeometry args={[0.3, 16]}` fill at `opacity={0.05}` in the same ink color, so the bed still registers as a distinct patch of ground without the current opaque black weight.
