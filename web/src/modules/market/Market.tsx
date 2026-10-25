import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Flag, MessageCircle, PackageCheck, Pencil, Plus, ShieldCheck, Truck } from 'lucide-react'
import { useDB } from '@/core/db'
import { LISTING_CATEGORY, LISTING_CONDITION } from '@/core/config'
import { num, timeAgo, toman } from '@/core/format'
import { AUTO_RELEASE_DAYS, buyListing, cancelDeal, confirmReceived, contactSeller, createListing, markShipped, removeListing, updateListing } from '@/core/services/market'
import { reportContent } from '@/core/services/fitzone'
import type { Listing } from '@/core/types'
import { Avatar, Badge, Button, Card, Chips, Empty, Field, ImagePicker, Input, NumberInput, PageHeader, SectionTitle, Select, Sheet, Textarea } from '@/ui/kit'
import { useBalance, useMe, useUserMap } from '@/ui/hooks'
import { run, runOk, ask, askText } from '@/ui/toast'

type Cat = Listing['category']
const DEAL: Record<NonNullable<Listing['deal']>['status'], string> = { paid: 'پرداخت‌شده؛ در انتظار ارسال', shipped: 'ارسال شد؛ در انتظار تأیید خریدار', done: 'تحویل و تسویه شد', cancelled: 'لغو شد' }

function ListingCard({ l }: { l: Listing }) {
  return (
    <Link to={`/market/${l.id}`}>
      <Card className="overflow-hidden p-0 transition hover:-translate-y-0.5">
        <img src={l.photos[0]} alt="" className="aspect-[4/3] w-full object-cover" />
        <div className="p-3">
          <div className="truncate text-sm font-semibold">{l.title}</div>
          <div className="mt-0.5 text-[12px] text-ink-400">{LISTING_CONDITION[l.condition]} · {l.city} · {timeAgo(l.createdAt)}</div>
          <div className="mt-1 flex items-center justify-between">
            <b className="text-sm">{toman(l.price)}</b>
            {l.status !== 'active' && <Badge color={l.status === 'sold' ? 'slate' : 'amber'}>{l.status === 'sold' ? 'فروخته شد' : l.status === 'reserved' ? 'رزرو' : 'حذف'}</Badge>}
          </div>
        </div>
      </Card>
    </Link>
  )
}

