# راهنمای نصب کی‌فیت روی سرور و دامنه

این راهنما کی‌فیت را با **Docker** روی یک سرور لینوکسی نصب می‌کند. **Caddy** هم گواهی HTTPS را خودکار و رایگان از Let's Encrypt می‌گیرد و تمدید می‌کند. اگر نمی‌خواهید از Docker استفاده کنید، [روش بدون Docker](#روش-بدون-docker) را ببینید.

---

## ۱. پیش‌نیازها

| مورد | حداقل پیشنهادی |
|---|---|
| سرور | Ubuntu 22.04 یا 24.04، دو هسته، ۲ گیگ رم، ۲۰ گیگ دیسک |
| دامنه | مثلاً `keyfit.ir` |
| پورت‌ها | ۸۰ و ۴۴۳ باز باشند (فایروال سرور و پنل دیتاسنتر) |
| سرویس پیامک | حساب [کاوه‌نگار](https://kavenegar.com) برای ارسال کد ورود |
| درگاه پرداخت | مرچنت [زرین‌پال](https://zarinpal.com) (نیاز به نماد اعتماد الکترونیکی دارد) |

---

## ۲. تنظیم DNS دامنه

در پنل دامنه (یا ابر آروان / کلودفلر) دو رکورد بسازید:

| نوع | نام | مقدار |
|---|---|---|
| A | `@` | IP سرور |
| A | `www` | IP سرور |

> اگر از کلودفلر یا ابر آروان استفاده می‌کنید، برای دریافت اولین گواهی، پراکسی (ابر نارنجی) را چند دقیقه خاموش کنید. بعد از صدور گواهی می‌توانید دوباره روشنش کنید.

با دستور `ping keyfit.ir` بررسی کنید که دامنه به IP سرور اشاره می‌کند.

---

## ۳. نصب Docker روی سرور

با SSH وارد سرور شوید:

```bash
ssh root@IP-سرور
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

> **سرور داخل ایران:** اگر دریافت ایمیج‌ها از Docker Hub خطا داد، یک میرور رجیستری داخلی تنظیم کنید. مثلاً در فایل `/etc/docker/daemon.json` بنویسید:
> ```json
> { "registry-mirrors": ["https://docker.arvancloud.ir"] }
> ```
> سپس `systemctl restart docker` را اجرا کنید.

---

## ۴. دریافت کد برنامه

**روش الف: از گیت‌هاب.** مخزن خصوصی است و به یک [Personal Access Token](https://github.com/settings/tokens) با دسترسی خواندن نیاز دارد.

```bash
git clone https://github.com/oftadeh/Hro.git /opt/keyfit
cd /opt/keyfit
git checkout claude/keyfit-health-app-832fse
```

**روش ب: بارگذاری فایل.** روی کامپیوتر خودتان پوشه‌ی پروژه را فشرده کنید و بفرستید:

```bash
scp keyfit.zip root@IP-سرور:/opt/
ssh root@IP-سرور "cd /opt && apt install -y unzip && unzip keyfit.zip -d keyfit"
```

---

## ۵. تنظیمات (`.env`)

```bash
cd /opt/keyfit
cp .env.example .env
nano .env
```

| متغیر | توضیح |
|---|---|
| `DOMAIN` | دامنه بدون https، مثلاً `keyfit.ir` |
| `APP_SECRET` | یک رشته‌ی تصادفی طولانی. ساخت: `openssl rand -hex 32` |
| `ADMIN_PHONE` | شماره‌ی موبایل شما؛ با این شماره وارد شوید تا پنل مدیر کل فعال باشد |
| `ADMIN_EMAIL` | ایمیل شما؛ تا وقتی پیامک فعال نیست، مدیر کل با این ایمیل وارد می‌شود |
| `SMTP_HOST`، `SMTP_PORT`، `SMTP_USER`، `SMTP_PASS` | ارسال کد ورود به ایمیل. با Gmail: `smtp.gmail.com`، پورت `465`، آدرس جیمیل و یک App Password (نه رمز اصلی) |
| `DEMO_MODE` | `0` برای نسخه‌ی واقعی. `1` فقط برای ارائه است: داده‌ی نمونه، کد ثابت ۱۲۳۴ و ورود سریع |
| `KAVENEGAR_API_KEY`، `KAVENEGAR_TEMPLATE` | کلید API و نام قالب Verify در پنل کاوه‌نگار. متن قالب مثلاً: «کد ورود کی‌فیت: %token» |
| `ZARINPAL_MERCHANT_ID` | مرچنت زرین‌پال. برای تست اولیه `ZARINPAL_SANDBOX=1` بگذارید |
| `ANTHROPIC_API_KEY` | اختیاری. فیت‌یار را به Claude وصل می‌کند و تشخیص کالری از عکس را فعال می‌کند |
| `VAPID_PUBLIC_KEY`، `VAPID_PRIVATE_KEY` | اختیاری، برای اعلان روی گوشی (ساخت کلید در مرحله‌ی بعد) |

**ساخت کلیدهای اعلان گوشی** (اختیاری):

```bash
docker compose run --rm app npx web-push generate-vapid-keys
```

دو کلیدی را که چاپ می‌شود در `.env` بگذارید.

> - **بدون سرویس پیامک** نسخه‌ی واقعی اجازه‌ی ورود نمی‌دهد. این عمدی است تا کسی نتواند با شماره‌ی دیگران وارد شود.
> - **بدون مرچنت زرین‌پال** پرداخت شبیه‌سازی می‌شود. این حالت فقط برای تست است؛ قبل از افتتاح حتماً مرچنت را تنظیم کنید.
> - **API هوش مصنوعی Anthropic از IPهای ایران در دسترس نیست.** اگر سرور شما در ایران است، یا `ANTHROPIC_API_KEY` را خالی بگذارید (فیت‌یار با مشاور داخلی کار می‌کند)، یا با متغیر `ANTHROPIC_BASE_URL` یک پراکسی خارج از ایران تعریف کنید.

---

## ۶. اجرا

```bash
docker compose up -d --build
docker compose logs -f app
```

وقتی در لاگ عبارت `KeyFit server on :8080` را دیدید، سایت را باز کنید: `https://keyfit.ir`

**اولین ورود:**
1. با همان شماره‌ی `ADMIN_PHONE` وارد شوید. حساب مدیر هنگام راه‌اندازی خودکار ساخته می‌شود.
2. از پروفایل ← «حساب و حریم» ← «مدیر سامانه» وارد پنل مدیریت شوید.

**تنظیمات اولیه در پنل مدیر:**
- کمیسیون هر بخش
- هزینه‌ی ارسال
- پاداش معرفی
- کدهای تخفیف

**پس از ثبت‌نام کسب‌وکارها:**
- باشگاه‌ها را در «باشگاه‌ها» تأیید کنید.
- پزشکان، مربیان و رستوران‌ها را در «تأیید مدارک» تأیید کنید. پزشک را فقط پس از استعلام کد نظام پزشکی تأیید کنید.

---

## ۷. به‌روزرسانی نسخه

```bash
cd /opt/keyfit
git pull
docker compose up -d --build
```

داده‌ها در پوشه‌ی `./data` هستند و با به‌روزرسانی پاک نمی‌شوند.

---

## ۸. پشتیبان‌گیری و بازگردانی

همه‌ی داده‌ها در پوشه‌ی `/opt/keyfit/data` است:

| مسیر | محتوا |
|---|---|
| `keyfit.db` | دیتابیس |
| `backups/` | پشتیبان خودکار روزانه (۱۴ روز آخر) |
| `uploads/` | تصاویر بارگذاری‌شده |

**پشتیبان شبانه به جای دیگر:**

```bash
crontab -e
# این خط را اضافه کنید (هر شب ساعت ۳):
0 3 * * * tar -czf /root/keyfit-$(date +\%F).tar.gz -C /opt/keyfit data && find /root -name 'keyfit-*.tar.gz' -mtime +30 -delete
```

بهتر است این فایل‌ها را به یک فضای ذخیره‌سازی دیگر هم منتقل کنید، مثلاً فضای ابری آروان یا یک سرور دوم.

**بازگردانی:**

```bash
docker compose down
tar -xzf /root/keyfit-2026-10-22.tar.gz -C /opt/keyfit
docker compose up -d
```

---

## روش بدون Docker

اگر Node.js و nginx را خودتان مدیریت می‌کنید:

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs nginx certbot python3-certbot-nginx

cd /opt/keyfit/web
npm ci
npm run build:remote && npm run build:server
```

**سرویس systemd** را در فایل `/etc/systemd/system/keyfit.service` بسازید:

```ini
[Unit]
Description=KeyFit
After=network.target

[Service]
WorkingDirectory=/opt/keyfit/web
EnvironmentFile=/opt/keyfit/.env
Environment=PORT=8080 DATA_DIR=/opt/keyfit/data STATIC_DIR=/opt/keyfit/web/dist TZ=Asia/Tehran PUBLIC_URL=https://keyfit.ir
ExecStart=/usr/bin/node --no-warnings dist-server/index.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now keyfit
```

**nginx** را در فایل `/etc/nginx/sites-available/keyfit` تنظیم کنید:

```nginx
server {
    server_name keyfit.ir www.keyfit.ir;
    client_max_body_size 45m;     # ویدیوی معرفی تا ۴۰ مگابایت
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_http_version 1.1;
        proxy_buffering off;          # برای رویدادهای لحظه‌ای
        proxy_read_timeout 1h;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/keyfit /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d keyfit.ir -d www.keyfit.ir
```

---

## عیب‌یابی

| مشکل | راه‌حل |
|---|---|
| سایت با HTTPS باز نمی‌شود | `docker compose logs caddy` را ببینید. رکورد A دامنه باید به IP سرور اشاره کند و پورت‌های ۸۰ و ۴۴۳ باز باشند. |
| «سرویس پیامک تنظیم نشده است» | `KAVENEGAR_API_KEY` را در `.env` بگذارید و `docker compose up -d` را بزنید. |
| پیامک ارسال نمی‌شود | نام قالب Verify و اعتبار حساب کاوه‌نگار را بررسی کنید. خطا در `docker compose logs app` دیده می‌شود. |
| بعد از پرداخت «ناموفق» نمایش داده می‌شود | آدرس سایت ثبت‌شده در زرین‌پال باید با `DOMAIN` یکی باشد. برای تست `ZARINPAL_SANDBOX=1` بگذارید. |
| فیت‌یار پاسخ‌های ساده می‌دهد | `ANTHROPIC_API_KEY` تنظیم نشده یا API از سرور در دسترس نیست. در این حالت مشاور داخلی پاسخ می‌دهد. |
| اعلان گوشی نمی‌آید | کلیدهای VAPID را بسازید. کاربر باید در پروفایل ← حساب و حریم ← «فعال‌سازی اعلان گوشی» را بزند. اعلان فقط روی HTTPS کار می‌کند. |
| مشاهده‌ی لاگ‌ها | `docker compose logs -f app` |
| راه‌اندازی دوباره | `docker compose restart app` |

---

## ظرفیت و مقیاس

- **ظرفیت فعلی:** نسخه‌ی فعلی همه‌ی داده‌ها را در یک فرایند و یک فایل SQLite نگه می‌دارد. برای چند هزار کاربر فعال روی یک سرور معمولی کافی است.
- **رشد بیشتر:** وقتی تعداد کاربران فعال از این حد بیشتر شد، مرحله‌ی بعد انتقال به PostgreSQL با جدول‌های جداگانه است. ساختار سرویس‌ها برای این انتقال آماده است.
