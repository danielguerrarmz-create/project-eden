import { describe, it, expect } from 'vitest';
import { useDesign, paramsFromURL, queryFor, composeDesignUrl } from './store';
import { ENVELOPE, GRAMMAR } from '../data/config';
import { riseCapM } from '../engine/grammar';
import type { DesignParams } from '../engine/types';

/**
 * The store keeps the CLAMPED params the engine actually used, so the UI can
 * never present a design the grammar would reject. These run in node (no
 * window); the URL codec early-returns without one.
 */
describe('design store: the grammar clamps whatever the UI asks for', () => {
  it('clamps an over-range footprint down into the envelope', () => {
    useDesign.getState().setParam('footprintM2', 999);
    expect(useDesign.getState().params.footprintM2).toBeLessThanOrEqual(ENVELOPE.footprintM2.max);
    useDesign.getState().reset();
  });

  it('clamps rise to the governing cap for the current footprint', () => {
    useDesign.getState().setParam('footprintM2', 12);
    useDesign.getState().setParam('riseM', 99);
    const p = useDesign.getState().params;
    expect(p.riseM).toBeLessThanOrEqual(riseCapM(p.footprintM2).cap + 1e-9);
    useDesign.getState().reset();
  });

  it('clamps lattice spacing to the cuttability bounds', () => {
    useDesign.getState().setParam('strutSpacingM', 0.001);
    expect(useDesign.getState().params.strutSpacingM).toBeGreaterThanOrEqual(GRAMMAR.minStrutSpacingM);
    useDesign.getState().reset();
  });

  it('recomputes the engine outputs on every change', () => {
    useDesign.getState().setSpecies('wisteria');
    expect(useDesign.getState().outputs.species.id).toBe('wisteria');
    useDesign.getState().reset();
  });

  it('paramsFromURL returns the defaults when there is no window', () => {
    const p = paramsFromURL();
    expect(p.footprintM2).toBe(ENVELOPE.footprintM2.default);
    expect(p.riseM).toBe(ENVELOPE.riseM.default);
  });
});

describe('the design URL', () => {
  const P: DesignParams = {
    footprintM2: 15,
    riseM: 2.3,
    strutSpacingM: 0.55,
    apertureDeg: 90,
    jointSystem: ENVELOPE.jointSystem,
    speciesId: 'clematis',
    year: 0,
  };

  it('encodes every param needed to restore the design', () => {
    const q = new URLSearchParams(queryFor(P));
    expect(q.get('a')).toBe('15.0');
    expect(q.get('r')).toBe('2.30');
    expect(q.get('ap')).toBe('90');
    expect(q.get('sp')).toBe('clematis');
    expect(q.get('y')).toBe('0');
  });

  it('KEEPS THE HASH ROUTE — touching a param must not navigate you away', () => {
    // Routing is hash-based. Dropping `#/studio` here sends the user to the
    // splash mid-design, and any link they copy goes to the splash too.
    const url = composeDesignUrl('/', P, '#/studio');
    expect(url).toContain('#/studio');
    expect(url).toContain('a=15.0');
    // The query has to precede the hash or it stops being a query.
    expect(url.indexOf('?')).toBeLessThan(url.indexOf('#'));
  });

  it('keeps the drawing flow route too', () => {
    expect(composeDesignUrl('/', P, '#/draw')).toContain('#/draw');
  });

  it('is fine with no hash at all', () => {
    const url = composeDesignUrl('/', P, '');
    expect(url).toBe(`/?${queryFor(P)}`);
  });
});
