/**
 * formFinding.ts — a de-risking SPIKE of a sculptable, constrained-relaxation
 * gridshell. PURE: no React, no three.js. Node-testable in a plain repl.
 *
 * THE BET (Bower / Project Eden): escape the "params -> one shape" slider model.
 * Instead the user SCULPTS a control lattice — grab a node, pull a region — and a
 * position-based relaxation projects the deformed lattice onto the NEAREST
 * BUILDABLE gridshell, live. The shell visibly SETTLES as you pull and STIFFENS
 * (resists) at the fabrication limits — "clay with a grain".
 *
 * SOLVER — position-based dynamics (PBD, the deterministic cousin of XPBD):
 *   1. predict:     integrate light gravity (so the shell drapes / settles).
 *   2. grab:        pull the grabbed node + a falloff region toward the cursor.
 *   3. distance:    project every strut toward its buildable length (below).
 *   4. ground:      feet pinned at y=0; no node may sink below the lawn.
 *   5. finalize:    derive velocity from the position delta, with damping.
 * A few iterations of (2..4) per frame. Feet are infinite-mass anchors (w=0).
 *
 * BUILDABILITY ENFORCEMENT — the whole trick, in `bandTarget()`:
 *   Each strut has a rest length and a per-strut BUILDABLE BAND [lmin, lmax] that
 *   sits strictly INSIDE the fabrication grammar's hard limits (minStrutSpacingM
 *   .. maxComponentLengthM from data/config GRAMMAR). Within the band the strut is
 *   soft — it barely resists, so the lattice deforms like clay and only weakly
 *   remembers its rest length (`grain`). At a band edge it becomes RIGID: the
 *   constraint projects it exactly back to the edge. So a pull that would stretch a
 *   strut past fabrication stops feeling like clay and starts feeling like a rod —
 *   the fab limit is something you feel with the cursor, and the settled shell is
 *   buildable by construction (no strut ever leaves the hard limits).
 *
 * This is XPBD-lite on purpose (see the plan doc): plain PBD with a per-band
 * rigidity law is deterministic and trivially unit-testable; true XPBD compliance
 * (dt²/α, order-independent stiffness) is the production upgrade, noted as such.
 */
import { GRAMMAR } from '../data/config';

export type Vec3 = readonly [number, number, number];

/** One buildable strut = one distance constraint between two lattice nodes. */
export interface Strut {
  a: number; // node index
  b: number; // node index
  rest: number; // rest length (m) at seed
  lmin: number; // soft band lower edge (m) — rigid below
  lmax: number; // soft band upper edge (m) — rigid above
  kind: 'diagrid' | 'ring' | 'radial' | 'eave';
}

/**
 * The full solver state. Positions are a flat Float64Array (3 per node) so a
 * relax step allocates nothing; `invMass[i] = 0` pins node i (a foot / anchor).
 */
export interface GridShell {
  n: number; // node count
  pos: Float64Array; // 3n — live positions
  prev: Float64Array; // 3n — positions last step (for velocity)
  invMass: Float64Array; // n — 0 = pinned
  struts: Strut[];
  feet: number[]; // node indices pinned to the ground
  rings: number; // topology (rings of nodes, crown..eave)
  spokes: number; // topology (spokes around)
  /** Grabbed region: node -> target this frame + follow weight (0..1). */
  grab: GrabPoint[] | null;
}

export interface GrabPoint {
  node: number;
  /** Original position at grab-start (world). */
  origin: Vec3;
  /** How strongly this node follows the drag delta (1 at the seed). */
  weight: number;
}

// --- fabrication grammar, surfaced as the HARD limits buildability is judged on ---
/** Absolute cuttable strut-length limits from the grammar. Nothing may leave these. */
export const FAB_MIN_M = GRAMMAR.minStrutSpacingM; // 0.25 — joints overlap below this
export const FAB_MAX_M = GRAMMAR.maxComponentLengthM; // 2.35 — longest blank off a sheet

