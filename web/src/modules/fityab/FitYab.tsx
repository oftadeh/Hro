import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Award, Baby, BadgeCheck, Building2, CalendarClock, Crosshair, Dumbbell, Flag, LayoutGrid, List, Map as MapIcon, Navigation, Search, Sparkles, Waves, X, type LucideIcon } from 'lucide-react'
import { useDB } from '@/core/db'
import { VENUE_KINDS, cityCenter } from '@/core/config'
import type { VenueKind } from '@/core/types'
import { dec, distanceKm, num } from '@/core/format'
import { Button, Cover, Input, PageHeader, Tabs } from '@/ui/kit'
import { toast } from '@/ui/toast'
import { GymMap } from './GymMap'
import { GymCard } from './GymCard'
import { ClassFinder } from './ClassFinder'
import { gymTier, rentalTier, subCovers } from '@/core/services/fityab'
import { activeSubscription } from '@/core/services/wallet'
import { directionsUrl } from './nav'
import { useMe } from '@/ui/hooks'

const KIND_ICON: Record<VenueKind, LucideIcon> = { gym: Dumbbell, pool: Waves, equestrian: Award, hall: Building2, turf: Flag }

export default function FitYab() {
  const gyms = useDB((s) => s.gyms)
  const [q, setQ] = useState('')
  const me = useMe()
  const [params] = useSearchParams()
  const [view, setView] = useState<'map' | 'list' | 'classes'>(params.get('view') === 'classes' ? 'classes' : 'map')
  const [sport, setSport] = useState(params.get('sport') ?? 'all')
  const [womenOnly, setWomenOnly] = useState(false)
  const [kidsOnly, setKidsOnly] = useState(params.get('kids') === '1')
  const [coveredOnly, setCoveredOnly] = useState(false)
  useDB((s) => s.subscriptions)
  const sub = me ? activeSubscription(me.id) : null
  const enabled = useDB((s) => s.settings.venueKinds) ?? ['gym']
  const [kind, setKind] = useState<VenueKind | 'all'>((params.get('kind') as VenueKind) ?? 'all')
  const visibleGyms = useMemo(() => gyms.filter((g) => enabled.includes(g.kind ?? 'gym')), [gyms, enabled])
  const [sort, setSort] = useState<'near' | 'price' | 'rating'>('near')
  const [user, setUser] = useState<[number, number]>()
  // بدون موقعیت دقیق، نقشه و فاصله‌ها از مرکز شهر کاربر حساب می‌شود
  const home = useMemo(() => cityCenter(me?.city), [me?.city])
  const [center, setCenter] = useState<[number, number]>(home)
  const [selected, setSelected] = useState<string>()

  const origin = user ?? home
  const sports = useMemo(() => {
    const all = [...new Set(visibleGyms.filter((g) => g.approved && (kind === 'all' || (g.kind ?? 'gym') === kind)).flatMap((g) => g.sports))].slice(0, 10)
    return sport !== 'all' && !all.includes(sport) ? [sport, ...all] : all
  }, [visibleGyms, sport, kind])
  const list = useMemo(() => {
    const l = visibleGyms
      .filter((g) => g.approved)
      .filter((g) => kind === 'all' || (g.kind ?? 'gym') === kind)
      // باشگاه‌های تک‌جنسیتی فقط به همان جنسیت نمایش داده می‌شوند
      // کلاس کودکان: محدودیت جنسیتی برای خود فرزند در رزرو بررسی می‌شود
      .filter((g) => kidsOnly || g.gender === 'mixed' || !me?.gender || g.gender === me.gender)
      .filter((g) => !kidsOnly || !!g.classes?.some((c) => c.audience === 'kids'))
      .filter((g) => !womenOnly || g.gender === 'female')
      .filter((g) => sport === 'all' || g.sports.includes(sport))
      .filter((g) => !q || g.name.includes(q) || g.address.includes(q) || !!g.brand?.includes(q) || !!g.branch?.includes(q) || g.sports.some((s) => s.includes(q)))
      // فقط باشگاه‌هایی که با اعتبار عضویت فعلی می‌شود رفت
      .filter((g) => !coveredOnly || !sub?.planId || subCovers(sub.planId, g.rental ? rentalTier(g) : gymTier(g)))
      .map((g) => ({ g, d: distanceKm(origin, [g.lat, g.lng]) }))
    return l.sort((a, b) => (sort === 'near' ? a.d - b.d : sort === 'price' ? (a.g.rental?.hourlyPrice ?? a.g.sessionPrice) - (b.g.rental?.hourlyPrice ?? b.g.sessionPrice) : b.g.rating - a.g.rating))
  }, [visibleGyms, kind, sport, q, sort, origin, me?.gender, womenOnly, kidsOnly, coveredOnly, sub?.planId])

  const sel = list.find((x) => x.g.id === selected)

  const locate = () => {
    if (!navigator.geolocation) return toast.error('مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos: [number, number] = [p.coords.latitude, p.coords.longitude]
        setUser(pos)
        setCenter(pos)
        toast.info('موقعیت شما روی نقشه مشخص شد')
      },
      () => toast.error('دسترسی به موقعیت مکانی داده نشد'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="فیت‌یاب"
        subtitle="بدون ثبت‌نام، با اشتراک کی‌فیت وارد باشگاه شو"
        actions={
          <Tabs
            value={view}
            onChange={setView}
            items={[
              { value: 'map', label: <><MapIcon size={16} /><span className="sr-only">نقشه</span></> },
              { value: 'list', label: <><List size={16} /><span className="sr-only">فهرست</span></> },
              { value: 'classes', label: <><CalendarClock size={16} /><span className="sr-only">کلاس‌ها بر اساس ساعت</span></> },
            ]}
          />
        }
      />
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی باشگاه، محله یا رشته…" className="pr-10" />
        </div>
        <Button variant="outline" onClick={locate} icon={<Crosshair size={18} />} aria-label="موقعیت من" />
      </div>
      {/* نوع مکان: کارت‌های کوچک با آیکون، در یک ردیف اسکرولی */}
      {enabled.length > 1 && (
        <div className="-mx-4 mb-2.5 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="tablist" aria-label="نوع مکان">
          {([{ v: 'all' as const, label: 'همه', Icon: LayoutGrid }, ...enabled.map((k) => ({ v: k, label: VENUE_KINDS[k].plural, Icon: KIND_ICON[k] }))]).map(({ v, label, Icon }) => (
            <button
              key={v}
              role="tab"
              aria-selected={kind === v}
              onClick={() => { setKind(v); setSport('all') }}
              className={clsx('press flex h-[72px] w-[84px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[20px] text-[12px] font-semibold', kind === v ? 'card-violet shadow-glow' : 'bg-white text-ink-600 shadow-card dark:bg-white/[.06] dark:text-ink-300 dark:shadow-none')}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className="max-w-full truncate px-1">{label}</span>
            </button>
          ))}
        </div>
      )}
      {/* رشته‌ها و فیلترهای ویژه در یک ردیف اسکرولی */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" aria-label="فیلترها">
        {me?.gender === 'female' && (
          <button onClick={() => setWomenOnly((v) => !v)} aria-pressed={womenOnly} className={clsx('press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px]', womenOnly ? 'card-pink font-semibold' : 'bg-ink-900/[.05] text-ink-600 dark:bg-white/[.06] dark:text-ink-300')}>
            <Sparkles size={14} /> ویژه‌ی بانوان
          </button>
        )}
        {sub && (
          <button onClick={() => setCoveredOnly((v) => !v)} aria-pressed={coveredOnly} className={clsx('press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px]', coveredOnly ? 'card-lime font-semibold' : 'bg-ink-900/[.05] text-ink-600 dark:bg-white/[.06] dark:text-ink-300')}>
            <BadgeCheck size={14} /> شامل عضویت {sub.plan.name}
          </button>
        )}
        <button onClick={() => setKidsOnly((v) => !v)} aria-pressed={kidsOnly} className={clsx('press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px]', kidsOnly ? 'card-peach font-semibold' : 'bg-ink-900/[.05] text-ink-600 dark:bg-white/[.06] dark:text-ink-300')}>
          <Baby size={14} /> کودکان
        </button>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-ink-900/10 dark:bg-white/15" />
        {[{ value: 'all', label: 'همه‌ی رشته‌ها' }, ...sports.map((x) => ({ value: x, label: x }))].map((it) => (
          <button key={it.value} onClick={() => setSport(it.value)} aria-pressed={sport === it.value} className={clsx('press h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px]', sport === it.value ? 'bg-ink-950 font-semibold text-white dark:bg-white dark:text-ink-950' : 'bg-ink-900/[.05] text-ink-600 dark:bg-white/[.06] dark:text-ink-300')}>
            {it.label}
          </button>
        ))}
      </div>

      {view === 'classes' ? (
        <ClassFinder list={list} sport={sport} kidsOnly={kidsOnly} gender={me?.gender} />
      ) : view === 'map' ? (
        <div className="relative mt-3">
          <GymMap gyms={list.map((x) => x.g)} center={center} user={user} selected={selected} onSelect={(id) => { setSelected(id); const g = gyms.find((x) => x.id === id); if (g) setCenter([g.lat, g.lng]) }} className="h-[calc(100dvh-24rem)] min-h-[22rem] shadow-card lg:h-[64dvh]" />
          {sel && (
            <div className="absolute inset-x-3 bottom-3 z-[500] animate-sheet-up">
              {/* پنل به سبک ناوبری: سه شاخص + دکمه‌ی طلایی */}
              <div className="rounded-2xl border hairline bg-white/95 p-4 pt-2.5 shadow-soft backdrop-blur-xl dark:bg-ink-900/95">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink-200 dark:bg-white/25" />
                <div className="flex items-center gap-3">
                  <Cover gradient={sel.g.id} image={sel.g.media.find((m) => m.type === 'image')?.url} className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{sel.g.name}</div>
                    <div className="truncate text-xs text-ink-400">{sel.g.address}</div>
                  </div>
                  <button onClick={() => setSelected(undefined)} className="rounded-full bg-ink-100 p-2 text-ink-500 dark:bg-white/10 dark:text-ink-300" aria-label="بستن">
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 text-center">
                  {[
                    ['فاصله', `${dec(sel.d)} کیلومتر`],
                    ['زمان رسیدن', `${num(Math.max(3, (sel.d / 22) * 60))} دقیقه`],
                    sel.g.rental && !sel.g.sessionPrice ? ['هر ساعت اجاره', `${num(sel.g.rental.hourlyPrice / 1000)} هزار`] : ['هر سانس', `${num(sel.g.sessionPrice / 1000)} هزار`],
                  ].map(([k, v], i) => (
                    <div key={k} className={i === 1 ? 'border-x hairline' : ''}>
                      <div className="text-[12px] text-ink-400">{k}</div>
                      <div className="mt-0.5 text-sm font-light tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <a href={directionsUrl(sel.g.lat, sel.g.lng)} target="_blank" rel="noreferrer" className="flex-1">
                    <Button className="w-full" icon={<Navigation size={16} />}>مسیریابی</Button>
                  </a>
                  <Link to={`/fityab/${sel.g.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">ورود به باشگاه</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-3 flex justify-end">
            <Tabs
              value={sort}
              onChange={setSort}
              items={[
                { value: 'near', label: 'نزدیک‌ترین' },
                { value: 'price', label: 'ارزان‌ترین' },
                { value: 'rating', label: 'محبوب‌ترین' },
              ]}
            />
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(({ g, d }) => <GymCard key={g.id} gym={g} distance={d} />)}
          </div>
        </>
      )}
    </div>
  )
}
