/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Vazirmatn', 'system-ui', 'sans-serif'] },
      letterSpacing: { tightest: '-.04em' },
      colors: {
        // شامپاینی: تنها رنگ تأکیدی برند
        brand: {
          50: '#faf8f3', 100: '#f3eee2', 200: '#e7dcc3', 300: '#d8c49c', 400: '#c6ab78', 500: '#b0915c',
          600: '#95784a', 700: '#775f3c', 800: '#5a4830', 900: '#3e3223',
        },
        gold: { 300: '#dcc59a', 400: '#c9ad7a', 500: '#b0915c', 600: '#95784a' },
        // خاکستری گرم و خنثی
        ink: {
          50: '#f8f8f6', 100: '#f1f0ed', 200: '#e5e4e0', 300: '#d1cfca', 400: '#a19e97', 500: '#76736c',
          600: '#57554f', 700: '#3e3d39', 800: '#282826', 850: '#1e1e1c', 900: '#171716', 950: '#0e0e0d',
        },
        coral: {
          50: '#faf4f3', 100: '#f3e5e3', 200: '#e5c8c4', 300: '#d2a6a1', 400: '#bd8780', 500: '#a46c65',
          600: '#895650', 700: '#6d4440', 800: '#523431', 900: '#3a2523',
        },
        aqua: {
          50: '#f3f6f7', 100: '#e4eaec', 200: '#c9d4d8', 300: '#a7b8be', 400: '#869ca3', 500: '#6a8189',
          600: '#55686f', 700: '#435258', 800: '#323e42', 900: '#232b2e',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px -16px rgb(0 0 0 / 0.14)',
        card: '0 1px 2px rgb(0 0 0 / 0.03)',
        glow: '0 1px 2px rgb(0 0 0 / 0.06)',
        gold: '0 1px 2px rgb(0 0 0 / 0.06)',
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
