import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, List, Map as MapIcon, Navigation, Search, X } from 'lucide-react'
import { useDB } from '@/core/db'
import { DEFAULT_CENTER } from '@/core/config'
import { dec, distanceKm, num } from '@/core/format'
import { Button, Chips, Cover, Input, PageHeader, Tabs } from '@/ui/kit'
import { toast } from '@/ui/toast'
import { GymMap } from './GymMap'
import { GymCard } from './GymCard'
import { directionsUrl } from './nav'

export default function FitYab() {
  const gyms = useDB((s) => s.gyms)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [q, setQ] = useState('')
  const [sport, setSport] = useState('all')
  const [sort, setSort] = useState<'near' | 'price' | 'rating'>('near')
  const [user, setUser] = useState<[number, number]>()
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [selected, setSelected] = useState<string>()

  const origin = user ?? DEFAULT_CENTER
  const sports = useMemo(() => [...new Set(gyms.filter((g) => g.approved).flatMap((g) => g.sports))].slice(0, 10), [gyms])
  const list = useMemo(() => {
    const l = gyms
      .filter((g) => g.approved)
      .filter((g) => sport === 'all' || g.sports.includes(sport))
      .filter((g) => !q || g.name.includes(q) || g.address.includes(q) || g.sports.some((s) => s.includes(q)))
      .map((g) => ({ g, d: distanceKm(origin, [g.lat, g.lng]) }))
    return l.sort((a, b) => (sort === 'near' ? a.d - b.d : sort === 'price' ? a.g.sessionPrice - b.g.sessionPrice : b.g.rating - a.g.rating))
  }, [gyms, sport, q, sort, origin])

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
              { value: 'map', label: <MapIcon size={16} /> },
              { value: 'list', label: <List size={16} /> },
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
      <Chips value={sport} onChange={setSport} items={[{ value: 'all', label: 'همه‌ی رشته‌ها' }, ...sports.map((s) => ({ value: s, label: s }))]} />

      {view === 'map' ? (
        <div className="relative mt-3">
          <GymMap gyms={list.map((x) => x.g)} center={center} user={user} selected={selected} onSelect={(id) => { setSelected(id); const g = gyms.find((x) => x.id === id); if (g) setCenter([g.lat, g.lng]) }} className="h-[calc(100dvh-24rem)] min-h-[22rem] shadow-card lg:h-[64dvh]" />
          {sel && (
            <div className="absolute inset-x-3 bottom-3 z-[500] animate-sheet-up">
              {/* پنل به سبک ناوبری: سه شاخص + دکمه‌ی طلایی */}
              <div className="rounded-[2rem] border border-white/60 bg-white/90 p-4 pt-2.5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-ink-900/85">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink-200 dark:bg-white/25" />
                <div className="flex items-center gap-3">
                  <Cover gradient={sel.g.cover} image={sel.g.media.find((m) => m.type === 'image')?.url} emoji="🏋️" className="h-14 w-14 shrink-0 rounded-[1rem] text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-black">{sel.g.name}</div>
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
                    ['هر سانس', `${num(sel.g.sessionPrice / 1000)} هزار`],
                  ].map(([k, v], i) => (
                    <div key={k} className={i === 1 ? 'border-x border-ink-100 dark:border-white/10' : ''}>
                      <div className="text-[11px] text-ink-400">{k}</div>
                      <div className="mt-0.5 text-sm font-black">{v}</div>
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
