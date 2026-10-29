/**
 * بیمه‌ی ورزشی (با همکاری بیمه‌گر طرف قرارداد):
 * خرید بیمه‌نامه‌ی حادثه‌ی ورزشی، ثبت خسارت با مدارک، بررسی کارشناس و پرداخت خسارت به کیف پول.
 * حق بیمه به حساب بیمه‌گر (insurer) می‌رود و کی‌فیت کارمزد نمایندگی برمی‌دارد.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { ID, InsuranceClaim, InsurancePlan } from '../types'
import { applyPayment, notify, reversePayment } from './ledger'
import { toman } from '../format'

export const INSURER = 'insurer'
export const CLAIM_STATUS: Record<InsuranceClaim['status'], string> = { submitted: 'ثبت شد', reviewing: 'در حال بررسی', approved: 'تأیید شد', rejected: 'رد شد', paid: 'پرداخت شد' }

/** اعتبارسنجی کد ملی ایران */
export function validNationalId(code: string) {
  const c = String(code ?? '').replace(/\D/g, '')
  if (!/^\d{10}$/.test(c) || /^(\d)\1{9}$/.test(c)) return false
  const sum = [...c.slice(0, 9)].reduce((a, d, i) => a + Number(d) * (10 - i), 0) % 11
  const check = Number(c[9])
  return sum < 2 ? check === sum : check === 11 - sum
}

export function activePolicy(userId: ID, s: Pick<DBState, 'policies'> = db()) {
  return s.policies.find((p) => p.userId === userId && p.status === 'active' && new Date(p.endAt) > new Date())
}

/** مبلغ خسارت پرداخت‌شده/تأییدشده‌ی یک بیمه‌نامه (برای سقف تعهد) */
export function usedCover(policyId: ID, s: Pick<DBState, 'claims'> = db()) {
  return s.claims.filter((c) => c.policyId === policyId && (c.status === 'approved' || c.status === 'paid')).reduce((a, c) => a + (c.approvedAmount ?? 0), 0)
}

const policyNo = () => `KF-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`

export const buyPolicy = svc('insurance.buy', (planId: ID, nationalId: string) => {
  const me = currentUserId()
  const plan = db().insurancePlans.find((p) => p.id === planId && p.active)
  if (!plan) throw new AppError('پلن بیمه یافت نشد')
  if (!validNationalId(nationalId)) throw new AppError('کد ملی معتبر نیست')
  if (activePolicy(me)) throw new AppError('بیمه‌نامه‌ی فعال دارید؛ پس از پایان آن تمدید کنید')
  let id = ''
  mutate((d) => {
    id = uid('pol-')
    applyPayment(d, { type: 'insurance', from: me, to: INSURER, amount: plan.price, module: 'insurance', refId: id, description: `بیمه‌ی ورزشی ${plan.name} (${plan.provider})` })
    const start = new Date()
    d.policies.unshift({ id, userId: me, planId, number: policyNo(), nationalId: nationalId.replace(/\D/g, ''), startAt: start.toISOString(), endAt: new Date(start.getTime() + 365 * 86_400_000).toISOString(), status: 'active', createdAt: now() })
    notify(d, me, 'بیمه‌نامه صادر شد', `بیمه‌ی ورزشی ${plan.name} تا یک سال فعال است.`, '', '/insurance')
  })
  return id
})

/** انصراف تا ۱۴ روز پس از خرید و بدون خسارت، با بازگشت کامل حق بیمه */
export const cancelPolicy = svc('insurance.cancel', (policyId: ID) => {
  const me = currentUserId()
  mutate((d) => {
    const p = d.policies.find((x) => x.id === policyId && x.userId === me)
    if (!p || p.status !== 'active') throw new AppError('بیمه‌نامه‌ی فعال یافت نشد')
    if (Date.now() - new Date(p.startAt).getTime() > 14 * 86_400_000) throw new AppError('مهلت انصراف (۱۴ روز) تمام شده است')
    if (d.claims.some((c) => c.policyId === p.id)) throw new AppError('برای این بیمه‌نامه خسارت ثبت شده و قابل انصراف نیست')
    const tx = d.transactions.find((t) => t.type === 'insurance' && t.refId === p.id)
    if (tx) reversePayment(d, tx, 'بازگشت حق بیمه (انصراف)')
    p.status = 'cancelled'
  })
})

