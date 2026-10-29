import { Link } from 'react-router-dom'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { setGymApproval } from '@/core/services/admin'
import { Badge, Button, Card, Cover, PageHeader, Tabs } from '@/ui/kit'
import { useUserMap } from '@/ui/hooks'
import { useState } from 'react'

export default function AdminGyms() {
  const gyms = useDB((s) => s.gyms)
  const checkins = useDB((s) => s.checkins)
  const users = useUserMap()
  const [tab, setTab] = useState<'pending' | 'approved'>('pending')
  const list = gyms.filter((g) => (tab === 'pending' ? !g.approved : g.approved))
  return (
    <div className="animate-fade-up">
      <PageHeader title="باشگاه‌های فیت‌یاب" />
      <Tabs className="mb-4 max-w-sm" value={tab} onChange={setTab} items={[{ value: 'pending', label: `در انتظار (${num(gyms.filter((g) => !g.approved).length)})` }, { value: 'approved', label: 'فعال' }]} />
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((g) => (
          <Card key={g.id} className="flex gap-3">
            <Cover gradient={g.cover} image={g.media.find((m) => m.type === 'image')?.url} emoji="" className="h-24 w-24 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <Link to={`/fityab/${g.id}`} className="font-semibold">{g.name}</Link>
              <div className="text-xs text-ink-500">مالک: {users[g.ownerId]?.name} · {g.address}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge color="slate">{toman(g.sessionPrice)}</Badge>
                <Badge color="slate">{num(checkins.filter((c) => c.gymId === g.id).length)} ورود</Badge>
              </div>
              <div className="mt-2">
                {g.approved ? (
                  <Button size="sm" variant="ghost" className="text-coral-500" onClick={() => setGymApproval(g.id, false)}>غیرفعال‌سازی</Button>
                ) : (
                  <Button size="sm" onClick={() => setGymApproval(g.id, true)}>تایید و انتشار</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
