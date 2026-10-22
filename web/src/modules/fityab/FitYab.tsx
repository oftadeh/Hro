import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, List, Map as MapIcon, Navigation, Search } from 'lucide-react'
import { useDB } from '@/core/db'
import { DEFAULT_CENTER } from '@/core/config'
import { dec, distanceKm, toman } from '@/core/format'
import { Button, Chips, Cover, Input, PageHeader, Stars, Tabs } from '@/ui/kit'
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
          <GymMap gyms={list.map((x) => x.g)} center={center} user={user} selected={selected} onSelect={(id) => { setSelected(id); const g = gyms.find((x) => x.id === id); if (g) setCenter([g.lat, g.lng]) }} className="h-[62dvh]" />
          {sel && (
            <div className="absolute inset-x-3 bottom-3 z-[500] animate-fade-up overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-ink-900">
              <div className="flex gap-3 p-3">
                <Cover gradient={sel.g.cover} image={sel.g.media.find((m) => m.type === 'image')?.url} emoji="🏋️" className="h-24 w-24 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-bold">{sel.g.name}</div>
                    <Stars value={sel.g.rating} />
                  </div>
                  <div className="truncate text-xs text-ink-500">{sel.g.tagline}</div>
                  <div className="mt-1 text-xs text-ink-400">{dec(sel.d)} کیلومتر · {toman(sel.g.sessionPrice)}</div>
                  <div className="mt-2 flex gap-2">
                    <Link to={`/fityab/${sel.g.id}`} className="flex-1">
                      <Button size="sm" className="w-full">مشاهده و ورود</Button>
                    </Link>
                    <a href={directionsUrl(sel.g.lat, sel.g.lng)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="secondary" icon={<Navigation size={14} />}>مسیر</Button>
                    </a>
                  </div>
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
