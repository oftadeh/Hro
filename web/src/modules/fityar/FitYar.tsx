import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, Send, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { askAI, clearAIChat } from '@/core/services/ai'
import { faDate, num, toman } from '@/core/format'
import { Avatar, Badge, Button, Card, Empty, PageHeader, Stars, Tabs } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { run } from '@/ui/toast'

type Tab = 'ai' | 'coaches' | 'plans'

export default function FitYar() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'ai'
  return (
    <div className="animate-fade-up">
      <PageHeader title="فیت‌یار" subtitle="مشاوره‌ی هوشمند و مربیان حرفه‌ای تغذیه و تمرین" />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={(t) => setParams({ tab: t })}
        items={[
          { value: 'ai', label: '🤖 دستیار هوشمند' },
          { value: 'coaches', label: '🧑‍🏫 مربیان' },
          { value: 'plans', label: '📋 برنامه‌های من' },
        ]}
      />
      {tab === 'ai' && <AIChat initial={params.get('q') ?? ''} />}
      {tab === 'coaches' && <Coaches />}
      {tab === 'plans' && <MyPlans />}
    </div>
  )
}

const QUICK = ['برنامه کاهش وزن می‌خوام', 'برنامه تمرینی حجم ۴ روزه', 'تمرین در خانه بدون وسیله', 'روزی چقدر پروتئین لازم دارم؟', 'BMI من چنده؟', 'کراتین مصرف کنم؟']

function AIChat({ initial }: { initial: string }) {
  const me = useMe()!
  const nav = useNavigate()
  const chat = useDB((s) => s.aiChats[me.id]) ?? []
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const asked = useRef(false)

  const send = async (t: string) => {
    if (!t.trim() || busy) return
    setText('')
    setBusy(true)
    await run(() => askAI(t.trim()))
    setBusy(false)
  }

  useEffect(() => {
    if (initial && !asked.current) {
      asked.current = true
      send(initial)
    }
  }, [initial]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [chat.length, busy])

  return (
    <Card className="flex h-[calc(100dvh-15rem)] min-h-[28rem] flex-col p-0">
      <div className="flex items-center gap-3 border-b border-ink-100 p-4 dark:border-white/5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-soft">
          <Bot size={22} />
        </div>
        <div className="flex-1">
          <div className="font-bold">فیت‌یار هوشمند</div>
          <div className="text-[11px] text-brand-500">● آنلاین · متخصص تغذیه و تمرین</div>
        </div>
        {chat.length > 0 && (
          <button onClick={clearAIChat} className="rounded-xl p-2 text-ink-400 hover:text-rose-500" aria-label="پاک کردن">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chat.length === 0 && (
          <div className="py-6 text-center">
            <div className="text-5xl">🤖</div>
            <div className="mt-2 font-bold">سلام {me.name.split(' ')[0]}! چطور کمکت کنم؟</div>
            <p className="mx-auto mt-1 max-w-sm text-xs text-ink-500">بر اساس قد، وزن و هدفت در پروفایل، برنامه‌ی تغذیه و تمرین شخصی‌سازی‌شده می‌دم.</p>
            {!me.weightKg && (
              <Link to="/profile" className="mt-2 inline-block text-xs font-bold text-indigo-500">
                ← ابتدا قد و وزنت رو در پروفایل وارد کن
              </Link>
            )}
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={clsx('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}>
            <div className={clsx('max-w-[85%] rounded-[1.75rem] px-4 py-3 text-sm leading-7', m.role === 'user' ? 'rounded-tr-md bg-gradient-to-l from-brand-500 to-violet-500 text-white' : 'rounded-tl-md bg-ink-100 dark:bg-white/5')}>
              <div className="whitespace-pre-line">{renderBold(m.text)}</div>
              {m.suggestions && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.suggestions.map((s) => (
                    <button key={s.link + s.label} onClick={() => nav(s.link)} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm dark:bg-ink-800 dark:text-indigo-300">
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-end">
            <div className="flex gap-1 rounded-[1.75rem] bg-ink-100 px-4 py-4 dark:bg-white/5">
              {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="border-t border-ink-100 p-3 dark:border-white/5">
        <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {QUICK.map((q) => (
            <button key={q} onClick={() => send(q)} className="whitespace-nowrap rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-600 hover:bg-ink-50 dark:border-white/10 dark:text-ink-300">
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send(text)
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="سوالت رو بپرس…" className="flex-1 rounded-2xl bg-ink-100 px-4 py-3 text-sm outline-none dark:bg-white/5" />
          <Button type="submit" disabled={busy || !text.trim()} icon={<Send size={18} className="-scale-x-100" />} aria-label="ارسال" />
        </form>
      </div>
    </Card>
  )
}

/** نمایش **متن** به صورت پررنگ */
function renderBold(t: string) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part))
}

function Coaches() {
  const coaches = useDB((s) => s.coaches)
  const users = useUserMap()
  const [filter, setFilter] = useState<'all' | 'workout' | 'diet'>('all')
  const list = coaches.filter((c) => filter === 'all' || c.plans.some((p) => p.kind === filter || p.kind === 'both'))
  return (
    <>
      <Tabs className="mb-4 max-w-sm" value={filter} onChange={setFilter} items={[{ value: 'all', label: 'همه' }, { value: 'workout', label: 'تمرینی' }, { value: 'diet', label: 'تغذیه' }]} />
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((c) => {
          const u = users[c.userId]
          if (!u) return null
          const minPrice = Math.min(...c.plans.map((p) => p.price), c.callPrice)
          return (
            <Link key={c.userId} to={`/fityar/coach/${c.userId}`}>
              <Card className="h-full transition hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar name={u.name} src={u.avatar} size={60} />
                    {c.online && <span className="absolute bottom-0.5 left-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-500 dark:border-ink-900" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{u.name}</div>
                    <div className="text-xs text-ink-500">{c.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Stars value={c.rating} />
                      <span className="text-[11px] text-ink-400">{num(c.students)} شاگرد · {num(c.experienceYears)} سال سابقه</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.specialties.map((s) => <Badge key={s} color="sky">{s}</Badge>)}
                </div>
                <div className="mt-3 text-xs text-ink-500">شروع قیمت از <b className="text-brand-600 dark:text-brand-400">{toman(minPrice)}</b></div>
              </Card>
            </Link>
          )
        })}
      </div>
    </>
  )
}

function MyPlans() {
  const me = useMe()!
  const orders = useDB((s) => s.planOrders)
  const users = useUserMap()
  const mine = orders.filter((o) => o.userId === me.id)
  if (!mine.length) return <Empty icon="📋" title="هنوز برنامه‌ای نخریدی" desc="از مربیان فیت‌یار برنامه‌ی اختصاصی تمرین و تغذیه بگیر." />
  return (
    <div className="space-y-3">
      {mine.map((o) => (
        <Card key={o.id}>
          <div className="flex items-center gap-3">
            <Avatar name={users[o.coachId]?.name ?? ''} size={42} />
            <div className="min-w-0 flex-1">
              <div className="font-bold">{o.title}</div>
              <div className="text-xs text-ink-500">{users[o.coachId]?.name} · {faDate(o.createdAt)}</div>
            </div>
            <Badge color={o.status === 'delivered' ? 'emerald' : 'amber'}>{o.status === 'delivered' ? 'تحویل شده' : 'در حال آماده‌سازی'}</Badge>
          </div>
          {o.content && <div className="mt-3 whitespace-pre-line rounded-2xl bg-ink-50 p-4 text-sm leading-7 dark:bg-white/5">{o.content}</div>}
        </Card>
      ))}
    </div>
  )
}
