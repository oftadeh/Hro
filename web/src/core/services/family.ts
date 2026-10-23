/**
 * حساب خانوادگی: والد اعضای خانواده (به‌ویژه فرزندان) را بدون حساب جداگانه ثبت می‌کند
 * و برایشان کلاس کودکان رزرو می‌کند. بلیت با حساب والد صادر می‌شود و نام فرزند روی آن است.
 */
import { AppError, mutate, currentUserId, svc } from '../store'
import { uid } from '../id'
import type { FamilyMember, GymClass } from '../types'

export const FAMILY_MAX = 6
export const RELATION_LABEL: Record<FamilyMember['relation'], string> = { child: 'فرزند', spouse: 'همسر', parent: 'والد', other: 'سایر' }

/** سن تقریبی بر اساس سال تولد شمسی */
export function ageOf(birthYear: number, at = new Date()) {
  const jy = Number(new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric' }).format(at).replace(/\D/g, ''))
  return jy - birthYear
}

/** آیا عضو خانواده می‌تواند در این کلاس شرکت کند؟ (پیام خطا یا null) */
export function classEligibility(c: GymClass, member?: Pick<FamilyMember, 'birthYear'>): string | null {
  if (c.audience !== 'kids') return member && ageOf(member.birthYear) < 15 ? 'این کلاس برای بزرگسالان است' : null
  if (!member) return 'این کلاس ویژه‌ی کودکان است؛ فرزندتان را انتخاب کنید'
  const age = ageOf(member.birthYear)
  if (c.ageMin && age < c.ageMin) return `حداقل سن این کلاس ${c.ageMin} سال است`
  if (c.ageMax && age > c.ageMax) return `حداکثر سن این کلاس ${c.ageMax} سال است`
  return null
}

export const saveFamilyMember = svc('family.save', (input: Omit<FamilyMember, 'id'> & { id?: string }) => {
  const me = currentUserId()
  const name = String(input.name ?? '').trim()
  if (name.length < 2) throw new AppError('نام را وارد کنید')
  if (!(input.relation in RELATION_LABEL)) throw new AppError('نسبت معتبر نیست')
  if (!['male', 'female'].includes(input.gender)) throw new AppError('جنسیت را انتخاب کنید')
  const age = ageOf(Number(input.birthYear))
  if (!(age >= 0 && age <= 110)) throw new AppError('سال تولد معتبر نیست (شمسی، مثلاً ۱۳۹۵)')
  let id = input.id
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    const list = (u.family ??= [])
    const m: FamilyMember = { id: id || uid('fm-'), name: name.slice(0, 40), relation: input.relation, birthYear: Number(input.birthYear), gender: input.gender, notes: input.notes?.slice(0, 200) || undefined }
    const i = id ? list.findIndex((x) => x.id === id) : -1
    if (id && i < 0) throw new AppError('عضو یافت نشد')
    if (i >= 0) list[i] = m
    else {
      if (list.length >= FAMILY_MAX) throw new AppError(`حداکثر ${FAMILY_MAX} عضو خانواده`)
      list.push(m)
    }
    id = m.id
  })
  return id!
})

export const removeFamilyMember = svc('family.remove', (id: string) => {
  const me = currentUserId()
  mutate((d) => {
    const u = d.users.find((x) => x.id === me)!
    u.family = (u.family ?? []).filter((m) => m.id !== id)
  })
})
