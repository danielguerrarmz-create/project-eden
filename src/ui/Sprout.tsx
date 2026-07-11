/**
 * Sprout.tsx — the bower sprout glyph. One drawn mark reused by every piece of
 * brand chrome (the studio Navbar pill, the splash header, the engine header) so
 * the wordmark reads as one company everywhere. Size is a prop so it can sit
 * beside 19px serif in the pill or 11px mono in the documentation headers.
 */
export function Sprout({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M12 21V11" stroke="#5E6E2B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12C12 8.5 9 6.5 5.5 6.5C5.5 10 8 12 12 12Z" fill="#7A8B3C" />
      <path d="M12 10.5C12 7.5 14.6 5 18 5C18 8.2 15.5 10.5 12 10.5Z" fill="#8ea060" />
      <circle cx="12" cy="21" r="1.1" fill="#E06A4E" />
    </svg>
  );
}
