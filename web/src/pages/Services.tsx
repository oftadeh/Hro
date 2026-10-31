import { Link } from 'react-router-dom'
import { GROUPS } from '@/layouts/nav'
import { PageHeader } from '@/ui/kit'

/** همه‌ی خدمات کی‌فیت، دسته‌بندی‌شده (ورزش، سلامت، خرید، جامعه، حساب) */
export default function Services() {
  return (
    <div className="animate-fade-up">
      <PageHeader title="همه‌ی خدمات" />
      <div className="space-y-8">
        {GROUPS.map((g) => (
          <section key={g.id} aria-labelledby={`grp-${g.id}`}>
            <h2 id={`grp-${g.id}`} className="mb-3 text-[17px] font-extrabold">{g.title}</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {g.items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  className="flex min-h-[72px] items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-card transition hover:-translate-y-0.5 dark:bg-ink-850 dark:shadow-none"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-ink-100 dark:bg-ink-800">
                    <it.icon size={20} strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{it.label}</span>
                    {it.desc && <span className="block truncate text-[12px] text-ink-500">{it.desc}</span>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
