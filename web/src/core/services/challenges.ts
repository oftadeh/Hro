/**
 * چالش‌ها با امتیاز قابل اعتماد:
 *  - verification = 'auto': امتیاز فقط از داده‌های تأییدشده‌ی اپ (ورود اسکن‌شده در باشگاه، تمرین ثبت‌شده) می‌آید.
 *  - verification = 'proof': هر ثبت دستی نیاز به عکس مدرک دارد و تا تأیید سازنده/مدیر «در انتظار» است.
 *  - verification = 'none': فقط برای چالش‌های بدون جایزه‌ی نقدی.
 * برای هر معیار سقف روزانه‌ی منطقی وجود دارد تا ثبت‌های غیرواقعی رد شوند.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { Challenge, ChallengeLog, ChallengeMetric, ID } from '../types'
import { applyPayment, notify } from './ledger'
import { addXP } from './engagement'
import { consumeFree } from './perks'
import { toman, num } from '../format'
import { GRADIENTS } from '../config'

export type NewChallenge = Pick<
  Challenge,
  'title' | 'description' | 'metric' | 'unit' | 'goal' | 'entryFee' | 'sponsorPrize' | 'extraReward' | 'prizes' | 'xpReward' | 'gradient' | 'emoji' | 'maxParticipants'
> & { days: number; verification?: Challenge['verification']; orgId?: ID; teamId?: ID }

/** سقف ثبت روزانه برای هر معیار */
export const DAILY_CAP: Record<ChallengeMetric, number> = { steps: 60_000, workouts: 3, minutes: 300, km: 60, weight_loss: 2, custom: 1_000_000 }
export const VERIFICATION_LABEL: Record<NonNullable<Challenge['verification']>, string> = {
  auto: 'خودکار از ورود به باشگاه، تمرین ثبت‌شده و ساعت هوشمند',
  proof: 'ثبت با عکس مدرک و تأیید سازنده',
  none: 'ثبت آزاد (بدون جایزه‌ی نقدی)',
}

const hasCash = (c: Pick<Challenge, 'entryFee' | 'sponsorPrize' | 'pool'>) => c.entryFee > 0 || c.sponsorPrize > 0 || c.pool > 0

export const verificationOf = (c: Challenge): NonNullable<Challenge['verification']> => c.verification ?? (hasCash(c) ? 'proof' : 'none')

/** امتیاز معتبر شرکت‌کننده = مجموع ثبت‌های تأییدشده */
const okScore = (logs: ChallengeLog[]) => Math.round(logs.filter((l) => (l.status ?? 'ok') === 'ok').reduce((a, l) => a + l.value, 0) * 100) / 100

function recompute(d: DBState, c: Challenge, userId: ID) {
  const p = c.participants.find((x) => x.userId === userId)
  if (!p) return
  const before = p.score
  p.score = okScore(p.logs)
  if (before < c.goal && p.score >= c.goal) {
    addXP(d, userId, c.xpReward)
    notify(d, userId, 'هدف چالش رو زدی!', `${num(c.xpReward)} امتیاز تجربه گرفتی.`, '', `/challenges/${c.id}`)
  }
}

