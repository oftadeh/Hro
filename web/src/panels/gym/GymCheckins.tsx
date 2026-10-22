import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { useDB } from '@/core/db'
import { faDateTime, toman } from '@/core/format'
import { verifyEntry } from '@/core/services/fityab'
import { Avatar, Badge, Button, Card, Empty, Input, PageHeader } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { run, toast } from '@/ui/toast'

export default function GymCheckins() {
  const me = useMe()!
  const gyms = useDB((s) => s.gyms)
  const checkins = useDB((s) => s.checkins)
  const users = useUserMap()
  const [code, setCode] = useState('')
  const myGyms = gyms.filter((g) => g.ownerId === me.id)
  const list = checkins.filter((c) => myGyms.some((g) => g.id === c.gymId))

  return (
    <div className="animate-fade-up">
      <PageHeader title="پذیرش ورود" subtitle="کد ورود ورزشکار را وارد یا QR را اسکن کنید" />
      <Card className="bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-500/10 dark:to-rose-500/10">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={async (e) => {
            e.preventDefault()
            const ci = await run(() => verifyEntry(code))
            if (ci) {
              toast.success(`ورود ${users[ci.userId]?.name} تایید شد ✅`)
              setCode('')
            }
          }}
        >
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد ۶ رقمی" dir="ltr" className="text-center text-xl tracking-[.4em]" maxLength={6} inputMode="numeric" />
          <Button size="lg" type="submit" icon={<QrCode size={18} />}>تایید ورود</Button>
        </form>
      </Card>
      <div className="mt-4 space-y-2">
        {list.length === 0 && <Empty icon="🎟️" title="هنوز ورودی ثبت نشده" />}
        {list.map((c) => (
          <Card key={c.id} className="flex items-center gap-3 py-3">
            <Avatar name={users[c.userId]?.name ?? ''} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{users[c.userId]?.name}</div>
              <div className="text-[11px] text-ink-400">{gyms.find((g) => g.id === c.gymId)?.name} · {faDateTime(c.createdAt)}</div>
            </div>
            <div className="text-left">
              <div className="text-xs font-bold">{toman(c.price)}</div>
              <Badge color={c.status === 'used' ? 'slate' : 'emerald'}>{c.status === 'used' ? 'وارد شد' : 'در انتظار ورود'}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
