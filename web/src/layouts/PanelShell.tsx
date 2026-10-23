import { Suspense } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowRight, LogOut, type LucideIcon } from 'lucide-react'
import { ROLE_META } from '@/core/config'
import type { Role } from '@/core/types'
import { useSession } from '@/core/db'
import { logout } from '@/core/client/session'
import { Avatar, Orbs } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { RoleIcon } from '@/ui/icons'
import { Logo } from './Logo'
import { RoleSwitcher } from './RoleSwitcher'
import { Loader, NotifButton, ThemeButton } from './AppShell'

export interface PanelLink {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

/** قالب مشترک پنل نقش‌ها (باشگاه‌دار، مربی، فروشنده، پزشک، رستوران، مدیر) */
export function PanelShell({ role, links }: { role: Role; links: PanelLink[] }) {
  const me = useMe()!
  const meta = ROLE_META[role]
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 p-4 lg:block">
        <div className="flex h-full flex-col rounded-[2rem] bg-white px-4 py-6 shadow-card dark:bg-ink-900 dark:shadow-none">
        <div className="px-2">
          <Logo />
        </div>
        <div className="relative mt-8 overflow-hidden rounded-3xl bg-ink-850 p-4 text-white">
          <Orbs seed={role} intensity={0.6} />
          <div className="relative flex items-center gap-2 text-white">
            <RoleIcon role={role} size={16} />
            <span className="font-display text-xl">پنل {meta.label}</span>
          </div>
          <div className="relative mt-1 text-[12px] leading-6 text-white/70">{meta.desc}</div>
        </div>
        <nav className="mt-6 flex-1 space-y-0.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-full px-4 py-2.5 text-[13.5px] transition',
                  isActive ? 'grad-lavender font-medium text-ink-950' : 'text-ink-500 hover:text-ink-950 dark:text-ink-400 dark:hover:text-white',
                )
              }
            >
              <l.icon size={18} strokeWidth={1.5} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t hairline pt-4">
          <RoleSwitcher />
          <button onClick={() => logout()} className="flex items-center gap-2 px-3 text-xs text-ink-400 transition hover:text-coral-600">
            <LogOut size={14} strokeWidth={1.5} /> خروج از حساب
          </button>
        </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-40">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4">
            {role !== 'admin' && (
              <Link to="/" onClick={() => useSession.getState().setRole('user')} className="flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-xs text-ink-700 transition hover:bg-white dark:text-ink-200 dark:hover:bg-white/5">
                <ArrowRight size={14} strokeWidth={1.5} /> اپ کی‌فیت
              </Link>
            )}
            <div className="mr-2 flex items-center gap-2 text-sm font-medium lg:hidden">
              <RoleIcon role={role} size={16} /> پنل {meta.label}
            </div>
            <div className="flex-1" />
            <NotifButton />
            <ThemeButton />
            <Avatar name={me.name} src={me.avatar} size={32} className="mr-1" />
          </div>
          <div className="flex gap-1 overflow-x-auto px-4 pb-2.5 no-scrollbar lg:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  clsx('flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition', isActive ? 'grad-lavender border-transparent text-ink-950' : 'hairline text-ink-600 dark:text-ink-300')
                }
              >
                <l.icon size={14} strokeWidth={1.5} />
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="px-4 pb-2.5 lg:hidden">
            <RoleSwitcher compact />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 pb-16">
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
