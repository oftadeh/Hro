import { mutate, currentUserId, db } from '../db'
import { ai, type AIReply } from '../ai'
import { now } from '../id'
import { completeMission } from './engagement'

export async function askAI(text: string): Promise<AIReply> {
  const me = currentUserId()
  mutate((d) => {
    ;(d.aiChats[me] ??= []).push({ role: 'user', text, at: now() })
    completeMission(d, me, 'ai')
  })
  const history = (db().aiChats[me] ?? []).slice(-12).map(({ role, text }) => ({ role, text }))
  const profile = db().users.find((u) => u.id === me)!
  const reply = await ai.reply(history, profile)
  mutate((d) => {
    d.aiChats[me].push({ role: 'assistant', text: reply.text, suggestions: reply.suggestions, at: now() })
  })
  return reply
}

export function clearAIChat() {
  const me = currentUserId()
  mutate((d) => {
    d.aiChats[me] = []
  })
}
