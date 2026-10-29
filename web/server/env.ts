/** تنظیمات سرور از متغیرهای محیطی (فایل .env در کنار docker-compose) */
const bool = (v: string | undefined) => v === '1' || v === 'true'

export const env = {
  port: Number(process.env.PORT ?? 8080),
  dataDir: process.env.DATA_DIR ?? './data',
  /** نشانی عمومی سایت، مثلاً https://keyfit.ir (برای بازگشت از درگاه) */
  publicUrl: (process.env.PUBLIC_URL ?? 'http://localhost:8080').replace(/\/$/, ''),
  /** حالت نمایشی: داده‌های نمونه، کد ثابت ۱۲۳۴ و ورود سریع با حساب‌های نمایشی */
  demo: bool(process.env.DEMO_MODE),
  /** شماره‌ی موبایل مدیر کل سامانه */
  adminPhone: process.env.ADMIN_PHONE ?? '',
  /** ایمیل ورود مدیر کل (تا وقتی پیامک فعال نیست، مدیر با این ایمیل وارد می‌شود) */
  adminEmail: (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase(),
  /** کلید امضای توکن‌های موقت (حتماً مقدار تصادفی طولانی بگذارید) */
  secret: process.env.APP_SECRET ?? 'change-me-in-production',
  /** فقط برای تست بدون سرویس پیامک: کد تأیید در پاسخ برگردانده می‌شود (هرگز در نسخه‌ی واقعی فعال نکنید) */
  otpEcho: bool(process.env.OTP_DEV_ECHO),
  sms: {
    kavenegarKey: process.env.KAVENEGAR_API_KEY ?? '',
    kavenegarTemplate: process.env.KAVENEGAR_TEMPLATE ?? 'keyfit-otp',
  },
  /** ارسال ایمیل کد ورود با SMTP (مثلاً Gmail با App Password روی پورت ۴۶۵) */
  mail: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 465),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromName: process.env.MAIL_FROM_NAME ?? 'کی‌فیت',
  },
  zarinpal: {
    merchant: process.env.ZARINPAL_MERCHANT_ID ?? '',
    sandbox: bool(process.env.ZARINPAL_SANDBOX),
  },
  ai: {
    key: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.AI_MODEL ?? 'claude-opus-5-5',
  },
  push: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
  },
  staticDir: process.env.STATIC_DIR ?? './dist',
}

if (env.secret === 'change-me-in-production' && !env.demo) console.warn('⚠️  APP_SECRET تنظیم نشده است؛ برای نسخه‌ی واقعی حتماً مقدار تصادفی بگذارید.')
