import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useSession } from '@/core/db'
import { ROLE_META } from '@/core/config'
import type { Role } from '@/core/types'
import { useMe } from '@/ui/hooks'
import { RoleIcon } from '@/ui/icons'
import { isBusiness } from '@/core/roles'

/** جابجایی بین داشبورد نقش‌های مختلف کاربر */
export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const me = useMe()
  const active = useSession((s) => s.activeRole)
  const setRole = useSession((s) => s.setRole)
  const nav = useNavigate()
  // حساب کسب‌وکار به «اپ ورزشکار» دسترسی ندارد
  const roles = me ? (isBusiness(me) ? me.roles.filter((r) => r !== 'user') : me.roles) : []
  if (!me || roles.length < 2) return null
  const go = (r: Role) => {
    setRole(r)
    nav(ROLE_META[r].panel)
  }
  return (
    <div className={clsx(compact ? 'flex gap-1.5 overflow-x-auto no-scrollbar' : 'space-y-0.5')}>
      {!compact && <div className="mb-2 px-3 text-[12px] font-medium tracking-wide text-ink-400">حساب‌ها</div>}
      {roles.map((r) => (
        <button
          key={r}
          onClick={() => go(r)}
          className={clsx(
            'flex items-center gap-2.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] transition',
            !compact && 'w-full',
            compact && 'border hairline py-1.5 text-xs',
            active === r ? 'font-medium text-ink-950 dark:text-white' : 'text-ink-500 hover:text-ink-950 dark:hover:text-white',
            active === r && compact && 'border-ink-900 dark:border-white/40',
          )}
        >
          <RoleIcon role={r} size={15} />
          {r === 'user' ? 'اپ ورزشکار' : `پنل ${ROLE_META[r].label}`}
          {!compact && active === r && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-aqua-300" />}
        </button>
      ))}
    </div>
  )
}
