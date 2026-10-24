import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowLeft, BadgeCheck, Check, Droplet, Dumbbell, Footprints, Heart, MapPin, MessageCircle, Plus, QrCode, Trophy, Wallet } from 'lucide-react'
import { Emblem, Logo } from '@/layouts/Logo'
import { Showcase } from './landing/Showcase'

/* ───────── قطعه‌های واقعی داشبورد (نسخه‌ی نمایشی) ───────── */

/** کارت اشتراک: «کلید» ورود به باشگاه‌ها */
function PassCard({ className }: { className?: string }) {
  return (
    <div className={clsx('card-violet relative flex flex-col justify-between overflow-hidden rounded-[30px] p-5 text-ink-950 shadow-[0_30px_80px_-30px_rgba(91,55,245,.8)]', className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[13px] font-bold opacity-70">اشتراک کی‌فیت</div>
          <div className="mt-1 text-[24px] font-black leading-tight">طلایی · ۳۰ روزه</div>
        </div>
        <Emblem size={40} />
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="space-y-1 text-[13px] font-semibold">
          <div className="flex items-center gap-1.5"><MapPin size={14} /> همه‌ی باشگاه‌های منتخب اصفهان</div>
          <div className="opacity-70">۲۲ روز مانده · اعتبار ۱٬۴۲۰٬۰۰۰ تومان</div>
        </div>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink-950 text-white"><QrCode size={28} /></span>
      </div>
    </div>
  )
}

function ActivityMini({ className }: { className?: string }) {
  const C = 2 * Math.PI * 42
  return (
    <div className={clsx('card-mint flex flex-col justify-between rounded-[30px] p-5 text-ink-950', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold opacity-70">امروز</span>
        <span className="flex rounded-full bg-white/45 p-1 text-[12px]">
          <span className="rounded-full bg-ink-950 px-3 py-1 font-bold text-white">قدم</span>
          <span className="px-3 py-1 opacity-70">آب</span>
          <span className="px-3 py-1 opacity-70">تمرین</span>
        </span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[44px] font-black leading-none">۶٬۴۸۰</div>
          <div className="mt-2 text-[13px] opacity-70">هدف امروز کامل شد</div>
        </div>
        <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="10" />
          <circle className="m-ring" cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * 0.12} />
        </svg>
      </div>
      <div className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink-950 px-4 text-[14px] font-bold text-white"><Plus size={16} /> ثبت ۱٬۰۰۰ قدم</div>
    </div>
  )
}

function ChallengeMini({ tone, title, score, goal, rank, className }: { tone: string; title: string; score: string; goal: number; rank: string; className?: string }) {
  return (
    <div className={clsx('flex flex-col rounded-[28px] p-4 text-ink-950', tone, className)}>
      <div className="flex justify-between text-[12px] font-bold opacity-70"><span>۱۲ روز مانده</span><span>۴۸ نفر</span></div>
      <div className="mt-2 text-[18px] font-extrabold leading-7">{title}</div>
      <div className="mt-auto pt-4">
        <div className="flex justify-between text-[12px] font-bold"><span>{rank}</span><span>{score}</span></div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/45"><div className="m-fill h-full rounded-full bg-ink-950" style={{ width: `${goal}%` }} /></div>
      </div>
    </div>
  )
}

function TrainingMini({ className }: { className?: string }) {
  return (
    <div className={clsx('card-night relative flex flex-col justify-center overflow-hidden rounded-[30px] p-5', className)}>
      <span aria-hidden className="pointer-events-none absolute -left-14 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(140,110,255,.45),transparent_65%)]" />
      <Dumbbell aria-hidden size={110} strokeWidth={1} className="pointer-events-none absolute -bottom-5 -left-3 -rotate-12 opacity-[.07]" />
      <div className="relative">
        <div className="text-[13px] font-semibold text-white/60">تمرین امروز</div>
        <div className="mt-1 text-[22px] font-extrabold">روز ۳: پا و سرینی</div>
        <div className="text-[13px] text-white/60">برنامه‌ی مربی · ۶ حرکت</div>
        <div className="mt-4 flex justify-between">
          {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((d, i) => (
            <span key={d} className="flex flex-col items-center gap-1">
              <span className={clsx('flex h-8 w-8 items-center justify-center rounded-full text-[12px]', i < 3 ? 'card-violet font-bold text-ink-950' : i === 3 ? 'border-2 border-dashed border-white/40' : 'bg-white/10')}>{i < 3 ? '✓' : ''}</span>
              <span className="text-[12px] text-white/45">{d}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ZoneMini({ className }: { className?: string }) {
  return (
    <div className={clsx('flex flex-col rounded-[30px] bg-white/[.06] p-4', className)}>
      <div className="flex gap-2">
        {['card-violet', 'card-pink', 'card-peach', 'card-mint'].map((t) => <span key={t} className={clsx('h-[58px] w-[46px] rounded-[16px] p-[2px]', t)}><span className="block h-full w-full rounded-[14px] bg-ink-900/70" /></span>)}
      </div>
      <div className="card-pink mt-3 flex flex-1 items-center justify-center rounded-[22px] p-4 text-center text-[18px] font-extrabold text-ink-950">امروز ۵ کیلومتر کنار زاینده‌رود دویدم!</div>
      <div className="mt-2 flex items-center gap-4 px-1 text-[13px] text-white/70"><Heart size={18} className="fill-[#ff2f7d] text-[#ff2f7d]" /> ۱۲۸ <MessageCircle size={17} /> ۱۴</div>
    </div>
  )
}

function EntryMini({ className }: { className?: string }) {
  return (
    <div className={clsx('card-peach flex flex-col justify-between rounded-[30px] p-5 text-ink-950', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold opacity-70">ورود به باشگاه</span>
        <QrCode size={22} />
      </div>
      <div>
        <div className="text-[20px] font-extrabold leading-snug">باشگاه پارس، چهارباغ</div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink-950 px-3 py-1.5 text-[13px] font-bold text-white"><Check size={15} strokeWidth={3} /> ورود ثبت شد · ۱۸:۴۲</div>
      </div>
    </div>
  )
}

/* ───────── قهرمان صفحه: کارت‌های داشبورد زیر طاق ───────── */
function HeroVisual() {
  return (
    <div className="relative isolate mx-auto w-full max-w-[380px] px-2 pb-6 pt-20">
      {/* طاق اصفهانی: قاب صحنه */}
      <svg viewBox="0 0 400 560" preserveAspectRatio="none" className="absolute inset-0 -z-10 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="taqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b2f52" />
            <stop offset="1" stopColor="#131118" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M2 560 V220 C2 110 130 40 200 2 C270 40 398 110 398 220 V560" fill="url(#taqFill)" stroke="rgba(160,140,255,.35)" strokeWidth="2" />
        <path d="M34 560 V232 C34 140 140 78 200 44 C260 78 366 140 366 232 V560" fill="none" stroke="rgba(160,140,255,.15)" strokeWidth="1.5" />
      </svg>
      <div className="hero-fan">
        <ChallengeMini tone="card-pink" title="۳۰ روز، ۳۰ تمرین" score="۲۱ / ۳۰ جلسه" goal={70} rank="رتبه‌ی ۲" className="fan-1 relative z-0 mx-8 h-[150px]" />
        <ActivityMini className="fan-2 relative z-10 mx-3 -mt-14" />
        <PassCard className="fan-3 relative z-20 -mt-16" />
      </div>
    </div>
  )
}

const BENTO = [
  { cap: 'یک اشتراک، همه‌ی باشگاه‌ها', d: 'اعتبار اشتراک را در هر باشگاه، استخر یا کلاس منتخب خرج کن؛ ثبت‌نام جداگانه لازم نیست.', el: <PassCard /> },
  { cap: 'ورود با اسکن QR', d: 'دم در باشگاه QR را اسکن کن؛ ورودت ثبت و به پذیرش اعلام می‌شود.', el: <EntryMini /> },
  { cap: 'فعالیت روزانه', d: 'قدم، آب و دقیقه‌های تمرین را با یک لمس ثبت کن و پر شدن هدفت را ببین.', el: <ActivityMini /> },
  { cap: 'برنامه‌ی تمرینی', d: 'از مربیان تأییدشده برنامه بگیر و هر روز ببین کجای برنامه هستی.', el: <TrainingMini /> },
  { cap: 'چالش و جایزه', d: 'در چالش‌های قدم، تمرین و دویدن شرکت کن، رتبه بگیر و جایزه ببر.', el: (
    <div className="grid h-full grid-cols-2 gap-3">
      <ChallengeMini tone="card-lilac" title="۳۰۰ هزار قدم" score="۱۸۰ هزار" goal={60} rank="رتبه‌ی ۵" />
      <ChallengeMini tone="card-peach" title="ماراتن ۴۲ کیلومتر" score="۲۹ کیلومتر" goal={69} rank="رتبه‌ی ۱" />
    </div>
  ) },
  { cap: 'فیت‌زون', d: 'عکس، ویدیو و استوری تمرینت را بگذار و ورزشکارهای شهرت را دنبال کن.', el: <ZoneMini /> },
]

function Bento() {
  return (
    <section aria-labelledby="inside">
      <h2 id="inside" className="max-w-xl text-[32px] font-black leading-tight">داخل کی‌فیت چه می‌بینی</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-8 text-white/60">این‌ها همان کارت‌هایی است که بعد از ورود در داشبوردت داری.</p>
      <div className="mt-8 grid gap-x-5 gap-y-9 md:grid-cols-2 lg:grid-cols-3">
        {BENTO.map((b) => (
          <figure key={b.cap} className="flex flex-col">
            {/* همه‌ی کارت‌ها هم‌اندازه */}
            <div className="h-[250px] [&>*]:h-full">{b.el}</div>
            <figcaption className="mt-4 px-1">
              <div className="text-[18px] font-extrabold">{b.cap}</div>
              <p className="mt-1 text-[14px] leading-7 text-white/60">{b.d}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  { t: 'ثبت‌نام در یک دقیقه', d: 'فقط با شماره‌ی موبایل و کد تأیید.', icon: BadgeCheck },
  { t: 'یک اشتراک بخر', d: 'اعتبارش را در هر باشگاه، کلاس و خدمتی که خواستی خرج کن.', icon: Wallet },
  { t: 'اسکن کن و تمرین کن', d: 'QR دم در را بزن؛ ورودت ثبت و امتیازت به چالش‌ها اضافه می‌شود.', icon: QrCode },
]

export default function Landing() {
  const start = (
    <Link to="/login" className="card-lime inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-extrabold text-ink-950 shadow-glow transition hover:brightness-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
      شروع کن! <ArrowLeft size={18} />
    </Link>
  )
  return (
    <div className="sport-bg min-h-dvh overflow-x-clip bg-[#131118] text-white">
      <header className="sticky top-0 z-50 bg-[#131118]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo size={36} sub />
          {start}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-24 px-4 pb-20">
        {/* قهرمان: چه اپی است، در یک نگاه */}
        <section className="grid items-center gap-10 pt-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
          <div>
            <h1 className="text-[38px] font-black leading-[1.3] sm:text-[52px]">با یک اشتراک، به هر باشگاهی که خواستی برو</h1>
            <p className="mt-5 max-w-xl text-[16px] leading-8 text-white/65">
              کی‌فیت اپ ورزشی اصفهان است: ورود به باشگاه‌ها و استخرها با اسکن QR، چالش‌های جایزه‌دار، مربی و برنامه‌ی تمرینی، و جامعه‌ای از ورزشکارهای شهر.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {start}
              <a href="#tour" className="inline-flex h-12 items-center rounded-full border border-white/15 px-6 text-[15px] font-semibold">ببین چطور کار می‌کند</a>
            </div>
            <ul className="mt-9 grid max-w-md grid-cols-3 gap-3 text-[13px]">
              {[
                { icon: Footprints, t: 'ثبت فعالیت روزانه' },
                { icon: Trophy, t: 'چالش با جایزه‌ی نقدی' },
                { icon: Droplet, t: 'سلامت و تغذیه' },
              ].map((x) => (
                <li key={x.t} className="flex flex-col gap-2 rounded-[20px] bg-white/[.05] p-3 text-white/75">
                  <x.icon size={18} className="text-[#8a6bff]" /> {x.t}
                </li>
              ))}
            </ul>
          </div>
          <HeroVisual />
        </section>

        <Bento />

        <section aria-labelledby="tour-title">
          <h2 id="tour-title" className="mb-8 text-[32px] font-black">در حرکت ببین</h2>
          <Showcase />
        </section>

        <section aria-labelledby="how">
          <h2 id="how" className="text-[32px] font-black">در سه قدم</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.t} className="rounded-[30px] bg-white/[.05] p-6">
                <div className="flex items-center justify-between">
                  <span className="card-violet flex h-12 w-12 items-center justify-center rounded-full text-ink-950"><s.icon size={22} /></span>
                  <span className="text-[44px] font-black text-white/10">{(i + 1).toLocaleString('fa-IR')}</span>
                </div>
                <h3 className="mt-4 text-[19px] font-extrabold">{s.t}</h3>
                <p className="mt-1 text-[14px] leading-7 text-white/60">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="card-night relative overflow-hidden rounded-[40px] p-8 sm:p-12">
          <span aria-hidden className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(246,169,211,.35),transparent_65%)]" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-[28px] font-black leading-snug">باشگاه‌دار، مربی، پزشک یا فروشنده‌ای؟</h2>
              <p className="mt-2 max-w-xl text-[15px] leading-8 text-white/60">با حساب کسب‌وکار، پنل مدیریت، پذیرش ورود با QR، فروش و تسویه‌ی درآمد داری. مدارکت را بارگذاری کن تا پس از بررسی فعال شوی.</p>
            </div>
            <Link to="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-extrabold text-ink-950">
              ثبت کسب‌وکار <ArrowLeft size={18} />
            </Link>
          </div>
        </section>

        <section className="text-center">
          <Emblem size={72} className="mx-auto" />
          <div dir="ltr" className="mt-4 text-[13px] font-semibold tracking-[.35em] text-white/45">UNLOCK YOUR POTENTIAL</div>
          <h2 className="mt-3 text-[34px] font-black">آماده‌ای؟</h2>
          <p className="mt-2 text-white/60">ثبت‌نام رایگان است.</p>
          <div className="mt-6">{start}</div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-[13px] text-white/40">
        © {new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date())} کی‌فیت · اصفهان · keyfitapp.ir
      </footer>
    </div>
  )
}
