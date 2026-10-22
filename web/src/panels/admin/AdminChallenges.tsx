import { Link } from 'react-router-dom'
import { useDB } from '@/core/db'
import { faDate, num, toman } from '@/core/format'
import { settleChallenge } from '@/core/services/challenges'
import { Badge, Button, Card, PageHeader } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'
import { run } from '@/ui/toast'

export default function AdminChallenges() {
  const challenges = useDB((s) => s.challenges)
  const users = useUserMap()
  return (
    <div className="animate-fade-up">
      <PageHeader title="چالش‌ها" subtitle="نظارت بر صندوق جوایز و تسویه‌ی چالش‌ها" />
      <div className="grid gap-3 md:grid-cols-2">
        {challenges.map((c) => (
          <Card key={c.id} className="flex gap-3">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ${c.gradient}`}>{c.emoji}</div>
            <div className="min-w-0 flex-1">
              <Link to={`/challenges/${c.id}`} className="font-bold">{c.title}</Link>
              <div className="text-xs text-ink-500">سازنده: {users[c.creatorId]?.name} · تا {faDate(c.endAt)}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge color="amber">صندوق {toman(c.pool)}</Badge>
                <Badge color="slate">{num(c.participants.length)} نفر</Badge>
                <Badge color={c.status === 'active' ? 'emerald' : 'slate'}>{c.status === 'active' ? 'فعال' : 'پایان‌یافته'}</Badge>
              </div>
              {c.status === 'active' && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => confirm('چالش بسته و جوایز پرداخت شود؟') && run(() => settleChallenge(c.id, true), 'جوایز پرداخت شد')}>
                  پایان و تسویه
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
