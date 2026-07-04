/**
 * text.ts — display-layer copy sanitiser.
 *
 * The engine is reused byte-for-byte, and some of its human strings (flowering
 * ranges like "Jun–Sep", price line labels, growth stage labels) still carry
 * en/em dashes. Daniel's standing rule is no em/en dashes as punctuation in any
 * on-screen copy, so we strip them HERE at render time rather than editing the
 * engine: spaced dashes become commas, bare range dashes become " to ".
 */
export function deDash(s: string): string {
  return s
    .replace(/\s+[—–]\s+/g, ', ') // " — " / " – "  ->  ", "
    .replace(/(\w)[–—](\w)/g, '$1 to $2') // "Jun–Sep" -> "Jun to Sep"
    .replace(/[—–]/g, ', '); // any stragglers
}
