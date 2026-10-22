import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useSession } from '@/core/db'
import { ROLE_META } from '@/core/config'
import type { Role } from '@/core/types'
import { useMe } from '@/ui/hooks'

/** جابجایی بین داشبورد نقش‌های مختلف کاربر */
export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const me = useMe()
  const active = useSession((s) => s.activeRole)
  const setRole = useSession((s) => s.setRole)
  const nav = useNavigate()
  if (!me || me.roles.length < 2) return null
  const go = (r: Role) => {
    setRole(r)
    nav(ROLE_META[r].panel)
  }
  return (
    <div className={clsx('flex gap-1.5', compact ? 'overflow-x-auto no-scrollbar' : 'flex-wrap')}>
      {me.roles.map((r) => (
        <button
          key={r}
          onClick={() => go(r)}
          className={clsx(
            'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold transition',
            active === r ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-white/5 dark:text-ink-300',
          )}
        >
          <span>{ROLE_META[r].icon}</span>
          {r === 'user' ? 'اپ ورزشکار' : `پنل ${ROLE_META[r].label}`}
        </button>
      ))}
    </div>
  )
}
