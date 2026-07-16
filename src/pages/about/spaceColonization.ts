/**
 * spaceColonization.ts — branches that grow into empty space, after Runions et al.
 *
 * "Modeling Trees with a Space Colonization Algorithm" (Adam Runions, Brendan Lane, Przemyslaw
 * Prusinkiewicz; Eurographics Workshop on Natural Phenomena, 2007). The algorithm is the paper's,
 * unmodified; everything page-specific (where the attractors go, where the sources sit) lives in
 * CrossPathsTimeline.tsx, so this module is a generic tool with no opinion about the About page.
 *
 * WHY THIS ALGORITHM, and not a hand-tuned branch layout. Daniel asked for two things at once:
 *
 *   "create branches that continue and take up the empty white space that the project images don't
 *    fill... I'd like for you to actually create an engine or an algorithm that creates the flowers
 *    and makes them grow as the timeline continues."
 *
 * Filling the negative space and avoiding the occupied space are usually two systems that fight —
 * one places ornament, another pushes it out of the way, and the arbitration between them is where
 * the bugs live. Space colonization makes them THE SAME MECHANISM: growth is pulled toward
 * attractor points and consumes them as it arrives, so a region with no attractors is a region
 * nothing grows into. To keep the ornament off a project plate you simply do not scatter attractors
 * on it. There is no collision test anywhere in this file, and there is no need for one.
 *
 * That property is why round 1's whole class of collisions cannot come back here. Those branches
 * were STRUCTURE: they carried the plates, so the layout depended on them, and every rule that
 * kept them apart had to run before the layout was final. These branches are ORNAMENT: they read a
 * finished layout and grow into what is left. If a branch and a plate ever disagree, the branch
 * loses, because the plate was placed before this function was called and cannot hear the answer.
 *
 * The whole thing is deterministic under a seeded PRNG, so a given input grows the same tree
 * forever — cacheable, testable, and curatable the way every other seed on this page is.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** One node of the grown tree. `parent` is an index into the same array; -1 marks a source. */
export interface ColonyNode {
  pos: Vec2;
  parent: number;
}

export interface ColonizeOpts {
  /** The space to fill. Growth is pulled toward these and consumes them on arrival. */
  attractors: readonly Vec2[];
  /** Where growth starts. Each becomes a root node (`parent: -1`). */
  sources: readonly Vec2[];
  /** How far one growth step moves (the paper's D). */
  segment: number;
  /** An attractor only pulls on nodes within this radius (the paper's di). Set it well above
   *  `segment` or growth stalls before it finds anything. */
  influence: number;
  /** An attractor is consumed once any node comes within this radius (the paper's dk). Below
   *  ~2*segment, growth overshoots and curls back on itself. */
  kill: number;
  /** Deterministic [0,1) source. Called once per growth step, for the wobble. */
  rand: () => number;
  /** How far a step may be nudged off the attractors' mean direction, in radians. A little of this
   *  is what separates a drawn branch from a Voronoi skeleton; too much and growth wanders off its
   *  attractors and stalls. */
  wobble?: number;
  /** Hard stops, so a bad parameter set fails fast instead of hanging the paint worker. */
  maxNodes?: number;
  maxSteps?: number;
}

const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const len = (a: Vec2): number => Math.hypot(a.x, a.y);
const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

