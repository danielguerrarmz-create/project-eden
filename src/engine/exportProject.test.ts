import { describe, it, expect } from 'vitest';
import {
  buildDrawingExport,
  buildProjectExport,
  parseDrawingExport,
  exportFilename,
  DRAWING_FORMAT_VERSION,
} from './exportProject';
import { readDrawing, type Drawing } from './fromDrawing';
import { analyseSite, AUSTIN_PARCELS } from './site';
import { runEngine } from './index';

const drawing: Drawing = {
  spines: [
    { a: { x: -2, y: -2 }, b: { x: 2, y: 2 } },
    { a: { x: 2, y: -2 }, b: { x: -2, y: 2 } },
  ],
};
const site = analyseSite(AUSTIN_PARCELS[0]);
const read = readDrawing(drawing);
const outputs = runEngine(read.params);

describe('drawing export: the one that must round-trip', () => {
  it('is versioned and self-identifying', () => {
    const d = buildDrawingExport(drawing, 0, site);
    expect(d.format).toBe('bower.eden.drawing');
    expect(d.version).toBe(DRAWING_FORMAT_VERSION);
  });

  it('survives a round trip through JSON with the lines intact', () => {
    const d = buildDrawingExport(drawing, 0.25, site);
    const back = parseDrawingExport(JSON.parse(JSON.stringify(d)));
    expect(back).not.toBeNull();
    expect(back!.drawing.spines).toHaveLength(2);
    expect(back!.drawing.spines[0].a.x).toBeCloseTo(-2, 6);
    expect(back!.crownPullM).toBeCloseTo(0.25, 6);
  });

  it('a round-tripped drawing reads to the SAME design', () => {
    const d = buildDrawingExport(drawing, 0, site);
    const back = parseDrawingExport(JSON.parse(JSON.stringify(d)))!;
    expect(readDrawing(back.drawing).params).toEqual(read.params);
  });

  it('omits an absent outline rather than exporting an empty one', () => {
    expect(buildDrawingExport(drawing, 0, site).outline).toBeUndefined();
  });

  it('carries an outline when one was traced', () => {
    const withOutline: Drawing = {
      ...drawing,
      outline: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }],
    };
    const d = buildDrawingExport(withOutline, 0, site);
    expect(d.outline).toHaveLength(3);
    expect(parseDrawingExport(JSON.parse(JSON.stringify(d)))!.drawing.outline).toHaveLength(3);
  });

  it('rejects anything that is not one of ours', () => {
    expect(parseDrawingExport(null)).toBeNull();
    expect(parseDrawingExport(42)).toBeNull();
    expect(parseDrawingExport({})).toBeNull();
    expect(parseDrawingExport({ format: 'something.else', spines: [] })).toBeNull();
  });

  it('is tolerant: drops junk lines instead of throwing the file away', () => {
    const back = parseDrawingExport({
      format: 'bower.eden.drawing',
      version: 1,
      spines: [
        { a: { x: 0, y: 0 }, b: { x: 1, y: 1 } },
        { a: { x: 'oops' }, b: null },
        null,
      ],
    });
    expect(back).not.toBeNull();
    expect(back!.drawing.spines).toHaveLength(1);
  });

  it('defaults a missing crown pull rather than yielding NaN', () => {
    const back = parseDrawingExport({ format: 'bower.eden.drawing', version: 1, spines: [] });
    expect(back!.crownPullM).toBe(0);
  });
});

describe('project export: everything on screen is in the file', () => {
  const p = buildProjectExport(drawing, 0, site, read, outputs);

  it('carries the site, the lines, what was read, and the price', () => {
    expect(p.format).toBe('bower.eden.project');
    expect(p.site!.address).toBe(site.parcel.address);
    expect(p.drawing.spines).toHaveLength(2);
    expect(p.read.params).toEqual(read.params);
    expect(p.price.costBuildUpGBP).toBe(outputs.price.costBuildUpGBP);
  });

  it('carries the reasoning, not just the answers', () => {
    expect(p.read.nudges.length).toBeGreaterThan(0);
    expect(p.site!.reasons.length).toBeGreaterThan(0);
  });

  it('carries the buildable spec: pieces, sheets, screws, plan', () => {
    expect(p.build.pieceCount).toBe(outputs.geometry.pieces.length);
    expect(p.build.groundScrewCount).toBe(outputs.geometry.groundScrewCount);
    expect(p.components).toBeDefined();
    expect(p.nesting).toBeDefined();
    expect(p.buildPlan).toBeDefined();
  });

  it('is actually serialisable — no cycles, no undefined holes', () => {
    const s = JSON.stringify(p);
    expect(s.length).toBeGreaterThan(100);
    expect(() => JSON.parse(s)).not.toThrow();
  });

  it('works with no site chosen', () => {
    const p2 = buildProjectExport(drawing, 0, null, read, outputs);
    expect(p2.site).toBeNull();
    expect(p2.drawing.site).toBeNull();
    expect(() => JSON.stringify(p2)).not.toThrow();
  });
});

describe('exportFilename', () => {
  it('names the parcel so it is findable later', () => {
    expect(exportFilename('project', site)).toBe(`eden-${site.parcel.id}-project.json`);
    expect(exportFilename('drawing', null)).toBe('eden-unsited-drawing.json');
  });
});
