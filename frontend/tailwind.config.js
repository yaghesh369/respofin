/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        body: ['Manrope', 'sans-serif'],
        display: ['Outfit', 'Manrope', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 48px rgba(2, 8, 23, 0.18)',
      },
      colors: {
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
      },
      backgroundImage: {
        'page-light': 'linear-gradient(170deg, #f8f0e5 0%, #f5ebdf 48%, #efe2d0 100%)',
        'page-dark': 'linear-gradient(170deg, #06121b 0%, #081724 48%, #0a1d2d 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
