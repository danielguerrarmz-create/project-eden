/**
 * HeroCanopyMark.tsx — D-hero. The splash's live brand mark: the same
 * plan-plus-elevation drawing the Engine page teaches in SiteEnvelopeDiagram,
 * built from the identical live engine output (the store's default design), but
 * read as an emblem rather than an instruction sheet.
 *
 * Differences from SiteEnvelopeDiagram, on purpose (spec §1):
 *  - no inline DimensionLine callouts (an emblem, not a dimensioned drawing);
 *  - one AccentMark only, on the aperture bearing (the site convention);
 *  - linework at ~0.55 opacity so the mark sits quietly beside the hero copy;
 *  - one AnnotationStrip beneath carrying real live numbers (span, rise, and the
 *    live fixed price), the one place a number appears before the visitor scrolls.
 *
 * Not a render, not a 3D scene: the exact SVG hairline pipeline the Engine page
 * already ships, sampling the real canopyProfile() surface function.
 */
import { canopyProfile } from '../../engine/geometry';
import type { EngineOutputs } from '../../engine/types';
import { AnnotationStrip } from '../engine/EngineSection';
import { AccentMark, DiagramSvg, useInk } from '../engine/hairline';

const DEG = Math.PI / 180;
const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

export function HeroCanopyMark({ outputs }: { outputs: EngineOutputs }) {
  const ink = useInk();
  const { planA, planB, footBearingsDeg, riseM, spanM, params } = outputs.geometry;
  const apertureDeg = params.apertureDeg;

  // --- Plan view: ellipse with a = major (E-W), b = minor (N-S) ---
  const cx = 95;
  const cy = 52;
  const planScale = 56 / planA;
  const aU = planA * planScale;
  const bU = planB * planScale;
  const planPt = (bearingDeg: number, r = 1): [number, number] => {
    const t = bearingDeg * DEG;
    return [cx + r * aU * Math.sin(t), cy - r * bU * Math.cos(t)];
  };

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

  const [ex, ey] = planPt(apertureDeg);

  return (
    <div>
      <DiagramSvg
        viewBox="0 0 190 200"
        label="Living plan and section of the generated canopy: elliptical plan, feet, and the aperture it lifts toward"
      >
        {/* Quiet linework, one register below the teaching diagram. */}
        <g opacity={0.55}>
          {/* Plan: ellipse */}
          <ellipse cx={cx} cy={cy} rx={aU} ry={bU} fill={ink} fillOpacity={0.05} stroke={ink} strokeWidth={0.75} />
          <circle cx={cx} cy={cy} r={0.9} fill={ink} />

          {/* Feet on their real bearings */}
          {footBearingsDeg.map((deg, i) => {
            const [fx, fy] = planPt(deg);
            return <circle key={i} cx={fx} cy={fy} r={2} fill={ink} />;
          })}

          {/* Aperture direction (the lift), dashed radius, no callout label */}
          <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={ink} strokeWidth={0.5} opacity={0.6} strokeDasharray="2 1.6" />

          {/* Compass N (top of plan) */}
          <path d={`M ${cx} ${cy - bU - 8} L ${cx - 2.4} ${cy - bU - 3} L ${cx + 2.4} ${cy - bU - 3} Z`} fill={ink} />
          <text x={cx} y={cy - bU - 11} fill={ink} fontSize={5} textAnchor="middle" className="font-mono">N</text>

          {/* Elevation silhouette (real section, lifted aperture side on the right) */}
          <path d={leftPath} fill="none" stroke={ink} strokeWidth={0.75} />
          <path d={rightPath} fill="none" stroke={ink} strokeWidth={0.75} />
          <line x1={ecx - edgeR * elevScale} y1={baseY} x2={ecx + edgeR * elevScale} y2={baseY} stroke={ink} strokeWidth={0.5} opacity={0.65} />
        </g>

        {/* The single accent mark on the aperture bearing, at full chroma. */}
        <AccentMark cx={ex} cy={ey} r={2.2} />
      </DiagramSvg>

      <AnnotationStrip>
        span {spanM.toFixed(1)} m · rise {riseM.toFixed(2)} m · fixed price {gbp(outputs.price.fixedTotalGBP)}
      </AnnotationStrip>
    </div>
  );
}