/** ایجاد چالش: هزینه‌ی ایجاد به کی‌فیت و جایزه‌ی اسپانسر به صندوق امانی می‌رود */
export const createChallenge = svc('challenge.create', (input: NewChallenge) => {
  const me = currentUserId()
  const title = String(input.title ?? '').trim()
  if (title.length < 4) throw new AppError('عنوان چالش را کامل بنویسید')
  if (!(input.goal > 0)) throw new AppError('هدف چالش را مشخص کنید')
  if (!(input.days >= 1 && input.days <= 90)) throw new AppError('مدت چالش باید بین ۱ تا ۹۰ روز باشد')
  if (!(input.maxParticipants >= 2 && input.maxParticipants <= 10_000)) throw new AppError('ظرفیت چالش معتبر نیست')
  if (input.entryFee < 0 || input.sponsorPrize < 0) throw new AppError('مبالغ معتبر نیست')
  const prizes = (input.prizes ?? []).slice(0, 10).map((p, i) => ({ rank: i + 1, title: String(p.title || `نفر ${i + 1}`), percent: Math.max(0, Math.round(p.percent)) }))
  const totalPct = prizes.reduce((a, p) => a + p.percent, 0)
  if (prizes.length && totalPct !== 100) throw new AppError('جمع درصد جوایز باید ۱۰۰ باشد')
  const cash = input.entryFee > 0 || input.sponsorPrize > 0
  let verification = input.verification ?? (cash ? 'proof' : 'none')
  if (cash && verification === 'none') throw new AppError('چالش‌های جایزه‌دار باید روش تأیید امتیاز داشته باشند')
  if (verification === 'auto' && !['workouts', 'minutes', 'steps'].includes(input.metric)) verification = 'proof'
  if (input.orgId) {
    const org = db().orgs.find((o) => o.id === input.orgId)
    if (!org || org.adminId !== me) throw new AppError('فقط مدیر سازمان می‌تواند چالش سازمانی بسازد')
  }
  if (input.teamId) {
    const team = db().teams.find((t) => t.id === input.teamId)
    if (!team || !team.members.includes(me)) throw new AppError('فقط اعضای تیم می‌توانند چالش تیمی بسازند')
  }
  // چالش‌های تیمی بدون جایزه‌ی نقدی رایگان‌اند
  const fee = input.teamId && !cash ? 0 : db().settings.challengeCreationFee
  let id = ''
  mutate((d) => {
    id = uid('ch-')
    if (fee > 0) applyPayment(d, { type: 'challenge_create', from: me, to: 'platform', amount: fee, module: 'challenge', refId: id, description: `هزینه‌ی ایجاد چالش «${title}»` })
    if (input.sponsorPrize > 0)
      applyPayment(d, { type: 'challenge_entry', from: me, to: 'escrow', amount: input.sponsorPrize, commissionPct: 0, refId: id, description: `جایزه‌ی نقدی چالش «${title}»` })
    const start = new Date()
    d.challenges.unshift({
      id, creatorId: me, title, description: String(input.description ?? '').slice(0, 1000), metric: input.metric, unit: String(input.unit ?? ''), goal: input.goal,
      entryFee: Math.round(input.entryFee), sponsorPrize: Math.round(input.sponsorPrize), extraReward: String(input.extraReward ?? '').slice(0, 120), prizes,
      xpReward: Math.min(1000, Math.max(0, Math.round(input.xpReward || 0))), gradient: GRADIENTS.includes(input.gradient) ? input.gradient : GRADIENTS[0], emoji: '',
      maxParticipants: Math.round(input.maxParticipants), verification, orgId: input.orgId, teamId: input.teamId,
      creationFee: fee, pool: Math.round(input.sponsorPrize), participants: [], status: 'active',
      startAt: start.toISOString(), endAt: new Date(start.getTime() + input.days * 86_400_000).toISOString(), createdAt: now(),
    })
    addXP(d, me, 80)
    if (input.teamId) {
      const t = d.teams.find((x) => x.id === input.teamId)!
      t.members.filter((m) => m !== me).forEach((m) => notify(d, m, `چالش تیمی ${t.name}`, `«${title}» شروع شد؛ بپیوند!`, '', `/challenges/${id}`))
    }
  })
  return id
})

/** ورود به چالش: ورودی پس از کسر کمیسیون به صندوق جایزه اضافه می‌شود */
export const joinChallenge = svc('challenge.join', (challengeId: string) => {
  const me = currentUserId()
  const ch = db().challenges.find((c) => c.id === challengeId)
  if (!ch || ch.status !== 'active' || new Date(ch.endAt) < new Date()) throw new AppError('چالش فعال نیست')
  if (ch.participants.some((p) => p.userId === me)) throw new AppError('قبلاً در این چالش شرکت کرده‌اید')
  if (ch.participants.length >= ch.maxParticipants) throw new AppError('ظرفیت چالش تکمیل است')
  if (ch.orgId && db().users.find((u) => u.id === me)?.orgId !== ch.orgId) throw new AppError('این چالش مخصوص اعضای سازمان است')
  if (ch.teamId && !db().teams.find((t) => t.id === ch.teamId)?.members.includes(me)) throw new AppError('این چالش مخصوص اعضای تیم است')
  mutate((d) => {
    const c = d.challenges.find((x) => x.id === challengeId)!
    if (c.entryFee > 0) {
      const free = consumeFree(d, me, 'challenge')
      const tx = applyPayment(d, { type: 'challenge_entry', from: me, to: 'escrow', amount: c.entryFee, module: 'challenge', refId: c.id, discountPct: free ? 100 : 0, description: free ? `ورود رایگان (اشتراک) به چالش «${c.title}»` : `ورودی چالش «${c.title}»` })
      c.pool += c.entryFee - tx.commission
    }
    c.participants.push({ userId: me, score: 0, joinedAt: now(), logs: [] })
    addXP(d, me, 20)
    const u = d.users.find((x) => x.id === me)!
    notify(d, c.creatorId, 'شرکت‌کننده‌ی جدید', `${u.name} به «${c.title}» پیوست.`, '', `/challenges/${c.id}`)
  })
})

