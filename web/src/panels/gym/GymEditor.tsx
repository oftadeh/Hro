import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, FileText, Plus, Trash2, Upload } from 'lucide-react'
import { openDoc, uploadDoc, uploadVideo } from '@/core/client/remote'
import { IR_CITIES, VENUE_KINDS, cityCenter } from '@/core/config'
import { CityInput } from '@/ui/CityInput'
import { useMe } from '@/ui/hooks'
import type { VenueKind } from '@/core/types'
import { MIN_GYM_PHOTOS, gymMissing, isDefaultSpot, weekdayLabel } from '@/core/services/fityab'
import { uid } from '@/core/id'
import { useDB } from '@/core/db'
import { saveGym } from '@/core/services/fityab'
import type { GenderWindow, Gym, GymClass, Media } from '@/core/types'
import { Button, Card, Field, ImagePicker, Input, NumberInput, PageHeader, SectionTitle, Select, Tabs, Textarea } from '@/ui/kit'
import { run, toast } from '@/ui/toast'
import { LocationPicker } from '../shared/LocationPicker'

type Tab = 'info' | 'capacity' | 'classes' | 'place' | 'license'

/** هر مورد ناقص در کدام بخش فرم است */
const TAB_OF: Record<string, Tab> = { name: 'info', city: 'info', phone: 'info', description: 'info', sports: 'info', hours: 'info', address: 'place', location: 'place', photos: 'place', licenseNo: 'license', licenseDoc: 'license' }

const split = (s: string) => s.split(/[،,]/).map((x) => x.trim()).filter(Boolean)

