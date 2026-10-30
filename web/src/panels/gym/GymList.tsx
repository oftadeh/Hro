import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PenSquare, Pencil, Plus } from 'lucide-react'
import { CreatePostSheet } from '@/modules/fitzone/CreatePost'
import { useDB } from '@/core/db'
import { num, toman } from '@/core/format'
import { brandOf, gymTier, tierLabel } from '@/core/services/fityab'
import { Badge, Button, Card, Cover, Empty, PageHeader, SectionTitle, Stars } from '@/ui/kit'
import { useMe } from '@/ui/hooks'

/** باشگاه‌های من، گروه‌بندی‌شده بر اساس برند و شعبه */
export default function GymList() {
  const me = useMe()!
  const gyms = useDB((s) => s.gyms)
  const checkins = useDB((s) => s.checkins)
  const settings = useDB((s) => s.settings)
  const [postGym, setPostGym] = useState<string>()
  const mine = gyms.filter((g) => g.ownerId === me.id)
  const brands = [...new Set(mine.map(brandOf))]

  return (
    <div className="animate-fade-up">
      <PageHeader title="باشگاه‌ها و شعبه‌ها" subtitle="هر برند با همه‌ی شعبه‌هایش" actions={<Link to="../edit"><Button size="sm" icon={<Plus size={16} />}>باشگاه جدید</Button></Link>} />
      {mine.length === 0 && <Empty title="هنوز باشگاهی ثبت نکرده‌اید" desc="اول باشگاه را معرفی کنید؛ بعد از تأیید مدیر در فیت‌یاب دیده می‌شود." action={<Link to="../edit"><Button>ثبت باشگاه</Button></Link>} />}
      {brands.map((brand) => {
        const branches = mine.filter((g) => brandOf(g) === brand)
        return (
          <section key={brand}>
            <SectionTitle title={`${brand}${branches.length > 1 ? ` · ${num(branches.length)} شعبه` : ''}`} action={<Link to={`../edit?from=${branches[0].id}`}><Button size="sm" variant="ghost" icon={<Plus size={14} />}>افزودن شعبه</Button></Link>} />
            <div className="grid gap-4 md:grid-cols-2">
              {branches.map((g) => (
                <Card key={g.id} className="overflow-hidden p-0">
                  <Cover gradient={g.cover} image={g.media.find((m) => m.type === 'image')?.url} className="h-24">
                    <div className="absolute right-3 top-3 flex gap-1.5">
                      {g.approved ? <Badge color="emerald">فعال در فیت‌یاب</Badge> : <Badge color="amber">در انتظار تأیید مدیر</Badge>}
                      {!g.rental && <Badge>{tierLabel(gymTier(g, { settings }))}</Badge>}
                    </div>
                  </Cover>
                  <div className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{g.branch || g.name}</div>
                      <div className="truncate text-xs text-ink-500">{g.city}{g.address ? ` · ${g.address}` : ''}</div>
                      <div className="mt-0.5 text-xs text-ink-500">{g.rental ? `${toman(g.rental.hourlyPrice)} / ساعت` : `${toman(g.sessionPrice)} / سانس`} · {num(checkins.filter((c) => c.gymId === g.id).length)} ورود</div>
                      <Stars value={g.rating} count={g.reviews} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Link to={`../edit/${g.id}`}><Button size="sm" variant="outline" className="w-full" icon={<Pencil size={14} />}>ویرایش</Button></Link>
                      {g.approved && <Button size="sm" variant="secondary" icon={<PenSquare size={14} />} onClick={() => setPostGym(g.id)}>پست</Button>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )
      })}
      <CreatePostSheet open={!!postGym} onClose={() => setPostGym(undefined)} gymId={postGym} />
    </div>
  )
}
