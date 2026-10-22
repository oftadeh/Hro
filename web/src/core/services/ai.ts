import { mutate, currentUserId, db, svc, AppError } from '../store'
import { getAI, type AIReply } from '../ai'
import { now } from '../id'
import { completeMission } from './engagement'
import { cycleStatus } from './cycle'
import { weeklySummary } from './health'

export const askAI = svc('ai.ask', async (text: string): Promise<AIReply> => {
  const me = currentUserId()
  const body = String(text ?? '').trim()
  if (!body) throw new AppError('پرسش خود را بنویسید')
  if (body.length > 1500) throw new AppError('پرسش خیلی طولانی است')
  mutate((d) => {
    ;(d.aiChats[me] ??= []).push({ role: 'user', text: body, at: now() })
    d.aiChats[me] = d.aiChats[me].slice(-60)
    completeMission(d, me, 'ai')
  })
  const history = (db().aiChats[me] ?? []).slice(-12).map(({ role, text }) => ({ role, text }))
  const profile = db().users.find((u) => u.id === me)!
  const st = cycleStatus(me)
  const reply = await getAI().reply(history, profile, {
    cycle: st ? { day: st.day, phase: st.info.label, intensity: st.info.intensity, workout: st.info.workout, nutrition: st.info.nutrition, daysToNext: st.daysToNext } : undefined,
    week: weeklySummary(me),
  })
  mutate((d) => {
    ;(d.aiChats[me] ??= []).push({ role: 'assistant', text: reply.text, suggestions: reply.suggestions, at: now() })
  })
  return reply
})

/** مرور هفتگی هوشمند */
export const weeklyReview = svc('ai.weekly', async (): Promise<AIReply> => {
  const me = currentUserId()
  const profile = db().users.find((u) => u.id === me)!
  return getAI().weekly(profile, weeklySummary(me))
})

export const clearAIChat = svc('ai.clear', () => {
  const me = currentUserId()
  mutate((d) => {
    d.aiChats[me] = []
  })
})
