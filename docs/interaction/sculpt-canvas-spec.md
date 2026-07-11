# Sculpt canvas spec — one surface, gesture as parameter

Author: Sai (Product Designer) · 2026-07-08 · Docs-only, no source touched.
Branch: `form-finding-core`. Target surface: `src/pages/SculptPage.tsx` (`#/sculpt`),
`src/scene/SculptShell.tsx`, `src/engine/formFinding.ts`, and the routing/chrome that
currently keeps `#/sculpt` and `#/shape` as two separate prototypes. Wears the same
documentation-layer tokens both pages already use: `paperVellum` `#FBF9F3`, `inkBlack`
`#17160F`, `inkNavy` `#232C5E`, `accentOlive` `#ACC13A`, IBM Plex Mono. No new tokens.

This spec assumes and extends the gesture grammar already authored in
`docs/design/sculpting-gestures.md` (the aspirational six-gesture membrane vocabulary)
and `docs/design/direct-manipulation.md` (the handle-cage precedent it superseded). It
does not re-derive their rules (grain resistance, amber-not-red, one accent, quiet
until touched, no coachmarks) — those hold here unchanged. What this doc adds: the
narrower, closer-to-buildable-today gesture set Daniel approved for the unification,
grounded against the code that actually exists on this branch right now, not the full
membrane system those two specs describe as a longer arc.

## 0. Thesis, and the one honest complication

**Illoca's promise is the target**: explore first, clay-fast, direct manipulation as
the default surface; the parametric precision is still there underneath, one layer
down, for whoever wants the numbers. Not two tools on two routes. One canvas, one
gesture vocabulary, sliders demoted to a "reveal the numbers" panel that documents
what the gesture already did rather than driving anything itself.

