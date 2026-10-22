/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Vazirmatn', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#f4f1ff', 100: '#ebe5ff', 200: '#d8ccff', 300: '#bba5ff', 400: '#9b78ff',
          500: '#7c4dff', 600: '#6a35f2', 700: '#5a26d6', 800: '#4a20ad', 900: '#3d1d8a',
        },
        ink: {
          50: '#f4f2fb', 100: '#ece9f6', 200: '#dcd8ec', 300: '#bfbad6', 400: '#8f8aae', 500: '#6b6790',
          600: '#4f4b72', 700: '#363457', 800: '#1d2540', 850: '#162036', 900: '#111a2e', 950: '#0a1120',
        },
        gold: { 300: '#f3d58a', 400: '#e8bf5a', 500: '#d4a23c', 600: '#b5852a' },
        coral: { 400: '#ff7a93', 500: '#f4506e', 600: '#dc3a59' },
        aqua: { 300: '#9fe3f0', 400: '#6fd0e3', 500: '#46b9d2' },
      },
      boxShadow: {
        soft: '0 18px 40px -20px rgb(76 45 170 / 0.28)',
        card: '0 2px 6px -2px rgb(76 45 170 / 0.08), 0 22px 44px -24px rgb(76 45 170 / 0.30)',
        glow: '0 14px 34px -10px rgb(124 77 255 / 0.6)',
        gold: '0 14px 34px -10px rgb(212 162 60 / 0.55)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(.9)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        progress: { '0%': { width: '0%' }, '100%': { width: '100%' } },
        'sheet-up': { '0%': { opacity: 0, transform: 'translateY(40px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        pop: 'pop .2s ease-out both',
        progress: 'progress 5s linear forwards',
        'sheet-up': 'sheet-up .35s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
}
