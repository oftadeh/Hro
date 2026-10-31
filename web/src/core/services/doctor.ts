import { AppError, mutate, currentUserId, db, svc } from '../store'
import { uid, now } from '../id'
import type { CareKind, DoctorProfile } from '../types'
import { CARE_KINDS } from '../config'
import { applyPayment, notify, reversePayment } from './ledger'
import { faDateTime } from '../format'
import { consumeFree, discountPct } from './perks'
import { callLink } from './fityar'

export const careKind = (d: Pick<DoctorProfile, 'kind'>): CareKind => d.kind ?? 'doctor'
/** حالت‌های مجاز ارائه‌ی خدمت؛ ماساژ فقط حضوری است */
export const careModes = (d: Pick<DoctorProfile, 'kind' | 'mode'>): ('online' | 'inperson')[] => {
  if (careKind(d) === 'massage') return ['inperson']
  const m = d.mode ?? 'online'
  return m === 'both' ? ['online', 'inperson'] : [m]
}

export const bookAppointment = svc('doctor.book', (doctorId: string, at: string, reason: string, mode?: 'online' | 'inperson') => {
  const me = currentUserId()
  const doc = db().doctors.find((x) => x.userId === doctorId)
  if (!doc) throw new AppError('ارائه‌دهنده یافت نشد')
  const label = CARE_KINDS[careKind(doc)].label
  if (!doc.verified) throw new AppError(`مدارک این ${label} هنوز تأیید نشده است`)
  const modes = careModes(doc)
  const m = mode && modes.includes(mode) ? mode : modes[0]
  if (mode && !modes.includes(mode)) throw new AppError(mode === 'online' ? 'این خدمت فقط حضوری ارائه می‌شود' : 'این خدمت فقط آنلاین ارائه می‌شود')
  if (doctorId === me) throw new AppError('نمی‌توانید برای خودتان نوبت بگیرید')
  if (!doc.slots.includes(at)) throw new AppError('این نوبت دیگر آزاد نیست')
  if (String(reason ?? '').trim().length < 5) throw new AppError('علت مراجعه را بنویسید')
  mutate((d) => {
    const id = uid('ap-')
    const free = consumeFree(d, me, 'doctor')
    applyPayment(d, { type: 'doctor_visit', from: me, to: doctorId, amount: doc.visitPrice, module: 'doctor', refId: id, discountPct: free ? 100 : discountPct(me, 'doctor', d), description: `${free ? 'رایگان با اشتراک — ' : ''}نوبت ${label} (${m === 'online' ? 'آنلاین' : 'حضوری'})` })
    const dd = d.doctors.find((x) => x.userId === doctorId)!
    dd.slots = dd.slots.filter((s) => s !== at)
    const link = m === 'online' ? callLink(id) : undefined
    d.appointments.unshift({ id, userId: me, doctorId, at, price: doc.visitPrice, reason: reason.slice(0, 500), status: 'booked', callLink: link, mode: m, createdAt: now() })
    notify(d, doctorId, 'نوبت جدید', `نوبت ${m === 'online' ? 'آنلاین' : 'حضوری'} ${faDateTime(at)} رزرو شد.`, '', '/panel/doctor')
    notify(d, me, 'نوبت شما ثبت شد', m === 'online' ? `${faDateTime(at)} — در زمان نوبت از «پرونده‌ی پزشکی» وارد جلسه‌ی تصویری شوید.` : `${faDateTime(at)} — نشانی: ${doc.address || 'در پروفایل ارائه‌دهنده'}`, '', '/medical')
    let t = d.threads.find((x) => x.members.includes(me) && x.members.includes(doctorId))
    if (!t) {
      t = { id: uid('t-'), members: [me, doctorId], context: 'doctor', updatedAt: now(), messages: [] }
      d.threads.unshift(t)
    }
    t.messages.push({ id: uid('m-'), from: me, text: `نوبت ${m === 'online' ? 'آنلاین' : 'حضوری'}: ${faDateTime(at)}\nعلت: ${reason}`, at: now(), kind: link ? 'call' : 'text', link })
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

const DOCTOR_FIELDS = ['specialty', 'medicalCode', 'bio', 'visitPrice', 'slots', 'online', 'kind', 'mode', 'address'] as const

export const saveDoctorProfile = svc(
  'doctor.saveProfile',
  (input: Partial<DoctorProfile>) => {
    const me = currentUserId()
    if (input.visitPrice !== undefined && !(input.visitPrice === 0 || (input.visitPrice >= 10_000 && input.visitPrice <= 50_000_000))) throw new AppError('هزینه‌ی ویزیت معتبر نیست (رایگان یا حداقل ۱۰ هزار تومان)')
    if (input.medicalCode !== undefined && String(input.medicalCode).trim().length < 4) throw new AppError('کد نظام یا شماره‌ی مجوز را کامل وارد کنید')
    if (input.specialty !== undefined && String(input.specialty).trim().length < 3) throw new AppError('تخصص را بنویسید')
    if (input.bio !== undefined && String(input.bio).trim().length < 20) throw new AppError('درباره‌ی خودتان حداقل ۲۰ حرف بنویسید')
    if (input.slots !== undefined && input.slots.length > 200) throw new AppError('تعداد نوبت‌ها بیش از حد است')
    if (input.kind !== undefined && !(input.kind in CARE_KINDS)) throw new AppError('نوع خدمت معتبر نیست')
    if (input.mode !== undefined && !['online', 'inperson', 'both'].includes(input.mode)) throw new AppError('نحوه‌ی ارائه‌ی خدمت معتبر نیست')
    if (input.address !== undefined) input.address = String(input.address).slice(0, 200)
    mutate((d) => {
      let doc = d.doctors.find((x) => x.userId === me)
      if (!doc) {
        doc = { userId: me, specialty: 'پزشک عمومی', medicalCode: '', bio: '', visitPrice: 200_000, rating: 5, visits: 0, slots: [], online: true, verified: false }
        d.doctors.push(doc)
      }
      const codeBefore = doc.medicalCode
      const kindBefore = careKind(doc)
      for (const k of DOCTOR_FIELDS) if (k in input) (doc as unknown as Record<string, unknown>)[k] = input[k]
      if (careKind(doc) === 'massage') doc.mode = 'inperson'
      if (careModes(doc).includes('inperson') && !doc.address?.trim()) throw new AppError('برای خدمات حضوری نشانی را وارد کنید')
      // تغییر نوع خدمت نیاز به بررسی دوباره‌ی مدارک دارد
      if (careKind(doc) !== kindBefore) doc.verified = false
      doc.slots = [...new Set(doc.slots)].filter((s) => new Date(s) > new Date()).sort()
      if (doc.medicalCode !== codeBefore || careKind(doc) !== kindBefore) {
        doc.verified = false
        const meta = CARE_KINDS[careKind(doc)]
        d.users.filter((u) => u.roles.includes('admin')).forEach((a) => notify(d, a.id, `استعلام مدارک ${meta.label}`, `${meta.license} ${doc!.medicalCode} برای بررسی ثبت شد.`, '', '/panel/admin/approvals'))
      }
    })
  },
  { roles: ['doctor'] },
)
