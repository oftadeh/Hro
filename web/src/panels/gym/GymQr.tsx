import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, RefreshCw, ShieldCheck } from 'lucide-react'
import { useDB } from '@/core/db'
import { ENTRY_RADIUS_M, rotateEntryCode, gymTitle } from '@/core/services/fityab'
import { Button, Card, Empty, PageHeader, Select } from '@/ui/kit'
import { useMe } from '@/ui/hooks'
import { run, ask } from '@/ui/toast'

/** QR ثابت ورود باشگاه برای چاپ و نصب دم در پذیرش */
export default function GymQr() {
  const me = useMe()!
  const gyms = useDB((s) => s.gyms).filter((g) => g.ownerId === me.id)
  const [gymId, setGymId] = useState(gyms[0]?.id ?? '')
  const gym = gyms.find((g) => g.id === gymId) ?? gyms[0]
  const [busy, setBusy] = useState(false)

  if (!gym) return <Empty title="هنوز باشگاهی ثبت نکرده‌اید" desc="پس از ثبت و تأیید باشگاه، QR ورود اینجا ساخته می‌شود." action={<Link to="/panel/gym/edit"><Button variant="dark">ثبت باشگاه</Button></Link>} />

  const link = gym.entryCode ? `${location.origin}/scan?g=${encodeURIComponent(gym.id)}&c=${gym.entryCode}` : ''
  const rotate = async () => {
    if (gym.entryCode && !(await ask('با ساخت QR جدید، QR چاپ‌شده‌ی قبلی باطل می‌شود. ادامه می‌دهید؟'))) return
    setBusy(true)
    await run(() => rotateEntryCode(gym.id), 'QR ورود ساخته شد')
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <PageHeader title="QR ورود باشگاه" subtitle="ورزشکاران با اسکن این کد ورودشان را ثبت می‌کنند" />
      </div>
      {gyms.length > 1 && (
        <Select value={gym.id} onChange={(e) => setGymId(e.target.value)} className="print:hidden">
          {gyms.map((g) => <option key={g.id} value={g.id}>{gymTitle(g)}</option>)}
        </Select>
      )}

      {!gym.approved && <Card className="text-[14px] text-ink-500 print:hidden">این باشگاه هنوز توسط کی‌فیت تأیید نشده است؛ پس از تأیید، اسکن QR فعال می‌شود.</Card>}

      {link ? (
        <Card className="mx-auto max-w-sm p-6 text-center print:max-w-none print:shadow-none">
          <p className="text-[13px] text-ink-500">ورود با کی‌فیت</p>
          <h2 className="mt-1 text-[22px] font-extrabold">{gym.name}</h2>
          <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4">
            <QRCodeSVG value={link} size={220} level="M" />
          </div>
          <p className="mt-4 text-[14px] leading-7">اپ کی‌فیت را باز کن، «ورود» را بزن و این کد را اسکن کن.</p>
          <p className="text-[12px] text-ink-500">ثبت ورود فقط در فاصله‌ی {ENTRY_RADIUS_M.toLocaleString('fa-IR')} متری باشگاه ممکن است.</p>
        </Card>
      ) : (
        <Empty title="QR ورود هنوز ساخته نشده" desc="یک بار بسازید، چاپ کنید و دم در پذیرش نصب کنید." />
      )}

      <div className="flex flex-wrap justify-center gap-2.5 print:hidden">
        {link && <Button variant="dark" icon={<Printer size={17} />} onClick={() => window.print()}>چاپ</Button>}
        <Button variant="outline" loading={busy} icon={<RefreshCw size={17} />} onClick={rotate}>{link ? 'ساخت QR جدید' : 'ساخت QR ورود'}</Button>
      </div>

      <Card className="flex items-start gap-3 text-[13px] leading-6 text-ink-500 print:hidden">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        اگر احتمال می‌دهید کد بیرون از باشگاه پخش شده، QR جدید بسازید؛ کد قبلی بلافاصله باطل می‌شود. هر ورود در «پذیرش ورود» ثبت و به شما اعلام می‌شود.
      </Card>
    </div>
  )
}
