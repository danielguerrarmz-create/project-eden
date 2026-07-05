import { describe, it, expect } from 'vitest';
import { useDesign, paramsFromURL } from './store';
import { ENVELOPE, GRAMMAR } from '../data/config';
import { riseCapM } from '../engine/grammar';

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
