/**
 * لحظه‌های ویژه (ورود، پرداخت، کسر پول، چالش، اشتراک‌گذاری) با یک زبان حرکتی مشترک:
 * حلقه‌های لیمویی بازشونده، تیک کشیده‌شونده، ذرات پالت و فنرهای ثابت.
 * هیچ‌کدام کار کاربر را قطع نمی‌کنند (لایه‌ی بدون کلیک، حداکثر ~۱٫۶ ثانیه).
 */
import { celebrate } from './motion'
import { SP, EASE_OUT } from './live'

type Kind = 'unlock' | 'pay' | 'debit' | 'medal' | 'join' | 'share'
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const KEY = `<svg viewBox="0 0 64 64" width="84" height="84"><rect width="64" height="64" rx="16" fill="#16131b" stroke="#2c2834"/><g fill="#f1ece3"><path d="M15 11h11.5v42H15z"/><path d="M26.5 27.5 41.5 11H53L31.5 35z"/><path d="M30 30.5 52.5 53H41.2L26.5 38.2z"/></g><g class="kh" fill="#16131b"><circle cx="27.6" cy="31.5" r="4.6"/><path d="M26 33h3.2l1 8h-5.2z"/></g></svg>`
const CHECK = `<svg viewBox="0 0 30 30" width="34" height="34" fill="none" stroke="#0d0b10" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path class="ck" d="M8 15.5l4.5 4.5L22 10.5"/></svg>`
const MEDAL = `<svg viewBox="0 0 86 110" width="78" height="100"><path d="M28 0h12l6 30H34zM46 0h12l-6 30H40z" fill="#8a6bff"/><circle cx="43" cy="66" r="34" fill="#dcff5a"/><path d="M43 50l5 10 11 1.5-8 7.5 2 11-10-5.5-10 5.5 2-11-8-7.5 11-1.5z" fill="#0d0b10"/></svg>`

function layer() {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = 'position:fixed;inset:0;z-index:1150;pointer-events:none;display:grid;place-items:center'
  document.body.appendChild(el)
  return el
}

function rings(host: HTMLElement, n = 3) {
  for (let i = 0; i < n; i++) {
    const r = document.createElement('i')
    r.style.cssText = 'position:absolute;left:50%;top:50%;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;border:1.6px solid #dcff5a'
    host.appendChild(r)
    r.animate([{ transform: 'scale(.9)', opacity: 0.9 }, { transform: `scale(${2 + i * 0.8})`, opacity: 0 }], { duration: 1100, delay: i * 110, easing: EASE_OUT, fill: 'forwards' })
  }
}

/** متن زیر نماد، با ورود نرم */
function caption(host: HTMLElement, title: string, sub?: string, delay = 300) {
  const c = document.createElement('div')
  c.style.cssText = 'position:absolute;left:0;right:0;top:calc(50% + 70px);text-align:center;color:#fff;text-shadow:0 2px 14px #0009;padding:0 24px'
  c.innerHTML = `<b style="display:block;font-size:18px;font-weight:900"></b><span style="font-size:13px;opacity:.85"></span>`
  c.querySelector('b')!.textContent = title
  c.querySelector('span')!.textContent = sub ?? ''
  host.appendChild(c)
  c.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { ...SP.soft, delay, fill: 'both' })
}

