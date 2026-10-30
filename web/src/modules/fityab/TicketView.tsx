import type { ReactNode } from 'react'
/** نمایش بلیت ورود (QR + کد) و پرداخت سانس/کلاس */
import { Link } from 'react-router-dom'
import { Navigation, Undo2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { faDateTime, toman } from '@/core/format'
import { CANCEL_GRACE_MIN, cancelQuote, cancelTicket, CLASS_CANCEL_HOURS, inCancelGrace, NO_SHOW_LIMIT, ticketStatus } from '@/core/services/fityab'
import { useDB } from '@/core/db'
import type { CheckIn, Gym } from '@/core/types'
import { Badge, Button, Sheet } from '@/ui/kit'
import { runOk, ask } from '@/ui/toast'
import { directionsUrl } from './nav'

export const TICKET_STATUS: Record<CheckIn['status'], { label: string; color: 'emerald' | 'slate' | 'rose' | 'amber' }> = {
  active: { label: 'فعال', color: 'emerald' },
  used: { label: 'استفاده‌شده', color: 'slate' },
  cancelled: { label: 'لغو شده', color: 'rose' },
  expired: { label: 'منقضی', color: 'amber' },
}

export function TicketSheet({ ticket, gym, onClose, onShare }: { ticket?: CheckIn; gym?: Gym; onClose: () => void; onShare?: () => void }) {
  const cls = ticket?.classId ? gym?.classes?.find((c) => c.id === ticket.classId) : undefined
  const st = ticket ? ticketStatus(ticket) : 'active'
  const settings = useDB((s) => s.settings)
  const grace = !!ticket && inCancelGrace(ticket)
  const q = ticket ? cancelQuote(ticket, Date.now(), { settings }) : undefined
  return (
    <Sheet open={!!ticket} onClose={onClose} title={cls ? `بلیت کلاس ${cls.title}` : ticket?.rentalEnd ? 'رزرو اجاره' : 'بلیت ورود'}>
      {ticket && gym && (
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <Badge color={TICKET_STATUS[st].color}>{TICKET_STATUS[st].label}</Badge>
          </div>
          {st === 'active' ? (
            <>
              <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-soft">
                <QRCodeSVG value={`KEYFIT:${ticket.id}:${ticket.code}`} size={190} />
              </div>
              <div className="mt-4 text-xs text-ink-500">کد ورود</div>
              <div className="font-display text-5xl tracking-[.25em]" dir="ltr">
                {ticket.code}
              </div>
              <p className="mt-3 text-sm text-ink-500">QR یا کد را در پذیرش «{gym.name}» نشان دهید.</p>
            </>
          ) : (
            <p className="py-6 text-sm text-ink-500">{st === 'used' ? `ورود در ${faDateTime(ticket.usedAt ?? ticket.createdAt)} ثبت شد.` : st === 'cancelled' ? 'این بلیت لغو و مبلغ آن برگشت داده شد.' : 'اعتبار این بلیت بدون استفاده تمام شد.'}</p>
          )}
          <div className="mt-3 space-y-1 rounded-2xl bg-ink-900/[.04] p-3 text-xs leading-6 text-ink-500 dark:bg-white/[.05]">
            {ticket.memberName && <div>شرکت‌کننده: <b className="text-ink-900 dark:text-white">{ticket.memberName}</b></div>}
            {cls && ticket.slotAt && <div>زمان کلاس: <b className="text-ink-900 dark:text-white">{faDateTime(ticket.slotAt)}</b> · مربی: {cls.coachName}</div>}
            {ticket.rentalEnd && ticket.slotAt && <div>از <b className="text-ink-900 dark:text-white">{faDateTime(ticket.slotAt)}</b> تا {faDateTime(ticket.rentalEnd)}</div>}
            <div>
              مبلغ: {toman(ticket.paid ?? ticket.price)} از {ticket.paidWith === 'subscription' ? 'اعتبار اشتراک' : 'کیف پول'}
              {ticket.offPeak && <span className="text-aqua-600 dark:text-aqua-300"> (تخفیف ساعت خلوت)</span>}
            </div>
            {st === 'active' && ticket.validUntil && <div>معتبر تا {faDateTime(ticket.validUntil)}</div>}
          </div>
          {st === 'active' && (
            <>
              <a href={directionsUrl(gym.lat, gym.lng)} target="_blank" rel="noreferrer">
                <Button className="mt-4 w-full" icon={<Navigation size={16} />}>
                  مسیریابی تا باشگاه
                </Button>
              </a>
              <Button
                variant="ghost"
                className="mt-2 w-full text-coral-500"
                icon={<Undo2 size={16} />}
                disabled={!q?.allowed}
                onClick={async () => {
                  const msg = q?.late ? `کمتر از ${q.window.toLocaleString('fa-IR')} ساعت به شروع مانده؛ با لغو، ${toman(q.fee)} به باشگاه می‌رسد و ${toman(q.refund)} برمی‌گردد. لغو شود؟` : 'بلیت لغو و کل مبلغ برگشت داده شود؟'
                  if (!(await ask(msg))) return
                  if (await runOk(() => cancelTicket(ticket.id), 'بلیت لغو شد')) onClose()
                }}
              >
                {!q?.allowed ? 'نوبت شروع شده و قابل لغو نیست' : q.late ? `لغو با بازگشت ${toman(q.refund)}` : 'لغو و بازگشت کامل وجه'}
              </Button>
              {grace && ticket.slotAt && <p className="mt-1 text-[12px] text-ink-500">تا {CANCEL_GRACE_MIN.toLocaleString('fa-IR')} دقیقه پس از خرید، لغو با بازگشت کامل ممکن است.</p>}
              {ticket.classId && <p className="mt-1 text-[12px] text-ink-500">نیامدن بدون لغو، غیبت حساب می‌شود؛ با {NO_SHOW_LIMIT.toLocaleString('fa-IR')} غیبت در ۳۰ روز، رزرو کلاس موقتاً بسته می‌شود.</p>}
            </>
          )}
          {st === 'used' && onShare && (
            <Button variant="outline" className="mt-4 w-full" onClick={onShare}>
              اشتراک در فیت‌زون
            </Button>
          )}
          <Link to="/tickets" onClick={onClose} className="mt-3 block text-xs text-ink-400 hover:text-ink-900 dark:hover:text-white">
            همه‌ی بلیت‌های من
          </Link>
        </div>
      )}
    </Sheet>
  )
}

/** انتخاب روش پرداخت سانس یا کلاس */
export function PaySheet({
  open,
  onClose,
  title,
  desc,
  price,
  credit,
  balance,
  onPay,
  children,
  disabled,
  note,
  cta,
  uncovered,
}: {
  /** اگر عضویت این سطح را پوشش ندهد، دلیلش (پرداخت فقط از کیف پول) */
  uncovered?: string
  /** پیشوند دکمه‌ها (مثلاً «ماندن در صف») */
  cta?: string
  /** متن پایین برگه (پیش‌فرض: قانون لغو) */
  note?: string
  children?: ReactNode
  disabled?: boolean
  open: boolean
  onClose: () => void
  title: string
  desc: string
  price: number
  credit?: number
  balance: number
  onPay: (prefer: 'subscription' | 'wallet') => void
}) {
  const canSub = credit !== undefined && credit >= price && !uncovered
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <p className="text-sm leading-7 text-ink-500">{desc}</p>
        {children}
        {uncovered && <div className="rounded-2xl bg-gold-300/15 p-3 text-xs leading-6">{uncovered}</div>}
        <div className="flex items-baseline justify-between rounded-2xl bg-ink-900/[.04] p-4 dark:bg-white/[.05]">
          <span className="text-xs text-ink-500">مبلغ قابل پرداخت</span>
          <span className="font-display text-3xl">{toman(price)}</span>
        </div>
        <Button className="w-full" size="lg" disabled={!canSub || disabled} onClick={() => onPay('subscription')}>
          {cta ? `${cta} · ` : ''}پرداخت از اشتراک {credit !== undefined ? `(اعتبار: ${toman(credit)})` : '(اشتراک ندارید)'}
        </Button>
        <Button className="w-full" size="lg" variant="outline" disabled={balance < price || disabled} onClick={() => onPay('wallet')}>
          {cta ? `${cta} · ` : ''}پرداخت از کیف پول (موجودی: {toman(balance)})
        </Button>
        {!canSub && balance < price && (
          <Link to="/wallet">
            <Button variant="secondary" className="mt-1 w-full">
              شارژ کیف پول / خرید اشتراک
            </Button>
          </Link>
        )}
        <p className="text-center text-[12px] text-ink-400">{note ?? `لغو سانس آزاد تا قبل از ورود و لغو کلاس تا ${CLASS_CANCEL_HOURS.toLocaleString('fa-IR')} ساعت قبل، با بازگشت کامل وجه؛ دیرتر از آن، بخشی از مبلغ کسر می‌شود.`}</p>
      </div>
    </Sheet>
  )
}
