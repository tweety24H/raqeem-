/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand color — used for buttons, links, active states, headers.
        // Matches the hex already hardcoded on the login screen (#0B1D3A) so
        // every page shares the exact same navy instead of a slightly-off shade.
        nili: {
          DEFAULT: '#0B1D3A',
          dark: '#071429',
          light: '#132A50',
        },
        // `primary` is an alias for `nili` (same values) — kept so both
        // `bg-nili`/`bg-primary` resolve to one design token; new code should
        // prefer `primary`, existing `nili` usages don't need a mass rename.
        primary: {
          DEFAULT: '#0B1D3A',
          dark: '#071429',
          light: '#132A50',
        },
        // Single accent color, reserved for important/highlighted actions
        // (e.g. .btn-gold) — not a general-purpose interactive color.
        // Matches the hex already hardcoded on the login screen (#C5A880).
        gold: {
          DEFAULT: '#C5A880',
          light: '#E0C9A6',
          dark: '#9c7c4a',
        },
        surface: '#F8F9FA',
        success: '#10B981',
        danger: '#EF4444',
        muted: '#64748B',
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
        // Single font family for the whole app (weights 400/600/700 only,
        // loaded via <link> in index.html). `display`/`arabic` are kept as
        // aliases so existing font-display/font-arabic usages don't need a
        // mass rename — they now resolve to the same family as font-sans.
        sans: ['IBM Plex Sans Arabic', 'sans-serif'],
        display: ['IBM Plex Sans Arabic', 'sans-serif'],
        arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
      },
      borderRadius: {
        // Large, luxurious corner radius driven by a single CSS variable
        // (see :root in index.css) so it can be tuned in one place.
        '2xl': 'var(--radius)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
