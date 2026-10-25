import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Check, Eye, HeartPulse as HeartIcon, Lock, LogOut, Moon, Pencil, RotateCcw, Share2, ShoppingBag, Sun } from 'lucide-react'
import { useDB, useSession } from '@/core/db'
import { LEVELS, ROLE_META } from '@/core/config'
import { dec, num } from '@/core/format'
import { ACTIVITY, GOALS, bodyOf, completeness } from '@/core/profile'
import { activateRole, updateProfile } from '@/core/services/auth'
import { isBusiness, isBusinessPathAllowed } from '@/core/roles'
import { toggleBlock } from '@/core/services/fitzone'
import { uid } from '@/core/id'
import { logout, resetLocalDemo, REMOTE } from '@/core/client/session'
import type { Address } from '@/core/types'
import { levelOf } from '@/core/services/engagement'
import type { Role, User } from '@/core/types'
import { Button, Card, Field, IconTile, ImagePicker, Input, NumberInput, Progress, SectionTitle, Sheet, Tabs, Textarea } from '@/ui/kit'
import { RoleIcon } from '@/ui/icons'
import { Runner, Scale, Yoga } from '@/ui/art'
import { useMe } from '@/ui/hooks'
import { run, runOk, toast, ask } from '@/ui/toast'
import { CycleCard, CycleHistory } from '@/modules/health/Cycle'
import { IntroVideoCard } from '@/modules/profile/IntroVideo'
import { Achievements, BmiGauge, ProfileHero, StatRow, achievementsOf } from '@/modules/profile/parts'

const PRO_ROLES: Exclude<Role, 'admin' | 'user'>[] = ['gym', 'coach', 'seller', 'doctor', 'restaurant']
type Tab = 'body' | 'health' | 'activity' | 'settings'

/** نیاز کالری روزانه (میفلین-سنت جئور) */
function calories(u: User, age?: number) {
  if (!u.heightCm || !u.weightKg || !age || !u.gender) return undefined
  const bmr = 10 * u.weightKg + 6.25 * u.heightCm - 5 * age + (u.gender === 'male' ? 5 : -161)
  const tdee = bmr * { low: 1.375, medium: 1.55, high: 1.725 }[u.activityLevel ?? 'medium']
  return Math.round((tdee + (u.goal === 'lose' ? -450 : u.goal === 'gain' ? 300 : 0)) / 10) * 10
}