function norm(a: Vec2): Vec2 {
  const l = len(a);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/**
 * Grow a tree into `attractors` from `sources`. Returns every node, parents first (a node's parent
 * always has a lower index, so a single forward pass can walk the tree).
 *
 * One step of the paper's loop:
 *   1. ASSOCIATE — each attractor picks the single nearest node within `influence`.
 *   2. GROW — each node that was picked by at least one attractor sprouts a child, one `segment`
 *      along the mean of the normalised directions to its attractors. A node pulled from several
 *      sides averages them, which is what makes the branching look decided rather than random.
 *   3. PRUNE — any attractor now within `kill` of a node has been reached, and is consumed.
 * Growth ends when a step sprouts nothing: either the space is full or nothing is in reach.
 */
export function colonize(opts: ColonizeOpts): ColonyNode[] {
  const { segment, influence, kill, rand } = opts;
  const wobble = opts.wobble ?? 0;
  const maxNodes = opts.maxNodes ?? 4000;
  const maxSteps = opts.maxSteps ?? 400;

  const nodes: ColonyNode[] = opts.sources.map((p) => ({ pos: { ...p }, parent: -1 }));
  let live = opts.attractors.map((a) => ({ ...a }));

  for (let step = 0; step < maxSteps && live.length > 0 && nodes.length < maxNodes; step++) {
    // 1. associate: nearest node within the influence radius, per attractor.
    const pull = new Map<number, Vec2>();
    const count = new Map<number, number>();
    for (const a of live) {
      let best = -1;
      let bestD = influence;
      for (let i = 0; i < nodes.length; i++) {
        const d = dist(a, nodes[i].pos);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) continue;
      const dir = norm(sub(a, nodes[best].pos));
      const acc = pull.get(best);
      if (acc) {
        acc.x += dir.x;
        acc.y += dir.y;
      } else {
        pull.set(best, { ...dir });
      }
      count.set(best, (count.get(best) ?? 0) + 1);
    }
    if (pull.size === 0) break;

    // 2. grow: one child per pulled node, along the mean direction plus a little wobble.
    const grown: ColonyNode[] = [];
    for (const [ni, acc] of pull) {
      let dir = norm({ x: acc.x / (count.get(ni) ?? 1), y: acc.y / (count.get(ni) ?? 1) });
      // A node pulled equally from opposite sides averages to nothing; it has no direction to
      // grow, so it simply doesn't. (Without this guard it would sprout a zero-length child and
      // every later step would divide by zero on it.)
      if (len(dir) < 1e-9) continue;
      if (wobble > 0) {
        const a = (rand() * 2 - 1) * wobble;
        const c = Math.cos(a);
        const s = Math.sin(a);
        dir = { x: dir.x * c - dir.y * s, y: dir.x * s + dir.y * c };
      }
      grown.push({
        pos: { x: nodes[ni].pos.x + dir.x * segment, y: nodes[ni].pos.y + dir.y * segment },
        parent: ni,
      });
    }
    if (grown.length === 0) break;
    nodes.push(...grown);

    // 3. prune: every attractor the tree has now reached.
    live = live.filter((a) => !grown.some((n) => dist(a, n.pos) <= kill));
  }

  return nodes;
}

/** One drawable run of the tree, with its place in the hierarchy. */
export interface Branch {
  /** Root-first polyline. */
  pts: Vec2[];
  /**
   * BRANCH ORDER, in the botanical sense: 0 is a run leaving a source (the trunk), 1 is a branch off
   * the trunk, 2 a sub-branch off that, and so on. Order increments at each FORK, not per segment —
   * a long run that never forks is still the same branch, however far it travels.
   */
  order: number;
  /** True when this run ends at a tip rather than at another fork. */
  terminal: boolean;
}

/**
 * Split the tree into drawable runs: one per unbroken stretch from a source or a fork down to a tip
 * or the next fork. Each is root-first, which is the direction the garland composer walks (it tapers
 * a vine from root to tip).
 *
 * Runs are cut at forks rather than traced whole-tip-to-root so that no segment is emitted twice —
 * a shared trunk drawn once per tip would paint over itself and read heavier than the branches it
 * carries. Cutting at forks is also what makes `order` available: a fork is exactly where one branch
 * becomes two, so the hierarchy is a property of this split rather than something measured after.
 */
export function branches(nodes: readonly ColonyNode[]): Branch[] {
  const children = new Map<number, number[]>();
  for (let i = 0; i < nodes.length; i++) {
    const p = nodes[i].parent;
    if (p < 0) continue;
    const arr = children.get(p);
    if (arr) arr.push(i);
    else children.set(p, [i]);
  }

  const out: Branch[] = [];
  // Each run starts at a source or at the child of a fork, and walks down while the path is
  // single-file. A node with 2+ children ends the current run and starts one per child. Walking the
  // starts breadth-first from the sources means a run's order is always known before its children's.
  const orderOf = new Map<number, number>();
  const queue: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].parent < 0) {
      orderOf.set(i, 0);
      queue.push(i);
    }
  }

  while (queue.length > 0) {
    const s = queue.shift()!;
    const order = orderOf.get(s)!;
    const run: Vec2[] = [];
    // Anchor the run at its parent so consecutive runs meet on the paper rather than leaving a
    // `segment`-long gap at every fork.
    if (nodes[s].parent >= 0) run.push({ ...nodes[nodes[s].parent].pos });
    let cur = s;
    for (;;) {
      run.push({ ...nodes[cur].pos });
      const kids = children.get(cur);
      if (!kids || kids.length !== 1) {
        // A run of one point is a node that forked the instant it started (a source whose first step
        // already split). Nothing is drawn for it, so it is not a branch, and its children must NOT
        // count it as their parent tier — otherwise they claim an order whose parent run does not
        // exist, and the hierarchy is a lie from the root down. Only an EMITTED run deepens the order.
        const drawn = run.length >= 2;
        if (drawn) out.push({ pts: run, order, terminal: !kids || kids.length === 0 });
        for (const k of kids ?? []) {
          orderOf.set(k, drawn ? order + 1 : order);
          queue.push(k);
        }
        break;
      }
      cur = kids[0];
    }
  }
  return out;
}

/** mulberry32, seeded from a string with djb2. A tiny self-contained PRNG so the ornament is
 *  reproducible without coupling this module to any particular engine's rng. */
export function seededRandom(seed: string): () => number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
