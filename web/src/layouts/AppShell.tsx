import { Suspense } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Bell, Moon, Sun } from 'lucide-react'
import { useDB, useSession } from '@/core/db'
import { num } from '@/core/format'
import { levelOf } from '@/core/services/engagement'
import { Avatar, Progress } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { BOTTOM, SIDEBAR } from './nav'
import { Logo } from './Logo'
import { RoleSwitcher } from './RoleSwitcher'

const iconBtn = 'relative flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-900/[.05] hover:text-ink-950 dark:text-ink-300 dark:hover:bg-white/[.06] dark:hover:text-white'

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
      {unread > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500" />}
    </Link>
  )
}

export const Loader = () => (
  <div className="flex h-64 items-center justify-center">
    <span className="h-6 w-6 animate-spin rounded-full border-[1.5px] border-ink-300 border-t-ink-900 dark:border-white/15 dark:border-t-brand-300" />
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
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-l hairline px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <Link to="/profile" className="mt-8 flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-ink-900/[.04] dark:hover:bg-white/[.04]">
          <Avatar name={me.name} src={me.avatar} size={38} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{me.name}</div>
            <div className="text-[11px] text-ink-500">سطح {num(lvl.level)} · {lvl.title}</div>
            <Progress value={lvl.progress} className="mt-1.5" />
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
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition',
                  isActive ? 'bg-ink-900/[.06] font-medium text-ink-950 dark:bg-white/[.07] dark:text-white' : 'text-ink-500 hover:text-ink-950 dark:text-ink-400 dark:hover:text-white',
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
      </aside>

      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-40 border-b hairline">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
            <div className="lg:hidden">
              <Logo size={28} />
            </div>
            <div className="flex-1" />
            <Link to="/wallet" className="ml-1 flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-xs tabular-nums text-ink-800 transition hover:bg-white dark:text-ink-100 dark:hover:bg-white/5">
              {num(bal)} <span className="text-ink-400">تومان</span>
            </Link>
            <NotifButton />
            <ThemeButton />
            <Link to="/profile" className="mr-1 lg:hidden">
              <Avatar name={me.name} src={me.avatar} size={32} />
            </Link>
          </div>
        </header>

        <main className={clsx('mx-auto max-w-5xl px-4 pt-6', hideBottom ? 'pb-4' : 'pb-28 lg:pb-12')}>
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </main>

        {!hideBottom && (
          <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t hairline lg:hidden">
            <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1">
              {BOTTOM.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  className={({ isActive }) =>
                    clsx('flex flex-1 flex-col items-center gap-1 py-2 text-[10px] transition', isActive ? 'font-medium text-ink-950 dark:text-white' : 'text-ink-400')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <it.icon size={21} strokeWidth={isActive ? 1.9 : 1.5} />
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
