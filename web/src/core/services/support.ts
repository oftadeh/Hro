/** پشتیبانی: تیکت کاربران و کسب‌وکارها، پاسخ مدیر */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import { uid, now } from '../id'
import type { Ticket } from '../types'
import { notify } from './ledger'

export const TICKET_CATEGORY: Record<Ticket['category'], string> = { payment: 'پرداخت و کیف پول', gym: 'باشگاه و ورود', order: 'سفارش', account: 'حساب کاربری', other: 'سایر' }
export const TICKET_STATUS: Record<Ticket['status'], string> = { open: 'در انتظار پاسخ', answered: 'پاسخ داده شد', closed: 'بسته شد' }

export const createTicket = svc('support.create', (subject: string, category: Ticket['category'], text: string) => {
  const me = currentUserId()
  if (String(subject ?? '').trim().length < 3) throw new AppError('موضوع را بنویسید')
  if (String(text ?? '').trim().length < 10) throw new AppError('توضیحات را کامل‌تر بنویسید')
  if (db().tickets.filter((t) => t.userId === me && t.status === 'open').length >= 5) throw new AppError('تا پاسخ تیکت‌های قبلی، تیکت جدید ثبت نکنید')
  const id = uid('tk-')
  mutate((d) => {
    d.tickets.unshift({ id, userId: me, subject: subject.trim().slice(0, 100), category: category in TICKET_CATEGORY ? category : 'other', status: 'open', messages: [{ from: me, text: text.trim().slice(0, 2000), at: now() }], createdAt: now(), updatedAt: now() })
    d.users.filter((u) => u.roles.includes('admin')).forEach((a) => notify(d, a.id, 'تیکت جدید', subject.slice(0, 60), '', '/panel/admin/support'))
  })
  return id
})

export const replyTicket = svc('support.reply', (ticketId: string, text: string) => {
  const me = currentUserId()
  const isAdmin = db().users.find((u) => u.id === me)?.roles.includes('admin')
  const body = String(text ?? '').trim()
  if (!body) throw new AppError('متن پاسخ را بنویسید')
  mutate((d) => {
    const t = d.tickets.find((x) => x.id === ticketId)
    if (!t || (t.userId !== me && !isAdmin)) throw new AppError('تیکت یافت نشد')
    if (t.status === 'closed') throw new AppError('این تیکت بسته شده است')
    const staff = isAdmin && t.userId !== me
    t.messages.push({ from: me, text: body.slice(0, 2000), at: now(), staff })
    t.status = staff ? 'answered' : 'open'
    t.updatedAt = now()
    if (staff) notify(d, t.userId, 'پاسخ پشتیبانی', t.subject, '', `/support/${t.id}`)
  })
})

export const closeTicket = svc('support.close', (ticketId: string) => {
  const me = currentUserId()
  const isAdmin = db().users.find((u) => u.id === me)?.roles.includes('admin')
  mutate((d) => {
    const t = d.tickets.find((x) => x.id === ticketId)
    if (!t || (t.userId !== me && !isAdmin)) throw new AppError('تیکت یافت نشد')
    t.status = 'closed'
    t.updatedAt = now()
  })
})
