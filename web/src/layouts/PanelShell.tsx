import { Suspense } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowRight, LogOut, type LucideIcon } from 'lucide-react'
import { ROLE_META } from '@/core/config'
import type { Role } from '@/core/types'
import { useSession } from '@/core/db'
import { Avatar } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { Logo } from './Logo'
import { RoleSwitcher } from './RoleSwitcher'
import { NotifButton, ThemeButton } from './AppShell'

export interface PanelLink {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

/** قالب مشترک پنل نقش‌ها (باشگاه‌دار، مربی، فروشنده، پزشک، رستوران، مدیر) */
export function PanelShell({ role, links }: { role: Role; links: PanelLink[] }) {
  const me = useMe()!
  const logout = useSession((s) => s.logout)
  const meta = ROLE_META[role]
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-l border-ink-100 bg-white p-5 dark:border-white/5 dark:bg-ink-900 lg:flex">
        <Logo />
        <div className={clsx('mt-6 rounded-3xl bg-gradient-to-br p-4 text-white shadow-soft', meta.color)}>
          <div className="text-2xl">{meta.icon}</div>
          <div className="mt-1 text-sm font-bold">پنل {meta.label}</div>
          <div className="text-[11px] text-white/80">{meta.desc}</div>
        </div>
        <nav className="mt-5 flex-1 space-y-0.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
                  isActive ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-white/5',
                )
              }
            >
              <l.icon size={19} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-ink-100 pt-4 dark:border-white/5">
          <RoleSwitcher />
          <button onClick={logout} className="flex items-center gap-2 text-xs text-ink-400 hover:text-rose-500">
            <LogOut size={14} /> خروج از حساب
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-40 border-b border-ink-100/60 dark:border-white/5">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
            {role !== 'admin' && (
              <Link to="/" onClick={() => useSession.getState().setRole('user')} className="flex items-center gap-1 rounded-2xl bg-ink-100 px-3 py-2 text-xs font-semibold text-ink-600 dark:bg-white/5 dark:text-ink-300">
                <ArrowRight size={14} /> اپ کی‌فیت
              </Link>
            )}
            <div className="text-sm font-bold lg:hidden">
              {meta.icon} پنل {meta.label}
            </div>
            <div className="flex-1" />
            <NotifButton />
            <ThemeButton />
            <Avatar name={me.name} src={me.avatar} size={34} />
          </div>
          <div className="flex gap-1 overflow-x-auto px-4 pb-2 no-scrollbar lg:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  clsx('flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold', isActive ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300')
                }
              >
                <l.icon size={14} />
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="px-4 pb-2 lg:hidden">
            <RoleSwitcher compact />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-5 pb-16">
          <Suspense fallback={<div className="flex h-64 items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