const todayTotal = (logs: ChallengeLog[]) => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return logs.filter((l) => new Date(l.at) >= start && (l.status ?? 'ok') !== 'rejected').reduce((a, l) => a + l.value, 0)
}

/** ثبت دستی پیشرفت */
export const logChallengeProgress = svc('challenge.log', (challengeId: string, value: number, note?: string, proof?: string) => {
  const me = currentUserId()
  if (!(value > 0) || !isFinite(value)) throw new AppError('مقدار معتبر وارد کنید')
  mutate((d) => {
    const c = d.challenges.find((x) => x.id === challengeId)
    const p = c?.participants.find((x) => x.userId === me)
    if (!c || !p) throw new AppError('ابتدا در چالش شرکت کنید')
    if (c.status !== 'active' || new Date(c.endAt) < new Date()) throw new AppError('زمان چالش تمام شده است')
    const mode = verificationOf(c)
    if (mode === 'auto') throw new AppError('امتیاز این چالش خودکار از ورود به باشگاه و تمرین‌های ثبت‌شده محاسبه می‌شود')
    if (mode === 'proof' && !proof) throw new AppError('برای این چالش جایزه‌دار، عکس مدرک (مثلاً اسکرین‌شات قدم‌شمار) لازم است')
    const cap = DAILY_CAP[c.metric]
    if (todayTotal(p.logs) + value > cap) throw new AppError(`سقف ثبت روزانه برای این چالش ${num(cap)} ${c.unit} است`)
    p.logs.push({ id: uid('l-'), at: now(), value, note: note?.slice(0, 200), proof, source: 'manual', status: mode === 'proof' ? 'pending' : 'ok' })
    addXP(d, me, 5)
    if (mode === 'proof') {
      const u = d.users.find((x) => x.id === me)!
      notify(d, c.creatorId, 'ثبت جدید در انتظار تأیید', `${u.name}: ${num(value)} ${c.unit} در «${c.title}»`, '', `/challenges/${c.id}?tab=review`)
    } else recompute(d, c, me)
  })
})

/** تأیید یا رد ثبت‌های مدرک‌دار توسط سازنده یا مدیر */
export const reviewChallengeLog = svc('challenge.reviewLog', (challengeId: string, userId: ID, logId: string, approve: boolean) => {
  const me = currentUserId()
  const isAdmin = db().users.find((u) => u.id === me)?.roles.includes('admin')
  mutate((d) => {
    const c = d.challenges.find((x) => x.id === challengeId)
    if (!c) throw new AppError('چالش یافت نشد')
    if (c.creatorId !== me && !isAdmin) throw new AppError('فقط سازنده یا مدیر می‌تواند ثبت‌ها را بررسی کند')
    if (userId === me && !isAdmin) throw new AppError('ثبت‌های خودتان را نمی‌توانید تأیید کنید')
    const p = c.participants.find((x) => x.userId === userId)
    const l = p?.logs.find((x) => x.id === logId)
    if (!p || !l) throw new AppError('ثبت یافت نشد')
    l.status = approve ? 'ok' : 'rejected'
    recompute(d, c, userId)
    notify(d, userId, approve ? 'ثبت چالش تأیید شد' : 'ثبت چالش رد شد', `${num(l.value)} ${c.unit} در «${c.title}»`, '', `/challenges/${c.id}`)
  })
})

