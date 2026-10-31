import { Suspense } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Bell, LogOut, Moon, Sun } from 'lucide-react'
import { useDB, useSession } from '@/core/db'
import { logout } from '@/core/client/session'
import { num } from '@/core/format'
import { levelOf } from '@/core/services/engagement'
import { Avatar, Orbs, Progress } from '@/ui/kit'
import { useMe, useBalance } from '@/ui/hooks'
import { BOTTOM, GROUPS, HOME_ITEM, businessBottom, businessGroups, type NavItem } from './nav'
import { ROLE_META } from '@/core/config'
import { isBusiness, primaryBusinessRole } from '@/core/roles'
import { Logo } from './Logo'
import { RoleSwitcher } from './RoleSwitcher'
import { GenderPrompt } from '@/modules/profile/GenderPrompt'
import { ask } from '@/ui/toast'

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

const confirmLogout = async () => {
  if ((await ask('از حساب کاربری خارج می‌شوید؟'))) logout()
}

export function LogoutButton() {
  return (
    <button onClick={confirmLogout} className={clsx(iconBtn, 'hover:!text-coral-600')} aria-label="خروج از حساب" title="خروج از حساب">
      <LogOut size={18} strokeWidth={1.5} />
    </button>
  )
}

export function LogoutLink() {
  return (
    <button onClick={confirmLogout} className="flex items-center gap-2 px-3 text-xs text-ink-400 transition hover:text-coral-600">
      <LogOut size={14} strokeWidth={1.5} /> خروج از حساب
    </button>
  )
}

/** اسکلت بارگذاری صفحه (به‌جای چرخنده) */
export const Loader = () => (
  <div className="space-y-4" aria-busy="true" aria-label="در حال بارگذاری">
    <div className="skeleton h-8 w-48 rounded-full" />
    <div className="skeleton h-4 w-64 rounded-full" />
    <div className="grid gap-4 pt-2 lg:grid-cols-2">
      <div className="skeleton h-48 rounded-[30px]" />
      <div className="skeleton h-48 rounded-[30px]" />
    </div>
    <div className="flex gap-3 overflow-hidden">
      {[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 w-56 shrink-0 rounded-[28px]" />)}
    </div>
    <div className="skeleton h-20 rounded-[26px]" />
  </div>
)

export function AppShell() {
  const me = useMe()!
  const bal = useBalance(me.id)
  const lvl = levelOf(me.xp)
  const { pathname } = useLocation()
  const hideBottom = pathname.startsWith('/messages/')
  const bizRole = isBusiness(me) ? primaryBusinessRole(me) : undefined
  const groups = bizRole ? businessGroups(ROLE_META[bizRole].panel) : [{ id: 'sport' as const, title: '', items: [HOME_ITEM] }, ...GROUPS]
  const bottom = bizRole ? businessBottom(ROLE_META[bizRole].panel) : BOTTOM
  const sideLink = (it: NavItem) => (
    <NavLink
      key={it.to}
      to={it.to}
      end={it.to === '/' || it.to.startsWith('/panel/')}
      className={({ isActive }) =>
        clsx(
          'flex min-h-[40px] items-center gap-3 rounded-full px-4 text-[14px] transition',
          isActive ? 'bg-ink-950 font-semibold text-white dark:bg-white dark:text-ink-950' : 'text-ink-500 hover:text-ink-950 dark:hover:text-white',
        )
      }
    >
      <it.icon size={18} strokeWidth={1.6} />
      {it.label}
    </NavLink>
  )

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
            <div className="text-[12px] text-white/60">سطح {num(lvl.level)} · {lvl.title} · {num(bal)} تومان</div>
            <Progress value={lvl.progress} className="mt-1.5 !bg-white/15" />
          </div>
        </Link>
        <nav aria-label="منوی اصلی" className="mt-6 flex-1 space-y-4 overflow-y-auto no-scrollbar">
          {groups.map((g) => (
            <div key={g.id + g.title} className="space-y-0.5">
              {g.title && <div className="px-4 pb-1 text-[12px] font-semibold text-ink-500">{g.title}</div>}
              {g.items.map(sideLink)}
            </div>
          ))}
        </nav>
        <div className="space-y-3 border-t hairline pt-4">
          <RoleSwitcher />
          <LogoutLink />
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
            <NotifButton />
            <Link to="/profile" aria-label="پروفایل و تنظیمات" className="mr-1.5">
              <Avatar name={me.name} src={me.avatar} size={36} />
            </Link>
          </div>
        </header>

        <main className={clsx('mx-auto max-w-5xl px-4 pt-4', hideBottom ? 'pb-4' : 'pb-32 lg:pb-12')}>
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
          <GenderPrompt />
        </main>

        {!hideBottom && (
          <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4 lg:hidden">
            <div className="mx-auto mb-3 flex max-w-md items-center justify-around rounded-[1.75rem] bg-white/95 px-2 py-1.5 shadow-soft backdrop-blur-xl dark:bg-ink-850/95">
              {bottom.map((it) =>
                it.to === '/challenges' ? (
                  <NavLink key={it.to} to={it.to} aria-label="چالش‌ها" className="-mt-7 flex flex-1 flex-col items-center gap-1 text-[12px] font-semibold text-ink-950 dark:text-white">
                    <span className="card-lime flex h-14 w-14 items-center justify-center rounded-full shadow-glow ring-4 ring-ink-50 transition active:scale-90 dark:ring-ink-950">
                      <it.icon size={24} strokeWidth={1.8} />
                    </span>
                    {it.label}
                  </NavLink>
                ) : (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === '/' || it.to.startsWith('/panel/')}
                    className={({ isActive }) =>
                      clsx('press group flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[12px]', isActive ? 'font-semibold text-ink-950 dark:text-white' : 'text-ink-500')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={clsx('flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-200', isActive && 'bg-ink-100 dark:bg-white/10')}>
                          <it.icon size={22} strokeWidth={isActive ? 2 : 1.6} />
                        </span>
                        {it.label}
                      </>
                    )}
                  </NavLink>
                ),
              )}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
