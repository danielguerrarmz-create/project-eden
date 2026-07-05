/**
 * store.ts — the single zustand design store (v2 surface).
 *
 * The engine is untouched: it still consumes a full DesignParams and returns
 * EngineOutputs via runEngine (pure). What changed is the SURFACE. The user now
 * touches only three things — a size PRESET, an OPENNESS value, and a SPECIES —
 * plus a mapped PLOT (width, depth, north). deriveParams() folds those few
 * exposed controls back into the engine's full DesignParams, computing the
 * now-hidden knobs (footprint radius, height, enclosure, lattice density,
 * opening + site orientation) so the engine keeps running exactly as before.
 *
 * Honesty note: footprint is CLAMPED to the plot (min(width,depth)/2 minus a
 * setback), so an Eden can never be bigger than the site it was mapped onto.
 */
import { create } from 'zustand';
import { ENVELOPE } from '../data/config';
import { runEngine } from '../engine';
import { DEFAULT_SPECIES_ID } from '../engine/species';
import type { DesignParams, EngineOutputs } from '../engine/types';
import type { Year } from '../data/config';

export type OverlayKey = 'sunPath' | 'strutHeatmap' | 'waterFlow' | 'growth';
export type Step = 1 | 2 | 3;
export type SizePreset = 'intimate' | 'standard' | 'grand';

export interface Plot {
  widthM: number;
  depthM: number;
  northDeg: number; // rotation of the north marker; drives sun-path + orientation
  address: string;
}

/** Size presets -> a target footprint radius + height pair, clamped to the plot. */
export const SIZE_PRESETS: Record<
  SizePreset,
  { label: string; radiusM: number; heightM: number; blurb: string }
> = {
  intimate: { label: 'Intimate', radiusM: 1.9, heightM: 2.5, blurb: 'a private bower for two' },
  standard: { label: 'Standard', radiusM: 2.4, heightM: 3.0, blurb: 'a garden centrepiece' },
  grand: { label: 'Grand', radiusM: 3.1, heightM: 3.5, blurb: 'a gathering pavilion' },
};

const SETBACK_M = 0.6; // keep the Eden off the plot boundary
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The largest footprint radius that fits inside this plot. */
export function plotRadiusCapM(plot: Plot): number {
  const raw = Math.min(plot.widthM, plot.depthM) / 2 - SETBACK_M;
  return clamp(raw, ENVELOPE.footprintRadiusM.min, ENVELOPE.footprintRadiusM.max);
}

/**
 * Fold the few exposed controls back into the engine's full DesignParams.
 * openness01: 0 = enclosed/dense bower, 1 = open/airy screen.
 */
function deriveParams(
  plot: Plot,
  sizePreset: SizePreset,
  openness01: number,
  speciesId: string,
  year: Year,
): DesignParams {
  const preset = SIZE_PRESETS[sizePreset];
  const cap = plotRadiusCapM(plot);
  const footprintRadiusM = clamp(Math.min(preset.radiusM, cap), ENVELOPE.footprintRadiusM.min, ENVELOPE.footprintRadiusM.max);
  const heightM = clamp(preset.heightM, ENVELOPE.heightM.min, ENVELOPE.heightM.max);

  // One openness idea drives both how much of the ring is built AND how tight
  // the lattice weave is. Open = less built arc + sparser struts.
  const enclosurePct = lerp(ENVELOPE.enclosurePct.max, ENVELOPE.enclosurePct.min, openness01);
  const latticeDensity = lerp(ENVELOPE.latticeDensity.max, ENVELOPE.latticeDensity.min, openness01);

  return {
    enclosurePct,
    heightM,
    footprintRadiusM,
    latticeDensity,
    // Opening faces away from the north marker (toward the sun in the N hemisphere).
    openingOrientationDeg: (plot.northDeg + 180) % 360,
    siteOrientationDeg: ((plot.northDeg % 360) + 360) % 360,
    siteLatitudeDeg: ENVELOPE.siteLatitudeDeg.default,
    speciesId,
    year,
  };
}

const initialPlot: Plot = { widthM: 8, depthM: 6, northDeg: 0, address: '' };
const initialPreset: SizePreset = 'standard';
const initialOpenness = 0.5;
const initialParams = deriveParams(initialPlot, initialPreset, initialOpenness, DEFAULT_SPECIES_ID, 0);