export default function GymEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const existing = useDB((s) => s.gyms.find((g) => g.id === id))
  const me = useMe()
  // «افزودن شعبه»: اطلاعات مشترک از شعبه‌ی مبدأ کپی می‌شود؛ نشانی، موقعیت و تصاویر هر شعبه جداست
  const [search] = useSearchParams()
  const source = useDB((s) => s.gyms.find((g) => g.id === search.get('from') && g.ownerId === me?.id))
  const [f, setF] = useState<Partial<Gym>>(() => {
    if (existing) return existing
    if (source) {
      const [lat, lng] = cityCenter(source.city)
      return {
        name: source.name, brand: source.brand || source.name, branch: '', tagline: source.tagline, description: source.description, address: '', city: source.city, phone: source.phone,
        sessionPrice: source.sessionPrice, facilities: source.facilities, sports: source.sports, hours: source.hours, gender: source.gender, genderHours: source.genderHours,
        offPeak: source.offPeak, kind: source.kind, rental: source.rental, capacity: source.capacity, lat, lng, media: [],
        classes: (source.classes ?? []).map((c) => ({ ...c, id: uid('k-') })),
      }
    }
    const [lat, lng] = cityCenter(me?.city)
    return { name: '', tagline: '', description: '', address: '', city: me?.city ?? '', phone: '', sessionPrice: 100_000, facilities: [], sports: [], hours: '۸ صبح تا ۱۰ شب', gender: 'mixed', lat, lng, media: [], capacity: 50, classes: [] }
  })
  /** با عوض شدن شهرِ مجموعه‌ی تازه، نقشه‌ی انتخاب مکان به همان شهر می‌رود */
  const setCity = (city: string) => {
    const c = IR_CITIES.find((x) => x.name === city.trim())
    setF((x) => ({ ...x, city, ...(!existing && c ? { lat: c.lat, lng: c.lng } : {}) }))
  }
  const [facilities, setFacilities] = useState((existing?.facilities ?? []).join('، '))
  const [sports, setSports] = useState((existing?.sports ?? []).join('، '))
  const [video, setVideo] = useState('')
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState<Tab>('info')
  const [docBusy, setDocBusy] = useState(false)
  const kind = (f.kind ?? 'gym') as VenueKind
  const rentalKind = VENUE_KINDS[kind].booking === 'rental'
  // اجاره‌ای‌ها کلاس ندارند؛ اگر وسط کار نوع عوض شد، بخش کلاس‌ها به اطلاعات برمی‌گردد
  const view = rentalKind && tab === 'classes' ? 'info' : tab
  const set = <K extends keyof Gym>(k: K, v: Gym[K]) => setF((s) => ({ ...s, [k]: v }))
  const media = f.media ?? []
  const classes = f.classes ?? []
  const missing = gymMissing({ ...f, sports: split(sports) })
  const photos = media.filter((m) => m.type === 'image').length
  const review = existing && !existing.approved ? existing.review : undefined
  const rejected = review?.status === 'rejected'

  const save = async () => {
    const gid = await run(() => saveGym({ ...f, facilities: split(facilities), sports: split(sports) }), existing ? 'تغییرات ذخیره شد' : 'باشگاه ثبت شد و پس از تایید مدیر در فیت‌یاب نمایش داده می‌شود')
    if (gid) nav("/panel/gym/gyms")
  }

  return (
    <div className="animate-fade-up">
      <PageHeader back="/panel/gym/gyms" title={existing ? `ویرایش ${existing.name}` : 'معرفی باشگاه جدید'} subtitle="اطلاعات، عکس، فیلم و موقعیت باشگاه برای نمایش در فیت‌یاب" />
      {/* بخش‌های فرم: هر بار فقط یک بخش؛ ذخیره همه را با هم ثبت می‌کند */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4 no-scrollbar">
        <Tabs
          value={view}
          onChange={setTab}
          items={[
            { value: 'info', label: 'اطلاعات و قیمت' },
            { value: 'capacity', label: rentalKind ? 'ظرفیت' : 'ظرفیت و سانس‌ها' },
            ...(rentalKind ? [] : [{ value: 'classes' as const, label: `کلاس‌ها${classes.length ? ` (${classes.length.toLocaleString('fa-IR')})` : ''}` }]),
            { value: 'place', label: 'مکان و عکس‌ها' },
            { value: 'license', label: 'مجوز' },
          ]}
        />
      </div>
      <div className="grid max-w-3xl gap-4">
        {review && (review.status !== 'pending' || review.note) && (
          <Card className={`flex items-start gap-3 border text-[14px] leading-7 ${rejected ? 'border-coral-300/50' : 'border-gold-400/50'}`}>
            <AlertCircle size={20} className={`mt-1 shrink-0 ${rejected ? 'text-coral-500' : 'text-gold-600'}`} />
            <div>
              <b>{rejected ? 'ثبت این باشگاه رد شد' : review.status === 'changes' ? 'مدیر کی‌فیت درخواست اصلاح داده است' : 'در انتظار بررسی دوباره'}</b>
              {review.note && <div>یادداشت مدیر: {review.note}</div>}
              {rejected ? <div className="text-ink-500">برای بررسی دوباره با پشتیبانی تماس بگیرید.</div> : review.status === 'changes' && <div className="text-ink-500">موارد را اصلاح و ذخیره کنید تا دوباره بررسی شود.</div>}
            </div>
          </Card>
        )}
        {view === 'info' && (
        <Card className="space-y-4">
          <Field label="نوع مجموعه">
            <Select value={kind} onChange={(e) => { const k = e.target.value as VenueKind; set('kind', k); if (VENUE_KINDS[k].booking === 'rental' && !f.rental) set('rental', { hourlyPrice: 800_000, openFrom: 8, openTo: 24, maxHours: 2 }) }}>
              {(Object.keys(VENUE_KINDS) as VenueKind[]).map((k) => <option key={k} value={k}>{VENUE_KINDS[k].label} — {VENUE_KINDS[k].desc}</option>)}
            </Select>
          </Field>
          <Field label="نام مجموعه"><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="برند (برای چند شعبه)" hint="همه‌ی شعبه‌ها یک برند داشته باشند"><Input value={f.brand ?? ''} onChange={(e) => set('brand', e.target.value)} placeholder="مثلاً آیرون‌من" /></Field>
            <Field label="نام شعبه"><Input value={f.branch ?? ''} onChange={(e) => set('branch', e.target.value)} placeholder="مثلاً شعبه‌ی سعادت‌آباد" /></Field>
          </div>
          <Field label="شعار کوتاه"><Input value={f.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="مثلاً: بدنسازی حرفه‌ای با تجهیزات روز" /></Field>
          <Field label="معرفی کامل" hint="حداقل ۳۰ حرف: فضا، تجهیزات، مربی‌ها"><Textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {rentalKind ? (
              <>
                <Field label="اجاره‌ی هر ساعت (تومان)"><NumberInput value={f.rental?.hourlyPrice ?? 0} onChange={(v) => set('rental', { ...(f.rental ?? { openFrom: 8, openTo: 24, maxHours: 2 }), hourlyPrice: v })} /></Field>
                <Field label="حداکثر ساعت هر رزرو"><NumberInput value={f.rental?.maxHours ?? 2} onChange={(v) => set('rental', { ...(f.rental ?? { hourlyPrice: 0, openFrom: 8, openTo: 24 }), maxHours: v })} /></Field>
                <Field label="شروع ساعت کاری"><NumberInput value={f.rental?.openFrom ?? 8} onChange={(v) => set('rental', { ...(f.rental ?? { hourlyPrice: 0, openTo: 24, maxHours: 2 }), openFrom: v })} /></Field>
                <Field label="پایان ساعت کاری"><NumberInput value={f.rental?.openTo ?? 24} onChange={(v) => set('rental', { ...(f.rental ?? { hourlyPrice: 0, openFrom: 8, maxHours: 2 }), openTo: v })} /></Field>
              </>
            ) : (
              <Field label="هزینه‌ی هر سانس (تومان)"><NumberInput value={f.sessionPrice ?? 0} onChange={(v) => set('sessionPrice', v)} /></Field>
            )}
            <Field label="ساعات کاری"><Input value={f.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
            <Field label="شهر"><CityInput value={f.city ?? ''} onChange={(e) => setCity(e.target.value)} /></Field>
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
        )}

        {view === 'capacity' && (
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
        )}

        {view === 'capacity' && f.gender === 'mixed' && !rentalKind && (
          <Card className="space-y-3 lg:col-span-2">
            <SectionTitle
              title="سانس بانوان و آقایان"
              action={
                <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => set('genderHours', [...(f.genderHours ?? []), { from: 8, to: 12, gender: 'female' }])}>
                  افزودن سانس
                </Button>
              }
            />
            <p className="text-xs leading-6 text-ink-500">در این بازه‌ها فقط همان جنسیت بلیت می‌گیرد و وارد می‌شود. بلیت هر نفر تا پایان سانس خودش معتبر است. کلاس‌هایی که جنسیت ندارند، از سانس همان ساعت پیروی می‌کنند.</p>
            {(f.genderHours ?? []).map((w, i) => {
              const up = (patch: Partial<GenderWindow>) => set('genderHours', (f.genderHours ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)))
              return (
                <div key={i} className="grid grid-cols-2 items-center gap-2 rounded-2xl bg-ink-900/[.03] p-3 sm:grid-cols-5 dark:bg-white/[.04]">
                  <Select value={w.gender} onChange={(e) => up({ gender: e.target.value as GenderWindow['gender'] })}>
                    <option value="female">بانوان</option><option value="male">آقایان</option>
                  </Select>
                  <Select value={w.days?.length === 1 ? w.days[0] : -1} onChange={(e) => up({ days: Number(e.target.value) < 0 ? undefined : [Number(e.target.value)] })}>
                    <option value={-1}>همه‌ی روزها</option>
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{weekdayLabel(d)}</option>)}
                  </Select>
                  <label className="flex items-center gap-1 text-xs">از ساعت <NumberInput value={w.from} onChange={(v) => up({ from: v })} aria-label="از ساعت" /></label>
                  <label className="flex items-center gap-1 text-xs">تا <NumberInput value={w.to} onChange={(v) => up({ to: v })} aria-label="تا ساعت" /></label>
                  <button onClick={() => set('genderHours', (f.genderHours ?? []).filter((_, j) => j !== i))} className="justify-self-end rounded-full p-2 text-coral-500" aria-label="حذف سانس"><Trash2 size={15} /></button>
                </div>
              )
            })}
          </Card>
        )}

        {view === 'classes' && (
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
                {f.gender === 'mixed' && (
                  <Select className="col-span-2" value={c.gender ?? ''} onChange={(e) => up({ gender: (e.target.value || undefined) as GymClass['gender'] })} aria-label="جنسیت کلاس">
                    <option value="">طبق سانس همان ساعت</option><option value="female">ویژه‌ی بانوان</option><option value="male">ویژه‌ی آقایان</option>
                  </Select>
                )}
                <label className="col-span-2 flex items-center gap-2 text-xs sm:col-span-3">
                  <input type="checkbox" checked={c.audience === 'kids'} onChange={(e) => up(e.target.checked ? { audience: 'kids', ageMin: c.ageMin ?? 5, ageMax: c.ageMax ?? 12 } : { audience: undefined, ageMin: undefined, ageMax: undefined })} />
                  کلاس کودکان
                </label>
                {c.audience === 'kids' && (
                  <div className="col-span-2 flex items-center gap-1 text-xs sm:col-span-5">
                    سن از <NumberInput value={c.ageMin ?? 5} onChange={(v) => up({ ageMin: v })} aria-label="حداقل سن" /> تا <NumberInput value={c.ageMax ?? 12} onChange={(v) => up({ ageMax: v })} aria-label="حداکثر سن" /> سال
                  </div>
                )}
              </div>
            )
          })}
        </Card>
        )}

        {view === 'place' && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <Field label="آدرس"><Input value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <div className="text-xs text-ink-500">روی نقشه کلیک کنید یا «موقعیت من» را بزنید تا موقعیت دقیق باشگاه ثبت شود</div>
            <LocationPicker lat={f.lat!} lng={f.lng!} picked={!isDefaultSpot(f)} onChange={(lat, lng) => setF((s) => ({ ...s, lat, lng }))} />
          </Card>
          <Card>
            <SectionTitle title="گالری عکس و فیلم" />
            <p className={`-mt-2 mb-3 text-xs ${photos < MIN_GYM_PHOTOS ? 'text-coral-500' : 'text-ink-500'}`}>حداقل {MIN_GYM_PHOTOS.toLocaleString('fa-IR')} عکس واقعی از سالن، تجهیزات و ورودی لازم است ({photos.toLocaleString('fa-IR')} عکس اضافه شده).</p>
            <div className="grid grid-cols-3 gap-2">
              {media.map((m, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-ink-900">
                  {m.type === 'image' ? <img loading="lazy" decoding="async" src={m.url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl text-white"></div>}
                  <button onClick={() => set('media', media.filter((_, j) => j !== i))} className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white" aria-label="حذف"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <ImagePicker className="mt-3" onChange={(url) => url && set('media', [...media, { type: 'image', url } as Media])} label="افزودن عکس" />
            <div className="mt-3 flex gap-2">
              <Input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="لینک فیلم (mp4)" dir="ltr" className="text-left" />
              <Button variant="secondary" onClick={() => { if (video.startsWith('http')) { set('media', [...media, { type: 'video', url: video }]); setVideo('') } }}>افزودن</Button>
            </div>
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 py-3 text-xs text-ink-500 dark:border-white/15">
              <Upload size={15} /> {uploading ? 'در حال بارگذاری…' : 'بارگذاری فیلم معرفی از گوشی/کامپیوتر'}
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploading(true)
                  const url = await run(() => uploadVideo(file))
                  setUploading(false)
                  if (url) {
                    set('media', [...media, { type: 'video', url }])
                    toast.success('فیلم اضافه شد؛ ذخیره را بزنید')
                  }
                }}
              />
            </label>
          </Card>
        </div>
        )}
        {view === 'license' && (
        <Card className="space-y-4">
          <SectionTitle title="مجوز این مجموعه" />
          <p className="-mt-3 text-xs leading-6 text-ink-500">پروانه‌ی بهره‌برداری از اداره‌ی ورزش و جوانان یا مجوز هیئت ورزشی همین شعبه. فایل مجوز خصوصی است و فقط تیم بررسی کی‌فیت آن را می‌بیند.</p>
          <Field label="شماره‌ی پروانه یا مجوز"><Input value={f.license?.number ?? ''} onChange={(e) => set('license', { number: e.target.value, doc: f.license?.doc ?? '' })} dir="ltr" className="text-left" /></Field>
          {f.license?.doc ? (
            <div className="flex items-center gap-3 rounded-2xl bg-ink-50 px-3 py-2.5 dark:bg-ink-800">
              <FileText size={18} className="shrink-0 text-ink-500" />
              <button type="button" className="min-w-0 flex-1 truncate text-start text-[14px] underline-offset-4 hover:underline" onClick={() => run(() => openDoc(f.license!.doc))}>تصویر مجوز</button>
              <button type="button" aria-label="حذف فایل مجوز" onClick={() => set('license', { number: f.license?.number ?? '', doc: '' })} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700"><Trash2 size={16} /></button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 py-4 text-sm text-ink-500 dark:border-white/15">
              <Upload size={16} /> {docBusy ? 'در حال بارگذاری…' : 'بارگذاری تصویر یا PDF مجوز'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setDocBusy(true)
                  const ref = await run(() => uploadDoc(file))
                  setDocBusy(false)
                  if (ref) set('license', { number: f.license?.number ?? '', doc: ref })
                }}
              />
            </label>
          )}
        </Card>
        )}

        {missing.length > 0 && !rejected && (
          <Card className="space-y-2 border border-gold-400/40">
            <div className="text-[14px] font-bold">برای ثبت، این موارد را کامل کنید</div>
            <ul className="space-y-1">
              {missing.map((m) => (
                <li key={m.key}>
                  <button type="button" onClick={() => setTab(TAB_OF[m.key] ?? 'info')} className="flex items-center gap-2 text-[13px] text-ink-600 underline-offset-4 hover:underline dark:text-ink-300">
                    <AlertCircle size={14} className="shrink-0 text-gold-600" />{m.label}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {missing.length === 0 && !existing?.approved && !rejected && (
          <div className="flex items-center gap-2 text-[13px] text-aqua-600"><CheckCircle2 size={16} /> اطلاعات کامل است؛ پس از ثبت، مدیر کی‌فیت بررسی و منتشر می‌کند.</div>
        )}
        <div className="sticky bottom-3 z-10">
          <Button size="lg" className="w-full shadow-glow" disabled={rejected} onClick={save}>{existing ? (review?.status === 'changes' ? 'ذخیره و ارسال دوباره' : 'ذخیره‌ی تغییرات') : 'ثبت باشگاه'}</Button>
        </div>
      </div>
    </div>
  )
}