export default function Profile() {
  const me = useMe()!
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const setRole = useSession((s) => s.setRole)
  const posts = useDB((s) => s.posts.filter((p) => p.authorId === me.id).length)
  const checkins = useDB((s) => s.checkins.filter((c) => c.userId === me.id).length)
  const allCh = useDB((s) => s.challenges)
  const myCh = allCh.filter((c) => c.participants.some((p) => p.userId === me.id))
  const followers = useDB((s) => s.users.filter((u) => u.following.includes(me.id)).length)
  const lvl = levelOf(me.xp)
  const body = bodyOf(me)
  const comp = completeness(me)
  const kcal = calories(me, body.age)
  const wins = myCh.filter((c) => (c.participants.find((p) => p.userId === me.id)?.score ?? 0) >= c.goal).length
  const ach = achievementsOf(me, { checkins, challenges: myCh.length, wins, posts, followers })
  const biz = isBusiness(me)
  // حساب کسب‌وکار فقط تب تنظیمات را دارد (مشخصات بدنی و سلامت مخصوص ورزشکار است)
  const tab: Tab = biz ? 'settings' : (params.get('tab') as Tab) || 'body'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const [edit, setEdit] = useState(false)
  const [activate, setActivate] = useState<Exclude<Role, 'admin' | 'user'>>()
  const privacy = me.privacy ?? { publicProfile: true, showBody: false }

  const share = async () => {
    const url = `${location.origin}/u/${me.id}`
    try {
      if (navigator.share) await navigator.share({ title: me.name, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('لینک پروفایل کپی شد')
      }
    } catch {
      /* لغو اشتراک‌گذاری */
    }
  }

  return (
    <div className="animate-fade-up">
      <ProfileHero
        user={me}
        actions={
          <>
            <button onClick={() => setEdit(true)} className="flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-ink-950 transition hover:brightness-95">
              <Pencil size={15} /> ویرایش پروفایل
            </button>
            <button onClick={share} className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm transition hover:bg-white/15">
              <Share2 size={15} /> اشتراک
            </button>
            <Link to={`/u/${me.id}?preview=1`} className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm transition hover:bg-white/15">
              <Eye size={15} /> نمای عمومی
            </Link>
          </>
        }
      />
      <StatRow items={[['پست', posts], ['دنبال‌کننده', followers], ['دنبال‌شونده', me.following.length], ['ورود به باشگاه', checkins]]} />
      <IntroVideoCard user={me} self />

      {comp.pct < 1 && !biz && (
        <Card className="mt-3 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">تکمیل پروفایل</span>
              <span className="tabular-nums text-ink-500">{num(comp.pct * 100)}٪</span>
            </div>
            <Progress value={comp.pct} className="mt-2" />
            <div className="mt-2 truncate text-[12px] text-ink-400">باقی‌مانده: {comp.missing.join('، ')}</div>
          </div>
          <Button size="sm" variant="dark" onClick={() => setEdit(true)}>
            تکمیل
          </Button>
        </Card>
      )}

      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        items={[
          ...(biz
            ? []
            : ([
                { value: 'body', label: 'مشخصات بدنی' },
                { value: 'health', label: 'سلامت' },
                { value: 'activity', label: 'فعالیت' },
              ] as const)),
          { value: 'settings', label: 'تنظیمات' },
        ]}
      />

      {tab === 'body' && (
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Card className="relative overflow-hidden p-5">
            <Scale size={96} className="pointer-events-none absolute -bottom-2 left-2 opacity-90" />
            <div className="text-xs text-ink-500">شاخص توده‌ی بدنی</div>
            {body.bmi ? (
              <>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[3rem] leading-none tabular-nums">{dec(Math.round(body.bmi * 10) / 10)}</span>
                  <span className="rounded-full bg-ink-900/[.05] px-2.5 py-1 text-xs dark:bg-white/[.06]">{body.bmiLabel}</span>
                </div>
                <div className="max-w-[70%]">
                  <BmiGauge bmi={body.bmi} />
                </div>
                {body.ideal && (
                  <div className="mt-3 text-xs text-ink-500">
                    وزن مناسب برای قد شما: <b className="tabular-nums text-ink-900 dark:text-white">{num(body.ideal[0])} تا {num(body.ideal[1])} کیلوگرم</b>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-2 text-sm text-ink-500">
                قد و وزن خود را وارد کنید.{' '}
                <button className="text-brand-600 dark:text-brand-300" onClick={() => setEdit(true)}>
                  ثبت
                </button>
              </div>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['قد', me.heightCm ? `${num(me.heightCm)} سانتی‌متر` : '—'],
                ['وزن', me.weightKg ? `${num(me.weightKg)} کیلوگرم` : '—'],
                ['سن', body.age ? `${num(body.age)} سال` : '—'],
                ['جنسیت', me.gender ? (me.gender === 'female' ? 'خانم' : 'آقا') : '—'],
                ['هدف', me.goal ? GOALS[me.goal] : '—'],
                ['سطح فعالیت', me.activityLevel ? ACTIVITY[me.activityLevel] : '—'],
              ] as const
            ).map(([l, v]) => (
              <div key={l} className="rounded-3xl bg-white p-4 shadow-card dark:bg-ink-850 dark:shadow-none">
                <div className="text-[12px] text-ink-400">{l}</div>
                <div className="mt-1 text-sm font-medium tabular-nums">{v}</div>
              </div>
            ))}
          </div>
          {kcal && (
            <div className="relative overflow-hidden rounded-3xl grad-peach p-5 text-ink-950 lg:col-span-2">
              <div className="text-xs opacity-60">نیاز انرژی روزانه برای هدف «{GOALS[me.goal ?? 'fit']}»</div>
              <div className="mt-1 font-display text-[2.4rem] leading-none tabular-nums">
                {num(kcal)} <span className="font-sans text-sm">کالری</span>
              </div>
              <div className="mt-2 text-xs opacity-70">
                پروتئین پیشنهادی: {num((me.weightKg ?? 0) * (me.goal === 'gain' ? 2 : 1.6))} گرم در روز ·{' '}
                <Link to="/fityar?q=برنامه غذایی" className="underline">
                  دریافت برنامه از فیت‌یار
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'health' && (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <Lock size={12} /> اطلاعات این بخش خصوصی است و فقط برای شما (و با اجازه‌ی شما برای پزشک یا مربی) نمایش داده می‌شود.
          </p>
          {me.gender === 'female' && (
            <>
              <CycleCard />
              <CycleHistory />
            </>
          )}
          <HealthCard user={me} />
        </div>
      )}

      {tab === 'activity' && (
        <div className="mt-4 space-y-3">
          <Card className="p-5">
            <div className="flex items-center justify-between text-sm">
              <b>
                سطح {num(lvl.level)} — {lvl.title}
              </b>
              <span className="tabular-nums text-ink-400">{num(me.xp)} XP</span>
            </div>
            <Progress value={lvl.progress} className="mt-2" />
            {lvl.next && <div className="mt-2 text-[12px] text-ink-400">{num(lvl.next.xp - me.xp)} امتیاز تا «{lvl.next.title}»</div>}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {LEVELS.map((l) => (
                <div key={l.level} className={clsx('rounded-2xl border p-2.5 text-center text-xs', me.xp >= l.xp ? 'border-brand-300 text-ink-900 dark:border-brand-300/50 dark:text-brand-200' : 'hairline text-ink-400')}>
                  <div className="text-[12px] tabular-nums text-ink-400">سطح {num(l.level)}</div>
                  <div className="mt-0.5">{l.title}</div>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['روز پیاپی', me.streak],
                ['چالش', myCh.length],
                ['هدف تکمیل‌شده', wins],
              ] as const
            ).map(([l, v]) => (
              <div key={l} className="rounded-3xl bg-white p-4 text-center shadow-card dark:bg-ink-850 dark:shadow-none">
                <div className="font-display text-[2rem] leading-none tabular-nums">{num(v)}</div>
                <div className="mt-1 text-[12px] text-ink-400">{l}</div>
              </div>
            ))}
          </div>
          <SectionTitle title="نشان‌ها" action={<span className="text-xs tabular-nums text-ink-500">{num(ach.filter((a) => a.done).length)} از {num(ach.length)}</span>} />
          <Achievements list={ach} />
          {myCh.length > 0 && (
            <>
              <SectionTitle title="چالش‌های من" />
              <Card className="px-5 py-1">
                {myCh.map((c) => {
                  const score = c.participants.find((p) => p.userId === me.id)?.score ?? 0
                  return (
                    <Link key={c.id} to={`/challenges/${c.id}`} className="flex items-center gap-3 border-b hairline py-3 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{c.title}</div>
                        <Progress value={score / c.goal} className="mt-2" />
                      </div>
                      <span className="text-[12px] tabular-nums text-ink-400">{c.status === 'finished' ? 'پایان‌یافته' : `${num((score / c.goal) * 100)}٪`}</span>
                    </Link>
                  )
                })}
              </Card>
            </>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="mt-4 space-y-3">
          <ThemeCard />
          <Link to="/terms" className="press flex items-center justify-between rounded-[26px] bg-white p-5 shadow-card dark:bg-ink-850 dark:shadow-none">
            <span>
              <span className="block text-sm font-medium">قوانین و حریم خصوصی</span>
              <span className="mt-0.5 block text-[13px] text-ink-500">قوانین استفاده، تعهدات هر نقش و نحوه‌ی نگهداری اطلاعات</span>
            </span>
            <span aria-hidden className="text-ink-400">‹</span>
          </Link>
          <Card className="p-5">
            <div className="mb-1 text-sm font-medium">حریم خصوصی</div>
            <Toggle
              label="پروفایل عمومی"
              desc="دیگران پست‌ها و فعالیت شما را ببینند"
              on={privacy.publicProfile}
              onChange={(v) => updateProfile({ privacy: { ...privacy, publicProfile: v } })}
            />
            <Toggle label="نمایش مشخصات بدنی" desc="قد، وزن و هدف در پروفایل عمومی نمایش داده شود" on={privacy.showBody} onChange={(v) => updateProfile({ privacy: { ...privacy, showBody: v } })} />
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-400">
              <Lock size={11} /> اطلاعات سلامت{me.gender === 'female' ? ' و چرخه‌ی قاعدگی' : ''} هرگز به‌صورت عمومی نمایش داده نمی‌شود.
            </div>
          </Card>

          <AddressesCard user={me} />
          <RemindersCard user={me} />
          {(me.blockedUsers?.length ?? 0) > 0 && <BlockedCard ids={me.blockedUsers!} />}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['/tickets', 'بلیت‌های باشگاه'],
              ['/medical', 'پرونده‌ی پزشکی'],
              ['/teams', 'هم‌تیمی‌ها'],
              ['/insurance', 'بیمه‌ی ورزشی'],
              ['/family', 'خانواده و کودکان'],
              ['/devices', 'ساعت و دستگاه‌ها'],
              ['/events', 'رویدادهای من'],
              ['/market', 'آگهی‌های دست‌دوم'],
              ['/invite', 'دعوت و هدیه'],
              ['/org', 'اشتراک سازمانی'],
              ['/league', 'لیگ هفتگی'],
              ['/support', 'پشتیبانی'],
              ['/orders', 'سفارش‌ها'],
              ['/wallet', 'کیف پول'],
            ].filter(([to]) => !biz || isBusinessPathAllowed(to)).map(([to, l]) => (
              <Link key={to} to={to} className="rounded-2xl bg-white px-4 py-3 text-center text-xs shadow-card transition hover:-translate-y-0.5 dark:bg-ink-850 dark:shadow-none">
                {l}
              </Link>
            ))}
          </div>

          <SectionTitle title="همکاری با کی‌فیت" />
          {!isBusiness(me) && !me.roles.includes('admin') ? (
            <Card className="text-xs leading-7 text-ink-500">
              حساب ورزشکار و حساب کسب‌وکار در کی‌فیت جدا هستند. برای معرفی باشگاه، ارائه‌ی خدمات مربیگری، فروشگاه، مطب یا رستوران، از حساب خارج شوید و با یک شماره‌ی دیگر «حساب کسب‌وکار» بسازید.
            </Card>
          ) : (
          <>
          <p className="-mt-2 mb-3 text-xs text-ink-500">با فعال‌کردن هر نقش، پنل مدیریت اختصاصی آن را دریافت می‌کنید و خدماتتان در ماژول مربوطه به کاربران نمایش داده می‌شود.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...PRO_ROLES, ...(me.roles.includes('admin') ? (['admin'] as const) : [])].map((r) => {
              const has = me.roles.includes(r)
              const meta = ROLE_META[r]
              return (
                <Card key={r} className="flex items-center gap-3">
                  <IconTile>
                    <RoleIcon role={r} size={18} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{meta.label}</div>
                    <div className="truncate text-[12px] text-ink-500">{meta.desc}</div>
                  </div>
                  {has ? (
                    <Button
                      size="sm"
                      variant="dark"
                      onClick={() => {
                        setRole(r)
                        nav(meta.panel)
                      }}
                    >
                      ورود به پنل
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setActivate(r as Exclude<Role, 'admin' | 'user'>)}>
                      فعال‌سازی
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
          </>
          )}

          <div className="grid gap-2 pt-3 sm:grid-cols-3">
            {!biz && (
              <Link to="/orders">
                <Button variant="outline" className="w-full" icon={<ShoppingBag size={16} />}>
                  سفارش‌های من
                </Button>
              </Link>
            )}
            {!REMOTE && (
              <Button
                variant="outline"
                icon={<RotateCcw size={16} />}
                onClick={async () => {
                  if ((await ask('همه‌ی داده‌ها به حالت نمایشی اولیه برگردد؟'))) resetLocalDemo()
                }}
              >
                بازنشانی داده‌های نمایشی
              </Button>
            )}
            <Button variant="ghost" className="text-coral-500" icon={<LogOut size={16} />} onClick={() => logout()}>
              خروج از حساب
            </Button>
          </div>
        </div>
      )}

      <EditProfileSheet open={edit} onClose={() => setEdit(false)} user={me} />

      <Sheet open={!!activate} onClose={() => setActivate(undefined)} title={activate && `فعال‌سازی نقش ${ROLE_META[activate].label}`}>
        {activate && (
          <div className="space-y-3 text-sm leading-7 text-ink-600 dark:text-ink-300">
            <p>{ROLE_META[activate].desc}.</p>
            <p>کی‌فیت از هر تراکنش موفق در این ماژول کمیسیون کسر می‌کند و باقی‌مانده به کیف پول شما واریز می‌شود. امکان تسویه به حساب بانکی از پنل وجود دارد.</p>
            <Button
              className="w-full"
              onClick={() => {
                run(() => activateRole(activate), 'نقش فعال شد')
                setActivate(undefined)
                nav(ROLE_META[activate].panel)
              }}
            >
              قبول قوانین و فعال‌سازی
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 border-b hairline py-3 text-right last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm">{label}</div>
        <div className="text-[12px] text-ink-400">{desc}</div>
      </div>
      <span className={clsx('relative h-6 w-11 shrink-0 rounded-full transition', on ? 'bg-brand-400' : 'bg-ink-900/15 dark:bg-white/15')}>
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'right-0.5' : 'right-[1.375rem]')} />
      </span>
    </button>
  )
}

function HealthCard({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(user.health ?? {})
  const rows: [keyof NonNullable<User['health']>, string, string][] = [
    ['injuries', 'آسیب‌دیدگی‌ها', 'مثلاً آسیب زانو، دیسک کمر'],
    ['conditions', 'بیماری‌ها / شرایط خاص', 'مثلاً فشار خون، دیابت، بارداری'],
    ['allergies', 'حساسیت غذایی', 'مثلاً لاکتوز، گلوتن، بادام‌زمینی'],
  ]
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HeartIcon size={16} className="text-coral-400" /> پرونده‌ی سلامت
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setF(user.health ?? {})
            setOpen(true)
          }}
        >
          {user.health ? 'ویرایش' : 'ثبت'}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(([k, l]) => (
          <div key={k} className="flex items-start justify-between gap-3 text-xs">
            <span className="text-ink-400">{l}</span>
            <span className="text-left">{user.health?.[k] || 'ثبت نشده'}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-5 text-ink-400">این اطلاعات در برنامه‌ی تمرین مربی، پیشنهادهای فیت‌یار و فیلتر غذاهای بوفه استفاده می‌شود.</p>
      <Sheet open={open} onClose={() => setOpen(false)} title="پرونده‌ی سلامت">
        <div className="space-y-3">
          {rows.map(([k, l, ph]) => (
            <Field key={k} label={l}>
              <Input value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} />
            </Field>
          ))}
          <Button
            className="w-full"
            onClick={async () => {
              if (await runOk(() => updateProfile({ health: f }), 'ذخیره شد')) setOpen(false)
            }}
          >
            ذخیره
          </Button>
        </div>
      </Sheet>
    </Card>
  )
}

const choice = (on: boolean) => clsx('rounded-full px-4 py-2 text-xs transition', on ? 'card-violet font-medium text-ink-950' : 'bg-ink-900/[.05] text-ink-600 dark:bg-white/[.06] dark:text-ink-300')

export function EditProfileSheet({ open, onClose, user }: { open: boolean; onClose: () => void; user: User }) {
  const [form, setForm] = useState<Partial<User>>({})
  const [shown, setShown] = useState(false)
  // فرم با هر بار باز شدن از داده‌ی فعلی پر می‌شود
  if (open && !shown) {
    setShown(true)
    setForm({ name: user.name, bio: user.bio, avatar: user.avatar, gender: user.gender, heightCm: user.heightCm, weightKg: user.weightKg, birthYear: user.birthYear, goal: user.goal, activityLevel: user.activityLevel, city: user.city })
  }
  if (!open && shown) setShown(false)
  const set = <K extends keyof User>(k: K, v: User[K]) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Sheet open={open} onClose={onClose} title="ویرایش پروفایل" wide>
      <div className="space-y-6">
        <section>
          <div className="mb-3 text-xs font-medium text-ink-500">معرفی</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ImagePicker value={form.avatar} onChange={(v) => set('avatar', v)} label="عکس پروفایل" />
            </div>
            <Field label="نام">
              <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="شهر">
              <Input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="درباره‌ی من">
                <Textarea rows={2} value={form.bio ?? ''} onChange={(e) => set('bio', e.target.value)} placeholder="مثلاً عاشق دویدن و یوگا" />
              </Field>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 text-xs font-medium text-ink-500">جنسیت</div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['female', 'خانم', <Yoga key="f" size={64} />, 'grad-pink'],
                ['male', 'آقا', <Runner key="m" size={64} male />, 'grad-mint'],
              ] as const
            ).map(([v, l, art, grad]) => (
              <button
                key={v}
                type="button"
                onClick={() => set('gender', v)}
                className={clsx('relative flex h-20 items-center overflow-hidden rounded-3xl px-4 text-right transition', form.gender === v ? `${grad} text-ink-950` : 'bg-ink-900/[.04] dark:bg-white/[.05]')}
              >
                <span className="font-display text-xl">{l}</span>
                <span className="absolute -left-1 top-1">{art}</span>
                {form.gender === v && <Check size={16} className="absolute right-3 top-3" />}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 text-xs font-medium text-ink-500">مشخصات بدنی</div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="قد (سانتی‌متر)">
              <NumberInput value={form.heightCm ?? 0} onChange={(v) => set('heightCm', v || undefined)} />
            </Field>
            <Field label="وزن (کیلوگرم)">
              <NumberInput value={form.weightKg ?? 0} onChange={(v) => set('weightKg', v || undefined)} />
            </Field>
            <Field label="سال تولد">
              <NumberInput value={form.birthYear ?? 0} onChange={(v) => set('birthYear', v || undefined)} placeholder="۱۳۷۵" />
            </Field>
          </div>
          <div className="mt-4 mb-2 text-[12px] text-ink-500">هدف</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(GOALS).map(([v, l]) => (
              <button key={v} type="button" className={choice(form.goal === v)} onClick={() => set('goal', v as User['goal'])}>
                {l}
              </button>
            ))}
          </div>
          <div className="mt-4 mb-2 text-[12px] text-ink-500">سطح فعالیت</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACTIVITY).map(([v, l]) => (
              <button key={v} type="button" className={choice(form.activityLevel === v)} onClick={() => set('activityLevel', v as User['activityLevel'])}>
                {l}
              </button>
            ))}
          </div>
        </section>

        <Button
          className="w-full"
          onClick={async () => {
            if (await runOk(() => updateProfile(form), 'پروفایل ذخیره شد')) onClose()
          }}
        >
          ذخیره
        </Button>
      </div>
    </Sheet>
  )
}

function AddressesCard({ user }: { user: User }) {
  const [f, setF] = useState({ title: '', text: '' })
  const list = user.addresses ?? []
  const save = (next: Address[]) => run(() => updateProfile({ addresses: next }))
  return (
    <Card className="p-5">
      <div className="mb-2 text-sm font-medium">آدرس‌های من</div>
      {list.map((a) => (
        <div key={a.id} className="flex items-center gap-2 border-b hairline py-2 text-xs last:border-0">
          <b className="w-16 shrink-0">{a.title}</b>
          <span className="flex-1 truncate text-ink-500">{a.text}</span>
          <button className="text-coral-500" onClick={() => save(list.filter((x) => x.id !== a.id))}>حذف</button>
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <Input className="w-24" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="خانه" />
        <Input value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="آدرس کامل" />
        <Button
          variant="secondary"
          onClick={() => {
            if (f.text.trim().length < 5) return
            save([...list, { id: uid('ad-'), title: f.title.trim() || 'آدرس', text: f.text.trim() }].slice(0, 6))
            setF({ title: '', text: '' })
          }}
        >
          افزودن
        </Button>
      </div>
    </Card>
  )
}

function RemindersCard({ user }: { user: User }) {
  const r = user.reminders ?? { water: true, workout: true, period: user.gender === 'female', workoutTime: '18:00' }
  const set = (patch: Partial<typeof r>) => run(() => updateProfile({ reminders: { ...r, ...patch } }))
  const askPush = async () => {
    if (!('Notification' in window)) return
    const p = await Notification.requestPermission()
    if (p === 'granted' && REMOTE) {
      const { enablePush } = await import('@/core/client/push')
      enablePush().catch(() => {})
    }
  }
  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between text-sm font-medium">
        یادآورها
        {'Notification' in window && Notification.permission !== 'granted' && (
          <Button size="sm" variant="secondary" onClick={askPush}>
            فعال‌سازی اعلان گوشی
          </Button>
        )}
      </div>
      <Toggle label="یادآور نوشیدن آب" desc="هر چند ساعت یک بار در طول روز" on={r.water} onChange={(v) => set({ water: v })} />
      <Toggle label="یادآور تمرین" desc={`هر روز ساعت ${r.workoutTime}`} on={r.workout} onChange={(v) => set({ workout: v })} />
      {r.workout && <Input type="time" dir="ltr" className="my-2 w-32" value={r.workoutTime} onChange={(e) => set({ workoutTime: e.target.value })} />}
      {user.gender === 'female' && <Toggle label="یادآور پریود" desc="دو روز قبل از شروع پیش‌بینی‌شده" on={r.period} onChange={(v) => set({ period: v })} />}
    </Card>
  )
}

function BlockedCard({ ids }: { ids: string[] }) {
  const users = useDB((s) => s.users)
  return (
    <Card className="p-5">
      <div className="mb-2 text-sm font-medium">کاربران مسدودشده</div>
      {ids.map((id) => (
        <div key={id} className="flex items-center justify-between border-b hairline py-2 text-xs last:border-0">
          <span>{users.find((u) => u.id === id)?.name ?? 'کاربر'}</span>
          <button className="text-brand-600 dark:text-brand-300" onClick={() => run(() => toggleBlock(id), 'رفع مسدودی شد')}>
            رفع مسدودی
          </button>
        </div>
      ))}
    </Card>
  )
}

/** انتخاب تم (تیره پیش‌فرض) */
function ThemeCard() {
  const theme = useSession((s) => s.theme)
  const toggle = useSession((s) => s.toggleTheme)
  const opts = [
    { id: 'dark' as const, label: 'تیره', icon: Moon, preview: 'bg-ink-950 border-ink-700' },
    { id: 'light' as const, label: 'روشن', icon: Sun, preview: 'bg-ink-50 border-ink-200' },
  ]
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-medium">ظاهر برنامه</div>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="تم">
        {opts.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={theme === o.id}
            onClick={() => theme !== o.id && toggle()}
            className={clsx('rounded-2xl border-2 p-2 transition', theme === o.id ? 'border-ink-950 dark:border-white' : 'border-transparent')}
          >
            <span className={clsx('flex h-16 items-end gap-1.5 rounded-xl border p-2', o.preview)}>
              <span className="card-violet h-6 w-10 rounded-md" />
              <span className="card-pink h-9 w-6 rounded-md" />
            </span>
            <span className="mt-2 flex items-center justify-center gap-1.5 text-[14px] font-semibold"><o.icon size={16} />{o.label}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}
