import { Link } from 'react-router-dom'
import { useDB } from '@/core/db'
import { Button, Empty, PageHeader } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { GymSchedule } from './GymSchedule'

/** برنامه‌ی هفته: نوبت‌های کلاس، تعطیلی روز و لغو نوبت برای هر شعبه */
export default function GymSchedulePage() {
  const me = useMe()!
  const gyms = useDB((s) => s.gyms).filter((g) => g.ownerId === me.id && g.approved)
  return (
    <div className="animate-fade-up">
      <PageHeader title="برنامه و تعطیلی" subtitle="نوبت‌های ۷ روز آینده، لغو نوبت و ثبت روز تعطیل؛ رزروهای درگیر خودکار برگشت داده می‌شوند" />
      {gyms.length === 0 ? (
        <Empty title="باشگاه فعالی ندارید" desc="بعد از تأیید باشگاه، برنامه‌ی کلاس‌ها این‌جا دیده می‌شود." action={<Link to="../gyms"><Button>باشگاه‌های من</Button></Link>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{gyms.map((g) => <GymSchedule key={g.id} gym={g} />)}</div>
      )}
    </div>
  )
}
