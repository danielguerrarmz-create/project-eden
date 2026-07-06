/**
 * store.ts — the single zustand design store (single-page studio).
 *
 * The user touches exactly four form parameters (footprint, rise, strut
 * spacing, aperture — demo-spec §2.1) plus the living layer (species, year).
 * Every change runs the pure engine; the store keeps the CLAMPED params the
 * engine actually used, so the UI always reflects what the grammar allowed.
 *
 * Persistence is the URL (demo-spec §1): the design is encoded into query
 * params on every change, so a design can be "sent" as a link. No backend,
 * no accounts.
 */
import { create } from 'zustand';
import { ENVELOPE, GROWTH } from '../data/config';
import { runEngine } from '../engine';
import { DEFAULT_SPECIES_ID, SPECIES_BY_ID } from '../engine/species';
import type { DesignParams, EngineOutputs, JointSystem } from '../engine/types';
import type { Year } from '../data/config';

export type OverlayKey = 'strutHeatmap' | 'growth';

/** The four slider keys, in display order. */
export type SliderKey = 'footprintM2' | 'riseM' | 'strutSpacingM' | 'apertureDeg';

const defaultParams: DesignParams = {
  footprintM2: ENVELOPE.footprintM2.default,
  riseM: ENVELOPE.riseM.default,
  strutSpacingM: ENVELOPE.strutSpacingM.default,
  apertureDeg: ENVELOPE.apertureDeg.default,
  jointSystem: ENVELOPE.jointSystem,
  speciesId: DEFAULT_SPECIES_ID,
  year: 0,
};

// ---------------------------------------------------------------------------
// URL codec — the design IS the link. Short keys, human-readable values.
// ---------------------------------------------------------------------------
const num = (v: string | null): number | undefined => {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function paramsFromURL(): DesignParams {
  if (typeof window === 'undefined') return defaultParams;
  const q = new URLSearchParams(window.location.search);
  const year = num(q.get('y'));
  return {
    footprintM2: num(q.get('a')) ?? defaultParams.footprintM2,
    riseM: num(q.get('r')) ?? defaultParams.riseM,
    strutSpacingM: num(q.get('s')) ?? defaultParams.strutSpacingM,
    apertureDeg: num(q.get('ap')) ?? defaultParams.apertureDeg,
    jointSystem: q.get('j') === 'lamella' ? 'lamella' : q.get('j') === 'hub' ? 'hub' : defaultParams.jointSystem,
    speciesId: q.get('sp') && SPECIES_BY_ID[q.get('sp')!] ? q.get('sp')! : defaultParams.speciesId,
    year: (GROWTH.years as readonly number[]).includes(year ?? -1) ? (year as Year) : 0,
  };
}

function urlFor(params: DesignParams): string {
  const q = new URLSearchParams({
    a: params.footprintM2.toFixed(1),
    r: params.riseM.toFixed(2),
    s: params.strutSpacingM.toFixed(2),
    ap: String(Math.round(params.apertureDeg)),
    j: params.jointSystem,
    sp: params.speciesId,
    y: String(params.year),
  });
  return `${window.location.pathname}?${q}`;
}

let urlTimer: ReturnType<typeof setTimeout> | undefined;
function writeURL(params: DesignParams) {
  if (typeof window === 'undefined') return;
  clearTimeout(urlTimer);
  // Debounced: dragging a slider shouldn't spam history.replaceState.
  urlTimer = setTimeout(() => window.history.replaceState(null, '', urlFor(params)), 180);
}

/** The shareable link for the current design (for the "copy link" affordance). */
export function shareURL(params: DesignParams): string {
  return `${window.location.origin}${urlFor(params)}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface DesignState {
  params: DesignParams; // the CLAMPED params the engine actually used
  outputs: EngineOutputs;
  overlays: Record<OverlayKey, boolean>;
  commissionOpen: boolean;

  reserveEmail: string;
  reserved: boolean;

  setParam: (key: SliderKey, value: number) => void;
  setJointSystem: (system: JointSystem) => void;
  setSpecies: (id: string) => void;
  setYear: (year: Year) => void;
  setOverlay: (key: OverlayKey, on: boolean) => void;
  setCommissionOpen: (open: boolean) => void;
  setReserveEmail: (email: string) => void;
  submitReserve: () => void;
  reset: () => void;
}

const initialParams = paramsFromURL();
const initialOutputs = runEngine(initialParams);

export const useDesign = create<DesignState>((set, get) => {
  /** Run the engine on a param patch; keep the clamped params it returns. */
  const recompute = (patch: Partial<DesignParams>) => {
    const outputs = runEngine({ ...get().params, ...patch });
    const params = { ...outputs.geometry.params };
    writeURL(params);
    return { params, outputs };
  };

  return {
    // The engine may clamp what the URL asked for; trust the engine.
    params: initialOutputs.geometry.params,
    outputs: initialOutputs,
    overlays: { strutHeatmap: true, growth: true },
    commissionOpen: false,

    reserveEmail: '',
    reserved: false,

    setParam: (key, value) => set(recompute({ [key]: value })),

    setJointSystem: (jointSystem) => set(recompute({ jointSystem })),

    setSpecies: (id) => set(recompute({ speciesId: id })),

    setYear: (year) => set(recompute({ year })),

    setOverlay: (key, on) => set((st) => ({ overlays: { ...st.overlays, [key]: on } })),

    setCommissionOpen: (commissionOpen) => set({ commissionOpen }),

    setReserveEmail: (email) => set({ reserveEmail: email }),

    submitReserve: () => {
      const { reserveEmail, outputs } = get();
      // MVP: no backend. Capture intent to console + local state only.
      // eslint-disable-next-line no-console
      console.log('[RESERVE] commission intent captured', {
        email: reserveEmail,
        species: outputs.species.common,
        fixedPriceGBP: outputs.price.fixedTotalGBP,
        dimensions: `${outputs.geometry.spanM} m span × ${outputs.geometry.riseM} m rise`,
        componentCount: outputs.components.totalCount,
        sheets: outputs.nesting.sheets.length,
        shareLink: shareURL(outputs.geometry.params),
      });
      set({ reserved: true });
    },

    reset: () =>
      set(() => {
        const outputs = runEngine(defaultParams);
        writeURL(outputs.geometry.params);
        return {
          params: outputs.geometry.params,
          outputs,
          overlays: { strutHeatmap: true, growth: true },
          commissionOpen: false,
          reserved: false,
          reserveEmail: '',
        };
      }),
  };
});
