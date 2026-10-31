import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { LEAGUES, leagueOf, weekXpOf } from '@/core/services/engagement'
import { Avatar, Card, PageHeader, Progress, Tabs } from '@/ui/kit'
import { Trophy } from '@/ui/art'
import { useMe } from '@/ui/hooks'

/** لیگ هفتگی: رتبه‌بندی بر اساس امتیاز همین هفته (هر شنبه از صفر) */
export default function League() {
  const me = useMe()!
  const users = useDB((s) => s.users)
  const [tab, setTab] = useState<'all' | 'friends' | 'org'>('all')
  const myXp = weekXpOf(me)
  const lg = leagueOf(myXp)
  const list = useMemo(() => {
    const base = users.filter((u) => !u.roles.includes('admin') && !u.blocked)
    const scoped = tab === 'friends' ? base.filter((u) => me.following.includes(u.id) || u.id === me.id) : tab === 'org' ? base.filter((u) => u.orgId && u.orgId === me.orgId) : base
    return scoped.map((u) => ({ u, xp: weekXpOf(u) })).sort((a, b) => b.xp - a.xp)
  }, [users, tab, me])
  const rank = list.findIndex((x) => x.u.id === me.id) + 1
  return (
    <div className="animate-fade-up">
      <PageHeader back title="لیگ هفتگی" subtitle="هر شنبه امتیازها صفر می‌شوند؛ با تمرین، ورود به باشگاه و مأموریت‌ها بالا برو" />
      <div className="relative overflow-hidden rounded-[2rem] bg-ink-850 p-6 text-white">
        <Trophy size={110} className="pointer-events-none absolute -bottom-2 left-3" />
        <div className="relative max-w-[62%]">
          <div className="text-xs text-white/60">لیگ تو این هفته</div>
          <div className="mt-1 font-display text-[2.6rem] leading-none" style={{ color: lg.color }}>{lg.name}</div>
          <div className="mt-2 text-xs text-white/70">{num(myXp)} امتیاز · رتبه {num(rank || list.length)}</div>
          {lg.next && (
            <>
              <Progress value={lg.progress} className="mt-3 !bg-white/15" />
              <div className="mt-1 text-[12px] text-white/50">{num(lg.next.min - myXp)} امتیاز تا لیگ {lg.next.name}</div>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {LEAGUES.map((l) => (
          <div key={l.id} className={clsx('rounded-2xl p-2.5 text-center text-xs', l.id === lg.id ? 'bg-white shadow-card dark:bg-ink-850' : 'opacity-50')}>
            <div className="mx-auto mb-1 h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
            {l.name}
            <div className="text-[12px] text-ink-400">{num(l.min)}+</div>
          </div>
        ))}
      </div>
      <Tabs className="my-4" value={tab} onChange={setTab} items={[{ value: 'all', label: 'همه' }, { value: 'friends', label: 'دوستان' }, ...(me.orgId ? [{ value: 'org' as const, label: 'سازمان' }] : [])]} />
      <Card className="px-3 py-1">
        {list.slice(0, 50).map(({ u, xp }, i) => (
          <Link key={u.id} to={`/u/${u.id}`} className={clsx('flex items-center gap-3 border-b hairline py-2.5 last:border-0', u.id === me.id && 'rounded-xl bg-brand-400/10 px-2')}>
            <span className="w-6 text-center font-display text-lg text-ink-400">{num(i + 1)}</span>
            <Avatar name={u.name} src={u.avatar} size={34} />
            <span className="flex-1 truncate text-sm">{u.name}</span>
            <span className="h-2 w-2 rounded-full" style={{ background: leagueOf(xp).color }} />
            <span className="w-14 text-left text-xs tabular-nums">{num(xp)}</span>
          </Link>
        ))}
      </Card>
    </div>
  )
}
