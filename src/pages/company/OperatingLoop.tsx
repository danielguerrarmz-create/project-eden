/**
 * OperatingLoop.tsx — the one diagram on the company page.
 *
 * A hairline pentagon of the five things the company does, drawn in the shared
 * technical-drawing vocabulary of the Engine page (0.75px rules, open node
 * rings, mono labels, ink resolved from the section ground). The five ink edges
 * carry the flow design → manufacture → assemble → plant → steward; the single
 * accent-olive edge is the return — steward back to design — the edge that
 * widens the grammar and makes the loop compound rather than merely repeat.
 * Exactly one accent-olive mark, per the house rule. No engine data: this is a
 * schematic of how the company works, robust on its own.
 */
import { useInk, INK } from '../engine/hairline';

interface Node {
  label: string;
  sub: string;
  x: number;
  y: number;
  /** Text anchor + label anchor point for this node's caption. */
  anchor: 'start' | 'middle' | 'end';
  tx: number;
  ty: number;
}

// Pentagon, first vertex at top, clockwise. Center (320,190), radius 120.
const NODES: Node[] = [
  { label: '01 · design', sub: 'generative engine', x: 320, y: 70, anchor: 'middle', tx: 320, ty: 46 },
  { label: '02 · manufacture', sub: 'dfm · cnc', x: 434.13, y: 152.92, anchor: 'start', tx: 452, ty: 149 },
  { label: '03 · assemble', sub: 'crew, then certify', x: 390.53, y: 287.08, anchor: 'start', tx: 406, ty: 299 },
  { label: '04 · plant', sub: 'living armature', x: 249.47, y: 287.08, anchor: 'end', tx: 234, ty: 299 },
  { label: '05 · steward', sub: 'the second half', x: 205.87, y: 152.92, anchor: 'end', tx: 188, ty: 149 },
];

export function OperatingLoop() {
  const ink = useInk();
  const olive = INK.accentOlive;

  return (
    <svg
      viewBox="0 0 640 380"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      role="img"
      aria-label="The operating loop: design, manufacture, assemble, plant, steward. The return edge from steward back to design widens the fabrication grammar, so the loop compounds."
    >
      {/* Four ink flow edges: 01→02→03→04→05 */}
      {NODES.slice(0, 4).map((n, i) => {
        const m = NODES[i + 1];
        return (
          <line
            key={`edge-${i}`}
            x1={n.x}
            y1={n.y}
            x2={m.x}
            y2={m.y}
            stroke={ink}
            strokeWidth={0.75}
          />
        );
      })}

      {/* The single accent-olive edge: the return, 05 (steward) → 01 (design). */}
      <line
        x1={NODES[4].x}
        y1={NODES[4].y}
        x2={NODES[0].x}
        y2={NODES[0].y}
        stroke={olive}
        strokeWidth={1.1}
      />
      {/* Open chevron on the return, pointing into design — the loop closing. */}
      <g stroke={olive} strokeWidth={1.1} fill="none" strokeLinecap="round">
        <line x1={296} y1={78} x2={311} y2={71} />
        <line x1={301} y1={90} x2={311} y2={71} />
      </g>
      <text
        x={252}
        y={102}
        fill={olive}
        fontSize={6.5}
        textAnchor="middle"
        className="font-mono uppercase"
        style={{ letterSpacing: '0.12em' }}
      >
        widens the grammar
      </text>

      {/* Nodes: open ring + filled dot, technical-drawing style. */}
      {NODES.map((n) => (
        <g key={`node-${n.label}`}>
          <circle cx={n.x} cy={n.y} r={7} fill="none" stroke={ink} strokeWidth={0.75} />
          <circle cx={n.x} cy={n.y} r={2.4} fill={ink} />
          <text
            x={n.tx}
            y={n.ty}
            fill={ink}
            fontSize={8.5}
            textAnchor={n.anchor}
            className="font-mono uppercase"
            style={{ letterSpacing: '0.06em' }}
          >
            {n.label}
          </text>
          <text
            x={n.tx}
            y={n.ty + 10}
            fill={ink}
            fontSize={6}
            textAnchor={n.anchor}
            className="font-mono uppercase"
            style={{ letterSpacing: '0.08em', opacity: 0.6 }}
          >
            {n.sub}
          </text>
        </g>
      ))}

      {/* Faint center caption — what the loop is. */}
      <text
        x={320}
        y={185}
        fill={ink}
        fontSize={7}
        textAnchor="middle"
        className="font-mono uppercase"
        style={{ letterSpacing: '0.14em', opacity: 0.4 }}
      >
        it closes
      </text>
      <text
        x={320}
        y={197}
        fill={ink}
        fontSize={7}
        textAnchor="middle"
        className="font-mono uppercase"
        style={{ letterSpacing: '0.14em', opacity: 0.4 }}
      >
        &amp; compounds
      </text>
    </svg>
  );
}
