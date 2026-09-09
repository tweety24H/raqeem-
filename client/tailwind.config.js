/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand color — used for buttons, links, active states, headers.
        nili: {
          DEFAULT: '#1B2A6B',
          dark: '#121d4d',
          light: '#2c3f96',
        },
        // Single accent color, reserved for important/highlighted actions
        // (e.g. .btn-gold) — not a general-purpose interactive color.
        gold: {
          DEFAULT: '#D4AF37',
          light: '#e6c866',
          dark: '#b8932a',
        },
        // Secondary, low-emphasis accent. Used only for focus rings and
        // chart/data-viz series — never as a button or card background.
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Explicit neutral scale for backgrounds/surfaces/borders, replacing
        // ad-hoc grays/hex values used across the app.
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'Sora'],
        display: ['Sora'],
        arabic: ['IBM Plex Sans Arabic'],
      },
      borderRadius: {
        // Large, luxurious corner radius driven by a single CSS variable
        // (see :root in index.css) so it can be tuned in one place.
        '2xl': 'var(--radius)',
      },
    },
  },
  plugins: [],
};