export interface SolveOpts {
  /** Constraint iterations per relax() call (Gauss–Seidel sweeps). */
  iterations: number;
  /** Timestep (s). Fixed 1/60 for a stable, framerate-independent feel. */
  dt: number;
  /** Downward settling accel (m/s²) — light, so the shell drapes not collapses. */
  gravity: number;
  /** Velocity retained per step (0..1); <1 bleeds energy so it settles. */
  damping: number;
  /** How hard a grabbed node chases its target per iteration (0..1). */
  grabStiffness: number;
  /** In-band rest-length memory (0 = pure clay, 1 = stiff spring). */
  grain: number;
  /**
   * Grab-free distance+ground sweeps AFTER the main loop — the buildability
   * projection. Buildability is the FINAL authority: however hard the cursor
   * pulls, these sweeps clamp every strut back inside the fab band, so the
   * returned shell is always buildable and a grabbed node visibly RESISTS
   * (lags the cursor) once its struts max out. This is "project onto the
   * nearest buildable gridshell", made literal.
   */
  projectionSweeps: number;
}

export const DEFAULT_OPTS: SolveOpts = {
  iterations: 8,
  dt: 1 / 60,
  gravity: 2.4,
  damping: 0.9,
  grabStiffness: 0.85,
  grain: 0.12,
  projectionSweeps: 6,
};

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const smoothstep = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

// ---------------------------------------------------------------------------
// THE BUILDABILITY LAW — pure, the most-tested function in the module.
// ---------------------------------------------------------------------------
/**
 * Desired length for a strut currently at `len`, given its buildable band and the
 * in-band grain. This single function is the whole "clay with a grain" behaviour:
 *
 *   len > lmax  -> lmax           (rigid: snap to the upper fab edge)
 *   len < lmin  -> lmin           (rigid: snap to the lower fab edge)
 *   else        -> len + grain·(rest − len)   (soft: weak pull toward rest)
 *
 * With grain=0 the interior is pure clay (holds any deformed length inside the
 * band); grain=1 it springs fully back to rest. The band edges are always rigid,
 * so the returned length is ALWAYS within [lmin, lmax] ⊂ [FAB_MIN, FAB_MAX].
 */
export function bandTarget(len: number, rest: number, lmin: number, lmax: number, grain: number): number {
  if (len > lmax) return lmax;
  if (len < lmin) return lmin;
  return len + grain * (rest - len);
}

/** Buildable band for a strut of rest length `rest`, clamped inside the fab limits. */
export function buildBand(rest: number): { lmin: number; lmax: number } {
  // Clay range ±: shrink to half, stretch to 1.6×, then clamp to the hard fab limits.
  const lmin = Math.max(FAB_MIN_M, rest * 0.5);
  const lmax = Math.min(FAB_MAX_M, rest * 1.6);
  return { lmin: Math.min(lmin, lmax), lmax };
}

// ---------------------------------------------------------------------------
// TOPOLOGY — build a buildable elliptical gridshell (crown oculus -> eave, on feet)
// ---------------------------------------------------------------------------
export interface ShellOpts {
  /** Rings of nodes from crown (0) to eave (rings). */
  rings: number;
  /** Spokes around the plan. */
  spokes: number;
  /** Plan semi-axes (m): a = major (X), b = minor (Z). */
  a: number;
  b: number;
  /** Crown height (m). */
  rise: number;
  /** Crown oculus radius as a fraction of the edge (diagrid starts here). */
  oculus: number;
  /** How many feet (grounded anchors) — evenly spaced spokes. */
  feet: number;
}

export const DEFAULT_SHELL: ShellOpts = {
  // A polar grid converges toward the crown, so oculus + spoke count are chosen
  // so EVERY seed strut — including the shortest crown-ring and near-crown radial
  // — is born inside the fabrication limits. See the params sweep in the plan doc.
  rings: 6,
  spokes: 18,
  a: 2.2,
  b: 1.76,
  rise: 2.3,
  oculus: 0.43,
  feet: 4,
};

