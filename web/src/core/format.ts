const nf = new Intl.NumberFormat('fa-IR')

export const num = (n: number) => nf.format(Math.round(n))
const df = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })
export const dec = (n: number) => df.format(n)
export const toman = (n: number) => `${num(n)} تومان`

export const faDate = (iso: string) =>
  new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(new Date(iso))

export const faDateTime = (iso: string) =>
  new Intl.DateTimeFormat('fa-IR', { weekday: 'short', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export const faTime = (iso: string) =>
  new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'همین حالا'
  const m = Math.floor(s / 60)
  if (m < 60) return `${num(m)} دقیقه پیش`
  const h = Math.floor(m / 60)
  if (h < 24) return `${num(h)} ساعت پیش`
  const d = Math.floor(h / 24)
  if (d < 30) return `${num(d)} روز پیش`
  return faDate(iso)
}

export function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

/** کلید روز محلی به صورت YYYY-MM-DD */
export function dayKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export const faDigitsToEn = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