/** نمایش یک لحظه‌ی ویژه */
export function moment(kind: Kind, opts: { title?: string; sub?: string } = {}) {
  if (typeof document === 'undefined') return
  navigator.vibrate?.(kind === 'debit' ? 12 : [18, 40, 26])
  if (reduced()) return
  const host = layer()
  // «باز شد» روی هر زمینه‌ای خوانا باشد: پرده‌ی تیره‌ی کوتاه
  if (kind === 'unlock') {
    host.style.background = 'rgb(13 11 16 / .62)'
    host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'backwards' })
  }
  const center = document.createElement('div')
  center.style.cssText = 'position:relative;display:grid;place-items:center'
  host.appendChild(center)
  let life = 1700

  if (kind === 'share') {
    // پیام کوچک پایین صفحه با تیک
    host.style.placeItems = 'end center'
    const t = document.createElement('div')
    t.style.cssText = 'margin-bottom:96px;display:flex;align-items:center;gap:8px;background:#f1ece3;color:#0d0b10;font-weight:800;font-size:14px;padding:10px 16px;border-radius:999px;box-shadow:0 10px 30px #0006'
    t.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0d0b10" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path class="ck" d="M5 12.5l4.5 4.5L19 7.5"/></svg><span></span>`
    t.querySelector('span')!.textContent = opts.title ?? 'لینک کپی شد'
    center.appendChild(t)
    t.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { ...SP.soft, fill: 'both' })
    drawCk(t, 200)
    life = 2000
  } else if (kind === 'debit') {
    // کسر پول: آرام و بدون جشن
    const chip = document.createElement('div')
    chip.style.cssText = 'background:linear-gradient(150deg,#ff9a4d,#ff5a1f);color:#0d0b10;font-weight:900;font-size:16px;padding:10px 18px;border-radius:999px;box-shadow:0 10px 30px #0005;white-space:nowrap'
    chip.textContent = opts.title ?? ''
    center.appendChild(chip)
    chip.animate([{ opacity: 0, transform: 'translateY(-24px) scale(.85)' }, { opacity: 1, transform: 'none', offset: 0.35 }, { opacity: 1, transform: 'translateY(10px)', offset: 0.8 }, { opacity: 0, transform: 'translateY(26px)' }], { duration: 1800, easing: EASE_OUT, fill: 'forwards' })
    if (opts.sub) caption(host, '', opts.sub, 400)
    life = 1900
  } else {
    const badge = document.createElement('div')
    badge.style.cssText = 'position:relative;display:grid;place-items:center'
    if (kind === 'unlock') {
      badge.innerHTML = KEY
      badge.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], SP.soft)
      badge.animate([{ rotate: '0deg' }, { rotate: '-14deg' }, { rotate: '0deg' }], { duration: 700, delay: 300, easing: 'cubic-bezier(.34,1.56,.64,1)', composite: 'add' })
      badge.querySelector('.kh')?.animate([{ fill: '#16131b' }, { fill: '#dcff5a' }], { duration: 250, delay: 550, fill: 'forwards' })
      setTimeout(() => rings(center), 600)
    } else if (kind === 'pay') {
      badge.style.cssText += ';width:64px;height:64px;border-radius:50%;background:linear-gradient(150deg,#dcff5a,#b8f400);box-shadow:0 10px 30px #0006'
      badge.innerHTML = CHECK
      badge.animate([{ transform: 'scale(.4)' }, { transform: 'none' }], SP.pop)
      drawCk(badge, 150)
      rings(center, 2)
    } else {
      // medal (اتمام چالش) و join (پیوستن): مدال با جشن، پیوستن کوچک‌تر
      badge.innerHTML = MEDAL
      badge.animate([{ opacity: 0, transform: 'translateY(-160px) rotate(-20deg)' }, { opacity: 1, transform: 'none' }], { ...SP.pop, fill: 'both' })
      setTimeout(() => {
        rings(center, kind === 'medal' ? 3 : 2)
        const r = center.getBoundingClientRect()
        celebrate({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, { pieces: kind === 'medal' ? 30 : 14, haptic: false })
      }, 380)
    }
    center.appendChild(badge)
    if (opts.title) caption(host, opts.title, opts.sub, kind === 'unlock' ? 750 : 350)
  }
  setTimeout(() => host.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(() => host.remove()), life)
}

function drawCk(root: HTMLElement, delay: number) {
  const p = root.querySelector('.ck') as SVGPathElement | null
  if (!p) return
  const L = p.getTotalLength()
  p.style.strokeDasharray = String(L)
  p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 360, delay, easing: EASE_OUT, fill: 'both' })
}
