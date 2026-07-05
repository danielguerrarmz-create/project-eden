/**
 * SiteEnvelopeDiagram.tsx — D1. The most literal technical-drawing moment on the
 * page: a plan view of the mapped plot with the footprint circle dimensioned, a
 * compass rotated to the site's north, and an elevation whose silhouette is the
 * ACTUAL rib curve from geometry.ts (ribProfile), not a freehand sketch.
 *
 * All numbers are live from the engine outputs + the mapped plot; nothing typed.
 */
import { ribProfile } from '../../engine/geometry';
import type { EngineOutputs } from '../../engine/types';
import type { Plot } from '../../state/store';
import { DiagramSvg, DimensionLine, useInk } from './hairline';

export function SiteEnvelopeDiagram({ outputs, plot }: { outputs: EngineOutputs; plot: Plot }) {
  const ink = useInk();
  const { footprintRadiusM, heightM } = outputs.geometry;

  // --- Plan view: fit the plot into a ~92-unit-wide rectangle ---
  const planW = 92;
  const scale = planW / plot.widthM;
  const planH = plot.depthM * scale;
  const px = 40;
  const py = 16;
  const cx = px + planW / 2;
  const cy = py + planH / 2;
  const rUnits = footprintRadiusM * scale;

  // Compass (top-right of the plan), N arrow rotated by the mapped north.
  const compX = px + planW + 14;
  const compY = py + 8;

  // --- Elevation: real rib silhouette, sampled t = 0..1 ---
  const elevScale = 15; // units per metre
  const baseY = 168;
  const ecx = cx;
  const samples = Array.from({ length: 21 }, (_, i) => i / 20).map((t) => ribProfile(t, footprintRadiusM, heightM));
  const leftPath = samples
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${(ecx - s.radius * elevScale).toFixed(2)} ${(baseY - s.y * elevScale).toFixed(2)}`)
    .join(' ');
  const rightPath = samples
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${(ecx + s.radius * elevScale).toFixed(2)} ${(baseY - s.y * elevScale).toFixed(2)}`)
    .join(' ');
  const apexY = baseY - heightM * elevScale;

  return (
    <DiagramSvg viewBox="0 0 190 190" label="Plan and elevation of the mapped plot and the structure's envelope">
      {/* Plot rectangle (plan) */}
      <rect x={px} y={py} width={planW} height={planH} fill="none" stroke={ink} strokeWidth={0.75} />
      {/* Footprint circle */}
      <circle cx={cx} cy={cy} r={rUnits} fill={ink} fillOpacity={0.06} stroke={ink} strokeWidth={0.75} />
      {/* Radial dimension: centre to footprint edge */}
      <DimensionLine x1={cx} y1={cy} x2={cx + rUnits} y2={cy} label={`R ${footprintRadiusM.toFixed(1)}M`} labelOffset={-5} />
      <circle cx={cx} cy={cy} r={0.9} fill={ink} />

      {/* Plot width + depth dimensions (live) */}
      <DimensionLine x1={px} y1={py - 6} x2={px + planW} y2={py - 6} label={`${plot.widthM.toFixed(1)}M`} labelOffset={-5} />
      <DimensionLine x1={px - 6} y1={py} x2={px - 6} y2={py + planH} label={`${plot.depthM.toFixed(1)}M`} labelOffset={-6} />

      {/* Compass, rotated to the site north */}
      <g transform={`rotate(${plot.northDeg} ${compX} ${compY})`}>
        <line x1={compX} y1={compY + 7} x2={compX} y2={compY - 7} stroke={ink} strokeWidth={0.5} />
        <path d={`M ${compX} ${compY - 9} L ${compX - 2.4} ${compY - 4} L ${compX + 2.4} ${compY - 4} Z`} fill={ink} />
      </g>
      <text x={compX} y={compY + 14} fill={ink} fontSize={5} textAnchor="middle" className="font-mono">N</text>

      {/* Elevation silhouette (real rib curve) + height dimension */}
      <path d={leftPath} fill="none" stroke={ink} strokeWidth={0.75} />
      <path d={rightPath} fill="none" stroke={ink} strokeWidth={0.75} />
      <line x1={ecx - footprintRadiusM * elevScale} y1={baseY} x2={ecx + footprintRadiusM * elevScale} y2={baseY} stroke={ink} strokeWidth={0.5} opacity={0.65} />
      <DimensionLine x1={ecx + footprintRadiusM * elevScale + 8} y1={baseY} x2={ecx + footprintRadiusM * elevScale + 8} y2={apexY} label={`H ${heightM.toFixed(1)}M`} labelOffset={7} />
    </DiagramSvg>
  );
}
