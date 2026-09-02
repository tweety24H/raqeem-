/** @type {import('tailwindcss').Config} */
export default {
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
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Tahoma', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
