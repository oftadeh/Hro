import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { weekdayLabel } from '@/core/services/fityab'
import { uid } from '@/core/id'
import { useDB } from '@/core/db'
import { saveGym } from '@/core/services/fityab'
import type { Gym, GymClass, Media } from '@/core/types'
import { Button, Card, Field, ImagePicker, Input, NumberInput, PageHeader, SectionTitle, Select, Textarea } from '@/ui/kit'
import { run } from '@/ui/toast'
import { LocationPicker } from '../shared/LocationPicker'

const split = (s: string) => s.split(/[،,]/).map((x) => x.trim()).filter(Boolean)

export default function GymEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const existing = useDB((s) => s.gyms.find((g) => g.id === id))
  const [f, setF] = useState<Partial<Gym>>(
    existing ?? { name: '', tagline: '', description: '', address: '', phone: '', sessionPrice: 100_000, facilities: [], sports: [], hours: '۸ صبح تا ۱۰ شب', gender: 'mixed', lat: 35.7219, lng: 51.3347, media: [], capacity: 50, classes: [] },
  )
  const [facilities, setFacilities] = useState((existing?.facilities ?? []).join('، '))
  const [sports, setSports] = useState((existing?.sports ?? []).join('، '))
  const [video, setVideo] = useState('')
  const set = <K extends keyof Gym>(k: K, v: Gym[K]) => setF((s) => ({ ...s, [k]: v }))
  const media = f.media ?? []
  const classes = f.classes ?? []

  const save = async () => {
    const gid = await run(() => saveGym({ ...f, facilities: split(facilities), sports: split(sports) }), existing ? 'تغییرات ذخیره شد' : 'باشگاه ثبت شد و پس از تایید مدیر در فیت‌یاب نمایش داده می‌شود')
    if (gid) nav('/panel/gym')
  }

  return (
    <div className="animate-fade-up">
      <PageHeader back="/panel/gym" title={existing ? `ویرایش ${existing.name}` : 'معرفی باشگاه جدید'} subtitle="اطلاعات، عکس، فیلم و موقعیت باشگاه برای نمایش در فیت‌یاب" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <Field label="نام باشگاه"><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="شعار کوتاه"><Input value={f.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="مثلاً: بدنسازی حرفه‌ای با تجهیزات روز" /></Field>
          <Field label="معرفی کامل"><Textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="هزینه‌ی هر سانس (تومان)"><NumberInput value={f.sessionPrice ?? 0} onChange={(v) => set('sessionPrice', v)} /></Field>
            <Field label="ساعات کاری"><Input value={f.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
            <Field label="تلفن"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" className="text-left" /></Field>
            <Field label="جنسیت">
              <Select value={f.gender} onChange={(e) => set('gender', e.target.value as Gym['gender'])}>
                <option value="mixed">سانس بانوان و آقایان</option><option value="male">آقایان</option><option value="female">بانوان</option>
              </Select>
            </Field>
          </div>
          <Field label="رشته‌ها" hint="با ویرگول جدا کنید"><Input value={sports} onChange={(e) => setSports(e.target.value)} placeholder="بدنسازی، کراس‌فیت، یوگا" /></Field>
          <Field label="امکانات" hint="با ویرگول جدا کنید"><Input value={facilities} onChange={(e) => setFacilities(e.target.value)} placeholder="سونا، پارکینگ، کمد" /></Field>
        </Card>

        <Card className="space-y-4 lg:col-span-2">
          <SectionTitle title="ظرفیت و قیمت‌گذاری ساعات خلوت" />
          <p className="-mt-3 text-xs leading-6 text-ink-500">با تخفیف در ساعات خلوت، ظرفیت خالی سالن پر می‌شود. ظرفیت برای نمایش «شلوغی لحظه‌ای» به ورزشکاران استفاده می‌شود.</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="ظرفیت هم‌زمان (نفر)"><NumberInput value={f.capacity ?? 50} onChange={(v) => set('capacity', v)} /></Field>
            <Field label="ساعات خلوت از"><NumberInput value={f.offPeak?.from ?? 10} onChange={(v) => set('offPeak', { from: v, to: f.offPeak?.to ?? 16, discountPct: f.offPeak?.discountPct ?? 0 })} /></Field>
            <Field label="تا ساعت"><NumberInput value={f.offPeak?.to ?? 16} onChange={(v) => set('offPeak', { from: f.offPeak?.from ?? 10, to: v, discountPct: f.offPeak?.discountPct ?? 0 })} /></Field>
            <Field label="تخفیف (درصد)" hint="۰ یعنی غیرفعال"><NumberInput value={f.offPeak?.discountPct ?? 0} onChange={(v) => set('offPeak', { from: f.offPeak?.from ?? 10, to: f.offPeak?.to ?? 16, discountPct: v })} /></Field>
          </div>
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          <SectionTitle
            title="کلاس‌های گروهی هفتگی"
            action={
              <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => set('classes', [...classes, { id: uid('k-'), title: '', sport: '', coachName: '', weekday: 0, time: '18:00', durationMin: 60, capacity: 15 }])}>
                افزودن کلاس
              </Button>
            }
          />
          {classes.length === 0 && <p className="text-xs text-ink-500">کلاسی تعریف نشده است. ورزشکاران می‌توانند هر نوبت کلاس را تا ۷ روز آینده رزرو کنند.</p>}
          {classes.map((c, i) => {
            const up = (patch: Partial<GymClass>) => set('classes', classes.map((x, j) => (j === i ? { ...x, ...patch } : x)))
            return (
              <div key={c.id} className="grid grid-cols-2 gap-2 rounded-2xl bg-ink-900/[.03] p-3 sm:grid-cols-8 dark:bg-white/[.04]">
                <Input className="col-span-2" value={c.title} onChange={(e) => up({ title: e.target.value, sport: e.target.value })} placeholder="عنوان (مثلاً اسپینینگ)" />
                <Input className="col-span-2" value={c.coachName} onChange={(e) => up({ coachName: e.target.value })} placeholder="نام مربی" />
                <Select value={c.weekday} onChange={(e) => up({ weekday: Number(e.target.value) })}>
                  {[0, 1, 2, 3, 4, 5, 6].map((w) => <option key={w} value={w}>{weekdayLabel(w)}</option>)}
                </Select>
                <Input type="time" value={c.time} onChange={(e) => up({ time: e.target.value })} dir="ltr" />
                <NumberInput value={c.capacity} onChange={(v) => up({ capacity: v })} placeholder="ظرفیت" aria-label="ظرفیت" />
                <div className="flex gap-1">
                  <NumberInput value={c.price ?? 0} onChange={(v) => up({ price: v || undefined })} placeholder="قیمت" aria-label="قیمت" />
                  <button onClick={() => set('classes', classes.filter((_, j) => j !== i))} className="shrink-0 rounded-full p-2 text-coral-500" aria-label="حذف کلاس"><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <Field label="آدرس"><Input value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <div className="text-xs text-ink-500">روی نقشه کلیک کنید تا موقعیت دقیق باشگاه ثبت شود</div>
            <LocationPicker lat={f.lat!} lng={f.lng!} onChange={(lat, lng) => setF((s) => ({ ...s, lat, lng }))} />
          </Card>
          <Card>
            <SectionTitle title="گالری عکس و فیلم" />
            <div className="grid grid-cols-3 gap-2">
              {media.map((m, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-ink-900">
                  {m.type === 'image' ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl text-white"></div>}
                  <button onClick={() => set('media', media.filter((_, j) => j !== i))} className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white" aria-label="حذف"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <ImagePicker className="mt-3" onChange={(url) => url && set('media', [...media, { type: 'image', url } as Media])} label="افزودن عکس" />
            <div className="mt-3 flex gap-2">
              <Input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="لینک فیلم (mp4)" dir="ltr" className="text-left" />
              <Button variant="secondary" onClick={() => { if (video.startsWith('http')) { set('media', [...media, { type: 'video', url: video }]); setVideo('') } }}>افزودن</Button>
            </div>
          </Card>
          <Button size="lg" className="w-full" onClick={save}>{existing ? 'ذخیره‌ی تغییرات' : 'ثبت باشگاه'}</Button>
        </div>
      </div>
    </div>
  )
}
