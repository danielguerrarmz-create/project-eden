import { describe, expect, it } from 'vitest';
import { RAIL_LINES, TOOLS } from './toolCopy';

const sculpt = TOOLS.find((t) => t.id === 'pushpull')!;

describe('the sculpt hint tells the truth about the tool', () => {
  it('names BOTH directions', () => {
    // The regression that matters. This line read "press on it and pull up"
    // while the tool had been bidirectional since the day it was written, and
    // it is shown CONTINUOUSLY while the tool is selected — so it was not a
    // missed toast, it was an active claim that half the tool did not exist.
    expect(sculpt.hint).toContain('up');
    expect(sculpt.hint).toContain('down');
  });

  it('never goes back to naming only the up direction', () => {
    // Guards the exact drift that caused this: a later edit tightening the copy
    // back down to one direction because "pull up" reads cleaner. It does read
    // cleaner. It is also false.
    expect(sculpt.hint).not.toBe('press on it and pull up');
    expect(sculpt.hint.toLowerCase()).not.toMatch(/^press on it and pull up/);
  });

  it('is called sculpt, not push/pull, and not lift', () => {
    // Daniel's ruling. push/pull is Rhino's and SketchUp's vocabulary and the
    // thesis is escaping that room; "lift" only ever named one direction.
    expect(sculpt.label).toBe('sculpt');
    expect(sculpt.label).not.toBe('lift');
  });

  it('keeps the label and the id deliberately apart', () => {
    // Pinned so nobody "fixes" the mismatch by renaming the engine again.
    // Edit.kind is not serialized; the id is free to stay put.
    expect(sculpt.id).toBe('pushpull');
    expect(sculpt.label).not.toBe(sculpt.id);
  });
});

describe('the toolbar', () => {
  it('offers exactly the three gestures, once each', () => {
    expect(TOOLS.map((t) => t.id)).toEqual(['draw', 'pushpull', 'hole']);
  });

  it('gives every tool a label and a hint', () => {
    for (const t of TOOLS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.hint.length).toBeGreaterThan(0);
    }
  });

  it('uses no em or en dash, like every other on-camera string', () => {
    for (const s of [...TOOLS.flatMap((t) => [t.label, t.hint]), ...RAIL_LINES]) {
      expect(/[—–]/.test(s)).toBe(false);
    }
  });
});

describe('the guidance rail', () => {
  it('teaches turning and zooming, and nothing else', () => {
    // Two lines. A third would be the tutorial overlay in a thinner suit, and
    // "another line grows it" is already taught transiently by the caption.
    expect(RAIL_LINES).toHaveLength(2);
  });

  it('names both turn paths, because they are not the same user', () => {
    // right-drag is the mouse's; space is the trackpad's, where two-finger drag
    // is already a wheel event spoken for by zoom.
    expect(RAIL_LINES[0]).toContain('right-drag');
    expect(RAIL_LINES[0]).toContain('space');
  });

  it('stays direction-agnostic about zoom', () => {
    // "scroll to zoom" covers in, out, and the trackpad pinch that arrives as
    // the same wheel event. "Scroll to get closer" is only half true.
    expect(RAIL_LINES[1]).toBe('scroll to zoom');
    expect(RAIL_LINES[1]).not.toContain('closer');
  });

  it('teaches what left-drag does, not only the orbit (spec F2)', () => {
    // First-run guidance has to cover both clicks, not just turning.
    expect(RAIL_LINES[0]).toContain('left-drag');
  });

  it('never promises pan, because enablePan is false', () => {
    // Teaching a gesture the canvas does not have is the exact overclaim the
    // repo's honesty discipline exists to catch.
    for (const line of RAIL_LINES) expect(line.toLowerCase()).not.toContain('pan');
  });
});
