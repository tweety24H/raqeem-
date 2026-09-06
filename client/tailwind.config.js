/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nili: {
          DEFAULT: '#1B2A6B',
          dark: '#121d4d',
          light: '#2c3f96',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#e6c866',
          dark: '#b8932a',
        },
        // Primary interactive/brand accent (buttons, links, focus rings, hero).
        // Replaces the ad-hoc violet-500/400 used inconsistently across dark mode.
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
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'Sora'],
        display: ['Sora'],
        arabic: ['IBM Plex Sans Arabic'],
      },
    },
  },
  plugins: [],
};
