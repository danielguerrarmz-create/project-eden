/**
 * PipelineSchematic.tsx — the lightweight box-and-arrow graphic for section 2.
 *
 * Mirrors the dependency graph in types.ts's own header comment: design params
 * produce a geometry; the geometry fans out to components, the strut field (once
 * read against the sun path), ecology, and growth. Hairline boxes, mono labels,
 * open-circle connectors, no fills, one weight throughout.
 */
import { DiagramSvg, useInk } from './hairline';

function Box({ x, y, w, h, label, ink }: { x: number; y: number; w: number; h: number; label: string; ink: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={ink} strokeWidth={0.6} />
      <text
        x={x + w / 2}
        y={y + h / 2}
        fill={ink}
        fontSize={5.6}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-mono uppercase"
        style={{ letterSpacing: '0.06em' }}
      >
        {label}
      </text>
    </g>
  );
}

function Connector({ x1, y1, x2, y2, ink }: { x1: number; y1: number; x2: number; y2: number; ink: string }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={0.5} opacity={0.8} />
      <circle cx={x2} cy={y2} r={1.4} fill="none" stroke={ink} strokeWidth={0.5} />
    </g>
  );
}

export function PipelineSchematic() {
  const ink = useInk();
  const bh = 22;
  const params = { x: 6, y: 69, w: 58, h: bh };
  const geom = { x: 100, y: 69, w: 52, h: bh };
  const rightX = 214;
  const rightW = 66;
  const outs = [
    { y: 8, label: 'COMPONENTS' },
    { y: 50, label: 'STRUT FIELD' },
    { y: 92, label: 'ECOLOGY' },
    { y: 134, label: 'GROWTH' },
  ];
  const geomOutX = geom.x + geom.w;
  const geomMidY = geom.y + bh / 2;

  return (
    <DiagramSvg viewBox="0 0 290 160" label="The engine pipeline: design parameters to geometry to its four outputs">
      <Connector x1={params.x + params.w} y1={params.y + bh / 2} x2={geom.x} y2={geomMidY} ink={ink} />
      {outs.map((o) => (
        <Connector key={o.label} x1={geomOutX} y1={geomMidY} x2={rightX} y2={o.y + bh / 2} ink={ink} />
      ))}
      <Box {...params} label="DESIGN PARAMS" ink={ink} />
      <Box {...geom} label="GEOMETRY" ink={ink} />
      {outs.map((o) => (
        <Box key={o.label} x={rightX} y={o.y} w={rightW} h={bh} label={o.label} ink={ink} />
      ))}
    </DiagramSvg>
  );
}
