import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/layouts/Logo'
import { useDB } from '@/core/db'
import { DEFAULT_COMMISSIONS } from '@/core/config'
import { legalDocs, TERMS_DATE, type LegalKey } from '@/core/legal'
import { CANCEL_GRACE_MIN, CLASS_CANCEL_HOURS, ENTRY_RADIUS_M, RENTAL_CANCEL_HOURS } from '@/core/services/fityab'
import { EVENT_CANCEL_HOURS } from '@/core/services/events'
import { LIVE_CANCEL_HOURS } from '@/core/services/live'
import { AUTO_RELEASE_DAYS } from '@/core/services/market'

/** قوانین و مقررات و حریم خصوصی؛ برای مهمان و کاربر واردشده در دسترس است */
export default function Legal({ privacy = false }: { privacy?: boolean }) {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const settings = useDB((s) => s.settings)
  const docs = useMemo(
    () =>
      legalDocs({
        commissions: { ...DEFAULT_COMMISSIONS, ...(settings?.commissions ?? {}) },
        minWithdraw: settings?.minWithdraw ?? 500_000,
        cancelGraceMin: CANCEL_GRACE_MIN,
        classCancelHours: CLASS_CANCEL_HOURS,
        rentalCancelHours: RENTAL_CANCEL_HOURS,
        eventCancelHours: EVENT_CANCEL_HOURS,
        liveCancelHours: LIVE_CANCEL_HOURS,
        entryRadiusM: ENTRY_RADIUS_M,
        marketReleaseDays: AUTO_RELEASE_DAYS,
      }),
    [settings],
  )
  const key = (params.get('t') as LegalKey | null) ?? (privacy ? 'privacy' : 'general')
  const doc = docs.find((d) => d.key === key) ?? docs[0]

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <button onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} aria-label="بازگشت" className="press flex h-11 w-11 items-center justify-center rounded-full bg-ink-900/[.05] dark:bg-white/[.06]">
            <ArrowRight size={18} />
          </button>
          <Link to="/" aria-label="کی‌فیت">
            <Logo size={30} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        <h1 className="text-[28px] font-extrabold leading-tight">قوانین و حریم خصوصی</h1>
        <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">آخرین به‌روزرسانی: {TERMS_DATE}</p>

        <div role="tablist" aria-label="بخش‌ها" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
          {docs.map((d) => (
            <button
              key={d.key}
              role="tab"
              aria-selected={d.key === doc.key}
              onClick={() => setParams({ t: d.key }, { replace: true })}
              className={clsx(
                'press h-10 shrink-0 rounded-full px-4 text-[14px]',
                d.key === doc.key ? 'card-violet font-semibold' : 'bg-white text-ink-600 shadow-card dark:bg-ink-850 dark:text-ink-300 dark:shadow-none',
              )}
            >
              {d.tab}
            </button>
          ))}
        </div>

        <article key={doc.key} className="anim-fade mt-6">
          <h2 className="text-[22px] font-extrabold">{doc.title}</h2>
          <p className="mt-2 text-[15px] leading-8 text-ink-600 dark:text-ink-300">{doc.intro}</p>
          <div className="mt-6 space-y-4">
            {doc.sections.map((s, i) => (
              <section key={s.title} className="rounded-[26px] bg-white p-5 shadow-card dark:bg-ink-850 dark:shadow-none">
                <h3 className="flex items-center gap-2 text-[17px] font-extrabold">
                  <span className="card-lime flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-black">{(i + 1).toLocaleString('fa-IR')}</span>
                  {s.title}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {s.items.map((t) => (
                    <li key={t} className="flex gap-2.5 text-[15px] leading-8 text-ink-700 dark:text-ink-200">
                      <span aria-hidden className="mt-3.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="mt-6 text-[13px] leading-7 text-ink-500 dark:text-ink-400">
            پرسش یا شکایتی دارید؟ از بخش پشتیبانی در برنامه پیام دهید.
          </p>
        </article>
      </main>
    </div>
  )
}
