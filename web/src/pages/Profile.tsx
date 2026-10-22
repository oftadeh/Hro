import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, RotateCcw } from 'lucide-react'
import { resetDemo, useDB, useSession } from '@/core/db'
import { LEVELS, ROLE_META } from '@/core/config'
import { num } from '@/core/format'
import { activateRole, updateProfile } from '@/core/services/auth'
import { levelOf } from '@/core/services/engagement'
import type { Role, User } from '@/core/types'
import { Avatar, Badge, Button, Card, IconTile, Field, ImagePicker, Input, NumberInput, PageHeader, Progress, SectionTitle, Select, Sheet, Textarea } from '@/ui/kit'
import { RoleIcon } from '@/ui/icons'
import { useMe } from '@/ui/hooks'
import { run } from '@/ui/toast'

const PRO_ROLES: Exclude<Role, 'admin' | 'user'>[] = ['gym', 'coach', 'seller', 'doctor', 'restaurant']

export default function Profile() {
  const me = useMe()!
  const nav = useNavigate()
  const logout = useSession((s) => s.logout)
  const setRole = useSession((s) => s.setRole)
  const posts = useDB((s) => s.posts.filter((p) => p.authorId === me.id).length)
  const checkins = useDB((s) => s.checkins.filter((c) => c.userId === me.id).length)
  const challenges = useDB((s) => s.challenges.filter((c) => c.participants.some((p) => p.userId === me.id)).length)
  const followers = useDB((s) => s.users.filter((u) => u.following.includes(me.id)).length)
  const lvl = levelOf(me.xp)
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState<Partial<User>>({})
  const [activate, setActivate] = useState<Exclude<Role, 'admin' | 'user'>>()

  const openEdit = () => {
    setForm({ name: me.name, bio: me.bio, avatar: me.avatar, gender: me.gender, heightCm: me.heightCm, weightKg: me.weightKg, birthYear: me.birthYear, goal: me.goal, city: me.city })
    setEdit(true)
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="پروفایل من" actions={<Button variant="outline" size="sm" onClick={openEdit}>ویرایش</Button>} />
      <Card className="text-center">
        <Avatar name={me.name} src={me.avatar} size={96} ring className="mx-auto" />
        <div className="mt-3 text-xl font-semibold">{me.name}</div>
        {me.bio && <p className="mt-1 text-sm text-ink-500">{me.bio}</p>}
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {me.roles.map((r) => <Badge key={r}><RoleIcon role={r} size={12} /> {ROLE_META[r].label}</Badge>)}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            ['پست', posts],
            ['دنبال‌کننده', followers],
            ['دنبال‌شونده', me.following.length],
            ['ورود به باشگاه', checkins],
          ].map(([l, v]) => (
            <div key={l as string}>
              <div className="text-xl font-light tabular-nums">{num(v as number)}</div>
              <div className="text-[11px] text-ink-400">{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle title="سطح و دستاوردها" />
      <Card>
        <div className="flex items-center justify-between text-sm">
          <b>سطح {num(lvl.level)} — {lvl.title}</b>
          <span className="text-ink-400">{num(me.xp)} XP</span>
        </div>
        <Progress value={lvl.progress} className="mt-2" />
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {LEVELS.map((l) => (
            <div key={l.level} className={`rounded-xl border p-2.5 text-center text-xs ${me.xp >= l.xp ? 'border-brand-300 text-ink-900 dark:border-brand-300/50 dark:text-brand-200' : 'hairline text-ink-400'}`}>
              <div className="text-[10px] tabular-nums text-ink-400">سطح {num(l.level)}</div>
              <div className="mt-0.5">{l.title}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-around text-center text-xs text-ink-500">
          <div><div className="text-2xl font-extralight tabular-nums text-ink-900 dark:text-white">{num(me.streak)}</div>روز پیاپی</div>
          <div><div className="text-2xl font-extralight tabular-nums text-ink-900 dark:text-white">{num(challenges)}</div>چالش</div>
        </div>
      </Card>

      <SectionTitle title="همکاری با کی‌فیت" />
      <p className="-mt-2 mb-3 text-xs text-ink-500">با فعال‌کردن هر نقش، پنل مدیریت اختصاصی آن را دریافت می‌کنید و خدماتتان در ماژول مربوطه به کاربران نمایش داده می‌شود.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...PRO_ROLES, ...(me.roles.includes('admin') ? (['admin'] as const) : [])].map((r) => {
          const has = me.roles.includes(r)
          const meta = ROLE_META[r]
          return (
            <Card key={r} className="flex items-center gap-3">
              <IconTile><RoleIcon role={r} size={18} /></IconTile>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{meta.label}</div>
                <div className="truncate text-[11px] text-ink-500">{meta.desc}</div>
              </div>
              {has ? (
                <Button size="sm" variant="dark" onClick={() => { setRole(r); nav(meta.panel) }}>ورود به پنل</Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setActivate(r as Exclude<Role, 'admin' | 'user'>)}>فعال‌سازی</Button>
              )}
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        <Link to="/orders"><Button variant="outline" className="w-full">سفارش‌های من</Button></Link>
        <Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => { if (confirm('همه‌ی داده‌ها به حالت نمایشی اولیه برگردد؟')) { resetDemo(); logout() } }}>بازنشانی داده‌های نمایشی</Button>
        <Button variant="ghost" className="text-coral-500" icon={<LogOut size={16} />} onClick={logout}>خروج از حساب</Button>
      </div>

      <Sheet open={edit} onClose={() => setEdit(false)} title="ویرایش پروفایل" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImagePicker value={form.avatar} onChange={(v) => setForm({ ...form, avatar: v })} label="عکس پروفایل" />
          </div>
          <Field label="نام"><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="شهر"><Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="جنسیت">
            <Select value={form.gender ?? ''} onChange={(e) => setForm({ ...form, gender: (e.target.value || undefined) as User['gender'] })}>
              <option value="">انتخاب</option><option value="female">زن</option><option value="male">مرد</option>
            </Select>
          </Field>
          <Field label="هدف">
            <Select value={form.goal ?? ''} onChange={(e) => setForm({ ...form, goal: (e.target.value || undefined) as User['goal'] })}>
              <option value="">انتخاب</option><option value="lose">کاهش وزن</option><option value="gain">افزایش حجم</option><option value="fit">تناسب اندام</option>
            </Select>
          </Field>
          <Field label="قد (سانتی‌متر)"><NumberInput value={form.heightCm ?? 0} onChange={(v) => setForm({ ...form, heightCm: v || undefined })} /></Field>
          <Field label="وزن (کیلوگرم)"><NumberInput value={form.weightKg ?? 0} onChange={(v) => setForm({ ...form, weightKg: v || undefined })} /></Field>
          <Field label="سال تولد (شمسی)"><NumberInput value={form.birthYear ?? 0} onChange={(v) => setForm({ ...form, birthYear: v || undefined })} placeholder="۱۳۷۵" /></Field>
          <div className="sm:col-span-2"><Field label="بیو"><Textarea rows={2} value={form.bio ?? ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field></div>
          <Button className="sm:col-span-2" onClick={async () => { await run(() => updateProfile(form), 'پروفایل ذخیره شد'); setEdit(false) }}>ذخیره</Button>
        </div>
      </Sheet>

      <Sheet open={!!activate} onClose={() => setActivate(undefined)} title={activate && `فعال‌سازی نقش ${ROLE_META[activate].label}`}>
        {activate && (
          <div className="space-y-3 text-sm leading-7 text-ink-600 dark:text-ink-300">
            <p>{ROLE_META[activate].desc}.</p>
            <p>کی‌فیت از هر تراکنش موفق در این ماژول کمیسیون کسر می‌کند و باقی‌مانده به کیف پول شما واریز می‌شود. امکان تسویه به حساب بانکی از پنل وجود دارد.</p>
            <Button className="w-full" onClick={() => { run(() => activateRole(activate), 'نقش فعال شد'); setActivate(undefined); nav(ROLE_META[activate].panel) }}>
              قبول قوانین و فعال‌سازی
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