interface DesignState {
  // Surface state (what the user touches)
  step: Step;
  plot: Plot;
  sizePreset: SizePreset;
  openness01: number;

  // Engine state (derived)
  params: DesignParams;
  outputs: EngineOutputs;
  overlays: Record<OverlayKey, boolean>;

  // Has the user actively chosen this control yet? Drives the "recommended"
  // pill hint, which shows only on the untouched default option.
  sizeTouched: boolean;
  speciesTouched: boolean;

  reserveEmail: string;
  reserved: boolean;

  setStep: (step: Step) => void;
  setPlot: (patch: Partial<Plot>) => void;
  setSizePreset: (preset: SizePreset) => void;
  setOpenness: (v: number) => void;
  setSpecies: (id: string) => void;
  setYear: (year: Year) => void;
  setOverlay: (key: OverlayKey, on: boolean) => void;
  setReserveEmail: (email: string) => void;
  submitReserve: () => void;
  reset: () => void;
}

export const useDesign = create<DesignState>((set, get) => {
  /** Rebuild derived params + outputs from the current surface state. */
  const recompute = (over: Partial<Pick<DesignState, 'plot' | 'sizePreset' | 'openness01'>> & { speciesId?: string; year?: Year }) => {
    const s = get();
    const plot = over.plot ?? s.plot;
    const sizePreset = over.sizePreset ?? s.sizePreset;
    const openness01 = over.openness01 ?? s.openness01;
    const speciesId = over.speciesId ?? s.params.speciesId;
    const year = over.year ?? s.params.year;
    const params = deriveParams(plot, sizePreset, openness01, speciesId, year);
    return { params, outputs: runEngine(params) };
  };

  return {
    step: 1,
    plot: initialPlot,
    sizePreset: initialPreset,
    openness01: initialOpenness,

    params: initialParams,
    outputs: runEngine(initialParams),
    // Step-driven: heatmap shows the species re-weighting; growth is the star of step 3.
    overlays: { sunPath: false, strutHeatmap: true, waterFlow: false, growth: false },

    sizeTouched: false,
    speciesTouched: false,

    reserveEmail: '',
    reserved: false,

    setStep: (step) => {
      // Overlays follow the step: step 2 proves the species field, step 3 grows it in.
      const overlays =
        step === 3
          ? { sunPath: false, strutHeatmap: false, waterFlow: false, growth: true }
          : { sunPath: false, strutHeatmap: true, waterFlow: false, growth: false };
      set({ step, overlays });
    },

    setPlot: (patch) => {
      const plot = { ...get().plot, ...patch };
      set({ plot, ...recompute({ plot }) });
    },

    setSizePreset: (sizePreset) => set({ sizePreset, sizeTouched: true, ...recompute({ sizePreset }) }),

    setOpenness: (openness01) => set({ openness01, ...recompute({ openness01 }) }),

    setSpecies: (id) => set({ speciesTouched: true, ...recompute({ speciesId: id }) }),

    setYear: (year) => set(recompute({ year })),

    setOverlay: (key, on) => set((st) => ({ overlays: { ...st.overlays, [key]: on } })),

    setReserveEmail: (email) => set({ reserveEmail: email }),

    submitReserve: () => {
      const { reserveEmail, outputs } = get();
      // MVP: no backend. Capture intent to console + local state only.
      // eslint-disable-next-line no-console
      console.log('[RESERVE] commission intent captured', {
        email: reserveEmail,
        species: outputs.species.common,
        priceIncVatGBP: outputs.price.incVatGBP,
        dimensions: `${outputs.geometry.spanM}m span x ${outputs.geometry.heightM}m`,
        componentCount: outputs.components.totalCount,
      });
      set({ reserved: true });
    },

    reset: () =>
      set({
        step: 1,
        plot: initialPlot,
        sizePreset: initialPreset,
        openness01: initialOpenness,
        params: initialParams,
        outputs: runEngine(initialParams),
        overlays: { sunPath: false, strutHeatmap: true, waterFlow: false, growth: false },
        sizeTouched: false,
        speciesTouched: false,
        reserved: false,
        reserveEmail: '',
      }),
  };
});
