import { describe, expect, it } from 'vitest';
import {
  PUSHPULL_RADIUS_M,
  PULL_LIMIT_M,
  PUSH_LIMIT_M,
  MIN_ARC_DRAG_M,
  MIN_HOLE_RADIUS_M,
  commitGesture,
  holeRadiusM,
  pushPullAmountM,
  toolClaimsPointer,
} from './gesture';

const at = (x: number, y: number) => ({ x, y });
const commit = (tool: 'draw' | 'pushpull' | 'hole', from: { x: number; y: number } | null, to: { x: number; y: number } | null, amountM = 0) =>
  commitGesture({ tool, from, to, amountM });

describe('toolClaimsPointer — who owns the drag', () => {
  it('gives the tool a plain left drag', () => {
    expect(toolClaimsPointer({ button: 0, spaceHeld: false, enabled: true })).toBe(true);
  });

  it('gives RIGHT to the camera, always', () => {
    // The whole bug: DrawStage claimed every button, so a right-drag meant to
    // orbit drew a line instead (verified in a real browser: 2 lines -> 3).
    expect(toolClaimsPointer({ button: 2, spaceHeld: false, enabled: true })).toBe(false);
  });

  it('gives MIDDLE to the camera', () => {
    expect(toolClaimsPointer({ button: 1, spaceHeld: false, enabled: true })).toBe(false);
  });

  it('gives LEFT to the camera while space is held', () => {
    // The trackpad's orbit: two-finger drag is a wheel event and belongs to
    // zoom, so space is the only left-hand path to orbit there.
    expect(toolClaimsPointer({ button: 0, spaceHeld: true, enabled: true })).toBe(false);
  });

  it('claims nothing once baked, whatever the button', () => {
    for (const button of [0, 1, 2]) {
      for (const spaceHeld of [true, false]) {
        expect(toolClaimsPointer({ button, spaceHeld, enabled: false })).toBe(false);
      }
    }
  });
});

describe('commitGesture — excavate needs a real drag', () => {
  it('does NOT open a hole on a bare click', () => {
    // REGRESSION. `r = Math.max(0.35, drag)` committed unconditionally, so a
    // click with no drag at all punched a 0.35 m window in the canopy.
    // Verified in a real browser before the fix: 0 edits -> 1 edit on a click.
    expect(commit('hole', at(2, 2), at(2, 2))).toBeNull();
  });

  it('does NOT open a hole on a click with a pixel of jitter', () => {
    expect(commit('hole', at(2, 2), at(2.02, 1.99))).toBeNull();
  });

  it('does not commit just below the threshold', () => {
    expect(commit('hole', at(0, 0), at(MIN_HOLE_RADIUS_M - 0.01, 0))).toBeNull();
  });

  it('opens a hole at the threshold', () => {
    expect(commit('hole', at(0, 0), at(MIN_HOLE_RADIUS_M, 0))).toEqual({
      kind: 'edit',
      edit: { kind: 'hole', at: at(0, 0), radiusM: MIN_HOLE_RADIUS_M },
    });
  });

  it('sizes the hole by the drag, with no floor inflating it', () => {
    const c = commit('hole', at(1, 1), at(1, 3));
    expect(c).toEqual({ kind: 'edit', edit: { kind: 'hole', at: at(1, 1), radiusM: 2 } });
  });

  it('anchors the hole where the press landed, not where the release did', () => {
    const c = commit('hole', at(-2, 0.5), at(3, 0.5));
    expect(c?.kind === 'edit' && c.edit.kind === 'hole' && c.edit.at).toEqual(at(-2, 0.5));
  });
});

