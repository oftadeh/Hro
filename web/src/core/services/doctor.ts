import { AppError, mutate, currentUserId, db, svc } from '../store'
import { uid, now } from '../id'
import type { DoctorProfile } from '../types'
import { applyPayment, notify, reversePayment } from './ledger'
import { faDateTime } from '../format'
import { consumeFree, discountPct } from './perks'
import { callLink } from './fityar'

export const bookAppointment = svc('doctor.book', (doctorId: string, at: string, reason: string) => {
  const me = currentUserId()
  const doc = db().doctors.find((x) => x.userId === doctorId)
  if (!doc) throw new AppError('پزشک یافت نشد')
  if (!doc.verified) throw new AppError('پروانه‌ی این پزشک هنوز تأیید نشده است')
  if (doctorId === me) throw new AppError('نمی‌توانید برای خودتان نوبت بگیرید')
  if (!doc.slots.includes(at)) throw new AppError('این نوبت دیگر آزاد نیست')
  if (String(reason ?? '').trim().length < 5) throw new AppError('علت مراجعه را بنویسید')
  mutate((d) => {
    const id = uid('ap-')
    const free = consumeFree(d, me, 'doctor')
    applyPayment(d, { type: 'doctor_visit', from: me, to: doctorId, amount: doc.visitPrice, module: 'doctor', refId: id, discountPct: free ? 100 : discountPct(me, 'doctor', d), description: free ? 'ویزیت پزشک (رایگان با اشتراک)' : 'ویزیت آنلاین پزشک' })
    const dd = d.doctors.find((x) => x.userId === doctorId)!
    dd.slots = dd.slots.filter((s) => s !== at)
    const link = callLink(id)
    d.appointments.unshift({ id, userId: me, doctorId, at, price: doc.visitPrice, reason: reason.slice(0, 500), status: 'booked', callLink: link, createdAt: now() })
    notify(d, doctorId, 'نوبت جدید', `نوبت ${faDateTime(at)} رزرو شد.`, '', '/panel/doctor')
    notify(d, me, 'نوبت شما ثبت شد', `${faDateTime(at)} — در زمان نوبت از «پرونده‌ی پزشکی» وارد ویزیت تصویری شوید.`, '', '/medical')
    let t = d.threads.find((x) => x.members.includes(me) && x.members.includes(doctorId))
    if (!t) {
      t = { id: uid('t-'), members: [me, doctorId], context: 'doctor', updatedAt: now(), messages: [] }
      d.threads.unshift(t)
    }
    t.messages.push({ id: uid('m-'), from: me, text: `نوبت ویزیت: ${faDateTime(at)}\nعلت: ${reason}`, at: now(), kind: 'call', link })
    t.updatedAt = now()
  })
})

/** لغو نوبت توسط بیمار تا ۶ ساعت قبل، یا توسط پزشک در هر زمان (با بازگشت وجه) */
export const cancelAppointment = svc('doctor.cancel', (id: string) => {
  const me = currentUserId()
  mutate((d) => {
    const a = d.appointments.find((x) => x.id === id)
    if (!a || (a.userId !== me && a.doctorId !== me)) throw new AppError('نوبت یافت نشد')
    if (a.status !== 'booked') throw new AppError('این نوبت قابل لغو نیست')
    if (a.userId === me && new Date(a.at).getTime() - Date.now() < 6 * 3_600_000) throw new AppError('لغو نوبت تا ۶ ساعت قبل از زمان ویزیت امکان‌پذیر است')
    const tx = d.transactions.find((t) => t.type === 'doctor_visit' && t.refId === a.id)
    if (tx) reversePayment(d, tx, 'بازگشت وجه نوبت لغوشده')
    a.status = 'cancelled'
    const doc = d.doctors.find((x) => x.userId === a.doctorId)
    if (doc && new Date(a.at) > new Date()) doc.slots = [...new Set([...doc.slots, a.at])].sort()
    notify(d, a.userId === me ? a.doctorId : a.userId, 'نوبت لغو شد', `نوبت ${faDateTime(a.at)} لغو شد.`, '', a.userId === me ? '/panel/doctor' : '/medical')
  })
})

export const completeAppointment = svc(
  'doctor.complete',
  (id: string, prescription: string) => {
    const me = currentUserId()
    mutate((d) => {
      const a = d.appointments.find((x) => x.id === id && x.doctorId === me)
      if (!a) throw new AppError('نوبت یافت نشد')
      if (a.status !== 'booked') throw new AppError('این نوبت قبلاً بسته شده است')
      a.status = 'done'
      a.prescription = String(prescription ?? '').slice(0, 4000)
      d.doctors.find((x) => x.userId === me)!.visits += 1
      notify(d, a.userId, 'نتیجه‌ی ویزیت آماده است', 'نسخه و توصیه‌های پزشک در پرونده‌ی پزشکی شما ثبت شد.', '', '/medical')
    })
  },
  { roles: ['doctor'] },
)

const DOCTOR_FIELDS = ['specialty', 'medicalCode', 'bio', 'visitPrice', 'slots', 'online'] as const

export const saveDoctorProfile = svc(
  'doctor.saveProfile',
  (input: Partial<DoctorProfile>) => {
    const me = currentUserId()
    if (input.visitPrice !== undefined && input.visitPrice < 0) throw new AppError('هزینه‌ی ویزیت معتبر نیست')
    mutate((d) => {
      let doc = d.doctors.find((x) => x.userId === me)
      if (!doc) {
        doc = { userId: me, specialty: 'پزشک عمومی', medicalCode: '', bio: '', visitPrice: 200_000, rating: 5, visits: 0, slots: [], online: true, verified: false }
        d.doctors.push(doc)
      }
      const codeBefore = doc.medicalCode
      for (const k of DOCTOR_FIELDS) if (k in input) (doc as unknown as Record<string, unknown>)[k] = input[k]
      doc.slots = [...new Set(doc.slots)].filter((s) => new Date(s) > new Date()).sort()
      if (doc.medicalCode !== codeBefore) {
        doc.verified = false
        d.users.filter((u) => u.roles.includes('admin')).forEach((a) => notify(d, a.id, 'استعلام پروانه‌ی پزشک', `کد نظام پزشکی ${doc!.medicalCode} برای بررسی ثبت شد.`, '', '/panel/admin/approvals'))
      }
    })
  },
  { roles: ['doctor'] },
)