**The complication Edward needs flagged before he estimates anything**: `#/sculpt` and
`#/shape` are not two skins on one engine today. They are two independent engines.
`#/shape` drives `useDesign`'s four-scalar parametric model (`store.ts` →
`engine/geometry.ts`, real pricing via `GRAMMAR`/`PRICING`). `#/sculpt` is a
self-contained PBD relaxation over a fixed-topology gridshell (`formFinding.ts`), and
its own header comment says so explicitly: "this runs ALONGSIDE the existing param
engine... it does not touch the store or the four-param model." Unifying the *canvas*
(one route, one gesture-first surface, this doc's scope) is independent of unifying
the *engine* (making the sculpted mesh feed the same pricing/grammar-notes pipeline
`#/shape` reads from `useDesign`, an engine-integration decision that is Edward's and
Senku's call, not a design one). Every gesture spec below is written to work
identically regardless of which way that engine question resolves. Recommendation:
make `#/sculpt` the canonical route, keep `#/shape` reachable only via the "reveal the
numbers" panel (or as a redirect once the reveal panel ships), and treat the
pricing-bridge as a fast-follow, not a blocker for Option A.

## 1. The unified canvas, at rest

- One route (`#/sculpt` canonical; `#/shape` becomes a synonym or is retired once the
  reveal panel lands — Edward's call on routing.ts mechanics).
- Direct manipulation is the whole canvas at rest: the shell, quiet, no dots, no
  markers, matching `sculpting-gestures.md` §3's "idle state" rule extended here too.
- The density preset row and the `reset shell` link stay (bottom-right HUD, unchanged
  from `SculptPage.tsx` today).
- The **falloff slider is deleted outright**, not relocated (§3.1 below explains what
  replaces it). Nothing in the rest state should read as "a control panel"; the HUD
  stays a read-only stat block, as it already is.
- **Reveal the numbers**: a single mono text affordance, same register as the existing
  `the param prototype →` link already on `SculptPage.tsx` (`SculptPage.tsx:162-167`),
  relabelled `reveal the numbers ↓`. Opens a collapsed panel (not a route change) with
  the read-only spec-strip pattern from `direct-manipulation.md` §8: whatever scalar
  summary the current engine can honestly produce (today: `ShellStats` — nodes,
  struts, strut length range; once the pricing bridge lands: footprint/rise/aperture/
  price too). This is the slider's replacement role: a mirror, never an input. No
  control in the reveal panel is draggable or click-to-edit; that would just be the
  old two-surface problem again with extra steps.

## 2. Option A — Gesture vocabulary (the tactile pole, ship first)

Five moves. All five build directly on what `SculptShell.tsx` already has (a
raycast-pickable node `InstancedMesh`, a live `useFrame` relax loop, `beginGrab` /
`moveGrab` / `endGrab`) rather than the fuller membrane-grab system
`sculpting-gestures.md` describes for later. Nothing here waits on that fuller system.

### 2.1 Hover-highlight before click

**Gap today**: `SculptShell.tsx`'s node mesh only sets `cursor: grab` on
`onPointerOver` (`SculptShell.tsx:245-248`) — no visual change to the node itself.
Compare `CageHandles.tsx`'s `DragHandle`, which already does this correctly per-object
(`hovered` state → scale ×1.25, emissive bump, `SculptShell.tsx`'s sibling file
`CageHandles.tsx:172-199`). Sculpt's node mesh is one shared `InstancedMesh`, so it has
no per-instance hover state yet — `onPointerOver`/`onPointerOut` fire once for the
whole mesh, not per node. Needs `onPointerMove` on the mesh, comparing `e.instanceId`
against a `hoveredNode` ref frame to frame, firing synthetic enter/leave.

**Trigger**: pointer moves onto any un-pinned node's instance (feet, `invMass===0`,
are excluded from hover exactly as they're already excluded from grab in
`onNodeDown`, `SculptShell.tsx:204`).

**Visual**: the hovered node needs its own instance color, which the node mesh
doesn't have yet (only the strut mesh calls `setColorAt`, `SculptShell.tsx:138`).
Add an `instanceColor` buffer to the node mesh; hovered node tints from the resting
`#2f3a1c` to `accentOlive` `#ACC13A`, scale bumps ×1.3 (multiplicative on top of the
existing foot ×1.5 baseline, `SculptShell.tsx:150`).

| State | Visual | Cursor |
|---|---|---|
| Resting | `#2f3a1c`, scale 1 (feet 1.5×) | default |
| Hover | tints `accentOlive`, scale ×1.3 | `grab` |
| Active (dragging) | solid `accentOlive`, scale ×1.4 | `grabbing` |
| At-limit | n/a — limits live on struts, not nodes; see §3.1. Don't invent a node-level limit state | `grabbing` |

### 2.2 The influence bubble (falloff becomes a spatial gesture)

Replaces the `falloff` range input (`SculptPage.tsx:141-153`) entirely. Falloff radius
is real geometry, not a number on a rail.

**Visual**: a translucent camera-facing disc centered on the hover/grab point, radius
= the live `radius` value already threaded through `SculptPage` → `SculptShell` →
`beginGrab(s, seed, radius)` (`formFinding.ts:289`). Fill `accentOlive` at 0.08-0.10
alpha (matching the fill weight `sculpting-gestures.md` §2.6 already specified for its
own falloff ring), dashed rim at higher opacity. Shown on hover, stays through the
drag.

**Resize gesture**: scroll wheel (or two-finger scroll / pinch on trackpad) while
hovering a node or mid-drag adjusts the `radius` state live, clamped to the same
0.4-2.4 m range the slider enforced today. A small mono label rides the bubble's edge,
`bubble · 1.1m`, tabular, same register as the HUD stat blocks — this is the numeric
readout the slider used to own, just relocated to the point of contact instead of a
fixed control rail (the exact pattern both prior specs already established for
per-handle readouts).

**Wheel conflict, the one build risk here**: `OrbitControls` already binds wheel to
camera dolly. While dragging, `controls.enabled` is already set `false`
(`SculptShell.tsx:213`), so wheel-to-resize is unambiguous during a drag. On hover
alone (before a pointer-down), orbit is still live, so a bare scroll would zoom the
camera unless intercepted. Needs an `onWheel` handler on the node mesh (or a
window-level listener gated on `hoveredNode.current != null`) that calls
`stopPropagation`/`preventDefault` and updates `radius` instead of letting the event
reach `OrbitControls`. Flagging this explicitly because it is the one place a gesture
here fights an existing control, not a new affordance in open space.

**Persistence**: last-used radius carries across grabs within the session, same
behavior as the slider today, just moved to a different input surface.

| State | Visual | Trigger |
|---|---|---|
| Hidden | nothing rendered | not hovering/dragging any node |
| Hover | disc fades in (150ms), dashed rim, `bubble · Nm` label | node hover |
| Resizing | disc radius live-updates with wheel/pinch delta | wheel/pinch while hover or drag |
| Active drag | disc follows the grab, same fill, no rim flicker | pointer down + move |

### 2.3 Pinch or scroll to pucker the oculus

New capability; the crown ring (`ring index 0`, i.e. every node where
`Math.floor(node / spokes) === 0`) currently only changes size at build time via the
`oculus` field on `ShellOpts` (`formFinding.ts:161`, fixed per `DENSITY` preset in
`SculptPage.tsx:31-36`). This gesture makes it live without a rebuild.

**Trigger**: hovering any crown-ring node shows a distinct affordance from a single
node highlight, a full faint dashed ring around the whole crown (not just one node),
because the gesture moves the ring as a unit, not a point.

**Gesture**: scroll or pinch while hovering the crown ring scales the ring's radius
live, shrink to pucker closed, grow to open wider. Maps to a **new engine function**,
e.g. `pinchOculus(shell, deltaR)` in `formFinding.ts`, implemented the same way
`beginGrab`/`moveGrab` already are: populate `s.grab` with every ring-0 node at weight
1.0, `desired` computed procedurally (each node's position scaled radially by
`deltaR` around the shell's vertical axis) instead of from a raycast delta. This is a
new *populator* for `s.grab`, not a change to `relax()` or `solveStrut()` — the solver
doesn't know or care whether a grab target came from a cursor or a formula.

**Limit**: crown-ring struts (`kind: 'ring'` at ring 0) already carry an `lmin`/`lmax`
band from `buildBand()` (`formFinding.ts:140`). Puckering past that band hits the same
rigid clamp as any other strut, which is exactly the input Option B's flash-and-whisper
needs (§3.1) — "crown struts at minimum" is a real, derivable event, not a canned
string.

| State | Visual | Trigger |
|---|---|---|
| Resting | crown ring undecorated | not hovering |
| Hover | full dashed ring fades in around the crown | pointer over any ring-0 node |
| Puckering | ring outline tints `accentOlive`, radius live-tracks scroll/pinch | scroll/pinch while hovering |
| At-limit | ring struts shift toward the grain-color amber treatment already in `grainColor()` (`SculptShell.tsx:63-69`) as they approach `lmin`/`lmax` | ring struts within their band's stiff zone |

### 2.4 Scroll to inflate the whole shell

Same synthetic-grab technique as §2.3, generalized to every un-pinned node instead of
just ring 0: `desired` = current position nudged outward along the local surface
normal (or, simplest first pass, straight up/out from the shell's vertical axis) by a
scroll/pinch delta.

**Trigger disambiguation, so this doesn't fight camera zoom everywhere**: only engage
when the raycast under the cursor hits the shell surface itself (a node, or the strut
mesh if that's made raycast-targetable too — Edward's call, same open question
`sculpting-gestures.md` §6 already flagged for the fuller system). Cursor over empty
space or the ground plane stays camera zoom, unchanged, no exceptions.

**Limit**: every strut's band applies exactly as it does for any other gesture; a full
inflate stiffens unevenly (crown-ring struts hit their band edge sooner than eave
struts, because `buildBand()` scales each strut's range off its own rest length),
which is a feature, not a bug: it's the shell telling you where it wants to grow and
where it doesn't.

| State | Visual | Trigger |
|---|---|---|
| Resting | shell as-is | cursor off the shell |
| Inflating | whole shell subtly breathes outward/inward with scroll delta | scroll/pinch while cursor is over the shell |
| At-limit | affected struts individually grain-color toward amber as they stiffen, same as any other gesture (no separate "whole shell maxed" state, it's just more struts flashing) | any strut in its band's stiff zone |

### 2.5 Shell-settling animation, on every gesture

Mostly already true. `relax()` (`formFinding.ts:330`) runs its full constraint sweep,
including the grab-free `projectionSweeps` buildability pass, every single frame,
drag or no drag (`formFinding.ts:384-392`) — so releasing a grab doesn't need a bolted
-on settle animation, the same continuous relax that was already running produces the
visible settle for free the instant the grab constraint disappears. This is honestly
the nicest thing about the current solver: it doesn't have a "settled" vs. "settling"
mode, it's one loop, always.

**Optional enhancement, not required for done**: a brief iteration boost right after
release (temporarily raise `iterations`/`projectionSweeps` above `DEFAULT_OPTS` for
~200ms) for a more legible "clay flop" beat on big pulls, matching the damped-wave
ripple `sculpting-gestures.md` §5 describes. Flag as a nice-to-have; the baseline
behavior already satisfies "settle on every gesture" with zero new code.

### Option A summary

| | |
|---|---|
| **Engine hooks touched** | `formFinding.ts`: `beginGrab`, `moveGrab`, new `pinchOculus()`, new `inflateShell()` (or equivalent `s.grab` populators), `buildBand`/`bandTarget` (read-only, already correct). `SculptShell.tsx`: node mesh instance-color buffer, per-instance hover tracking, `onWheel` handling, raycast target for §2.4. `SculptPage.tsx`: delete the falloff slider, add the reveal-numbers link (§1). |
| **Build estimate** | Hover-highlight + instance color: ~0.5 day. Influence bubble + wheel resize: ~1 day (the wheel/orbit conflict is the fiddly part). Oculus pucker: ~1 day (new grab-populator function + ring affordance). Shell inflate: ~0.5-1 day (mostly the raycast-target decision). Settle: effectively done, ~0 (optional boost ~0.5 day if wanted). **Total: roughly 3.5-4.5 days.** |
| **Done looks like** | Falloff slider is gone from the DOM. Every grabbable node visibly announces itself on hover before any click. The influence radius is a thing you see and resize in place, never a number you type. The crown ring and the whole shell both respond to scroll without a rebuild, and both audibly (visually) stiffen at their real fab bands, not a fake ceiling. Camera zoom still works everywhere it should and nowhere it shouldn't. |

## 3. Option B — Intent legibility (the parametricism pole, ships second)

Three moves, each translating something the engine already silently guarantees
(buildability, siting constraints) into something you can see and rewind.

### 3.1 Fab-limit flash + whisper

**Hook**: the per-frame strut loop in `SculptShell.tsx` (`SculptShell.tsx:128-141`)
already computes `len` and calls `grainColor(col, len, st.lmin, st.lmax)`
(`SculptShell.tsx:62-69`), whose internal `t` value is 1.0 exactly when a strut is
pinned to its band edge, the rigid regime `bandTarget()` (`formFinding.ts:133-137`)
enforces. "Clamped" is already computed every frame; it just isn't surfaced as an
event, only as a continuous color gradient.

**New**: track clamped-state transitions (a strut crossing into `t ≈ 1`, some small
epsilon like 0.96, from below) frame to frame via a small `Set<number>` of currently
-clamped strut indices, diffed each frame. On a transition into clamped, that strut
gets a one-shot 300ms flash (grain color → amber `#b8402f` peak → back to grain color)
, not a continuous strobe — a momentary event marker on state change, not a persistent
animation loop, consistent with the office-viz "static, no breathe/pulse" rule applied
to this surface's own idiom.

**Whisper copy**: derived, not canned. Ring index for a strut's crown-proximity is
recoverable as `Math.floor(st.a / spokes)` (topology is `idx(i, j) = i * spokes + j`,
`formFinding.ts:200`); which edge it hit (`lmin` vs `lmax`) tells you "at minimum" vs
"at maximum"; `st.kind` (`diagrid` / `ring` / `radial` / `eave`) supplies the noun.
Example: `crown struts at minimum, pull elsewhere.` or `eave strut at maximum, pull
elsewhere.` One line, mono, anchored near the clamped region (never a fixed HUD
corner, the same "attention never splits from where your hand is" rule both prior
specs already commit to), `aria-live="polite"`. Amber, never `bloom`/red, matching the
existing color contract.

**Debounce**: announce once per continuous clamp episode (on the transition into
clamped), not every frame it's held, so a sustained pull against a limit doesn't spam
the live region.

### 3.2 Ghosted constraint guides — sun path and site envelope

**Hooks**: `computeSunPath(latitudeDeg, dayOfYear)` from `src/engine/sunpath.ts`
(returns `SunSample[]` with a `direction: Vec3` per hour, already the "unit vector from
folly toward the sun" the scene's own convention expects, `sunpath.ts:41-47`), fed
`SITE.latitudeDeg` (51.5, `data/config.ts:91`). Envelope bounds come from `GRAMMAR`
(`maxFootprintM2`, `pdHeightCapM`, `data/config.ts:22-72`), the same numbers
`SiteEnvelopeDiagram.tsx` already draws as a flat 2D plan/section. That component
itself is SVG and can't mount inside the R3F canvas, so this reuses its *data*, not
the component, rendered as actual 3D ghost geometry instead of a 2D diagram sitting
beside it.

**Sun arc**: each `SunSample.direction`, scaled to a fixed guide radius past the shell
(say 6 m), strung into a dashed `<Line>` (drei, same primitive `CageHandles.tsx`'s
`GuideLine` already uses, `CageHandles.tsx:70-83`), low opacity (0.12-0.18),
`inkNavy` not `accentOlive` — this is a fixed reference you sculpt *against*, so it
must not read as something interactive. `accentOlive` stays reserved for "alive /
touched," exactly the rule both prior specs already hold.

**Site envelope**: a faint dashed ring at ground level sized to `GRAMMAR
.maxFootprintM2` (the buildable footprint ceiling), plus a faint dashed horizontal
ring at `GRAMMAR.pdHeightCapM` (2.5 m, the permitted-development height cap) — the two
numbers `SiteEnvelopeDiagram.tsx` already visualizes in 2D, now standing in the actual
3D space you're pulling the shell through.

**When they show**: default near-invisible (this is a "quiet until relevant" surface,
not a permanent HUD element competing with the shell). Brighten with a distance-based
opacity ramp as the live shell geometry approaches within some margin of a guide (a
pull nearing the height cap brightens the height ring; a pull nearing the footprint
ceiling brightens the ground ring), so they function as guides you're actually
approaching, not decoration sitting in frame the whole time. If the margin calculation
turns out fiddly to build well, the honest fallback is always-on at a very low fixed
opacity, flagged here as the simpler option rather than the better one.

### 3.3 Scrubbable undo-history

**Hook**: `shell.current.pos` is a flat `Float64Array`
(`formFinding.ts:54`), so a snapshot is one `pos.slice()` call, cheap (roughly 130
nodes × 3 × 8 bytes ≈ 3 KB at the default density preset). Capture one snapshot per
completed gesture, at the point `endGrab` already fires in `onUp`
(`SculptShell.tsx:190-198`), pushed onto a bounded `history` ref array (cap ~24
entries, generous headroom against the per-snapshot cost, not a hard technical
ceiling).

**Scrub UI**: a horizontal tick strip, same mono/button visual register as the
existing density-preset row (`SculptPage.tsx:127-139`), living beside it in the
bottom-right HUD. Dragging along the strip doesn't just jump between discrete
snapshots, it lerps node-by-node between the two adjacent snapshots' position arrays
for the in-between positions, then re-runs the grab-free `relax()` sweep (projection
only, no grab, no gravity integration) on the interpolated result each frame during
the scrub, so what you see mid-scrub is still a genuinely buildable shell settling
toward the next state, not a raw crossfade between two unrelated meshes.

**Branching**: releasing the scrub at a historical point makes that the live state;
any new gesture from there overwrites forward history rather than trying to preserve
a branch, the same "editing rewrites the future" convention any linear undo stack
uses. No confirmation dialog on restore; this is exploratory sculpting, cheap
reversibility is the entire point of the feature, a confirm step would undercut it.
The scrub strip should still visually mark "browsing history" (a distinct handle
position, dimmed HUD stats) versus "back to live," so it's never ambiguous which mode
you're in.

### Option B summary

| | |
|---|---|
| **Engine hooks touched** | `SculptShell.tsx`: clamped-strut transition tracking + one-shot flash, whisper-copy derivation (pure function, testable without React). `src/engine/sunpath.ts`: `computeSunPath` (read-only, already correct). `data/config.ts`: `GRAMMAR`, `SITE` (read-only). `formFinding.ts`: `pos.slice()` for snapshots, a new pure interpolation helper (lerp two `Float64Array`s node-by-node) reused by the scrub. |
| **Build estimate** | Flash + whisper: ~1 day (mostly the transition-tracking + copy-derivation logic; the visual flash itself is small). Ghosted guides: ~1-1.5 days (sun arc is straightforward; the distance-based brighten ramp is the part that could slip to the flat-opacity fallback). Scrubbable history: ~1.5-2 days (snapshot capture is trivial; the lerp-and-relax-during-scrub is the real work). **Total: roughly 3.5-4.5 days.** |
| **Done looks like** | Nobody has to ask "why won't this pull go further," the shell tells them in one line, at the point of contact, once. The sun path and the buildable envelope are visible enough to sculpt against when you're near them and invisible enough to ignore when you're not. Any gesture is reversible by dragging a strip, not by hitting an undo shortcut a fixed number of times and hoping.  |

## 4. Sequencing note

Option A is genuinely shippable alone: it makes the existing sculpt canvas feel
better without touching what it means (still one grab, one pull, one settle). Option B
is legibility layered on top of A's gestures, not a separate track that could ship
first, its flash-and-whisper literally reads state Option A's gestures produce. Build
A, then B, matches both the "ship first / ship second" split Daniel already approved
and the actual dependency graph.

## Open questions for Daniel / Edward

- **Engine unification** (§0): does the sculpted mesh need to feed real pricing before
  `#/shape` can retire, or does the reveal-numbers panel ship first with only
  `ShellStats`-derived numbers (no price) while that bridge is built separately? This
  is the one decision that changes scope more than any single gesture in this doc.
- **Strut-mesh raycasting** for §2.4's inflate trigger (hit-test the lattice interior,
  not just node instances) is flagged as Edward's call, same as the equivalent
  raycast-vs-overlay question already open in `sculpting-gestures.md` §6.
- **Ghosted-guide brighten margin** (§3.2): worth a hands-on pass once built; the
  distance thresholds proposed here are starting points, not tuned values.
