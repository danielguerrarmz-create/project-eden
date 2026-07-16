/**
 * PlanCanvas.tsx — steps 2 and 3: draw it badly, on purpose.
 *
 * Two moves, both crude by design:
 *   TRACE  — scribble a loose blob: "about this big, about here".
 *   SPINES — drag a stroke from one ground point to another. Each stroke is an
 *            arch; its two ends are feet. Two strokes = four feet.
 *
 * The point is that neither move is precise and neither needs to be. The
 * engine reads intent (area, contacts, the gap they leave) and fits it to the
 * buildable family — see engine/fromDrawing.ts. The user is never asked for a
 * number. The drawing is the input.
 *
 * Everything here works in PLAN METRES about the placement centre; the SVG is
 * flipped once so +y is north and children never think about screen space.
 */
import { useCallback, useRef, useState } from 'react';
import type { Pt, Spine } from '../../engine/fromDrawing';

export type DrawMode = 'trace' | 'spines';

export function PlanCanvas({
  mode,
  outline,
  spines,
  clearRadiusM,
  onOutline,
  onSpine,
}: {
  mode: DrawMode;
  outline: Pt[];
  spines: Spine[];
  /** The clear radius the site step found — drawn as the room you actually have. */
  clearRadiusM: number;
  onOutline: (pts: Pt[]) => void;
  onSpine: (s: Spine) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);

  // REFS ARE THE TRUTH; state only mirrors them for painting.
  //
  // A stroke arrives as a burst of pointer events. React batches state updates,
  // so a handler that reads the `wip` STATE reads whatever the last render saw
  // — which, mid-burst, is the empty array the stroke started from. With real
  // pointer events you usually get away with it (one event per task, so a
  // re-render lands in between); batch them, or drag fast enough, and the
  // finished stroke is silently discarded on pointerup. Keep the authoritative
  // copy in a ref and read THAT when committing.
  const wipRef = useRef<Pt[]>([]);
  const [wip, setWip] = useState<Pt[]>([]);
  const spineStartRef = useRef<Pt | null>(null);
  const spineNowRef = useRef<Pt | null>(null);
  const [spineStart, setSpineStart] = useState<Pt | null>(null);
  const [spineNow, setSpineNow] = useState<Pt | null>(null);

  // The field FRAMES the room you actually have. A fixed field either crops a
  // big yard or strands a small one in whitespace; either way the lawn stops
  // meaning anything and "about this big" loses its only reference.
  const fieldM = Math.max(2.6, clearRadiusM * 1.22);

  /**
   * Screen -> plan metres. The one place coordinates get converted.
   * The viewBox is square and preserveAspectRatio letterboxes it, so the live
   * scale is set by the SHORTER side — using width for x would skew every
   * point on any non-square stage.
   */
  const toPlan = useCallback(
    (e: React.PointerEvent): Pt => {
      const r = ref.current!.getBoundingClientRect();
      const side = Math.min(r.width, r.height);
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return {
        x: ((e.clientX - cx) / (side / 2)) * fieldM,
        y: -((e.clientY - cy) / (side / 2)) * fieldM, // flip: screen down -> plan north
      };
    },
    [fieldM],
  );

  const down = (e: React.PointerEvent) => {
    // Guarded: setPointerCapture THROWS for a pointerId the browser isn't
    // tracking (synthetic events, some pen/touch stacks). An exception here
    // kills the handler and the stroke silently never starts.
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* capture is an optimisation, not a requirement — drawing works without it */
    }
    const p = toPlan(e);
    if (mode === 'trace') {
      drawing.current = true;
      wipRef.current = [p];
      setWip(wipRef.current);
    } else {
      spineStartRef.current = p;
      spineNowRef.current = p;
      setSpineStart(p);
      setSpineNow(p);
    }
  };

  const move = (e: React.PointerEvent) => {
    const p = toPlan(e);
    if (mode === 'trace' && drawing.current) {
      // Thin the stroke: a point every ~8cm is plenty and keeps the area sane.
      const last = wipRef.current[wipRef.current.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.08) return;
      wipRef.current = [...wipRef.current, p];
      setWip(wipRef.current);
    } else if (mode === 'spines' && spineStartRef.current) {
      spineNowRef.current = p;
      setSpineNow(p);
    }
  };

  const up = () => {
    if (mode === 'trace' && drawing.current) {
      drawing.current = false;
      if (wipRef.current.length >= 3) onOutline(wipRef.current);
      wipRef.current = [];
      setWip([]);
    } else if (mode === 'spines' && spineStartRef.current && spineNowRef.current) {
      const a = spineStartRef.current;
      const b = spineNowRef.current;
      // Ignore an accidental tap — a spine needs to actually span something.
      if (Math.hypot(b.x - a.x, b.y - a.y) > 0.8) onSpine({ a, b });
      spineStartRef.current = null;
      spineNowRef.current = null;
      setSpineStart(null);
      setSpineNow(null);
    }
  };

  const path = (pts: Pt[], close: boolean) =>
    pts.length === 0
      ? ''
      : `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}${close ? ' Z' : ''}`;

  const live = wip.length > 0 ? wip : outline;
  // Ink scales with the field so strokes read the same at any yard size.
  const u = fieldM / 5.5;

  return (
    <svg
      ref={ref}
      viewBox={`${-fieldM} ${-fieldM} ${fieldM * 2} ${fieldM * 2}`}
      className="h-full w-full touch-none select-none"
      style={{ transform: 'scaleY(-1)', cursor: 'crosshair' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={up}
    >
      {/* The lawn you actually have — from the site step, not decoration. */}
      <circle cx={0} cy={0} r={clearRadiusM} fill="#93a06a" fillOpacity={0.35} />
      <circle
        cx={0}
        cy={0}
        r={clearRadiusM}
        fill="none"
        stroke="#1b1b18"
        strokeOpacity={0.35}
        strokeWidth={0.03 * u}
        strokeDasharray={`${0.22 * u} ${0.18 * u}`}
      />

      {/* Metre grid — quiet, so "about this big" has a reference */}
      {Array.from({ length: Math.ceil(fieldM) * 2 + 1 }, (_, i) => i - Math.ceil(fieldM)).map((m) => (
        <g key={m} stroke="#1b1b18" strokeOpacity={0.07} strokeWidth={fieldM * 0.0022}>
          <line x1={m} y1={-fieldM} x2={m} y2={fieldM} />
          <line x1={-fieldM} y1={m} x2={fieldM} y2={m} />
        </g>
      ))}

      {/* North tick */}
      <line
        x1={0}
        y1={fieldM - 0.7}
        x2={0}
        y2={fieldM - 0.25}
        stroke="#1b1b18"
        strokeOpacity={0.5}
        strokeWidth={fieldM * 0.007}
      />

      {/* The traced blob */}
      {live.length > 1 && (
        <path
          d={path(live, !drawing.current)}
          fill={drawing.current ? 'none' : '#1b1b18'}
          fillOpacity={drawing.current ? 0 : 0.07}
          stroke="#1b1b18"
          strokeWidth={0.055 * u}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Committed spines + their feet */}
      {spines.map((s, i) => (
        <g key={i}>
          <path
            d={`M ${s.a.x} ${s.a.y} L ${s.b.x} ${s.b.y}`}
            stroke="#1b1b18"
            strokeWidth={0.075 * u}
            strokeLinecap="round"
            fill="none"
          />
          {[s.a, s.b].map((p, j) => (
            <circle key={j} cx={p.x} cy={p.y} r={0.16 * u} fill="#1b1b18" />
          ))}
        </g>
      ))}

      {/* The spine being dragged */}
      {spineStart && spineNow && (
        <g>
          <path
            d={`M ${spineStart.x} ${spineStart.y} L ${spineNow.x} ${spineNow.y}`}
            stroke="#1b1b18"
            strokeOpacity={0.45}
            strokeWidth={0.06 * u}
            strokeDasharray={`${0.2 * u} ${0.15 * u}`}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={spineStart.x} cy={spineStart.y} r={0.14 * u} fill="#1b1b18" fillOpacity={0.5} />
          <circle cx={spineNow.x} cy={spineNow.y} r={0.14 * u} fill="#1b1b18" fillOpacity={0.5} />
        </g>
      )}
    </svg>
  );
}
