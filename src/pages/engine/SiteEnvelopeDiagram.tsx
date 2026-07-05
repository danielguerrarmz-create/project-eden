/**
 * SiteEnvelopeDiagram.tsx — D1. A plan and a section of the canopy the engine
 * actually generated: the elliptical plan (live planA / planB semi-axes) with
 * the grammar-chosen feet dropped onto their real bearings and the aperture
 * direction called out, above an elevation whose silhouette is the ACTUAL
 * surface curve (canopyProfile) sampled along the aperture axis, so the lifted
 * aperture edge reads higher than its opposite side. Every number is live.
 */
import { canopyProfile } from '../../engine/geometry';
import type { EngineOutputs } from '../../engine/types';
import { AccentMark, DiagramSvg, DimensionLine, LeaderCallout, useInk } from './hairline';

const DEG = Math.PI / 180;

export function SiteEnvelopeDiagram({ outputs }: { outputs: EngineOutputs }) {
  const ink = useInk();
  const { planA, planB, feetCount, footBearingsDeg, riseM, spanM, params } = outputs.geometry;
  const apertureDeg = params.apertureDeg;

  // --- Plan view: ellipse with a = major (E-W), b = minor (N-S) ---
  const cx = 95;
  const cy = 52;
  const planScale = 56 / planA;
  const aU = planA * planScale;
  const bU = planB * planScale;
  // Plan position of a compass bearing on the ellipse edge (r = 1).
  const planPt = (bearingDeg: number, r = 1): [number, number] => {
    const t = bearingDeg * DEG;
    return [cx + r * aU * Math.sin(t), cy - r * bU * Math.cos(t)];
  };

  const [apX, apY] = planPt(apertureDeg, 1.28);

  // --- Elevation: real section along the aperture axis ---
  const baseY = 182;
  const ecx = 95;
  const elevScale = 21;
  const front = canopyProfile(params, apertureDeg); // lifted side
  const back = canopyProfile(params, apertureDeg + 180); // opposite side
  const rightPath = front
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${(ecx + s.radius * elevScale).toFixed(2)} ${(baseY - s.y * elevScale).toFixed(2)}`)
    .join(' ');
  const leftPath = back
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${(ecx - s.radius * elevScale).toFixed(2)} ${(baseY - s.y * elevScale).toFixed(2)}`)
    .join(' ');
  const edgeR = Math.max(front[0].radius, back[0].radius);

  return (
    <DiagramSvg viewBox="0 0 190 200" label="Plan and section of the generated canopy: elliptical plan, feet, aperture and rise">
      {/* Plan: ellipse */}
      <ellipse cx={cx} cy={cy} rx={aU} ry={bU} fill={ink} fillOpacity={0.05} stroke={ink} strokeWidth={0.75} />
      <circle cx={cx} cy={cy} r={0.9} fill={ink} />

      {/* Span dimension across the major axis */}
      <DimensionLine x1={cx - aU} y1={cy + bU + 10} x2={cx + aU} y2={cy + bU + 10} label={`SPAN ${spanM.toFixed(1)}M`} labelOffset={-5} />

      {/* Feet on their real bearings */}
      {footBearingsDeg.map((deg, i) => {
        const [fx, fy] = planPt(deg);
        return <circle key={i} cx={fx} cy={fy} r={2} fill={ink} />;
      })}

      {/* Aperture direction (the lift) — the single accent mark + leader */}
      {(() => {
        const [ex, ey] = planPt(apertureDeg);
        return (
          <>
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={ink} strokeWidth={0.5} opacity={0.6} strokeDasharray="2 1.6" />
            <AccentMark cx={ex} cy={ey} r={2.2} />
            <LeaderCallout from={[ex, ey]} to={[apX, apY]} label="APERTURE" />
          </>
        );
      })()}

      {/* Compass N (top of plan) */}
      <g>
        <path d={`M ${cx} ${cy - bU - 8} L ${cx - 2.4} ${cy - bU - 3} L ${cx + 2.4} ${cy - bU - 3} Z`} fill={ink} />
        <text x={cx} y={cy - bU - 11} fill={ink} fontSize={5} textAnchor="middle" className="font-mono">N</text>
      </g>

      {/* Elevation silhouette (real section, lifted aperture side on the right) */}
      <path d={leftPath} fill="none" stroke={ink} strokeWidth={0.75} />
      <path d={rightPath} fill="none" stroke={ink} strokeWidth={0.75} />
      <line x1={ecx - edgeR * elevScale} y1={baseY} x2={ecx + edgeR * elevScale} y2={baseY} stroke={ink} strokeWidth={0.5} opacity={0.65} />
      <DimensionLine
        x1={ecx + edgeR * elevScale + 8}
        y1={baseY}
        x2={ecx + edgeR * elevScale + 8}
        y2={baseY - riseM * elevScale}
        label={`RISE ${riseM.toFixed(2)}M`}
        labelOffset={7}
      />
      <text x={ecx} y={baseY + 12} fill={ink} fontSize={5} textAnchor="middle" className="font-mono uppercase" opacity={0.75}>
        {feetCount} feet · section on aperture axis
      </text>
    </DiagramSvg>
  );
}
