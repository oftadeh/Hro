import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { Button, Empty, Money, Orbs, PageHeader, Tabs } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { ChallengeCard } from './ChallengeCard'
import { Trophy } from '@/ui/art'

export default function Challenges() {
  const me = useMe()!
  const challenges = useDB((s) => s.challenges)
  const [tab, setTab] = useState<'hot' | 'mine' | 'created' | 'finished'>('hot')
  const list = useMemo(() => {
    if (tab === 'mine') return challenges.filter((c) => c.participants.some((p) => p.userId === me.id))
    if (tab === 'created') return challenges.filter((c) => c.creatorId === me.id)
    if (tab === 'finished') return challenges.filter((c) => c.status === 'finished')
    return challenges.filter((c) => c.status === 'active').sort((a, b) => b.participants.length - a.participants.length)
  }, [challenges, tab, me.id])
  const totalPool = challenges.filter((c) => c.status === 'active').reduce((a, c) => a + c.pool, 0)

  return (
    <div className="animate-fade-up">
      <PageHeader title="چالش‌ها" subtitle="رقابت کن، امتیاز بگیر، جایزه ببر" actions={<Link to="/challenges/new"><Button size="sm" icon={<Plus size={16} />}>ساخت چالش</Button></Link>} />
      <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-ink-850 p-6 text-white min-h-[13rem]">
        <Orbs seed="challenges" intensity={0.8} />
        <Trophy size={112} className="pointer-events-none absolute -bottom-2 left-3" />
        <div className="relative">
          <div className="text-xs text-white/75">مجموع جوایز چالش‌های فعال</div>
          <div className="mt-1 font-display text-[3rem] leading-none"><Money value={totalPool} unitClass="font-sans" /></div>
          <div className="mt-3 max-w-[60%] text-xs leading-6 text-white/75">{num(challenges.filter((c) => c.status === 'active').length)} چالش فعال · هر کاربری می‌تواند چالش ایجاد کند</div>
        </div>
      </div>
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'hot', label: 'داغ' },
          { value: 'mine', label: 'شرکت کرده‌ام' },
          { value: 'created', label: 'ساخته‌ی من' },
          { value: 'finished', label: 'پایان‌یافته' },
        ]}
      />
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => <ChallengeCard key={c.id} c={c} me={me.id} />)}
        </div>
      ) : (
        <Empty icon="" title="چالشی اینجا نیست" action={<Link to="/challenges/new"><Button size="sm">اولین چالشت رو بساز</Button></Link>} />
      )}
    </div>
  )
}