/**
 * پیشرفت خودکار از داده‌های تأییدشده‌ی اپ (داخل mutate صدا زده می‌شود).
 * workouts: هر ورود اسکن‌شده یا تمرین ثبت‌شده = ۱؛ minutes: مدت تمرین ثبت‌شده.
 */
export function autoProgress(d: DBState, userId: ID, metric: ChallengeMetric, value: number, source: 'checkin' | 'workout' | 'device') {
  const at = new Date()
  for (const c of d.challenges) {
    if (c.status !== 'active' || new Date(c.endAt) < at || c.metric !== metric) continue
    const p = c.participants.find((x) => x.userId === userId)
    if (!p) continue
    const cap = DAILY_CAP[metric]
    const v = Math.min(value, Math.max(0, cap - todayTotal(p.logs)))
    if (v <= 0) continue
    p.logs.push({ id: uid('l-'), at: now(), value: v, source, status: 'ok', note: source === 'checkin' ? 'ورود تأییدشده به باشگاه' : source === 'device' ? 'قدم‌شمار ساعت/گوشی' : 'تمرین ثبت‌شده' })
    recompute(d, c, userId)
  }
}

export function rankings(c: Challenge) {
  return [...c.participants].sort((a, b) => b.score - a.score)
}

export const pendingLogs = (c: Challenge) =>
  c.participants.flatMap((p) => p.logs.filter((l) => l.status === 'pending').map((l) => ({ userId: p.userId, log: l })))

/** پایان چالش و تقسیم صندوق جایزه بین برندگان */
export const settleChallenge = svc('challenge.settle', (challengeId: string, force = false) => {
  const me = currentUserId()
  const isAdmin = db().users.find((u) => u.id === me)?.roles.includes('admin')
  mutate((d) => {
    const c = d.challenges.find((x) => x.id === challengeId)
    if (!c || c.status !== 'active') throw new AppError('چالش فعال نیست')
    if (c.creatorId !== me && !isAdmin) throw new AppError('فقط سازنده یا مدیر می‌تواند چالش را ببندد')
    if (force && !isAdmin) throw new AppError('بستن زودهنگام فقط توسط مدیر امکان‌پذیر است')
    if (!force && new Date(c.endAt) > new Date()) throw new AppError('هنوز زمان چالش تمام نشده است')
    if (pendingLogs(c).length) throw new AppError('ابتدا ثبت‌های در انتظار تأیید را بررسی کنید')
    const ranked = rankings(c).filter((p) => p.score > 0)
    c.winners = []
    let distributed = 0
    for (const prize of [...c.prizes].sort((a, b) => a.rank - b.rank)) {
      const w = ranked[prize.rank - 1]
      if (!w) continue
      const amount = Math.floor((c.pool * prize.percent) / 100)
      if (amount > 0) {
        d.wallets.escrow -= amount
        d.wallets[w.userId] = (d.wallets[w.userId] ?? 0) + amount
        d.transactions.unshift({ id: uid('tx-'), type: 'challenge_prize', from: 'escrow', to: w.userId, amount, commission: 0, module: 'challenge', refId: c.id, description: `جایزه‌ی ${prize.title} چالش «${c.title}»`, createdAt: now() })
      }
      distributed += amount
      c.winners.push({ userId: w.userId, rank: prize.rank, amount })
      addXP(d, w.userId, 100 * (4 - Math.min(prize.rank, 3)))
      notify(d, w.userId, `تبریک! ${prize.title} شدی`, `${toman(amount)} جایزه به کیف پولت واریز شد.${c.extraReward && prize.rank === 1 ? ` + ${c.extraReward}` : ''}`, '', `/challenges/${c.id}`)
    }
    // باقی‌مانده‌ی صندوق (اگر برنده‌ای برای رتبه‌ای نبود) به سازنده برمی‌گردد
    const rest = c.pool - distributed
    if (rest > 0) {
      d.wallets.escrow -= rest
      d.wallets[c.creatorId] = (d.wallets[c.creatorId] ?? 0) + rest
      d.transactions.unshift({ id: uid('tx-'), type: 'refund', from: 'escrow', to: c.creatorId, amount: rest, commission: 0, module: 'challenge', refId: c.id, description: `بازگشت باقی‌مانده‌ی صندوق چالش «${c.title}»`, createdAt: now() })
    }
    c.status = 'finished'
  })
})
