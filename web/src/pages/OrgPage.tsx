import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import { useDB } from '@/core/db'
import { num } from '@/core/format'
import { joinOrg, leaveOrg, orgLeaderboard } from '@/core/services/org'
import { activeSubscription } from '@/core/services/wallet'
import { Avatar, Button, Card, Empty, Input, PageHeader, SectionTitle } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

/** عضویت کارکنان در اشتراک سازمانی */
export default function OrgPage() {
  const me = useMe()!
  const orgs = useDB((s) => s.orgs)
  const users = useDB((s) => s.users)
  const challenges = useDB((s) => s.challenges)
  useDB((s) => s.subscriptions)
  const org = orgs.find((o) => o.id === me.orgId)
  const [code, setCode] = useState('')
  const sub = activeSubscription(me.id)
  if (!org)
    return (
      <div className="animate-fade-up">
        <PageHeader back title="اشتراک سازمانی" />
        <Card className="p-6 text-center">
          <Briefcase size={28} className="mx-auto text-ink-400" />
          <div className="mt-3 font-display text-2xl">کد سازمان داری؟</div>
          <p className="mt-2 text-xs leading-6 text-ink-500">اگر شرکت شما برنامه‌ی سلامت کی‌فیت را خریده است، با کدی که مسئول منابع انسانی داده عضو شوید تا اشتراک‌تان رایگان فعال شود.</p>
          <div className="mx-auto mt-4 flex max-w-xs gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="مثلاً DIGINO" dir="ltr" className="text-center" />
            <Button onClick={() => runOk(() => joinOrg(code), 'به سازمان پیوستی و اشتراکت فعال شد!')}>عضویت</Button>
          </div>
        </Card>
        <p className="mt-4 text-center text-xs text-ink-500">مسئول منابع انسانی هستید؟ از پروفایل نقش «سازمان» را فعال کنید.</p>
      </div>
    )
  const board = orgLeaderboard(org.id, { orgs, users })
  const orgChallenges = challenges.filter((c) => c.orgId === org.id && c.status === 'active')
  return (
    <div className="animate-fade-up">
      <PageHeader back title={org.name} subtitle={`${num(org.members.length)} عضو · برنامه‌ی سلامت سازمانی`} />
      <Card className="p-5 text-sm">
        اشتراک شما {sub?.orgId === org.id ? `از طرف ${org.name} فعال است` : 'فعال نیست'} {sub && `· اعتبار ${num(sub.credit)} تومان`}
      </Card>
      {orgChallenges.length > 0 && (
        <>
          <SectionTitle title="چالش‌های سازمان" />
          {orgChallenges.map((c) => (
            <Link key={c.id} to={`/challenges/${c.id}`}>
              <Card className="mb-2 text-sm font-medium">{c.title}</Card>
            </Link>
          ))}
        </>
      )}
      <SectionTitle title="رتبه‌بندی این هفته" />
      {board.length === 0 && <Empty title="هنوز فعالیتی نیست" />}
      <Card className="px-3 py-1">
        {board.map((x, i) => (
          <div key={x.user.id} className="flex items-center gap-3 border-b hairline py-2.5 last:border-0">
            <span className="w-6 text-center text-sm text-ink-400">{num(i + 1)}</span>
            <Avatar name={x.user.name} src={x.user.avatar} size={32} />
            <span className="flex-1 text-sm">{x.user.name}</span>
            <span className="text-xs tabular-nums">{num(x.xp)}</span>
          </div>
        ))}
      </Card>
      {org.adminId !== me.id && (
        <Button variant="ghost" className="mt-4 w-full text-coral-500" onClick={() => confirm('از سازمان خارج می‌شوید؟') && runOk(() => leaveOrg(), 'از سازمان خارج شدید')}>
          خروج از سازمان
        </Button>
      )}
    </div>
  )
}
