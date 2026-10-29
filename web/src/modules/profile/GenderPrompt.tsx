/** درخواست تعیین جنسیت از کاربرانی که پروفایلشان ناقص است (چیدمان اپ به آن وابسته است) */
import { useState } from 'react'
import { useSession } from '@/core/db'
import { updateProfile } from '@/core/services/auth'
import { Sheet } from '@/ui/kit'
import { Runner, Yoga } from '@/ui/art'
import { useMe } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

export function GenderPrompt() {
  const me = useMe()
  const role = useSession((s) => s.activeRole)
  const [later, setLater] = useState(false)
  if (!me || me.gender || later || role !== 'user') return null
  return (
    <Sheet open onClose={() => setLater(true)} title="پروفایلت را کامل کن">
      <p className="text-sm leading-7 text-ink-500">برای پیشنهاد باشگاه، برنامه‌ی تمرین و تغذیه‌ی متناسب (و ردیاب چرخه برای بانوان)، جنسیت خود را مشخص کنید.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {(
          [
            ['female', 'خانم', <Yoga key="f" size={84} />, 'grad-pink'],
            ['male', 'آقا', <Runner key="m" size={84} male />, 'grad-mint'],
          ] as const
        ).map(([v, l, art, grad]) => (
          <button key={v} onClick={() => runOk(() => updateProfile({ gender: v }), 'ذخیره شد')} className={`lift-hover relative flex h-32 items-end overflow-hidden rounded-3xl p-4 text-ink-950 ${grad}`}>
            <span className="relative z-10 font-display text-2xl">{l}</span>
            <span className="absolute -left-2 -top-1">{art}</span>
          </button>
        ))}
      </div>
      <button onClick={() => setLater(true)} className="mt-4 w-full text-center text-xs text-ink-400 hover:text-ink-900 dark:hover:text-white">
        بعداً
      </button>
    </Sheet>
  )
}
