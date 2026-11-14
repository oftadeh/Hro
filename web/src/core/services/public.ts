/**
 * اطلاعات عمومی برای بازدیدکننده‌ی واردنشده (صفحه‌ی اول): باشگاه‌های منتشرشده، تعداد ارائه‌دهنده‌ها،
 * دوره‌ی آزمایشی و مشخصات حقوقی. هیچ داده‌ی خصوصی (تلفن، آدرس دقیق، مجوز، کد ورود) ارسال نمی‌شود.
 * روی سرور از /api/public و در حالت نمایشی مستقیم از داده‌های محلی ساخته می‌شود.
 */
import type { DBState } from '../state'
import type { CompanyInfo, Gym, GymTier, VenueKind } from '../types'
import { isProviderActive } from '../roles'
import { memberPriceOf, tierOfPrice } from './fityab'

export interface PublicGym {
  id: string
  name: string
  branch?: string
  city: string
  kind: VenueKind
  gender: Gym['gender']
  sessionPrice: number
  /** قیمت ویژه‌ی اعضای اشتراک (سانس آزاد) */
  memberPrice?: number
  tier: GymTier
  lat: number
  lng: number
  rating: number
  reviews: number
  cover: string
  photo?: string
  sports: string[]
}

export interface PublicInfo {
  gyms: PublicGym[]
  counts: { gyms: number; coaches: number; doctors: number; restaurants: number; products: number; cities: number }
  trial: { credit: number; days: number } | null
  company: CompanyInfo | null
}

/** حداکثر تعداد باشگاه در پاسخ عمومی (برای حجم پاسخ) */
const MAX_GYMS = 300

export function publicInfo(s: DBState): PublicInfo {
  const active = new Set(s.users.filter((u) => isProviderActive(u)).map((u) => u.id))
  const listed = s.gyms.filter((g) => g.approved && active.has(g.ownerId))
  const gyms: PublicGym[] = listed
    .slice()
    .sort((a, b) => b.rating * Math.log(2 + b.reviews) - a.rating * Math.log(2 + a.reviews))
    .slice(0, MAX_GYMS)
    .map((g) => ({
      id: g.id, name: g.name, branch: g.branch, city: g.city, kind: g.kind ?? 'gym', gender: g.gender,
      sessionPrice: g.kind === 'hall' || g.kind === 'turf' ? g.rental?.hourlyPrice ?? g.sessionPrice : g.sessionPrice,
      memberPrice: g.kind === 'hall' || g.kind === 'turf' ? undefined : memberPriceOf(g),
      tier: tierOfPrice(g.kind === 'hall' || g.kind === 'turf' ? g.rental?.hourlyPrice ?? 0 : g.sessionPrice, s),
      // مختصات با دقت حدود ۱۰۰ متر کافی است
      lat: Math.round(g.lat * 1000) / 1000, lng: Math.round(g.lng * 1000) / 1000,
      rating: g.rating, reviews: g.reviews, cover: g.cover,
      photo: g.media.find((m) => m.type === 'image')?.url,
      sports: g.sports.slice(0, 4),
    }))
  const t = s.settings.trial
  return {
    gyms,
    counts: {
      gyms: listed.length,
      coaches: s.coaches.filter((c) => c.verified && active.has(c.userId)).length,
      doctors: s.doctors.filter((x) => x.verified && active.has(x.userId)).length,
      restaurants: s.restaurants.filter((r) => r.approved && active.has(r.ownerId)).length,
      products: s.products.filter((p) => !p.review && active.has(p.sellerId)).length,
      cities: new Set(listed.map((g) => g.city.trim()).filter(Boolean)).size,
    },
    trial: t?.enabled && t.credit > 0 ? { credit: t.credit, days: t.days } : null,
    company: s.settings.company?.name ? s.settings.company : null,
  }
}
