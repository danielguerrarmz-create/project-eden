/**
 * copy.ts — the hand-authored copy for the precedent-study splash additions (the
 * commission ritual and the "what stays the same" strip). Kept out of the JSX so
 * it can be dash-checked by the test suite (house rule: no em/en dashes in
 * on-screen copy) and so the ritual can be rendered twice, expanded and compact,
 * from one source. Live numbers (component count, lead-time weeks) are injected by
 * the caller from the store's default `outputs`, the same source of truth the
 * commission sheet reads; nothing here hardcodes a production figure.
 */
import { GRAMMAR } from '../../data/config';

export interface RitualStep {
  n: string;
  text: string;
}

/**
 * The commission ritual, numbered 1 to 5, one line each. Step 3 carries the live
 * component count off `outputs.components.totalCount`.
 */
export function ritualSteps(componentCount: number): RitualStep[] {
  return [
    { n: '1', text: 'Shape it in the studio' },
    { n: '2', text: 'The price fixes itself as you do' },
    { n: '3', text: `We cut, flat CNC-cut timber, ~${componentCount} components from the live cut list` },
    { n: '4', text: 'Days to raise, ground screws, no slab, no wet trades' },
    { n: '5', text: 'Plant, and let it start becoming.' },
  ];
}

/** The same ritual condensed to one mono line for the close (process shown twice). */
export function ritualCompact(componentCount: number): string {
  return `shape it in the studio · the price fixes itself · ~${componentCount} components, CNC-cut · days to raise on ground screws · plant, and it begins to become`;
}

/**
 * The objection-handling strip: what a client does NOT have to change, then the
 * one thing an Eden adds. Structural, not an FAQ afterthought.
 */
export const STAYS_THE_SAME = {
  keeps:
    'your garden · your soil (ground screws, the ground stays alive) · your planting scheme and your garden designer',
  adds: 'a computed armature for it to climb',
} as const;

/**
 * The single legal fact, phrased as a fact about the height class, never a promise
 * about any specific site. The height reads live off the grammar's permitted-
 * development cap, so it stays truthful to what the engine enforces.
 */
export const PD_FACT = `under ${GRAMMAR.pdHeightCapM} m: permitted development in the UK, no planning application`;
