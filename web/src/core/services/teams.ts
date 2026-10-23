/**
 * هم‌تیمی‌ها: چند دوست یک تیم می‌سازند، گفتگوی گروهی دارند، قرار تمرین می‌گذارند،
 * با هم در باشگاه تمرین می‌کنند (پاداش «تمرین با هم») و چالش داخلی تیم برگزار می‌کنند.
 */
import { AppError, mutate, currentUserId, db, svc } from '../store'
import type { DBState } from '../state'
import { uid, now } from '../id'
import type { ID, Team } from '../types'
import { notify } from './ledger'
import { addXP, weekXpOf } from './engagement'
import { dayKey, faDateTime } from '../format'

export const TEAM_MAX = 8
const TOGETHER_XP = 40

const teamCode = () => Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(10 + Math.random() * 90)

function myTeam(d: Pick<DBState, 'teams'>, teamId: ID, me: ID) {
  const t = d.teams.find((x) => x.id === teamId)
  if (!t || !t.members.includes(me)) throw new AppError('تیم یافت نشد')
  return t
}

function systemMessage(d: DBState, t: Team, from: ID, text: string) {
  const th = d.threads.find((x) => x.id === t.threadId)
  if (!th) return
  th.messages.push({ id: uid('m-'), from, text, at: now(), kind: 'system' })
  th.updatedAt = now()
}

export const createTeam = svc('team.create', (name: string, goal?: string) => {
  const me = currentUserId()
  const n = String(name ?? '').trim()
  if (n.length < 2 || n.length > 40) throw new AppError('نام تیم باید بین ۲ تا ۴۰ حرف باشد')
  if (db().teams.filter((t) => t.members.includes(me)).length >= 5) throw new AppError('حداکثر در ۵ تیم می‌توانید عضو باشید')
  const id = uid('tm-')
  mutate((d) => {
    const threadId = uid('t-')
    d.threads.unshift({ id: threadId, members: [me], context: 'team', title: n, teamId: id, messages: [], updatedAt: now() })
    d.teams.unshift({ id, name: n, ownerId: me, members: [me], code: teamCode(), threadId, goal: goal?.trim().slice(0, 120) || undefined, sessions: [], createdAt: now() })
    addXP(d, me, 20)
  })
  return id
})

function addMember(d: DBState, t: Team, userId: ID) {
  if (t.members.includes(userId)) throw new AppError('شما عضو این تیم هستید')
  if (t.members.length >= TEAM_MAX) throw new AppError(`ظرفیت تیم (${TEAM_MAX} نفر) تکمیل است`)
  t.members.push(userId)
  const th = d.threads.find((x) => x.id === t.threadId)
  if (th && !th.members.includes(userId)) th.members.push(userId)
  const u = d.users.find((x) => x.id === userId)!
  systemMessage(d, t, userId, `${u.name} به تیم پیوست`)
  t.members.filter((m) => m !== userId).forEach((m) => notify(d, m, `عضو جدید در ${t.name}`, `${u.name} به تیم پیوست.`, '', `/teams/${t.id}`))
}

export const joinTeam = svc('team.join', (code: string) => {
  const me = currentUserId()
  const t = db().teams.find((x) => x.code === String(code ?? '').trim().toUpperCase())
  if (!t) throw new AppError('کد تیم معتبر نیست')
  mutate((d) => addMember(d, d.teams.find((x) => x.id === t.id)!, me))
  return t.id
})

/** دعوت از یک دوست (اعلان با لینک پیوستن) */
export const inviteToTeam = svc('team.invite', (teamId: ID, userId: ID) => {
  const me = currentUserId()
  mutate((d) => {
    const t = myTeam(d, teamId, me)
    if (t.members.includes(userId)) throw new AppError('این کاربر عضو تیم است')
    const target = d.users.find((u) => u.id === userId)
    if (!target) throw new AppError('کاربر یافت نشد')
    if (target.blockedUsers?.includes(me)) throw new AppError('امکان دعوت این کاربر وجود ندارد')
    const inviter = d.users.find((u) => u.id === me)!
    notify(d, userId, `دعوت به تیم «${t.name}»`, `${inviter.name} شما را به تیم هم‌تمرینی دعوت کرد.`, '', `/teams?join=${t.code}`)
  })
})

export const leaveTeam = svc('team.leave', (teamId: ID) => {
  const me = currentUserId()
  mutate((d) => {
    const t = myTeam(d, teamId, me)
    t.members = t.members.filter((m) => m !== me)
    const th = d.threads.find((x) => x.id === t.threadId)
    if (th) th.members = th.members.filter((m) => m !== me)
    if (!t.members.length) {
      d.teams = d.teams.filter((x) => x.id !== t.id)
      d.threads = d.threads.filter((x) => x.id !== t.threadId)
      return
    }
    if (t.ownerId === me) t.ownerId = t.members[0]
    systemMessage(d, t, me, `${d.users.find((u) => u.id === me)?.name} از تیم خارج شد`)
  })
})

export const removeTeamMember = svc('team.remove', (teamId: ID, userId: ID) => {
  const me = currentUserId()
  mutate((d) => {
    const t = myTeam(d, teamId, me)
    if (t.ownerId !== me) throw new AppError('فقط سازنده‌ی تیم می‌تواند عضو را حذف کند')
    if (userId === me) throw new AppError('برای خروج از «ترک تیم» استفاده کنید')
    t.members = t.members.filter((m) => m !== userId)
    const th = d.threads.find((x) => x.id === t.threadId)
    if (th) th.members = th.members.filter((m) => m !== userId)
    notify(d, userId, 'خروج از تیم', `از تیم «${t.name}» حذف شدید.`, '')
  })
})