/** Catenary-ish cap profile: 1 at the crown (r=0), 0 at the edge (r=1). */
function capProfile(r: number): number {
  const k = 1.1;
  return (Math.cosh(k) - Math.cosh(k * r)) / (Math.cosh(k) - 1);
}

const TWO_PI = Math.PI * 2;

/**
 * Build the seed gridshell: node positions on an elliptical dome, distance
 * constraints for the diagrid (two diagonal families) + ring hoops + the eave
 * ring, and `feet` grounded anchors. Rest lengths + bands come from the seed.
 */
export function buildGridshell(opts: Partial<ShellOpts> = {}): GridShell {
  const o = { ...DEFAULT_SHELL, ...opts };
  const { rings, spokes, a, b, rise, oculus, feet } = o;

  const n = (rings + 1) * spokes;
  const pos = new Float64Array(n * 3);
  const invMass = new Float64Array(n).fill(1);

  const idx = (i: number, j: number) => i * spokes + ((j % spokes) + spokes) % spokes;
  const rAt = (i: number) => oculus + (1 - oculus) * (i / rings);
  const thetaAt = (j: number) => (j / spokes) * TWO_PI;

  // Feet sit on the eave ring at evenly spaced spokes.
  const footSpokes = Array.from({ length: feet }, (_, k) => Math.round((k / feet) * spokes) % spokes);

  for (let i = 0; i <= rings; i++) {
    const r = rAt(i);
    for (let j = 0; j < spokes; j++) {
      const th = thetaAt(j);
      const isFoot = i === rings && footSpokes.includes(j);
      const y = isFoot ? 0 : Math.max(0, capProfile(r) * rise * (i === rings ? 0.62 : 1));
      const k = idx(i, j) * 3;
      pos[k] = a * r * Math.sin(th); // +X = east
      pos[k + 1] = y;
      pos[k + 2] = b * r * Math.cos(th); // +Z = north
    }
  }

  const feetNodes: number[] = [];
  for (const j of footSpokes) {
    const node = idx(rings, j);
    invMass[node] = 0; // pinned anchor
    feetNodes.push(node);
  }

  const struts: Strut[] = [];
  const addStrut = (av: number, bv: number, kind: Strut['kind']) => {
    const rest = Math.hypot(
      pos[av * 3] - pos[bv * 3],
      pos[av * 3 + 1] - pos[bv * 3 + 1],
      pos[av * 3 + 2] - pos[bv * 3 + 2],
    );
    const { lmin, lmax } = buildBand(rest);
    struts.push({ a: av, b: bv, rest, lmin, lmax, kind });
  };

  // A classic TRIANGULATED gridshell: ring hoops + radial ties + ONE diagonal
  // family per quad. Rings+radials alone make quads (a floppy mechanism that a
  // relaxation would shear flat); the single diagonal splits every quad into two
  // triangles, so the lattice is genuinely rigid — it holds a fair surface under
  // relaxation instead of collapsing. (geometry.ts renders a static double-diagrid
  // and can skip this because it never relaxes; a solver cannot.)
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < spokes; j++) {
      addStrut(idx(i, j), idx(i + 1, j), 'radial'); // radial tie
      addStrut(idx(i, j), idx(i + 1, j + 1), 'diagrid'); // the triangulating diagonal
    }
  }
  // Ring hoops (each ring a closed loop — the compression/tension rings).
  for (let i = 0; i <= rings; i++) {
    for (let j = 0; j < spokes; j++) {
      addStrut(idx(i, j), idx(i, j + 1), i === rings ? 'eave' : 'ring');
    }
  }

  const prev = pos.slice();
  return { n, pos, prev, invMass, struts, feet: feetNodes, rings, spokes, grab: null };
}

// ---------------------------------------------------------------------------
// GRAB — pick a node, build a falloff region, drag it
// ---------------------------------------------------------------------------
export function getPos(s: GridShell, node: number): Vec3 {
  const k = node * 3;
  return [s.pos[k], s.pos[k + 1], s.pos[k + 2]];
}

