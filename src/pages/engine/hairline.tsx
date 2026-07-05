/**
 * hairline.tsx — the shared technical-drawing vocabulary for the Engine page.
 *
 * Every diagram is built from these primitives so all four stay identical in
 * stroke weight and annotation style (DESIGN-DIRECTION.md §4): 0.5px extension /
 * leader lines, 0.75px dimension lines with open tick terminators (architectural
 * convention, not filled engineering arrowheads), mono labels, and exactly one
 * accent-olive mark per diagram.
 *
 * Ink is resolved from context (the section ground decides navy vs black) with an
 * optional per-call override, so a future field-color change touches one prop.
 */
import { createContext, useContext, useId, type ReactNode } from 'react';

export const INK = {
  inkNavy: '#232C5E',
  inkBlack: '#17160F',
  accentOlive: '#ACC13A',
} as const;

const InkContext = createContext<string>(INK.inkBlack);
export const InkProvider = InkContext.Provider;

/** Resolve the active ink color: explicit prop wins, else the section context. */
export function useInk(explicit?: string): string {
  const ctx = useContext(InkContext);
  return explicit ?? ctx;
}

const PRIMARY = 0.75;
const SECONDARY = 0.5;

/** Unit vectors along and perpendicular to a segment. */
function frame(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return { ux, uy, px: -uy, py: ux, len };
}

interface DimProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  ink?: string;
  /** Perpendicular offset of the label from the line (drawing units). */
  labelOffset?: number;
  tick?: number;
  fontSize?: number;
}

/** A dimension line: 0.75px rule, open perpendicular ticks at each end, mono label. */
export function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  ink,
  labelOffset = 7,
  tick = 2,
  fontSize = 6,
}: DimProps) {
  const color = useInk(ink);
  const { px, py } = frame(x1, y1, x2, y2);
  const mx = (x1 + x2) / 2 + px * labelOffset;
  const my = (y1 + y2) / 2 + py * labelOffset;
  const endTick = (cx: number, cy: number) => (
    <line
      x1={cx - px * tick}
      y1={cy - py * tick}
      x2={cx + px * tick}
      y2={cy + py * tick}
      stroke={color}
      strokeWidth={PRIMARY}
    />
  );
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={PRIMARY} />
      {endTick(x1, y1)}
      {endTick(x2, y2)}
      <text
        x={mx}
        y={my}
        fill={color}
        fontSize={fontSize}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-mono uppercase"
        style={{ letterSpacing: '0.04em' }}
      >
        {label}
      </text>
    </g>
  );
}

/** A thin 0.5px extension line running from a geometry point out to a dimension. */
export function ExtensionLine({
  x,
  y,
  length,
  angle,
  ink,
}: {
  x: number;
  y: number;
  length: number;
  angle: number;
  ink?: string;
}) {
  const color = useInk(ink);
  const rad = (angle * Math.PI) / 180;
  return (
    <line
      x1={x}
      y1={y}
      x2={x + Math.cos(rad) * length}
      y2={y + Math.sin(rad) * length}
      stroke={color}
      strokeWidth={SECONDARY}
      opacity={0.65}
    />
  );
}

/** A dashed leader terminating in a small OPEN circle, with a mono label at the free end. */
export function LeaderCallout({
  from,
  to,
  label,
  ink,
  fontSize = 5.5,
}: {
  from: [number, number];
  to: [number, number];
  label: string;
  ink?: string;
  fontSize?: number;
}) {
  const color = useInk(ink);
  const [fx, fy] = from;
  const [tx, ty] = to;
  const labelRight = tx >= fx;
  return (
    <g>
      <line
        x1={fx}
        y1={fy}
        x2={tx}
        y2={ty}
        stroke={color}
        strokeWidth={SECONDARY}
        strokeDasharray="2 1.6"
      />
      <circle cx={fx} cy={fy} r={1.6} fill="none" stroke={color} strokeWidth={SECONDARY} />
      <text
        x={tx + (labelRight ? 2.5 : -2.5)}
        y={ty}
        fill={color}
        fontSize={fontSize}
        textAnchor={labelRight ? 'start' : 'end'}
        dominantBaseline="middle"
        className="font-mono uppercase"
        style={{ letterSpacing: '0.04em' }}
      >
        {label}
      </text>
    </g>
  );
}

/** Architectural section hatch: 0.5px parallel lines, >=4px spacing, clipped to a rect. */
export function SectionHatch({
  x,
  y,
  width,
  height,
  ink,
  spacing = 4,
  angle = 45,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  ink?: string;
  spacing?: number;
  angle?: number;
}) {
  const color = useInk(ink);
  const id = useId().replace(/:/g, '');
  const patternId = `hatch-${id}`;
  return (
    <g>
      <defs>
        <pattern
          id={patternId}
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${angle})`}
        >
          <line x1={0} y1={0} x2={0} y2={spacing} stroke={color} strokeWidth={SECONDARY} opacity={0.7} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${patternId})`} />
    </g>
  );
}

/** The single accent-olive mark permitted per diagram (a filled highlight dot). */
export function AccentMark({ cx, cy, r = 2.4 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill={INK.accentOlive} />;
}

/** Small helper for grouping a diagram's SVG with a consistent responsive frame. */
export function DiagramSvg({
  viewBox,
  children,
  label,
  className = '',
}: {
  viewBox: string;
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
      className={`h-auto w-full ${className}`}
    >
      {children}
    </svg>
  );
}
