import { Suspense } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Bell, Moon, Sun, Wallet } from 'lucide-react'
import { useDB, useSession } from '@/core/db'
import { num } from '@/core/format'
import { levelOf } from '@/core/services/engagement'
import { Avatar } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { BOTTOM, SIDEBAR } from './nav'
import { Logo } from './Logo'
import { RoleSwitcher } from './RoleSwitcher'

export function ThemeButton() {
  const theme = useSession((s) => s.theme)
  const toggle = useSession((s) => s.toggleTheme)
  return (
    <button onClick={toggle} className="rounded-2xl p-2.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-white/5" aria-label="تغییر تم">
      {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  )
}

export function NotifButton() {
  const me = useMe()
  const unread = useDB((s) => s.notifications.filter((n) => n.userId === me?.id && !n.read).length)
  return (
    <Link to="/notifications" className="relative rounded-2xl p-2.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-white/5" aria-label="اعلان‌ها">
      <Bell size={19} />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{num(unread)}</span>
      )}
    </Link>
  )
}

export function AppShell() {
  const me = useMe()!
  const bal = useBalance(me.id)
  const lvl = levelOf(me.xp)
  const { pathname } = useLocation()
  const hideBottom = pathname.startsWith('/messages/')

  return (
    <div className="min-h-dvh lg:flex">
      {/* سایدبار دسکتاپ */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-l border-ink-100 bg-white p-5 dark:border-white/5 dark:bg-ink-900 lg:flex">
        <Logo />
        <Link to="/profile" className="mt-6 flex items-center gap-3 rounded-3xl bg-gradient-to-br from-ink-900 to-ink-800 p-3 text-white">
          <Avatar name={me.name} src={me.avatar} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{me.name}</div>
            <div className="text-[11px] text-white/60">سطح {num(lvl.level)} · {lvl.title} · 🔥 {num(me.streak)}</div>
          </div>
        </Link>
        <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto no-scrollbar">
          {SIDEBAR.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
                  isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-white/5',
                )
              }
            >
              <it.icon size={19} />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t border-ink-100 pt-4 dark:border-white/5">
          <RoleSwitcher />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* هدر */}
        <header className="glass sticky top-0 z-40 border-b border-ink-100/60 dark:border-white/5">
          <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
            <div className="lg:hidden">
              <Logo size={32} />
            </div>
            <div className="flex-1" />
            <Link to="/wallet" className="flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Wallet size={15} />
              {num(bal)} <span className="font-normal opacity-70">تومان</span>
            </Link>
            <NotifButton />
            <ThemeButton />
            <Link to="/profile" className="lg:hidden">
              <Avatar name={me.name} src={me.avatar} size={34} />
            </Link>
          </div>
        </header>

        <main className={clsx('mx-auto max-w-5xl px-4 pt-4', hideBottom ? 'pb-4' : 'pb-28 lg:pb-10')}>
          <Suspense fallback={<div className="flex h-64 items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>}>
            <Outlet />
          </Suspense>
        </main>

        {/* نوار پایین موبایل */}
        {!hideBottom && (
          <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-ink-100/60 dark:border-white/5 lg:hidden">
            <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
              {BOTTOM.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  className={({ isActive }) => clsx('flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400')}
                >
                  {({ isActive }) =>
                    it.to === '/challenges' ? (
                      <>
                        <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30">
                          <it.icon size={22} />
                        </span>
                        {it.label}
                      </>
                    ) : (
                      <>
                        <span className={clsx('rounded-xl px-3 py-1 transition', isActive && 'bg-emerald-100 dark:bg-emerald-500/15')}>
                          <it.icon size={20} />
                        </span>
                        {it.label}
                      </>
                    )
                  }
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