export const updateTeam = svc('team.update', (teamId: ID, patch: { name?: string; goal?: string }) => {
  const me = currentUserId()
  mutate((d) => {
    const t = myTeam(d, teamId, me)
    if (t.ownerId !== me) throw new AppError('فقط سازنده‌ی تیم می‌تواند تیم را ویرایش کند')
    if (patch.name !== undefined) {
      const n = patch.name.trim()
      if (n.length < 2) throw new AppError('نام تیم را وارد کنید')
      t.name = n.slice(0, 40)
      const th = d.threads.find((x) => x.id === t.threadId)
      if (th) th.title = t.name
    }
    if (patch.goal !== undefined) t.goal = patch.goal.trim().slice(0, 120) || undefined
  })
})

/** قرار تمرین گروهی */
export const scheduleTeamSession = svc('team.schedule', (teamId: ID, input: { title: string; at: string; gymId?: string; note?: string }) => {
  const me = currentUserId()
  const at = new Date(input.at)
  if (isNaN(at.getTime()) || at.getTime() < Date.now() - 5 * 60_000) throw new AppError('زمان قرار باید در آینده باشد')
  if (at.getTime() - Date.now() > 60 * 86_400_000) throw new AppError('قرار حداکثر تا ۶۰ روز آینده قابل ثبت است')
  const title = String(input.title ?? '').trim()
  if (title.length < 2) throw new AppError('عنوان قرار را بنویسید')
  mutate((d) => {
    const t = myTeam(d, teamId, me)
    if (input.gymId && !d.gyms.some((g) => g.id === input.gymId && g.approved)) throw new AppError('مجموعه‌ی انتخاب‌شده فعال نیست')
    if (t.sessions.filter((s) => new Date(s.at) > new Date()).length >= 20) throw new AppError('تعداد قرارهای آینده زیاد است')
    const s = { id: uid('ts-'), title: title.slice(0, 60), at: at.toISOString(), gymId: input.gymId, note: input.note?.slice(0, 200), createdBy: me, going: [me], notGoing: [] }
    t.sessions.push(s)
    t.sessions.sort((a, b) => a.at.localeCompare(b.at))
    const gym = input.gymId ? d.gyms.find((g) => g.id === input.gymId)?.name : undefined
    const u = d.users.find((x) => x.id === me)!
    systemMessage(d, t, me, `قرار جدید: ${s.title} — ${faDateTime(s.at)}${gym ? ` در ${gym}` : ''}`)
    t.members.filter((m) => m !== me).forEach((m) => notify(d, m, `قرار تمرین ${t.name}`, `${u.name}: ${s.title} — ${faDateTime(s.at)}`, '', `/teams/${t.id}`))
  })
})

export const rsvpTeamSession = svc('team.rsvp', (teamId: ID, sessionId: ID, going: boolean) => {
  const me = currentUserId()
  mutate((d) => {
    const t = myTeam(d, teamId, me)
    const s = t.sessions.find((x) => x.id === sessionId)
    if (!s) throw new AppError('قرار یافت نشد')
    s.going = s.going.filter((x) => x !== me)
    s.notGoing = s.notGoing.filter((x) => x !== me)
    ;(going ? s.going : s.notGoing).push(me)
  })
})

export const deleteTeamSession = svc('team.deleteSession', (teamId: ID, sessionId: ID) => {
  const me = currentUserId()
  mutate((d) => {
    const t = myTeam(d, teamId, me)
    const s = t.sessions.find((x) => x.id === sessionId)
    if (!s) return
    if (s.createdBy !== me && t.ownerId !== me) throw new AppError('فقط سازنده‌ی قرار یا تیم می‌تواند آن را حذف کند')
    t.sessions = t.sessions.filter((x) => x.id !== sessionId)
    systemMessage(d, t, me, `قرار «${s.title}» لغو شد`)
  })
})

/**
 * پاداش «تمرین با هم»: وقتی دو هم‌تیمی در یک روز در یک باشگاه ورودشان ثبت شود
 * (داخل mutate، پس از تأیید ورود صدا زده می‌شود).
 */
export function trainTogetherBonus(d: DBState, userId: ID, gymId: ID) {
  const today = dayKey()
  const mates = new Set(d.teams.filter((t) => t.members.includes(userId)).flatMap((t) => t.members.filter((m) => m !== userId)))
  if (!mates.size) return
  const together = d.checkins.filter((c) => c.gymId === gymId && c.status === 'used' && c.usedAt && dayKey(new Date(c.usedAt)) === today && mates.has(c.userId))
  if (!together.length) return
  const me = d.users.find((u) => u.id === userId)!
  for (const c of together) {
    const key = `together:${[userId, c.userId].sort().join(':')}:${today}`
    if (d.notifications.some((n) => n.link === `/teams#${key}`)) continue
    addXP(d, userId, TOGETHER_XP)
    addXP(d, c.userId, TOGETHER_XP)
    const mate = d.users.find((u) => u.id === c.userId)
    notify(d, userId, 'تمرین با هم‌تیمی!', `امروز با ${mate?.name} تمرین کردی؛ +${TOGETHER_XP} امتیاز برای هر دو.`, '', `/teams#${key}`)
    notify(d, c.userId, 'تمرین با هم‌تیمی!', `${me.name} هم امروز به باشگاه آمد؛ +${TOGETHER_XP} امتیاز.`, '', `/teams#${key}`)
  }
}

export function teamBoard(t: Team, users: { id: ID; weekXp?: { week: string; xp: number }; name: string; avatar?: string }[]) {
  return t.members
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({ user: u, xp: weekXpOf(u) }))
    .sort((a, b) => b.xp - a.xp)
}
