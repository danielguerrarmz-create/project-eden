/**
 * SproutGlyph.tsx — the product's line-art sprout mark.
 *
 * Hairline (fill-none) strokes in inkBlack with a single accent-olive seed dot,
 * matching the Eden documentation language. Replaces the old moss-and-coral
 * filled sprout. Colors are hardcoded hex so the glyph renders correctly even
 * where Tailwind isn't available (e.g. the WebGL fallback, error states).
 */
export function SproutGlyph({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21V10" stroke="#17160F" strokeWidth={1.4} strokeLinecap="round" />
      <path
        d="M12 13C12 10 9.5 8 6 8C6 11 8.5 13 12 13Z"
        stroke="#17160F"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path
        d="M12 11.4C12 8.7 14.4 6.7 17.6 6.7C17.6 9.5 15.2 11.4 12 11.4Z"
        stroke="#17160F"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="7.6" r="1.4" fill="#ACC13A" />
    </svg>
  );
}