describe('commitGesture — push/pull needs a real drag', () => {
  it('does NOT move the surface on a bare click', () => {
    // push/pull was already guarded (a click yields dy=0), unlike excavate.
    // Pinned so a later refactor cannot give it excavate's bug.
    expect(commit('pushpull', at(0, 0), at(0, 0), 0)).toBeNull();
  });

  it('ignores a pull too small to be meant', () => {
    expect(commit('pushpull', at(0, 0), at(0, 0), 0.04)).toBeNull();
  });

  it('commits on a real pull', () => {
    expect(commit('pushpull', at(1, 2), at(1, 2), 0.5)).toEqual({
      kind: 'edit',
      edit: { kind: 'pushpull', at: at(1, 2), radiusM: PUSHPULL_RADIUS_M, amountM: 0.5 },
    });
  });

  it('PUSHES DOWN as readily as it pulls up, and always has', () => {
    const c = commit('pushpull', at(0, 0), at(0, 0), -0.5);
    expect(c?.kind === 'edit' && c.edit.kind === 'pushpull' && c.edit.amountM).toBe(-0.5);
  });

  it('sizes the move by the drag, never by how far the pointer wandered', () => {
    const near = commit('pushpull', at(0, 0), at(0, 0), 0.4);
    const far = commit('pushpull', at(0, 0), at(9, 9), 0.4);
    expect(far).toEqual(near);
  });
});

describe('commitGesture — draw', () => {
  it('does NOT draw on a bare click', () => {
    expect(commit('draw', at(0, 0), at(0, 0))).toBeNull();
  });

  it('ignores a stroke too short to be a line', () => {
    expect(commit('draw', at(0, 0), at(MIN_ARC_DRAG_M - 0.01, 0))).toBeNull();
  });

  it('draws an arc from a real stroke, end to end', () => {
    expect(commit('draw', at(-3, 0), at(3, 1))).toEqual({
      kind: 'arc',
      spine: { a: at(-3, 0), b: at(3, 1) },
    });
  });
});

describe('commitGesture — a missing endpoint is never a gesture', () => {
  it('commits nothing without a start', () => {
    for (const tool of ['draw', 'pushpull', 'hole'] as const) {
      expect(commit(tool, null, at(2, 2), 1)).toBeNull();
    }
  });

  it('commits nothing without an end', () => {
    for (const tool of ['draw', 'pushpull', 'hole'] as const) {
      expect(commit(tool, at(2, 2), null, 1)).toBeNull();
    }
  });
});

describe('pushPullAmountM', () => {
  it('reads a pull UP the screen as a rise', () => {
    // DrawStage passes (startY - currentY), so a positive dy is upward.
    expect(pushPullAmountM(100)).toBeGreaterThan(0);
  });

  it('reads a push DOWN as a fall', () => {
    expect(pushPullAmountM(-100)).toBeLessThan(0);
  });

  it('clamps a wild drag to what the canopy can take', () => {
    expect(pushPullAmountM(100000)).toBe(PULL_LIMIT_M);
    expect(pushPullAmountM(-100000)).toBe(PUSH_LIMIT_M);
  });

  it('does nothing at rest', () => {
    expect(pushPullAmountM(0)).toBe(0);
  });

  it('is bidirectional END TO END, which is the whole reason for the rename', () => {
    // The claim in one assertion. A drag of the same size up and down produces
    // equal and opposite amounts, and BOTH commit. This was true under the name
    // `lift` too; that is the point. If someone ever makes the tool
    // one-directional again, the copy and the name will still say push/pull,
    // and this is what catches it.
    expect(pushPullAmountM(200)).toBeCloseTo(-pushPullAmountM(-200), 9);
    for (const dy of [200, -200]) {
      const c = commit('pushpull', at(0, 0), at(0, 0), pushPullAmountM(dy));
      expect(c?.kind).toBe('edit');
    }
  });
});

describe('holeRadiusM', () => {
  it('is the plan distance dragged', () => {
    expect(holeRadiusM(at(0, 0), at(3, 4))).toBe(5);
  });

  it('is zero for a click, and is not floored', () => {
    // The live halo reads this, so it must tell the truth about a gesture
    // that is not going to commit.
    expect(holeRadiusM(at(2, 2), at(2, 2))).toBe(0);
  });
});
