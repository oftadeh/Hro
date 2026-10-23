import { useEffect, useState } from 'react'
import { useDB } from '@/core/db'
import { createPost } from '@/core/services/fitzone'
import { Button, ImagePicker, Select, Sheet, Textarea, Field } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { runOk } from '@/ui/toast'

export function CreatePostSheet({ open, onClose, challengeId, gymId, initialText = '' }: { open: boolean; onClose: () => void; challengeId?: string; gymId?: string; initialText?: string }) {
  const me = useMe()!
  const challenges = useDB((s) => s.challenges)
  const gyms = useDB((s) => s.gyms)
  const [text, setText] = useState(initialText)
  const [image, setImage] = useState<string>()
  const [ch, setCh] = useState(challengeId ?? '')
  const [gym, setGym] = useState(gymId ?? '')

  useEffect(() => {
    if (open) {
      setText(initialText)
      setCh(challengeId ?? '')
      setGym(gymId ?? '')
    }
  }, [open, initialText, challengeId, gymId])

  // باشگاه‌های خود کاربر اول نمایش داده می‌شوند
  const gymOptions = gyms.filter((g) => g.approved).sort((a, b) => Number(b.ownerId === me.id) - Number(a.ownerId === me.id))

  const submit = async () => {
    const ok = await runOk(() => createPost({ text, image, challengeId: ch || undefined, gymId: gym || undefined }), 'پست منتشر شد')
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="باشگاه (اختیاری)">
            <Select value={gym} onChange={(e) => setGym(e.target.value)}>
              <option value="">بدون باشگاه</option>
              {gymOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.ownerId === me.id ? ' — باشگاه من' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="چالش (اختیاری)">
            <Select value={ch} onChange={(e) => setCh(e.target.value)}>
              <option value="">بدون چالش</option>
              {challenges.filter((c) => c.status === 'active').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button className="w-full" onClick={submit}>
          انتشار
        </Button>
      </div>
    </Sheet>
  )
}
