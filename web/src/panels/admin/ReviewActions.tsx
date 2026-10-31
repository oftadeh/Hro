import { useState } from 'react'
import { BadgeCheck, PencilLine, X } from 'lucide-react'
import { Button, Input } from '@/ui/kit'
import { run } from '@/ui/toast'

export type Decision = 'approve' | 'changes' | 'reject'

/** سه تصمیم مدیر: تأیید و انتشار، نیاز به اصلاح (با توضیح)، رد (با دلیل) */
export function ReviewActions({
  onDecide,
  approveLabel = 'تأیید و انتشار',
  hideApprove,
}: {
  onDecide: (decision: Decision, note?: string) => unknown
  approveLabel?: string
  hideApprove?: boolean
}) {
  const [mode, setMode] = useState<'changes' | 'reject'>()
  const [note, setNote] = useState('')
  const done = (msg: string) => async () => {
    const ok = await run(async () => {
      await onDecide(mode ?? 'approve', note)
      return true
    }, msg)
    if (ok) {
      setMode(undefined)
      setNote('')
    }
  }
  if (mode)
    return (
      <div className="space-y-2">
        <Input
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === 'changes' ? 'چه چیزی باید اصلاح شود؟ (به کاربر نمایش داده می‌شود)' : 'دلیل رد (به کاربر نمایش داده می‌شود)'}
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setMode(undefined)}>انصراف</Button>
          <Button size="sm" variant={mode === 'reject' ? 'danger' : 'dark'} disabled={note.trim().length < 5} onClick={done('نتیجه به کاربر اعلام شد')}>
            {mode === 'changes' ? 'ارسال درخواست اصلاح' : 'رد نهایی'}
          </Button>
        </div>
      </div>
    )
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="ghost" className="text-coral-500" icon={<X size={14} />} onClick={() => setMode('reject')}>رد</Button>
      <Button size="sm" variant="outline" icon={<PencilLine size={14} />} onClick={() => setMode('changes')}>نیاز به اصلاح</Button>
      {!hideApprove && <Button size="sm" variant="dark" icon={<BadgeCheck size={14} />} onClick={done('تأیید و منتشر شد')}>{approveLabel}</Button>}
    </div>
  )
}