/** Nearest node to a world point (brute force — n is small). */
export function nearestNode(s: GridShell, p: Vec3): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < s.n; i++) {
    const k = i * 3;
    const d = (s.pos[k] - p[0]) ** 2 + (s.pos[k + 1] - p[1]) ** 2 + (s.pos[k + 2] - p[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Begin a grab at `seed`, building a smooth falloff region of radius `radius` (m)
 * around it. Weight = smoothstep(1 − d/radius), so the seed follows the cursor 1:1
 * and the region trails off. Pinned nodes (feet) are excluded so a foot never lifts.
 */
export function beginGrab(s: GridShell, seed: number, radius: number): GridShell {
  const sp = getPos(s, seed);
  const grab: GrabPoint[] = [];
  for (let i = 0; i < s.n; i++) {
    if (s.invMass[i] === 0) continue;
    const p = getPos(s, i);
    const d = Math.hypot(p[0] - sp[0], p[1] - sp[1], p[2] - sp[2]);
    if (d > radius) continue;
    grab.push({ node: i, origin: p, weight: smoothstep(1 - d / radius) });
  }
  return { ...s, grab };
}

/** Set the current drag target for the seed; the region trails by its weight. */
export function moveGrab(s: GridShell, seed: number, target: Vec3): void {
  if (!s.grab) return;
  const seedOrigin = s.grab.find((g) => g.node === seed)?.origin;
  if (!seedOrigin) return;
  const delta: Vec3 = [target[0] - seedOrigin[0], target[1] - seedOrigin[1], target[2] - seedOrigin[2]];
  // Stash the delta on the grab points as their per-node desired positions.
  for (const g of s.grab) {
    (g as GrabPoint & { desired?: Vec3 }).desired = [
      g.origin[0] + delta[0] * g.weight,
      g.origin[1] + delta[1] * g.weight,
      g.origin[2] + delta[2] * g.weight,
    ];
  }
}

export function endGrab(s: GridShell): GridShell {
  return { ...s, grab: null };
}

// ---------------------------------------------------------------------------
// SOLVER — one relaxation step
// ---------------------------------------------------------------------------
/**
 * Advance the shell one step: predict under gravity, then `iterations` sweeps of
 * grab + distance + ground constraints, then derive velocity. Mutates `s.pos` /
 * `s.prev` in place (no allocation). Deterministic given inputs.
 */
export function relax(s: GridShell, opts: SolveOpts = DEFAULT_OPTS): void {
  const { pos, prev, invMass, n } = s;
  const { dt, gravity, damping, iterations, grabStiffness, grain, projectionSweeps } = opts;

  // 1. Predict: verlet-style integrate velocity (pos−prev) + gravity.
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    if (invMass[i] === 0) {
      // Pinned: keep prev==pos so it contributes zero velocity.
      prev[k] = pos[k];
      prev[k + 1] = pos[k + 1];
      prev[k + 2] = pos[k + 2];
      continue;
    }
    const vx = (pos[k] - prev[k]) * damping;
    const vy = (pos[k + 1] - prev[k + 1]) * damping;
    const vz = (pos[k + 2] - prev[k + 2]) * damping;
    prev[k] = pos[k];
    prev[k + 1] = pos[k + 1];
    prev[k + 2] = pos[k + 2];
    pos[k] += vx;
    pos[k + 1] += vy - gravity * dt * dt;
    pos[k + 2] += vz;
  }

  // 2..4. Constraint sweeps.
  for (let iter = 0; iter < iterations; iter++) {
    // Grab: pull each grabbed node toward its desired position.
    if (s.grab) {
      for (const g of s.grab) {
        const d = (g as GrabPoint & { desired?: Vec3 }).desired;
        if (!d || invMass[g.node] === 0) continue;
        const k = g.node * 3;
        pos[k] += (d[0] - pos[k]) * grabStiffness;
        pos[k + 1] += (d[1] - pos[k + 1]) * grabStiffness;
        pos[k + 2] += (d[2] - pos[k + 2]) * grabStiffness;
      }
    }

    // Distance: project every strut toward its buildable length.
    for (let c = 0; c < s.struts.length; c++) {
      solveStrut(pos, invMass, s.struts[c], grain);
    }

    // Ground: no node below the lawn; feet stay exactly at 0 (they're pinned anyway).
    for (let i = 0; i < n; i++) {
      const k = i * 3 + 1;
      if (pos[k] < 0) pos[k] = 0;
    }
  }

  // 5. Buildability projection — grab-free distance+ground sweeps. This is the
  // final authority: it clamps every strut back into its fab band no matter how
  // hard the grab pulled, so the returned shell is buildable by construction.
  for (let iter = 0; iter < projectionSweeps; iter++) {
    for (let c = 0; c < s.struts.length; c++) {
      solveStrut(pos, invMass, s.struts[c], grain);
    }
    for (let i = 0; i < n; i++) {
      const k = i * 3 + 1;
      if (pos[k] < 0) pos[k] = 0;
    }
  }
}

/** Project one strut toward bandTarget(), distributing by inverse mass. Mutates pos. */
export function solveStrut(pos: Float64Array, invMass: Float64Array, st: Strut, grain: number): void {
  const ka = st.a * 3;
  const kb = st.b * 3;
  const dx = pos[kb] - pos[ka];
  const dy = pos[kb + 1] - pos[ka + 1];
  const dz = pos[kb + 2] - pos[ka + 2];
  const len = Math.hypot(dx, dy, dz) || 1e-9;
  const target = bandTarget(len, st.rest, st.lmin, st.lmax, grain);
  const wa = invMass[st.a];
  const wb = invMass[st.b];
  const wsum = wa + wb;
  if (wsum === 0) return;
  // C = len − target; move both ends along the axis to hit target, mass-weighted.
  const diff = (len - target) / len / wsum;
  const cx = dx * diff;
  const cy = dy * diff;
  const cz = dz * diff;
  pos[ka] += cx * wa;
  pos[ka + 1] += cy * wa;
  pos[ka + 2] += cz * wa;
  pos[kb] -= cx * wb;
  pos[kb + 1] -= cy * wb;
  pos[kb + 2] -= cz * wb;
}

// ---------------------------------------------------------------------------
// READOUT — buildability + geometry stats for the live HUD (and tests)
// ---------------------------------------------------------------------------
export interface ShellStats {
  nodes: number;
  struts: number;
  minLen: number;
  maxLen: number;
  meanLen: number;
  /** Struts outside the HARD fabrication limits [FAB_MIN, FAB_MAX]. Should be 0. */
  outOfSpec: number;
}

export function strutLength(s: GridShell, st: Strut): number {
  const ka = st.a * 3;
  const kb = st.b * 3;
  return Math.hypot(s.pos[kb] - s.pos[ka], s.pos[kb + 1] - s.pos[ka + 1], s.pos[kb + 2] - s.pos[ka + 2]);
}

export function shellStats(s: GridShell): ShellStats {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let out = 0;
  for (const st of s.struts) {
    const L = strutLength(s, st);
    if (L < min) min = L;
    if (L > max) max = L;
    sum += L;
    if (L < FAB_MIN_M - 1e-6 || L > FAB_MAX_M + 1e-6) out++;
  }
  return {
    nodes: s.n,
    struts: s.struts.length,
    minLen: min,
    maxLen: max,
    meanLen: sum / s.struts.length,
    outOfSpec: out,
  };
}

/** Line segments (start/end world points) for rendering the struts. */
export function strutSegments(s: GridShell): { start: Vec3; end: Vec3; kind: Strut['kind'] }[] {
  return s.struts.map((st) => ({ start: getPos(s, st.a), end: getPos(s, st.b), kind: st.kind }));
}
