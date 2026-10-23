/** کارت «تمرکز امروز» برای آقایان (و بانوانی که ردیاب چرخه را فعال نکرده‌اند) — برنامه‌ی تقسیمی هفتگی */
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { User } from '@/core/types'
import { Lifter, Runner, Yoga } from '@/ui/art'

// شنبه تا جمعه
const SPLIT = [
  { title: 'سینه، سرشانه و پشت‌بازو', moves: ['پرس سینه ۴×۸', 'پرس سرشانه ۳×۱۰', 'دیپ ۳×۱۲'], sport: 'بدنسازی', art: 'lift' },
  { title: 'پشت و جلوبازو', moves: ['بارفیکس ۴×۶', 'زیربغل تی‌بار ۳×۱۰', 'جلوبازو هالتر ۳×۱۲'], sport: 'بدنسازی', art: 'lift' },
  { title: 'پا و میان‌تنه', moves: ['اسکوات ۴×۸', 'ددلیفت رومانیایی ۳×۱۰', 'پلانک ۳×۴۵ ثانیه'], sport: 'کراس‌فیت', art: 'lift' },
  { title: 'کاردیو و HIIT', moves: ['۵ دقیقه گرم‌کردن', '۱۰ اینتروال ۳۰/۳۰', '۲۰ دقیقه دویدن آرام'], sport: 'HIIT', art: 'run' },
  { title: 'بالاتنه‌ی ترکیبی', moves: ['پرس سرشانه دمبل ۳×۱۰', 'روئینگ ۳×۱۲', 'شنا سوئدی ۳×حداکثر'], sport: 'بدنسازی', art: 'lift' },
  { title: 'پایین‌تنه و تحرک', moves: ['لانج ۳×۱۲', 'هیپ تراست ۳×۱۰', 'کشش ۱۰ دقیقه'], sport: 'فیتنس', art: 'run' },
  { title: 'ریکاوری فعال', moves: ['۳۰ دقیقه پیاده‌روی', 'یوگا یا کشش', 'خواب کافی'], sport: 'یوگا', art: 'yoga' },
] as const

export function TrainingFocus({ user, light }: { user: User; light?: boolean }) {
  // در روزهای قاعدگی برنامه به ریکاوری فعال تغییر می‌کند
  const idx = light ? 6 : (new Date().getDay() + 1) % 7 // شنبه = ۰
  const d = SPLIT[idx]
  const goalNote = user.goal === 'lose' ? 'برای کاهش وزن، استراحت بین ست‌ها را به ۴۵ ثانیه برسان.' : user.goal === 'gain' ? 'برای حجم، وزنه‌ها را سنگین و تکرارها را ۶ تا ۱۰ نگه دار.' : 'تکنیک درست را بر وزنه‌ی سنگین ترجیح بده.'
  const Art = d.art === 'run' ? <Runner size={128} male={user.gender === 'male'} /> : d.art === 'yoga' ? <Yoga size={124} /> : <Lifter size={128} />
  return (
    <div className="relative overflow-hidden rounded-[2rem] grad-mint p-5 text-ink-950">
      <div className="pointer-events-none absolute -bottom-3 left-0">{Art}</div>
      <div className="relative max-w-[62%]">
        <div className="text-xs opacity-60">تمرکز امروز</div>
        <div className="mt-1 font-display text-[1.8rem] leading-[1.1]">{d.title}</div>
        <ul className="mt-3 space-y-1 text-xs">
          {d.moves.map((m) => (
            <li key={m} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-950/50" />
              {m}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-5 opacity-65">{goalNote}</p>
        <Link to={`/fityab?sport=${encodeURIComponent(d.sport)}`} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950 px-4 py-2 text-xs font-medium text-white">
          باشگاه {d.sport} <ArrowLeft size={14} />
        </Link>
      </div>
    </div>
  )
}
