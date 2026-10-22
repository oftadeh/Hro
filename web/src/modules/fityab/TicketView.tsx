/** نمایش بلیت ورود (QR + کد) و پرداخت سانس/کلاس */
import { Link } from 'react-router-dom'
import { Navigation, Undo2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { faDateTime, toman } from '@/core/format'
import { cancelTicket, CLASS_CANCEL_HOURS, ticketStatus } from '@/core/services/fityab'
import type { CheckIn, Gym } from '@/core/types'
import { Badge, Button, Sheet } from '@/ui/kit'
import { runOk } from '@/ui/toast'
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
  const lateCancel = !!ticket?.slotAt && new Date(ticket.slotAt).getTime() - Date.now() < CLASS_CANCEL_HOURS * 3_600_000
  return (
    <Sheet open={!!ticket} onClose={onClose} title={cls ? `بلیت کلاس ${cls.title}` : 'بلیت ورود'}>
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
            {cls && ticket.slotAt && <div>زمان کلاس: <b className="text-ink-900 dark:text-white">{faDateTime(ticket.slotAt)}</b> · مربی: {cls.coachName}</div>}
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
                disabled={lateCancel}
                onClick={async () => {
                  if (!confirm('بلیت لغو و مبلغ آن برگشت داده شود؟')) return
                  if (await runOk(() => cancelTicket(ticket.id), 'بلیت لغو شد و مبلغ برگشت داده شد')) onClose()
                }}
              >
                {lateCancel ? `لغو کلاس تا ${CLASS_CANCEL_HOURS} ساعت قبل از شروع ممکن است` : 'لغو و بازگشت وجه'}
              </Button>
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
}: {
  open: boolean
  onClose: () => void
  title: string
  desc: string
  price: number
  credit?: number
  balance: number
  onPay: (prefer: 'subscription' | 'wallet') => void
}) {
  const canSub = credit !== undefined && credit >= price
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <p className="text-sm leading-7 text-ink-500">{desc}</p>
        <div className="flex items-baseline justify-between rounded-2xl bg-ink-900/[.04] p-4 dark:bg-white/[.05]">
          <span className="text-xs text-ink-500">مبلغ قابل پرداخت</span>
          <span className="font-display text-3xl">{toman(price)}</span>
        </div>
        <Button className="w-full" size="lg" disabled={!canSub} onClick={() => onPay('subscription')}>
          پرداخت از اشتراک {credit !== undefined ? `(اعتبار: ${toman(credit)})` : '(اشتراک ندارید)'}
        </Button>
        <Button className="w-full" size="lg" variant="outline" disabled={balance < price} onClick={() => onPay('wallet')}>
          پرداخت از کیف پول (موجودی: {toman(balance)})
        </Button>
        {!canSub && balance < price && (
          <Link to="/wallet">
            <Button variant="secondary" className="mt-1 w-full">
              شارژ کیف پول / خرید اشتراک
            </Button>
          </Link>
        )}
        <p className="text-center text-[11px] text-ink-400">لغو سانس آزاد تا قبل از ورود و لغو کلاس تا {CLASS_CANCEL_HOURS} ساعت قبل، با بازگشت کامل وجه.</p>
      </div>
    </Sheet>
  )
}