export const submitClaim = svc('insurance.claim', (input: { policyId: ID; incidentAt: string; sport: string; description: string; amount: number; documents: string[] }) => {
  const me = currentUserId()
  const p = db().policies.find((x) => x.id === input.policyId && x.userId === me)
  if (!p) throw new AppError('بیمه‌نامه یافت نشد')
  const plan = db().insurancePlans.find((x) => x.id === p.planId)!
  const at = new Date(input.incidentAt)
  if (isNaN(at.getTime()) || at > new Date()) throw new AppError('تاریخ حادثه معتبر نیست')
  const startDay = new Date(p.startAt); startDay.setHours(0, 0, 0, 0)
  if (at < startDay || at > new Date(p.endAt) || p.status === 'cancelled') throw new AppError('حادثه در دوره‌ی اعتبار بیمه‌نامه نیست')
  if (Date.now() - at.getTime() > 60 * 86_400_000) throw new AppError('مهلت اعلام خسارت (۶۰ روز پس از حادثه) گذشته است')
  if (String(input.description ?? '').trim().length < 20) throw new AppError('شرح حادثه را کامل‌تر بنویسید')
  if (!(input.amount > 0)) throw new AppError('مبلغ هزینه‌ها را وارد کنید')
  const left = plan.medicalCover - usedCover(p.id)
  if (input.amount > left) throw new AppError(`مبلغ درخواستی از سقف باقی‌مانده‌ی تعهد (${toman(left)}) بیشتر است`)
  const docs = (input.documents ?? []).filter((x) => typeof x === 'string').slice(0, 10)
  if (!docs.length) throw new AppError('تصویر مدارک (فاکتور درمان، گزارش پزشک) را بارگذاری کنید')
  mutate((d) => {
    d.claims.unshift({ id: uid('cl-'), policyId: p.id, userId: me, incidentAt: at.toISOString(), sport: String(input.sport ?? '').slice(0, 40), description: input.description.trim().slice(0, 1500), amount: Math.round(input.amount), documents: docs, status: 'submitted', createdAt: now(), updatedAt: now() })
    d.users.filter((u) => u.roles.includes('admin')).forEach((a) => notify(d, a.id, 'پرونده‌ی خسارت جدید', `${toman(input.amount)} — ${input.sport}`, '', '/panel/admin/insurance'))
  })
})

/** بررسی کارشناس (مدیر): تأیید با مبلغ (پس از کسر فرانشیز) یا رد */
export const reviewClaim = svc(
  'insurance.review',
  (claimId: ID, decision: 'reviewing' | 'approved' | 'rejected', approvedAmount?: number, note?: string) => {
    mutate((d) => {
      const c = d.claims.find((x) => x.id === claimId)
      if (!c) throw new AppError('پرونده یافت نشد')
      if (c.status === 'paid' || c.status === 'rejected') throw new AppError('این پرونده بسته شده است')
      const p = d.policies.find((x) => x.id === c.policyId)!
      const plan = d.insurancePlans.find((x) => x.id === p.planId)!
      if (decision === 'approved') {
        const max = Math.round((c.amount * (100 - plan.deductiblePct)) / 100)
        const amt = Math.round(approvedAmount ?? max)
        if (!(amt > 0) || amt > max) throw new AppError(`مبلغ قابل پرداخت حداکثر ${toman(max)} است (فرانشیز ${plan.deductiblePct}٪)`)
        if (amt > plan.medicalCover - usedCover(p.id, d)) throw new AppError('از سقف تعهد بیمه‌نامه بیشتر است')
        c.approvedAmount = amt
      }
      c.status = decision
      c.note = note?.slice(0, 500)
      c.updatedAt = now()
      notify(d, c.userId, `پرونده‌ی خسارت: ${CLAIM_STATUS[decision]}`, decision === 'approved' ? `${toman(c.approvedAmount!)} تأیید شد و به‌زودی به کیف پولتان واریز می‌شود.` : note ?? '', '', '/insurance')
    })
  },
  { roles: ['admin'] },
)

export const payClaim = svc(
  'insurance.pay',
  (claimId: ID) => {
    mutate((d) => {
      const c = d.claims.find((x) => x.id === claimId)
      if (!c || c.status !== 'approved' || !c.approvedAmount) throw new AppError('فقط پرونده‌های تأییدشده قابل پرداخت‌اند')
      d.wallets[INSURER] = (d.wallets[INSURER] ?? 0) - c.approvedAmount
      d.wallets[c.userId] = (d.wallets[c.userId] ?? 0) + c.approvedAmount
      d.transactions.unshift({ id: uid('tx-'), type: 'claim_payout', from: 'gateway', to: c.userId, amount: c.approvedAmount, commission: 0, module: 'insurance', refId: c.id, description: 'پرداخت خسارت بیمه‌ی ورزشی', createdAt: now() })
      c.status = 'paid'
      c.updatedAt = now()
      notify(d, c.userId, 'خسارت پرداخت شد', `${toman(c.approvedAmount)} به کیف پولتان واریز شد.`, '', '/wallet')
    })
  },
  { roles: ['admin'] },
)

const PLAN_FIELDS = ['name', 'provider', 'price', 'medicalCover', 'accidentCover', 'deductiblePct', 'sports', 'perks', 'active'] as const
export const saveInsurancePlan = svc(
  'insurance.savePlan',
  (input: Partial<InsurancePlan>) => {
    if (!input.name?.trim() || !(input.price! > 0)) throw new AppError('نام و حق بیمه الزامی است')
    if (input.deductiblePct !== undefined && (input.deductiblePct < 0 || input.deductiblePct > 50)) throw new AppError('فرانشیز باید بین ۰ تا ۵۰ درصد باشد')
    mutate((d) => {
      const ex = input.id ? d.insurancePlans.find((p) => p.id === input.id) : undefined
      const data: Partial<InsurancePlan> = {}
      for (const k of PLAN_FIELDS) if (k in input) (data as Record<string, unknown>)[k] = input[k]
      if (ex) Object.assign(ex, data)
      else d.insurancePlans.push({ provider: 'بیمه‌گر طرف قرارداد', medicalCover: 0, accidentCover: 0, deductiblePct: 10, sports: [], perks: [], active: true, ...data, id: uid('ins-') } as InsurancePlan)
    })
  },
  { roles: ['admin'] },
)
