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
      },
      fontFamily: {
        // Eccentric organic display for titles + the big price.
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        // Clean neutral sans for all UI.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
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
