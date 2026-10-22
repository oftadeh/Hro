import { Suspense } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Bell, Moon, Sun } from 'lucide-react'
import { useDB, useSession } from '@/core/db'
import { num } from '@/core/format'
import { levelOf } from '@/core/services/engagement'
import { Avatar, Orbs, Progress } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { BOTTOM, SIDEBAR } from './nav'
import { Logo } from './Logo'
import { RoleSwitcher } from './RoleSwitcher'

const iconBtn = 'relative flex h-10 w-10 items-center justify-center rounded-full bg-ink-900/[.05] text-ink-600 transition hover:text-ink-950 dark:bg-white/[.06] dark:text-ink-200 dark:hover:text-white'

export function ThemeButton() {
  const theme = useSession((s) => s.theme)
  const toggle = useSession((s) => s.toggleTheme)
  return (
    <button onClick={toggle} className={iconBtn} aria-label="تغییر تم">
      {theme === 'dark' ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
    </button>
  )
}

export function NotifButton() {
  const me = useMe()
  const unread = useDB((s) => s.notifications.filter((n) => n.userId === me?.id && !n.read).length)
  return (
    <Link to="/notifications" className={iconBtn} aria-label="اعلان‌ها">
      <Bell size={18} strokeWidth={1.5} />
      {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-coral-400 ring-2 ring-ink-50 dark:ring-ink-950" />}
    </Link>
  )
}

export const Loader = () => (
  <div className="flex h-64 items-center justify-center">
    <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand-300/30 border-t-brand-300" />
  </div>
)

export function AppShell() {
  const me = useMe()!
  const bal = useBalance(me.id)
  const lvl = levelOf(me.xp)
  const { pathname } = useLocation()
  const hideBottom = pathname.startsWith('/messages/')

  return (
    <div className="min-h-dvh lg:flex">
      {/* سایدبار دسکتاپ */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 p-4 lg:block">
        <div className="flex h-full flex-col rounded-[2rem] bg-white px-4 py-6 shadow-card dark:bg-ink-900 dark:shadow-none">
        <div className="px-2">
          <Logo />
        </div>
        <Link to="/profile" className="relative mt-8 flex items-center gap-3 overflow-hidden rounded-3xl bg-ink-850 p-3 text-white">
          <Orbs seed="side" intensity={0.55} />
          <Avatar name={me.name} src={me.avatar} size={40} className="relative" />
          <div className="relative min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{me.name}</div>
            <div className="text-[11px] text-white/60">سطح {num(lvl.level)} · {lvl.title}</div>
            <Progress value={lvl.progress} className="mt-1.5 !bg-white/15" />
          </div>
        </Link>
        <nav className="mt-6 flex-1 space-y-0.5 overflow-y-auto no-scrollbar">
          {SIDEBAR.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-full px-4 py-2.5 text-[13.5px] transition',
                  isActive ? 'grad-lavender font-medium text-ink-950' : 'text-ink-500 hover:text-ink-950 dark:text-ink-400 dark:hover:text-white',
                )
              }
            >
              <it.icon size={18} strokeWidth={1.5} />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t hairline pt-4">
          <RoleSwitcher />
        </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-40">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
            <div className="lg:hidden">
              <Logo size={28} />
            </div>
            <div className="flex-1" />
            <Link to="/wallet" className="ml-1 flex h-10 items-center gap-1.5 rounded-full bg-ink-900/[.05] px-4 text-xs tabular-nums text-ink-800 transition dark:bg-white/[.06] dark:text-ink-100">
              {num(bal)} <span className="text-ink-400">تومان</span>
            </Link>
            <NotifButton />
            <ThemeButton />
            <Link to="/profile" className="mr-1 lg:hidden">
              <Avatar name={me.name} src={me.avatar} size={32} />
            </Link>
          </div>
        </header>

        <main className={clsx('mx-auto max-w-5xl px-4 pt-4', hideBottom ? 'pb-4' : 'pb-32 lg:pb-12')}>
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </main>

        {!hideBottom && (
          <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4 lg:hidden">
            <div className="mx-auto mb-3 flex max-w-md items-stretch justify-around rounded-[1.75rem] bg-white/90 px-2 py-2 shadow-soft backdrop-blur-xl dark:bg-ink-850/90">
              {BOTTOM.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  className={({ isActive }) =>
                    clsx('flex flex-1 flex-col items-center gap-1 py-1 text-[10px] transition', isActive ? 'text-brand-600 dark:text-brand-300' : 'text-ink-400')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span key={String(isActive)} className={clsx('flex h-8 w-12 items-center justify-center rounded-full transition', isActive && 'animate-pop bg-brand-400/15')}>
                        <it.icon size={20} strokeWidth={1.5} />
                      </span>
                      {it.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
