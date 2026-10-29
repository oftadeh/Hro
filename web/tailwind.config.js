/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
        display: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { tightest: '-.04em' },
      // کوچک‌ترین متن اپ ۱۳ پیکسل است (خوانایی در موبایل)
      fontSize: { xs: ['0.8125rem', '1.25rem'] },
      colors: {
        // بنفش برقی: رنگ اصلی برند (پالت ورزشی)
        brand: {
          50: '#f3f0ff', 100: '#e9e3ff', 200: '#d4c9ff', 300: '#b6a4ff', 400: '#9a82ff', 500: '#7b5cff',
          600: '#6a45f5', 700: '#5934d6', 800: '#4a2bb0', 900: '#3c248c',
        },
        // لیمویی نئون: دکمه‌ی اصلی و پیشرفت
        lime: {
          50: '#f8ffe6', 100: '#efffc4', 200: '#e2ff8a', 300: '#d4ff5e', 400: '#c6ff3d', 500: '#aee620',
          600: '#84b30f', 700: '#62860d', 800: '#4d6910', 900: '#3f5612',
        },
        // نارنجی آتشین
        gold: { 300: '#ffc39a', 400: '#ff9a5c', 500: '#ff7a2f', 600: '#e0601a' },
        // زغالی متمایل به بنفش («شب یاس»). ۴۰۰ و ۵۰۰ برای متن کم‌رنگ‌اند و در تم تیره
        // روشن‌تر می‌شوند تا کنتراست WCAG AA در هر دو تم برقرار باشد (index.css).
        ink: {
          50: '#f6f5f8', 100: '#eeebf3', 200: '#e2dde9', 300: '#c9c2d6',
          400: 'rgb(var(--ink-400) / <alpha-value>)', 500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: '#4a4456', 700: '#332e3c', 800: '#28242f', 850: '#1d1a23', 900: '#1a1720', 950: '#131118',
        },
        // صورتی پرانرژی
        coral: {
          50: '#fff0f7', 100: '#ffdcec', 200: '#ffbcdb', 300: '#ff92c4', 400: '#ff5fa2', 500: '#f23d88',
          600: '#d1266d', 700: '#a91d58', 800: '#86194a', 900: '#6c183f',
        },
        // فیروزه‌ای
        aqua: {
          50: '#e8fffb', 100: '#c5fff4', 200: '#8ef8e8', 300: '#5cefdc', 400: '#2ee6c9', 500: '#14c4aa',
          600: '#0d9c88', 700: '#0f7c6d', 800: '#116358', 900: '#12524a',
        },
      },
      boxShadow: {
        soft: '0 20px 50px -24px rgb(40 20 80 / 0.35)',
        card: '0 1px 2px rgb(40 20 80 / 0.04), 0 10px 30px -18px rgb(40 20 80 / 0.18)',
        glow: '0 14px 34px -14px rgb(198 255 61 / 0.55)',
        gold: '0 14px 34px -14px rgb(255 122 47 / 0.55)',
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
