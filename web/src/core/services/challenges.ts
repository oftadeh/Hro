import { AppError, mutate, currentUserId, db } from '../db'
import { uid, now } from '../id'
import type { Challenge } from '../types'
import { applyPayment, notify } from './ledger'
import { addXP } from './engagement'
import { consumeFree } from './perks'
import { toman } from '../format'

export type NewChallenge = Pick<
  Challenge,
  'title' | 'description' | 'metric' | 'unit' | 'goal' | 'entryFee' | 'sponsorPrize' | 'extraReward' | 'prizes' | 'xpReward' | 'gradient' | 'emoji' | 'maxParticipants'
> & { days: number }

/** ایجاد چالش: هزینه‌ی ایجاد به کی‌فیت و جایزه‌ی اسپانسر به صندوق امانی می‌رود */
export function createChallenge(input: NewChallenge) {
  const me = currentUserId()
  if (input.title.trim().length < 4) throw new AppError('عنوان چالش را کامل بنویسید')
  if (input.goal <= 0) throw new AppError('هدف چالش را مشخص کنید')
  const totalPct = input.prizes.reduce((a, p) => a + p.percent, 0)
  if (input.prizes.length && totalPct !== 100) throw new AppError('جمع درصد جوایز باید ۱۰۰ باشد')
  const fee = db().settings.challengeCreationFee
  let id = ''
  mutate((d) => {
    id = uid('ch-')
    applyPayment(d, { type: 'challenge_create', from: me, to: 'platform', amount: fee, module: 'challenge', refId: id, description: `هزینه‌ی ایجاد چالش «${input.title}»` })
    if (input.sponsorPrize > 0)
      applyPayment(d, { type: 'challenge_entry', from: me, to: 'escrow', amount: input.sponsorPrize, commissionPct: 0, refId: id, description: `جایزه‌ی نقدی چالش «${input.title}»` })
    const start = new Date()
    d.challenges.unshift({
      ...input,
      id, creatorId: me, creationFee: fee, pool: input.sponsorPrize, participants: [], status: 'active',
      startAt: start.toISOString(), endAt: new Date(start.getTime() + input.days * 86_400_000).toISOString(), createdAt: now(),
    })
    addXP(d, me, 80)
  })
  return id
}

/** ورود به چالش: ورودی پس از کسر کمیسیون به صندوق جایزه اضافه می‌شود */
export function joinChallenge(challengeId: string) {
  const me = currentUserId()
  const ch = db().challenges.find((c) => c.id === challengeId)
  if (!ch || ch.status !== 'active') throw new AppError('چالش فعال نیست')
  if (ch.participants.some((p) => p.userId === me)) throw new AppError('قبلاً در این چالش شرکت کرده‌اید')
  if (ch.participants.length >= ch.maxParticipants) throw new AppError('ظرفیت چالش تکمیل است')
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
}

export function logChallengeProgress(challengeId: string, value: number, note?: string) {
  const me = currentUserId()
  if (!(value > 0)) throw new AppError('مقدار معتبر وارد کنید')
  mutate((d) => {
    const c = d.challenges.find((x) => x.id === challengeId)
    const p = c?.participants.find((x) => x.userId === me)
    if (!c || !p) throw new AppError('ابتدا در چالش شرکت کنید')
    if (c.status !== 'active' || new Date(c.endAt) < new Date()) throw new AppError('زمان چالش تمام شده است')
    const before = p.score
    p.score = Math.round((p.score + value) * 100) / 100
    p.logs.push({ at: now(), value, note })
    addXP(d, me, 5)
    if (before < c.goal && p.score >= c.goal) {
      addXP(d, me, c.xpReward)
      notify(d, me, 'هدف چالش رو زدی!', `${c.xpReward} امتیاز تجربه گرفتی.`, '', `/challenges/${c.id}`)
    }
  })
}

export function rankings(c: Challenge) {
  return [...c.participants].sort((a, b) => b.score - a.score)
}

/** پایان چالش و تقسیم صندوق جایزه بین برندگان */
export function settleChallenge(challengeId: string, force = false) {
  const me = currentUserId()
  const isAdmin = db().users.find((u) => u.id === me)?.roles.includes('admin')
  mutate((d) => {
    const c = d.challenges.find((x) => x.id === challengeId)
    if (!c || c.status !== 'active') throw new AppError('چالش فعال نیست')
    if (c.creatorId !== me && !isAdmin) throw new AppError('فقط سازنده یا مدیر می‌تواند چالش را ببندد')
    if (!force && new Date(c.endAt) > new Date()) throw new AppError('هنوز زمان چالش تمام نشده است')
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
}
