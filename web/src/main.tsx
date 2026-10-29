import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AppError } from '@/core/store'
import { REMOTE, startRemote } from '@/core/client/remote'
import { toast } from '@/ui/toast'

if (REMOTE) startRemote()

// خطاهای سرویس‌هایی که بدون run() صدا زده شده‌اند هم به‌صورت پیام نمایش داده می‌شوند
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason instanceof AppError) {
    toast.error(e.reason.message)
    e.preventDefault()
  }
})

// سرویس‌ورکر برای نصب اپ، کار آفلاین و اعلان
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
