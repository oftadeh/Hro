/**
 * حالت خالی بخش‌هایی که به ارائه‌دهنده وابسته‌اند (باشگاه، مربی، فروشگاه، بوفه، پزشک).
 * به جای صفحه‌ی خالی، به کاربر می‌گوید چه کار کند: فیلتر را بردارد، یا ارائه‌دهنده‌ی آشنایش را دعوت کند.
 */
import { Share2 } from 'lucide-react'
import { Button, Empty } from './kit'
import { toast } from './toast'

export function EmptyProvider({ who, filtered, onClear, title, desc }: { who: string; filtered?: boolean; onClear?: () => void; title?: string; desc?: string }) {
  if (filtered && onClear) {
    return <Empty title={title ?? 'با این فیلترها چیزی پیدا نشد'} desc={desc ?? 'فیلترها یا جستجو را تغییر بده.'} action={<Button variant="secondary" onClick={onClear}>برداشتن فیلترها</Button>} />
  }
  const invite = async () => {
    const url = location.origin
    const text = `${who} شما هم می‌تواند رایگان در کی‌فیت ثبت شود و مشتری تازه بگیرد: ${url}`
    try {
      if (navigator.share) return await navigator.share({ title: 'کی‌فیت', text, url })
      await navigator.clipboard.writeText(text)
      toast.success('متن دعوت کپی شد')
    } catch {
      /* کاربر اشتراک‌گذاری را بست */
    }
  }
  return (
    <Empty
      title={title ?? `هنوز ${who} در این بخش نیست`}
      desc={desc ?? `این بخش تازه راه افتاده. ${who} آشنایی داری؟ دعوتش کن تا رایگان ثبت شود؛ به محض اضافه شدن، اینجا می‌بینی‌اش.`}
      action={<Button onClick={invite} icon={<Share2 size={16} />}>دعوت از {who}</Button>}
    />
  )
}
