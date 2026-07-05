/**
 * SunPathDiagram.tsx — D2. The real sampled sun path (computeSunPath) plotted as
 * altitude vs compass bearing across the modelled day, solar noon marked with the
 * one accent-olive highlight, and an 8-sector compass ring whose fills are the
 * live exposureBySector values the strut optimiser actually reads.
 */
import type { EngineOutputs } from '../../engine/types';
import { AccentMark, DiagramSvg, DimensionLine, INK, useInk } from './hairline';

const SECTOR_NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function SunPathDiagram({ outputs }: { outputs: EngineOutputs }) {
  const ink = useInk();
  const { sunPath } = outputs;
  const above = sunPath.samples.filter((s) => s.altitudeDeg > 0);

  // --- Sun-path arc: azimuth -> x, altitude -> y above a horizon line ---
  const left = 22;
  const right = 168;
  const horizonY = 96;
  const altScale = 0.72; // units per degree of altitude
  const azMin = Math.min(...above.map((s) => s.azimuthDeg));
  const azMax = Math.max(...above.map((s) => s.azimuthDeg));
  const xFor = (az: number) => left + ((az - azMin) / (azMax - azMin || 1)) * (right - left);
  const yFor = (alt: number) => horizonY - alt * altScale;

  const pts = above.map((s) => ({ x: xFor(s.azimuthDeg), y: yFor(s.altitudeDeg), s }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const peak = above.reduce((a, b) => (b.altitudeDeg > a.altitudeDeg ? b : a), above[0]);
  const peakX = xFor(peak.azimuthDeg);
  const peakY = yFor(peak.altitudeDeg);

  // --- Compass ring: 8 sectors, fill opacity from live exposure ---
  const ringCx = 95;
  const ringCy = 152;
  const ringR = 28;
  const exposure = sunPath.exposureBySector;
  let sunwardIdx = 0;
  for (let i = 1; i < exposure.length; i++) if (exposure[i] > exposure[sunwardIdx]) sunwardIdx = i;
  const pOnRing = (compassDeg: number, r = ringR): [number, number] => {
    const rad = (compassDeg * Math.PI) / 180;
    return [ringCx + r * Math.sin(rad), ringCy - r * Math.cos(rad)];
  };

  return (
    <DiagramSvg viewBox="0 0 190 200" label="Sun path across the day and the eight-sector daylight exposure ring">
      {/* Horizon */}
      <line x1={left - 6} y1={horizonY} x2={right + 6} y2={horizonY} stroke={ink} strokeWidth={0.5} opacity={0.65} />
      {/* Sampled sun path */}
      <path d={path} fill="none" stroke={ink} strokeWidth={0.75} />
      {pts.map((p, i) => (
        <line key={i} x1={p.x} y1={p.y - 1.4} x2={p.x} y2={p.y + 1.4} stroke={ink} strokeWidth={0.5} opacity={0.7} />
      ))}
      {/* Solar noon: the one accent mark + a dimension up from the horizon */}
      <DimensionLine x1={peakX} y1={horizonY} x2={peakX} y2={peakY} label={`${sunPath.peakAltitudeDeg.toFixed(0)}°`} labelOffset={8} />
      <AccentMark cx={peakX} cy={peakY} r={2.2} />

      {/* 8-sector compass ring */}
      {exposure.map((e, i) => {
        const a1 = i * 45 - 22.5;
        const a2 = i * 45 + 22.5;
        const [x1, y1] = pOnRing(a1);
        const [x2, y2] = pOnRing(a2);
        const isSun = i === sunwardIdx;
        return (
          <path
            key={i}
            d={`M ${ringCx} ${ringCy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${ringR} ${ringR} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`}
            fill={ink}
            fillOpacity={0.08 + e * 0.32}
            stroke={isSun ? INK.accentOlive : ink}
            strokeWidth={isSun ? 1 : 0.4}
            strokeOpacity={isSun ? 1 : 0.5}
          />
        );
      })}
      {SECTOR_NAMES.map((name, i) => {
        const [x, y] = pOnRing(i * 45, ringR + 5);
        return (
          <text key={name} x={x} y={y} fill={ink} fontSize={4.4} textAnchor="middle" dominantBaseline="middle" className="font-mono" opacity={0.8}>
            {name}
          </text>
        );
      })}
    </DiagramSvg>
  );
}
