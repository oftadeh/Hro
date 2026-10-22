import { Suspense } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Bell, Moon, Sun, Wallet } from 'lucide-react'
import { useDB, useSession } from '@/core/db'
import { num } from '@/core/format'
import { levelOf } from '@/core/services/engagement'
import { Avatar, Progress } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { BOTTOM, SIDEBAR } from './nav'
import { Logo } from './Logo'
import { RoleSwitcher } from './RoleSwitcher'

const iconBtn = 'relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-ink-500 shadow-card transition hover:text-brand-600 dark:bg-white/[.06] dark:text-ink-200 dark:shadow-none dark:hover:text-gold-300'

export function ThemeButton() {
  const theme = useSession((s) => s.theme)
  const toggle = useSession((s) => s.toggleTheme)
  return (
    <button onClick={toggle} className={iconBtn} aria-label="تغییر تم">
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export function NotifButton() {
  const me = useMe()
  const unread = useDB((s) => s.notifications.filter((n) => n.userId === me?.id && !n.read).length)
  return (
    <Link to="/notifications" className={iconBtn} aria-label="اعلان‌ها">
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-coral-500 px-1 text-[10px] font-bold text-white dark:border-ink-950">{num(unread)}</span>
      )}
    </Link>
  )
}

export const Loader = () => (
  <div className="flex h-64 items-center justify-center">
    <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent dark:border-gold-400 dark:border-t-transparent" />
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
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col p-4 lg:flex">
        <div className="flex h-full flex-col rounded-[2rem] bg-white/80 p-4 shadow-card backdrop-blur-xl dark:border dark:border-white/[.06] dark:bg-ink-900/60 dark:shadow-none">
          <Logo />
          <Link to="/profile" className="relative mt-5 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-brand-500 to-violet-800 p-3.5 text-white shadow-glow dark:from-ink-800 dark:to-ink-900 dark:shadow-none">
            <div className="absolute -left-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-3">
              <Avatar name={me.name} src={me.avatar} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{me.name}</div>
                <div className="text-[11px] text-white/70">سطح {num(lvl.level)} · {lvl.title} · 🔥 {num(me.streak)}</div>
              </div>
            </div>
            <Progress value={lvl.progress} className="relative mt-3 h-1.5 !bg-white/20" tone="from-white to-white/70 dark:from-gold-300 dark:to-gold-500" />
          </Link>
          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {SIDEBAR.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-gold-400/10 dark:text-gold-300'
                      : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800 dark:text-ink-300 dark:hover:bg-white/5',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={clsx('flex h-8 w-8 items-center justify-center rounded-xl transition', isActive ? 'bg-brand-600 text-white shadow-glow dark:bg-gold-400 dark:text-ink-950 dark:shadow-none' : 'bg-ink-100/70 dark:bg-white/5')}>
                      <it.icon size={17} />
                    </span>
                    {it.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 border-t border-ink-100 pt-3 dark:border-white/5">
            <RoleSwitcher />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* هدر */}
        <header className="glass sticky top-0 z-40 lg:bg-transparent lg:backdrop-blur-none">
          <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
            <div className="lg:hidden">
              <Logo size={34} />
            </div>
            <div className="flex-1" />
            <Link to="/wallet" className="flex h-10 items-center gap-1.5 rounded-2xl bg-white px-3 text-xs font-black text-ink-800 shadow-card dark:bg-white/[.06] dark:text-white dark:shadow-none">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-gold-400 dark:text-ink-950">
                <Wallet size={13} />
              </span>
              {num(bal)} <span className="font-medium text-ink-400">تومان</span>
            </Link>
            <NotifButton />
            <ThemeButton />
            <Link to="/profile" className="lg:hidden">
              <Avatar name={me.name} src={me.avatar} size={40} />
            </Link>
          </div>
        </header>

        <main className={clsx('mx-auto max-w-5xl px-4 pt-3', hideBottom ? 'pb-4' : 'pb-32 lg:pb-10')}>
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </main>

        {/* نوار پایین شناور موبایل */}
        {!hideBottom && (
          <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden">
            <div className="mx-auto mb-2 flex max-w-md items-stretch justify-around rounded-[1.75rem] bg-white/90 px-2 py-1.5 shadow-[0_20px_50px_-15px_rgb(60_30_150/.35)] backdrop-blur-2xl dark:border dark:border-white/10 dark:bg-ink-900/85 dark:shadow-[0_20px_50px_-15px_rgb(0_0_0/.7)]">
              {BOTTOM.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  className={({ isActive }) =>
                    clsx('flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-bold transition', isActive ? 'text-brand-600 dark:text-gold-300' : 'text-ink-400')
                  }
                >
                  {({ isActive }) =>
                    it.to === '/challenges' ? (
                      <>
                        <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-[1.25rem] border-4 border-ink-50 bg-gradient-to-br from-brand-500 to-violet-800 text-white shadow-glow dark:border-ink-950 dark:from-gold-300 dark:to-gold-600 dark:text-ink-950 dark:shadow-gold">
                          <it.icon size={22} />
                        </span>
                        {it.label}
                      </>
                    ) : (
                      <>
                        <span className="relative flex h-8 items-center justify-center px-3">
                          <it.icon size={21} strokeWidth={isActive ? 2.4 : 1.9} />
                        </span>
                        <span className="flex items-center gap-1">
                          {isActive && <span className="h-1 w-1 rounded-full bg-current" />}
                          {it.label}
                        </span>
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
