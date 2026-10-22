import { AppError, mutate, currentUserId, db } from '../db'
import { uid, now } from '../id'
import type { DoctorProfile } from '../types'
import { applyPayment, notify } from './ledger'
import { faDateTime } from '../format'

export function bookAppointment(doctorId: string, at: string, reason: string) {
  const me = currentUserId()
  const doc = db().doctors.find((x) => x.userId === doctorId)
  if (!doc) throw new AppError('پزشک یافت نشد')
  if (!doc.slots.includes(at)) throw new AppError('این نوبت دیگر آزاد نیست')
  if (reason.trim().length < 5) throw new AppError('علت مراجعه را بنویسید')
  mutate((d) => {
    const id = uid('ap-')
    applyPayment(d, { type: 'doctor_visit', from: me, to: doctorId, amount: doc.visitPrice, module: 'doctor', refId: id, description: 'ویزیت آنلاین پزشک' })
    const dd = d.doctors.find((x) => x.userId === doctorId)!
    dd.slots = dd.slots.filter((s) => s !== at)
    d.appointments.unshift({ id, userId: me, doctorId, at, price: doc.visitPrice, reason, status: 'booked', createdAt: now() })
    notify(d, doctorId, 'نوبت جدید 🩺', `نوبت ${faDateTime(at)} رزرو شد.`, '🩺', '/panel/doctor')
    notify(d, me, 'نوبت شما ثبت شد 🩺', `${faDateTime(at)} — از بخش پیام‌ها با پزشک در ارتباط باشید.`, '🩺', '/doctors')
    // ایجاد گفتگو برای ویزیت آنلاین
    if (!d.threads.find((t) => t.members.includes(me) && t.members.includes(doctorId))) {
      d.threads.unshift({ id: uid('t-'), members: [me, doctorId], context: 'doctor', updatedAt: now(), messages: [{ id: uid('m-'), from: me, text: `🩺 نوبت ویزیت: ${faDateTime(at)}\nعلت: ${reason}`, at: now(), kind: 'system' }] })
    }
  })
}

export function completeAppointment(id: string, prescription: string) {
  const me = currentUserId()
  mutate((d) => {
    const a = d.appointments.find((x) => x.id === id && x.doctorId === me)
    if (!a) throw new AppError('نوبت یافت نشد')
    a.status = 'done'
    a.prescription = prescription
    d.doctors.find((x) => x.userId === me)!.visits += 1
    notify(d, a.userId, 'نتیجه‌ی ویزیت آماده است 📋', 'توصیه‌های پزشک را در بخش پزشک ببینید.', '📋', '/doctors')
  })
}

export function saveDoctorProfile(input: Partial<DoctorProfile>) {
  const me = currentUserId()
  mutate((d) => {
    let doc = d.doctors.find((x) => x.userId === me)
    if (!doc) {
      doc = { userId: me, specialty: 'پزشک عمومی', medicalCode: '', bio: '', visitPrice: 200_000, rating: 5, visits: 0, slots: [], online: true }
      d.doctors.push(doc)
    }
    Object.assign(doc, input, { userId: me })
    doc.slots = [...new Set(doc.slots)].filter((s) => new Date(s) > new Date()).sort()
  })
}
