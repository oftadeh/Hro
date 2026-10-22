import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PhoneCall, Send, Video } from 'lucide-react'
import clsx from 'clsx'
import { useDB } from '@/core/db'
import { faTime } from '@/core/format'
import { sendMessage } from '@/core/services/fityar'
import { Avatar, Button, Empty, PageHeader } from '@/ui/kit'
import { useMe, useUserMap } from '@/ui/hooks'
import { toast } from '@/ui/toast'

export default function ChatThread() {
  const { id } = useParams()
  const me = useMe()!
  const thread = useDB((s) => s.threads.find((t) => t.id === id))
  const users = useUserMap()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [thread?.messages.length])

  if (!thread || !thread.members.includes(me.id)) return <Empty icon="💬" title="گفتگو یافت نشد" />
  const other = users[thread.members.find((m) => m !== me.id)!]
  const call = () => toast.info('تماس در نسخه‌ی موبایل از طریق WebRTC برقرار می‌شود 📞')

  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col">
      <PageHeader
        back="/messages"
        title={
          <span className="flex items-center gap-2">
            <Avatar name={other?.name ?? ''} src={other?.avatar} size={34} /> {other?.name}
          </span>
        }
        actions={
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={call} icon={<PhoneCall size={18} />} aria-label="تماس صوتی" />
            <Button variant="ghost" size="sm" onClick={call} icon={<Video size={18} />} aria-label="تماس تصویری" />
          </div>
        }
      />
      <div className="flex-1 space-y-2 overflow-y-auto rounded-3xl bg-white p-4 dark:bg-ink-900">
        {thread.messages.map((m) =>
          m.kind === 'system' || m.kind === 'call' ? (
            <div key={m.id} className="mx-auto max-w-sm whitespace-pre-line rounded-2xl bg-amber-50 px-4 py-2 text-center text-xs leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className={clsx('flex', m.from === me.id ? 'justify-start' : 'justify-end')}>
              <div className={clsx('max-w-[80%] rounded-3xl px-4 py-2.5 text-sm leading-7', m.from === me.id ? 'rounded-tr-md bg-emerald-500 text-white' : 'rounded-tl-md bg-ink-100 dark:bg-white/5')}>
                <div className="whitespace-pre-line">{m.text}</div>
                <div className={clsx('mt-0.5 text-[10px]', m.from === me.id ? 'text-white/70' : 'text-ink-400')}>{faTime(m.at)}</div>
              </div>
            </div>
          ),
        )}
        <div ref={end} />
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(thread.id, text)
          setText('')
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام…" className="flex-1 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-ink-900" />
        <Button type="submit" disabled={!text.trim()} icon={<Send size={18} className="-scale-x-100" />} aria-label="ارسال" />
      </form>
    </div>
  )
}
