import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Empty } from '@/ui/kit'

/** آدرس اشتباه یا لینک قدیمی: به‌جای برگشت بی‌صدا به خانه، توضیح و راه برگشت */
export default function NotFound() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Empty
        title="این صفحه پیدا نشد"
        desc={`آدرس «${decodeURIComponent(pathname)}» در کی‌فیت وجود ندارد یا جابه‌جا شده است.`}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => nav('/', { replace: true })}>رفتن به خانه</Button>
            {history.length > 1 && <Button variant="secondary" onClick={() => nav(-1)}>برگشت</Button>}
          </div>
        }
      />
    </div>
  )
}
