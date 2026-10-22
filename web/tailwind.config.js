/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Vazirmatn', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
          500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b',
        },
        ink: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
          500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 850: '#172033', 900: '#0f172a', 950: '#0a0f1c',
        },
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgb(15 23 42 / 0.18)',
        glow: '0 10px 40px -10px rgb(16 185 129 / 0.55)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(.9)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        progress: { '0%': { width: '0%' }, '100%': { width: '100%' } },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        pop: 'pop .2s ease-out both',
        progress: 'progress 5s linear forwards',
      },
    },
  },
  plugins: [],
}
