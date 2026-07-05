/**
 * ParamSlider.tsx — one of the four form parameters, with the constraint beat.
 *
 * THE KEY INTERACTION (demo-spec §2.2): the slider's range IS the live
 * grammar-derived bound, so it physically stops at the rule — and the moment
 * it rests on a bound, a one-line reason appears beneath it. The constraint
 * being visible is what separates the engine from a render toy.
 *
 * Bounds are dynamic: shrink the footprint and the rise slider's max moves
 * (crown curvature governs before the planning cap does); the rise value is
 * clamped by the engine and the caption explains why. aria-live so the reason
 * is announced, not just painted.
 */
import type { ParamBound } from '../engine/types';
import { useDesign, type SliderKey } from '../state/store';
import { deDash } from './text';

interface SliderSpec {
  label: string;
  hint: string;
  step: number;
  format: (v: number) => string;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compassName = (deg: number) => COMPASS[Math.round(((deg % 360) / 22.5)) % 16];

const SPECS: Record<SliderKey, SliderSpec> = {
  footprintM2: {
    label: 'footprint',
    hint: 'plan area of the canopy',
    step: 0.1,
    format: (v) => `${v.toFixed(1)} m²`,
  },
  riseM: {
    label: 'rise',
    hint: 'crown height above ground',
    step: 0.01,
    format: (v) => `${v.toFixed(2)} m`,
  },
  strutSpacingM: {
    label: 'lattice',
    hint: 'strut spacing of the diagrid',
    step: 0.005,
    format: (v) => `${Math.round(v * 1000)} mm`,
  },
  apertureDeg: {
    label: 'aperture',
    hint: 'where the canopy lifts open',
    step: 1,
    format: (v) => `${compassName(v)} · ${Math.round(v)}°`,
  },
};

export function ParamSlider({ param }: { param: SliderKey }) {
  const value = useDesign((s) => s.params[param]);
  const bound: ParamBound = useDesign((s) => s.outputs.bounds[param]);
  const setParam = useDesign((s) => s.setParam);
  const spec = SPECS[param];

  const eps = spec.step / 2;
  const atMin = value <= bound.min + eps && bound.minRule !== '';
  const atMax = value >= bound.max - eps && bound.maxRule !== '';
  const rule = atMax ? bound.maxRule : atMin ? bound.minRule : null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-base font-semibold lowercase text-ink">{spec.label}</span>
          <span className="hidden text-[11px] text-inkFaint sm:inline">{spec.hint}</span>
        </div>
        <span className="font-mono text-[13px] tabular-nums text-ink">{spec.format(value)}</span>
      </div>
      <input
        type="range"
        min={bound.min}
        max={bound.max}
        step={spec.step}
        value={value}
        onChange={(e) => setParam(param, Number(e.target.value))}
        className="botanical mt-2 w-full"
        aria-label={`${spec.label}: ${spec.hint}`}
      />
      {/* The constraint caption: quiet, but the thesis in one line. */}
      <div aria-live="polite" className="min-h-[18px]">
        {rule && (
          <p className="animate-grow-in mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-amber">
            <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
            <span>{deDash(rule)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
