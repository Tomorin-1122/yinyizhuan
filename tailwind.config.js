/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f6f3',
          100: '#eeece6',
          200: '#ddd9cd',
          300: '#c7c0ad',
          400: '#ada28a',
          500: '#9a8d72',
          600: '#8d7e66',
          700: '#756856',
          800: '#61564a',
          900: '#50473e',
          950: '#2a2520',
        },
        vermilion: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#fdcdc9',
          300: '#fbaba4',
          400: '#f67b70',
          500: '#ec5244',
          600: '#d93526',
          700: '#b7291c',
          800: '#97251b',
          900: '#7e251d',
          950: '#440f0a',
        },
        parchment: {
          50: '#fdfcf9',
          100: '#f9f6ef',
          200: '#f3ede0',
          300: '#e8ddc8',
          400: '#d9c8a6',
          500: '#c9b288',
        },
      },
      fontFamily: {
        display: ['"Noto Serif SC"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
