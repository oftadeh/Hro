/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
        display: ['"Markazi Text"', 'Vazirmatn', 'serif'],
      },
      letterSpacing: { tightest: '-.04em' },
      colors: {
        // بنفش یاسی: رنگ اصلی برند
        brand: {
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6',
          600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95',
        },
        // هلویی/زرد پاستلی
        gold: { 300: '#fde68a', 400: '#fcd679', 500: '#f8c25c', 600: '#e3a63a' },
        // زغالی متمایل به بنفش
        ink: {
          50: '#f7f6fa', 100: '#efedf4', 200: '#e0dce9', 300: '#c3bdd0', 400: '#9a93a9', 500: '#726b82',
          600: '#524c60', 700: '#3a3545', 800: '#27232f', 850: '#1e1b25', 900: '#17141d', 950: '#100e14',
        },
        // صورتی پاستلی
        coral: {
          50: '#fdf2fb', 100: '#fbe4f7', 200: '#f8c9ef', 300: '#f2a3e2', 400: '#e879d0', 500: '#d655b8',
          600: '#b93d9b', 700: '#98307e', 800: '#7c2a67', 900: '#652656',
        },
        // نعنایی
        aqua: {
          50: '#ecfdf8', 100: '#d1faf0', 200: '#a7f3e0', 300: '#6ee7c8', 400: '#3fd6b0', 500: '#22b896',
          600: '#179478', 700: '#137762', 800: '#115e4f', 900: '#0f4d42',
        },
      },
      boxShadow: {
        soft: '0 20px 50px -24px rgb(40 20 80 / 0.35)',
        card: '0 1px 2px rgb(40 20 80 / 0.04), 0 10px 30px -18px rgb(40 20 80 / 0.18)',
        glow: '0 14px 34px -14px rgb(167 139 250 / 0.7)',
        gold: '0 14px 34px -14px rgb(252 214 121 / 0.6)',
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
