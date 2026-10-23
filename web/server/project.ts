/**
 * «نمای مجاز» هر کاربر از داده‌ها: فقط اطلاعاتی که اجازه‌ی دیدنش را دارد به مرورگر ارسال می‌شود.
 * شماره‌ی موبایل، سلامت، چرخه، کیف پول و پیام‌های دیگران هرگز به‌صورت عمومی ارسال نمی‌شود.
 */
import type { DBState } from '../src/core/state'
import type { CheckIn, User } from '../src/core/types'

const DAY = 86_400_000

export function project(s: DBState, uid: string): DBState {
  const me = s.users.find((u) => u.id === uid)
  const admin = !!me?.roles.includes('admin')
  const sharedWithMe = new Set(s.users.filter((u) => u.healthShares?.includes(uid)).map((u) => u.id))
  const myGyms = new Set(s.gyms.filter((g) => g.ownerId === uid).map((g) => g.id))
  const myRests = new Set(s.restaurants.filter((r) => r.ownerId === uid).map((r) => r.id))
  const now = Date.now()

  const publicUser = (u: User): User => {
    const shared = sharedWithMe.has(u.id)
    const showBody = shared || admin || !!u.privacy?.showBody
    return {
      id: u.id, name: u.name, avatar: u.avatar, bio: u.bio, city: u.city, roles: u.roles, xp: u.xp, streak: u.streak, following: u.following,
      createdAt: u.createdAt, gender: u.gender, privacy: u.privacy, weekXp: u.weekXp, introVideo: u.introVideo,
      orgId: u.orgId && (u.orgId === me?.orgId || admin) ? u.orgId : undefined,
      heightCm: showBody ? u.heightCm : undefined, weightKg: showBody ? u.weightKg : undefined, goal: showBody ? u.goal : undefined,
      activityLevel: showBody ? u.activityLevel : undefined, birthYear: shared ? u.birthYear : undefined,
      health: shared ? u.health : undefined,
      healthShares: shared ? [uid] : undefined,
      phone: admin ? u.phone : '',
      blocked: admin ? u.blocked : undefined,
      referredBy: u.referredBy === uid ? uid : undefined,
      referralRewarded: u.referredBy === uid ? u.referralRewarded : undefined,
    }
  }

  // بلیت‌های دیگران فقط به‌صورت بی‌نام و بدون کد (برای ظرفیت کلاس و شلوغی)
  const anonTicket = (c: CheckIn): CheckIn => ({ id: c.id, userId: 'anon', gymId: c.gymId, price: 0, code: '', paidWith: c.paidWith, status: c.status, classId: c.classId, slotAt: c.slotAt, rentalEnd: c.rentalEnd, usedAt: c.usedAt, createdAt: c.createdAt })
  const checkins = s.checkins.flatMap((c) => {
    if (admin || c.userId === uid || myGyms.has(c.gymId)) return [c]
    const relevant = ((c.classId || c.rentalEnd) && c.slotAt && new Date(c.slotAt).getTime() > now - DAY) || (c.status === 'used' && c.usedAt && now - new Date(c.usedAt).getTime() < 3 * 3_600_000)
    return relevant && (c.status === 'active' || c.status === 'used') ? [anonTicket(c)] : []
  })

  const involves = (t: { from: string; to: string; payerId?: string }) => t.from === uid || t.to === uid || t.payerId === uid
  const canSeeLogs = (creatorId: string) => admin || creatorId === uid

  return {
    ...s,
    users: s.users.map((u) => (u.id === uid ? u : publicUser(u))),
    subscriptions: admin ? s.subscriptions : s.subscriptions.filter((x) => x.userId === uid),
    wallets: admin ? s.wallets : { [uid]: s.wallets[uid] ?? 0 },
    transactions: admin ? s.transactions : s.transactions.filter(involves),
    payouts: admin ? s.payouts : s.payouts.filter((p) => p.userId === uid),
    gyms: s.gyms.filter((g) => g.approved || g.ownerId === uid || admin),
    checkins,
    entryRequests: s.entryRequests.filter((r) => r.userId === uid || myGyms.has(r.gymId) || admin),
    planOrders: s.planOrders.filter((o) => o.userId === uid || o.coachId === uid || admin),
    threads: s.threads.filter((t) => t.members.includes(uid)),
    orders: s.orders.filter((o) => o.userId === uid || o.vendorId === uid || myRests.has(o.vendorId) || admin),
    appointments: s.appointments.filter((a) => a.userId === uid || a.doctorId === uid || admin),
    restaurants: s.restaurants.filter((r) => r.approved || r.ownerId === uid || admin),
    posts: s.posts.filter((p) => !p.hidden || p.authorId === uid || admin),
    stories: s.stories.filter((x) => now - new Date(x.createdAt).getTime() < DAY),
    challenges: s.challenges.map((c) =>
      canSeeLogs(c.creatorId) ? c : { ...c, participants: c.participants.map((p) => (p.userId === uid ? p : { ...p, logs: [] })) },
    ),
    notifications: s.notifications.filter((n) => n.userId === uid).slice(0, 200),
    dailyLogs: s.dailyLogs.filter((l) => l.userId === uid),
    cycles: s.cycles.filter((c) => c.userId === uid || sharedWithMe.has(c.userId)),
    carts: { [uid]: s.carts[uid] ?? [] },
    aiChats: { [uid]: s.aiChats[uid] ?? [] },
    reports: admin ? s.reports : s.reports.filter((r) => r.reporterId === uid),
    tickets: admin ? s.tickets : s.tickets.filter((t) => t.userId === uid),
    workouts: s.workouts.filter((w) => w.userId === uid || sharedWithMe.has(w.userId)),
    meals: s.meals.filter((m) => m.userId === uid),
    bodyEntries: s.bodyEntries.filter((b) => b.userId === uid || sharedWithMe.has(b.userId)),
    orgs: admin ? s.orgs : s.orgs.filter((o) => o.id === me?.orgId || o.adminId === uid),
    giftCards: admin ? s.giftCards : s.giftCards.filter((g) => g.fromId === uid || g.redeemedBy === uid || (me && g.toPhone === me.phone)),
    coupons: admin ? s.coupons : [],
    teams: s.teams.filter((t) => t.members.includes(uid) || admin),
    policies: admin ? s.policies : s.policies.filter((x) => x.userId === uid),
    claims: admin ? s.claims : s.claims.filter((x) => x.userId === uid),
  }
}
