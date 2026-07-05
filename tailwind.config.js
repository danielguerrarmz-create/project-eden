/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm paper base + charcoal ink. No blue anywhere.
        paper: '#F6F4EE',
        paperDeep: '#EDE9DF',
        ink: '#1E1B17',
        inkSoft: '#57514A',
        inkFaint: '#8B857B',
        line: '#DED8CB',
        // Botanical accents (functional only).
        moss: '#7A8B3C',
        mossDeep: '#5E6E2B',
        bloom: '#E06A4E',
        bark: '#9c8466',
        amber: '#B8842A',

        // Documentation layer (the generative-engine page + LP materials only).
        // Additive: never used inside the warm-paper studio. Field colors are
        // full-bleed section grounds, used one at a time; accent-olive is the
        // single chroma accent.
        fieldBlue: '#C3DEF2',
        fieldChartreuse: '#D8F27E',
        fieldYellow: '#F0CE1B',
        inkNavy: '#232C5E',
        inkBlack: '#17160F',
        accentOlive: '#ACC13A',
        paperVellum: '#FBF9F3',
      },
      fontFamily: {
        // Eccentric organic display for titles + the big price.
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        // Clean neutral sans for all UI.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // IBM Plex Mono leads for drafting character on technical labels
        // (dimensions, annotations); benefits the studio's mono readouts too.
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        // Editorial display serif for the documentation layer (Freight Big Pro
        // when licensed, Source Serif 4 as the free fallback).
        serifDisplay: [
          '"Freight Big Pro"',
          '"Source Serif 4 Variable"',
          '"Source Serif 4"',
          'Fraunces',
          'Georgia',
          'serif',
        ],
        // High-contrast serif for the single hero / pull-quote moment per page.
        quote: ['"Bodoni Moda"', '"Freight Big Pro"', '"Source Serif 4 Variable"', 'Georgia', 'serif'],
      },
      keyframes: {
        'grow-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        sway: {
          '0%,100%': { transform: 'rotate(-1.2deg)' },
          '50%': { transform: 'rotate(1.2deg)' },
        },
      },
      animation: {
        'grow-in': 'grow-in 0.5s cubic-bezier(0.2,0.8,0.2,1) both',
        sway: 'sway 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
