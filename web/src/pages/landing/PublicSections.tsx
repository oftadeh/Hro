/**
 * بخش‌های عمومی صفحه‌ی اول که از داده‌ی واقعی ساخته می‌شوند: باشگاه‌های طرف قرارداد، پلن‌ها و قیمت‌ها،
 * قول‌های ما (بازگشت اعتبار و…) و مشخصات حقوقی. هدف: بازدیدکننده قبل از ثبت‌نام ببیند باشگاه خودش هست یا نه،
 * چقدر باید بپردازد و پشت اپ چه کسی است.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { BadgeCheck, Building2, Check, MapPin, RefreshCcw, ShieldCheck, Sparkles, Star, Undo2 } from 'lucide-react'
import { GYM_TIERS, SUBSCRIPTION_PLANS, VENUE_KINDS } from '@/core/config'
import { num, toman } from '@/core/format'
import { Cover } from '@/ui/kit'
import { REMOTE, api } from '@/core/client/remote'
import { useDB } from '@/core/db'
import { publicInfo, type PublicInfo } from '@/core/services/public'

/** اطلاعات عمومی: روی سرور از /api/public، در حالت نمایشی از داده‌های محلی */
export function usePublicInfo(): PublicInfo | null {
  const local = useDB((s) => (REMOTE ? null : s))
  const [remote, setRemote] = useState<PublicInfo | null>(null)
  useEffect(() => {
    if (!REMOTE) return
    let alive = true
    api<PublicInfo>('/public').then((x) => alive && setRemote(x)).catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  const fromLocal = useMemo(() => (local ? publicInfo(local) : null), [local])
  return REMOTE ? remote : fromLocal
}

const GENDER = { male: 'آقایان', female: 'بانوان', mixed: 'مختلط یا سانس‌بندی' } as const

/* ───────── باشگاه‌های طرف قرارداد ───────── */

export function PartnerGyms({ info }: { info: PublicInfo | null }) {
  const [city, setCity] = useState<string>('')
  const [gender, setGender] = useState<'' | 'female'>('')
  const [all, setAll] = useState(false)
  const gyms = useMemo(() => info?.gyms ?? [], [info])
  const cities = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of gyms) m.set(g.city, (m.get(g.city) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [gyms])
  const shown = gyms.filter((g) => (!city || g.city === city) && (!gender || g.gender !== 'male'))
  const list = all ? shown : shown.slice(0, 6)

  return (
    <section aria-labelledby="partners" id="partners" className="scroll-mt-20">
      <h2 id="partners" className="max-w-xl text-[32px] font-black leading-tight">باشگاه خودت هست؟</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-8 text-white/60">قبل از ثبت‌نام، باشگاه‌ها و قیمت هر جلسه را ببین. همین قیمت از اعتبار اشتراکت کم می‌شود.</p>

      {info && (
        <ul className="mt-6 flex flex-wrap gap-2 text-[13px]" aria-label="آمار ارائه‌دهنده‌های فعال">
          {[
            { n: info.counts.gyms, t: 'مجموعه‌ی ورزشی' },
            { n: info.counts.cities, t: 'شهر' },
            { n: info.counts.coaches, t: 'مربی تأییدشده' },
            { n: info.counts.doctors, t: 'پزشک و درمانگر' },
            { n: info.counts.restaurants, t: 'رستوران سالم' },
            { n: info.counts.products, t: 'کالای فروشگاه' },
          ]
            .filter((x) => x.n > 0)
            .map((x) => (
              <li key={x.t} className="rounded-full bg-white/[.06] px-4 py-2 text-white/75">
                <b className="font-extrabold text-white">{num(x.n)}</b> {x.t}
              </li>
            ))}
        </ul>
      )}

      {gyms.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="فیلتر">
          <Chip on={!city} onClick={() => setCity('')}>همه‌ی شهرها</Chip>
          {cities.slice(0, 8).map((c) => (
            <Chip key={c} on={city === c} onClick={() => setCity(c)}>{c}</Chip>
          ))}
          <Chip on={gender === 'female'} onClick={() => setGender(gender === 'female' ? '' : 'female')}>ویژه‌ی بانوان</Chip>
        </div>
      )}

      {!info ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="h-[132px] animate-pulse rounded-[28px] bg-white/[.05]" />)}
        </div>
      ) : list.length ? (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((g) => (
              <li key={g.id} className="flex h-full min-h-[132px] gap-4 rounded-[28px] bg-white/[.05] p-4">
                <Cover gradient={g.id} image={g.photo} className="h-[100px] w-[88px] shrink-0 rounded-[20px]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-extrabold">{g.name}{g.branch ? ` · ${g.branch}` : ''}</div>
                  <div className="mt-1 flex items-center gap-1 text-[13px] text-white/60">
                    <MapPin size={14} className="shrink-0" /> <span className="truncate">{g.city} · {VENUE_KINDS[g.kind]?.label ?? 'باشگاه'} · {GENDER[g.gender]}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                    <span className="rounded-full bg-white/10 px-2.5 py-1">سطح {GYM_TIERS[g.tier].label}</span>
                    {g.reviews > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><Star size={12} className="text-[#dcff5a]" /> {g.rating.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}</span>
                    )}
                  </div>
                  <div className="mt-2 text-[14px] font-extrabold text-[#dcff5a]">
                    {toman(g.sessionPrice)} <span className="text-[12px] font-semibold text-white/50">{g.kind === 'hall' || g.kind === 'turf' ? 'هر ساعت' : 'هر جلسه'}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {shown.length > list.length && (
            <button type="button" onClick={() => setAll(true)} className="mt-5 inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-[14px] font-semibold active:scale-95">
              نمایش همه‌ی {num(shown.length)} مجموعه
            </button>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-[28px] bg-white/[.05] p-6">
          <div className="text-[17px] font-extrabold">{gyms.length ? 'با این فیلتر مجموعه‌ای پیدا نشد' : 'به‌زودی اولین باشگاه‌ها اینجا می‌آیند'}</div>
          <p className="mt-1 text-[14px] leading-7 text-white/60">
            {gyms.length ? 'شهر یا فیلتر دیگری را امتحان کن.' : 'ثبت‌نام کن تا وقتی باشگاه نزدیکت اضافه شد خبرت کنیم. باشگاه‌داری؟ همین حالا رایگان ثبت کن.'}
          </p>
          {!gyms.length && (
            <Link to="/login" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-extrabold text-ink-950 active:scale-95">
              <Building2 size={16} /> ثبت باشگاه
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx('h-10 rounded-full px-4 text-[13px] font-semibold transition active:scale-95', on ? 'card-lime text-ink-950' : 'bg-white/[.06] text-white/75')}
    >
      {children}
    </button>
  )
}

/* ───────── پلن‌ها ───────── */

export function Plans({ info }: { info: PublicInfo | null }) {
  return (
    <section aria-labelledby="plans" id="plans" className="scroll-mt-20">
      <h2 id="plans" className="max-w-xl text-[32px] font-black leading-tight">قیمت‌ها، شفاف</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-8 text-white/60">هر پلن به اندازه‌ی پولی که می‌دهی اعتبار ورود دارد. هر جلسه فقط به قیمت خود باشگاه از اعتبارت کم می‌شود.</p>

      {info?.trial && (
        <div className="card-lime mt-6 flex flex-col gap-1 rounded-[28px] p-5 text-ink-950 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[18px] font-black"><Sparkles size={18} /> اول رایگان امتحان کن</div>
            <p className="mt-1 text-[14px] leading-7 opacity-80">{toman(info.trial.credit)} اعتبار ورود تا {num(info.trial.days)} روز، بدون پرداخت و بدون کارت بانکی. فقط یک بار برای هر شماره.</p>
          </div>
        </div>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUBSCRIPTION_PLANS.map((p) => (
          <li key={p.id} className={clsx('flex h-full flex-col rounded-[28px] p-5', p.popular ? 'card-violet text-white' : 'bg-white/[.05]')}>
            <div className="flex items-center justify-between">
              <span className="text-[18px] font-black">{p.name}</span>
              {p.popular && <span className="rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-bold">محبوب</span>}
            </div>
            <div className="mt-3 text-[26px] font-black leading-none">{num(p.price)} <span className="text-[13px] font-semibold opacity-70">تومان</span></div>
            <div className="mt-1 text-[13px] opacity-70">{p.durationDays % 30 === 0 ? `${num(p.durationDays / 30)} ماهه` : `${num(p.durationDays)} روزه`}</div>
            <ul className="mt-4 space-y-2 text-[13px] leading-6">
              {p.perks.map((x) => (
                <li key={x} className="flex gap-2"><Check size={16} className={clsx('mt-1 shrink-0', p.popular ? 'text-[#dcff5a]' : 'text-[#8a6bff]')} /> <span className="opacity-85">{x}</span></li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ───────── قول‌های ما و هویت حقوقی ───────── */

const PROMISES = [
  { icon: Undo2, t: 'پولت برمی‌گردد', d: 'هر وقت اشتراک را لغو کنی، اعتبار استفاده‌نشده (تا مبلغی که پرداخت کردی) همان لحظه به کیف پولت برمی‌گردد و قابل برداشت است.' },
  { icon: RefreshCcw, t: 'اعتبار نمی‌سوزد', d: 'اگر تا یک هفته بعد از پایان دوره تمدید کنی، باقی‌مانده‌ی اعتبارت به دوره‌ی بعد منتقل می‌شود.' },
  { icon: BadgeCheck, t: 'ارائه‌دهنده‌ی بررسی‌شده', d: 'هر باشگاه، مربی و پزشک قبل از نمایش، مجوز و مدارکش توسط کی‌فیت بررسی می‌شود.' },
  { icon: ShieldCheck, t: 'پرداخت امن', d: 'پرداخت فقط از درگاه بانکی رسمی انجام می‌شود و اطلاعات کارتت پیش ما نمی‌ماند.' },
]

export function Trust({ info }: { info: PublicInfo | null }) {
  const c = info?.company
  return (
    <section aria-labelledby="trust">
      <h2 id="trust" className="max-w-xl text-[32px] font-black leading-tight">قول ما به تو</h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROMISES.map((x) => (
          <li key={x.t} className="h-full rounded-[28px] bg-white/[.05] p-5">
            <span className="card-mint flex h-11 w-11 items-center justify-center rounded-full text-ink-950"><x.icon size={20} /></span>
            <h3 className="mt-4 text-[17px] font-extrabold">{x.t}</h3>
            <p className="mt-1 text-[14px] leading-7 text-white/60">{x.d}</p>
          </li>
        ))}
      </ul>
      {c && (
        <div className="mt-6 flex flex-col gap-4 rounded-[28px] bg-white/[.05] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[14px] leading-7 text-white/70">
            <div className="text-[16px] font-extrabold text-white">{c.name}</div>
            {c.nationalId && <div>شناسه‌ی ملی: <span dir="ltr">{c.nationalId}</span></div>}
            {c.address && <div>{c.address}</div>}
            <div className="flex flex-wrap gap-x-4">
              {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} dir="ltr" className="hover:text-white">{c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}`} dir="ltr" className="hover:text-white">{c.email}</a>}
            </div>
          </div>
          <EnamadBadge info={info} />
        </div>
      )}
    </section>
  )
}

/** نماد اعتماد الکترونیکی؛ فقط وقتی مدیر شناسه و کد را وارد کرده باشد */
export function EnamadBadge({ info, small }: { info: PublicInfo | null; small?: boolean }) {
  const c = info?.company
  if (!c?.enamadId || !c.enamadCode) return null
  const q = `id=${encodeURIComponent(c.enamadId)}&Code=${encodeURIComponent(c.enamadCode)}`
  return (
    <a referrerPolicy="origin" target="_blank" rel="noopener" href={`https://trustseal.enamad.ir/?${q}`} className="inline-block shrink-0 rounded-[18px] bg-white p-2">
      <img referrerPolicy="origin" src={`https://trustseal.enamad.ir/logo.aspx?${q}`} alt="نماد اعتماد الکترونیکی" className={small ? 'h-16 w-auto' : 'h-24 w-auto'} style={{ cursor: 'pointer' }} />
    </a>
  )
}
