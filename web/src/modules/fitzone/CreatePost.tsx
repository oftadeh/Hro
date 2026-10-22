import { useEffect, useState } from 'react'
import { useDB } from '@/core/db'
import { createPost } from '@/core/services/fitzone'
import { Button, ImagePicker, Select, Sheet, Textarea, Field } from '@/ui/kit'
import { runOk } from '@/ui/toast'

export function CreatePostSheet({ open, onClose, challengeId, initialText = '' }: { open: boolean; onClose: () => void; challengeId?: string; initialText?: string }) {
  const challenges = useDB((s) => s.challenges)
  const [text, setText] = useState(initialText)
  const [image, setImage] = useState<string>()
  const [ch, setCh] = useState(challengeId ?? '')

  useEffect(() => {
    if (open) {
      setText(initialText)
      setCh(challengeId ?? '')
    }
  }, [open, initialText, challengeId])

  const submit = async () => {
    const ok = await runOk(() => createPost({ text, image, challengeId: ch || undefined }), 'پست منتشر شد 🎉')
    if (ok) {
      setText('')
      setImage(undefined)
      onClose()
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title="پست جدید در فیت‌زون">
      <div className="space-y-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="از تمرین، رژیم یا دستاوردت بنویس…" />
        <ImagePicker value={image} onChange={setImage} />
        <Field label="پیوست چالش (اختیاری)">
          <Select value={ch} onChange={(e) => setCh(e.target.value)}>
            <option value="">بدون چالش</option>
            {challenges.filter((c) => c.status === 'active').map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.title}
              </option>
            ))}
          </Select>
        </Field>
        <Button className="w-full" onClick={submit}>
          انتشار
        </Button>
      </div>
    </Sheet>
  )
}