/** بازار دست‌دوم لوازم ورزشی با خرید امن */
export default function Market() {
  const me = useMe()!
  const listings = useDB((s) => s.listings)
  const [cat, setCat] = useState<'all' | Cat>('all')
  const [q, setQ] = useState('')
  const active = listings.filter((l) => l.status === 'active' && l.sellerId !== me.id && (cat === 'all' || l.category === cat) && (!q || l.title.includes(q)))
  const mine = listings.filter((l) => (l.sellerId === me.id || l.deal?.buyerId === me.id) && l.status !== 'removed')
  return (
    <div className="animate-fade-up">
      <PageHeader back="/shop" title="بازار دست‌دوم" subtitle="خرید و فروش لوازم ورزشی کارکرده، با خرید امن کی‌فیت" actions={<Link to="/market/new"><Button size="sm" icon={<Plus size={15} />}>ثبت آگهی</Button></Link>} />
      <div className="mb-4 flex items-start gap-2 rounded-2xl bg-aqua-400/10 p-3 text-xs leading-6">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-aqua-600" />
        <span>با «خرید امن»، پول تا وقتی کالا را تحویل بگیرید نزد کی‌فیت می‌ماند. اگر پس از ارسال {num(AUTO_RELEASE_DAYS)} روز تأیید نکنید، مبلغ خودکار به فروشنده واریز می‌شود.</span>
      </div>
      <Input placeholder="جستجو: دمبل، کفش، تردمیل…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
      <div className="mb-4">
        <Chips value={cat} onChange={setCat} items={[{ value: 'all', label: 'همه' }, ...(Object.keys(LISTING_CATEGORY) as Cat[]).map((k) => ({ value: k, label: LISTING_CATEGORY[k] }))]} />
      </div>
      {mine.length > 0 && (
        <>
          <SectionTitle title="آگهی‌ها و خریدهای من" />
          <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{mine.map((l) => <ListingCard key={l.id} l={l} />)}</div>
        </>
      )}
      <SectionTitle title="آگهی‌ها" />
      {active.length === 0 && <Empty title="آگهی‌ای پیدا نشد" />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{active.map((l) => <ListingCard key={l.id} l={l} />)}</div>
    </div>
  )
}

export function ListingDetail() {
  const { id } = useParams()
  const me = useMe()!
  const nav = useNavigate()
  const l = useDB((s) => s.listings.find((x) => x.id === id))
  const users = useUserMap()
  const bal = useBalance(me.id)
  const [buy, setBuy] = useState(false)
  const [address, setAddress] = useState(me.addresses?.[0]?.text ?? '')
  const [tracking, setTracking] = useState('')
  const [photo, setPhoto] = useState(0)
  if (!l) return <Empty title="آگهی یافت نشد" />
  const seller = users[l.sellerId]
  const mineSell = l.sellerId === me.id
  const mineBuy = l.deal?.buyerId === me.id
  return (
    <div className="animate-fade-up">
      <PageHeader back="/market" title={l.title} subtitle={`${LISTING_CATEGORY[l.category]} · ${LISTING_CONDITION[l.condition]}`} />
      <img src={l.photos[photo]} alt="" className="aspect-[4/3] w-full rounded-[2rem] object-cover" />
      {l.photos.length > 1 && (
        <div className="mt-2 flex gap-2">
          {l.photos.map((p, i) => <button key={i} onClick={() => setPhoto(i)}><img src={p} alt="" className={`h-14 w-14 rounded-xl object-cover ${i === photo ? 'ring-2 ring-aqua-500' : 'opacity-70'}`} /></button>)}
        </div>
      )}
      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-3xl">{toman(l.price)}</span>
          <span className="text-xs text-ink-400">{l.city} · {timeAgo(l.createdAt)}</span>
        </div>
        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink-600 dark:text-ink-300">{l.description}</p>
        <Link to={`/u/${l.sellerId}`} className="mt-3 flex items-center gap-2 text-sm"><Avatar name={seller?.name ?? ''} src={seller?.avatar} size={28} /> {seller?.name}</Link>
      </Card>

      {l.deal && (mineSell || mineBuy) && (
        <Card className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-aqua-600" /> خرید امن: {DEAL[l.deal.status]}</div>
          <div className="text-xs text-ink-500">نشانی تحویل: {l.deal.address}</div>
          {l.deal.tracking && <div className="text-xs text-ink-500">کد رهگیری: <span dir="ltr">{l.deal.tracking}</span></div>}
          {mineSell && l.deal.status === 'paid' && (
            <div className="flex gap-2">
              <Input placeholder="کد رهگیری پست (اختیاری)" value={tracking} onChange={(e) => setTracking(e.target.value)} />
              <Button icon={<Truck size={15} />} onClick={() => runOk(() => markShipped(l.id, tracking), 'ارسال ثبت شد')}>ارسال شد</Button>
            </div>
          )}
          {mineBuy && l.deal.status === 'shipped' && (
            <Button className="w-full" icon={<PackageCheck size={16} />} onClick={async () => (await ask('کالا را سالم تحویل گرفتید؟ مبلغ به فروشنده پرداخت می‌شود.')) && runOk(() => confirmReceived(l.id), 'تأیید شد؛ مبلغ به فروشنده پرداخت شد')}>کالا را تحویل گرفتم</Button>
          )}
          {l.deal.status === 'paid' && <Button className="w-full" variant="ghost" onClick={async () => (await ask('معامله لغو و مبلغ به خریدار برگردانده شود؟')) && runOk(() => cancelDeal(l.id), 'معامله لغو شد')}>لغو معامله</Button>}
          {mineBuy && l.deal.status === 'shipped' && <Link to="/support" className="block text-center text-xs text-ink-500 underline">مشکل در کالا؟ به پشتیبانی بگویید</Link>}
        </Card>
      )}

      {!mineSell && l.status === 'active' && (
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" icon={<MessageCircle size={16} />} onClick={async () => { const t = await run(() => contactSeller(l.id)); if (t) nav(`/messages/${t}`) }}>گفتگو</Button>
          <Button className="flex-1" size="lg" icon={<ShieldCheck size={17} />} onClick={() => setBuy(true)}>خرید امن</Button>
        </div>
      )}
      {mineSell && l.status === 'active' && (
        <div className="mt-4 flex gap-2">
          <Link to={`/market/${l.id}/edit`} className="flex-1"><Button className="w-full" variant="secondary" icon={<Pencil size={15} />}>ویرایش</Button></Link>
          <Button variant="ghost" className="text-coral-500" onClick={async () => (await ask('آگهی حذف شود؟')) && run(async () => { await removeListing(l.id); nav('/market') })}>حذف</Button>
        </div>
      )}
      {!mineSell && (
        <button className="mt-4 flex items-center gap-1 text-[12px] text-ink-400" onClick={async () => { const r = await askText('دلیل گزارش این آگهی چیست؟', 'کالای تقلبی، کلاهبرداری…'); if (r) run(() => reportContent('listing', l.id, r), 'گزارش ثبت شد') }}><Flag size={12} /> گزارش آگهی</button>
      )}

      <Sheet open={buy} onClose={() => setBuy(false)} title="خرید امن">
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span>مبلغ</span><b>{toman(l.price)}</b></div>
          <div className="text-xs text-ink-400">موجودی کیف پول: {toman(bal)}</div>
          <Field label="نشانی ارسال یا محل تحویل حضوری"><Textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <Button className="w-full" onClick={async () => { if (await runOk(() => buyListing(l.id, address), 'پرداخت امن انجام شد')) setBuy(false) }}>پرداخت و رزرو کالا</Button>
        </div>
      </Sheet>
    </div>
  )
}

export function ListingEditor() {
  const { id } = useParams()
  const me = useMe()!
  const nav = useNavigate()
  const existing = useDB((s) => s.listings.find((x) => x.id === id && x.sellerId === me.id))
  const [f, setF] = useState({ title: existing?.title ?? '', category: existing?.category ?? ('equipment' as Cat), condition: existing?.condition ?? ('good' as Listing['condition']), price: existing?.price ?? 0, description: existing?.description ?? '', photos: existing?.photos ?? ([] as string[]), city: existing?.city ?? me.city })
  return (
    <div className="animate-fade-up">
      <PageHeader back="/market" title={existing ? 'ویرایش آگهی' : 'آگهی جدید'} subtitle="کمیسیون فقط پس از فروش موفق کسر می‌شود" />
      <Card className="space-y-3">
        <Field label="عکس‌ها (حداکثر ۶)">
          <div className="grid grid-cols-3 gap-2">
            {f.photos.map((p, i) => <ImagePicker key={i} value={p} onChange={(v) => setF({ ...f, photos: v ? f.photos.map((x, j) => (j === i ? v : x)) : f.photos.filter((_, j) => j !== i) })} />)}
            {f.photos.length < 6 && <ImagePicker label="+ عکس" onChange={(v) => v && setF({ ...f, photos: [...f.photos, v] })} />}
          </div>
        </Field>
        <Field label="عنوان"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مثلاً دمبل ۱۰ کیلویی جفت" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="دسته">
            <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Cat })}>
              {(Object.keys(LISTING_CATEGORY) as Cat[]).map((k) => <option key={k} value={k}>{LISTING_CATEGORY[k]}</option>)}
            </Select>
          </Field>
          <Field label="وضعیت">
            <Select value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value as Listing['condition'] })}>
              {(Object.keys(LISTING_CONDITION) as Listing['condition'][]).map((k) => <option key={k} value={k}>{LISTING_CONDITION[k]}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="قیمت (تومان)"><NumberInput value={f.price} onChange={(v) => setF({ ...f, price: v })} /></Field>
          <Field label="شهر"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        </div>
        <Field label="توضیحات" hint="مدت استفاده، عیب‌ها، نحوه‌ی تحویل"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        {f.category === 'supplement' && <div className="rounded-2xl bg-gold-300/15 p-3 text-xs">فقط مکمل پلمپ و دارای تاریخ انقضای معتبر مجاز است.</div>}
        <Button className="w-full" onClick={async () => {
          const res = await run(() => (existing ? updateListing(existing.id, f).then(() => existing.id) : createListing(f)), existing ? 'آگهی به‌روز شد' : 'آگهی منتشر شد')
          if (res) nav(`/market/${res}`)
        }}>{existing ? 'ذخیره' : 'انتشار آگهی'}</Button>
      </Card>
    </div>
  )
}
