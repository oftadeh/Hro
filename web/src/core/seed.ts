import type {
  Challenge, CoachProfile, GymClass, Review, WorkoutSession, MealLog, BodyEntry, DoctorProfile, Food, Gym, Post, Product, Restaurant, Story, User, Thread, DailyLog,
} from './types'
import { DEFAULT_COMMISSIONS, DEFAULT_INSURANCE_PLANS } from './config'
import type { DBState } from './state'
import { dayKey } from './format'

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
const ahead = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

function mkUser(id: string, name: string, roles: User['roles'], extra: Partial<User> = {}): User {
  // کاربران نمایشی دیروز فعال بوده‌اند تا استریک‌شان حفظ شود
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return {
    id, name, roles, referralCode: id.replace('u-', '').toUpperCase().slice(0, 6) + '24', lastActiveDay: extra.streak ? dayKey(y) : undefined, phone: '09120000000', city: 'تهران', xp: 0, streak: 0, following: [], createdAt: ago(24 * 60), ...extra,
  }
}

function slots(): string[] {
  const out: string[] = []
  for (let d = 1; d <= 5; d++) {
    for (const h of [10, 12, 16, 18]) {
      const t = new Date()
      t.setDate(t.getDate() + d)
      t.setHours(h, 0, 0, 0)
      out.push(t.toISOString())
    }
  }
  return out
}

export function createSeed(): DBState {
  const users: User[] = [
    mkUser('u-sara', 'سارا محمدی', ['user'], { phone: '09121111111', xp: 740, streak: 6, gender: 'female', heightCm: 165, weightKg: 62, birthYear: 1377, goal: 'fit', bio: 'عاشق دویدن و یوگا', following: ['u-coach1', 'u-ali'],
      family: [{ id: 'fm-ava', name: 'آوا', relation: 'child', birthYear: 1397, gender: 'female', notes: 'به بادام زمینی حساسیت دارد' }, { id: 'fm-arian', name: 'آرین', relation: 'child', birthYear: 1394, gender: 'male' }],
      devices: [{ id: 'dv-band', kind: 'watch', name: 'Mi Band 8', connectedAt: ago(24 * 20), lastSyncAt: ago(5) }] }),
    mkUser('u-ali', 'علی رضایی', ['user', 'gym'], { gender: 'male', phone: '09122222222', xp: 1300, streak: 12, bio: 'مدیر باشگاه‌های آیرون‌من و پالس' }),
    mkUser('u-coach1', 'مهدی کریمی', ['user', 'coach'], { gender: 'male', phone: '09123333333', xp: 3100, streak: 40, bio: 'مربی بدنسازی و فیتنس | ۱۰ سال سابقه' }),
    mkUser('u-coach2', 'نگار احمدی', ['user', 'coach'], { gender: 'female', phone: '09124444444', xp: 2200, streak: 18, bio: 'مربی تغذیه و کاهش وزن' }),
    mkUser('u-seller', 'رضا پاورمکس', ['user', 'seller'], { gender: 'male', phone: '09125555555', xp: 300, bio: 'فروشگاه مکمل پاورمکس' }),
    mkUser('u-doctor', 'دکتر لیلا صادقی', ['user', 'doctor'], { gender: 'female', phone: '09126666666', xp: 500, bio: 'متخصص پزشکی ورزشی' }),
    mkUser('u-rest', 'سالادبار سبزینه', ['user', 'restaurant'], { phone: '09127777777', xp: 150 }),
    mkUser('u-admin', 'مدیر کی‌فیت', ['user', 'admin'], { phone: '09120000001', xp: 0 }),
    mkUser('u-mina', 'مینا کاظمی', ['user'], { gender: 'female', xp: 980, streak: 9, bio: 'کراس‌فیت' }),
    mkUser('u-reza', 'رضا نوری', ['user'], { orgId: 'org-1', gender: 'male', xp: 1650, streak: 21, bio: 'دونده‌ی ماراتن' }),
    mkUser('u-hamed', 'حامد یوسفی', ['user'], { gender: 'male', xp: 420, streak: 3, orgId: 'org-1' }),
    mkUser('u-physio', 'فرشته رحیمی', ['user', 'doctor'], { gender: 'female', phone: '09129990001', xp: 400, bio: 'فیزیوتراپیست ورزشی | توانبخشی زانو و شانه' }),
    mkUser('u-psych', 'دکتر آرش مهدوی', ['user', 'doctor'], { gender: 'male', phone: '09129990002', xp: 350, bio: 'روان‌شناس ورزشی | مشاور تیم‌های ملی' }),
    mkUser('u-massage', 'کامران صالحی', ['user', 'doctor'], { gender: 'male', phone: '09129990003', xp: 200, bio: 'ماساژ ورزشی و ریکاوری' }),
    mkUser('u-org', 'منابع انسانی دیجی‌نو', ['user', 'company'], { gender: 'female', phone: '09128888888', xp: 60, orgId: 'org-1', bio: 'برنامه‌ی سلامت کارکنان دیجی‌نو' }),
  ]

  const gymBase = { ownerId: 'u-ali', city: 'تهران', phone: '021-88000000', approved: true, createdAt: ago(500), media: [] as Gym['media'], capacity: 60 }
  const cl = (id: string, title: string, sport: string, coachName: string, weekday: number, time: string, durationMin: number, capacity: number, price?: number): GymClass => ({ id, title, sport, coachName, weekday, time, durationMin, capacity, price })
  const gyms: Gym[] = [
    { ...gymBase, offPeak: { from: 10, to: 16, discountPct: 25 }, classes: [cl('k-i1', 'بدنسازی مبتدی', 'بدنسازی', 'مهدی کریمی', 0, '18:00', 60, 15), cl('k-i2', 'فانکشنال', 'فیتنس', 'مهدی کریمی', 2, '19:00', 60, 15)], id: 'g-iron', name: 'باشگاه آیرون‌من', tagline: 'بدنسازی حرفه‌ای با تجهیزات روز', description: 'سالن ۸۰۰ متری با دستگاه‌های Technogym، سونا، جکوزی و مربیان مجرب. مناسب بدنسازی، فیتنس و کراس‌فیت.', address: 'ونک، خیابان ملاصدرا', lat: 35.7575, lng: 51.4085, sessionPrice: 120_000, facilities: ['سونا', 'جکوزی', 'پارکینگ', 'کمد اختصاصی', 'بوفه'], sports: ['بدنسازی', 'فیتنس', 'کراس‌فیت'], hours: '۶ صبح تا ۱۲ شب', gender: 'mixed', cover: 'from-ink-800 via-ink-800 to-ink-900', rating: 4.8, reviews: 312, media: [{ type: 'video', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' }] },
    { ...gymBase, offPeak: { from: 11, to: 16, discountPct: 20 }, classes: [cl('k-p1', 'اسپینینگ', 'اسپینینگ', 'سحر مرادی', 0, '08:00', 45, 20), cl('k-p2', 'زومبا', 'زومبا', 'سحر مرادی', 1, '18:30', 60, 25), cl('k-p3', 'HIIT', 'HIIT', 'امیر شاکری', 3, '19:00', 45, 18), cl('k-p4', 'TRX', 'TRX', 'امیر شاکری', 5, '10:00', 50, 12)], id: 'g-pulse', name: 'فیتنس پالس', tagline: 'کلاس‌های گروهی پرانرژی', description: 'اسپینینگ، زومبا، HIIT و TRX با بهترین مربیان. فضای شاد و صمیمی.', address: 'سعادت‌آباد، میدان کاج', lat: 35.7797, lng: 51.3740, sessionPrice: 95_000, facilities: ['کلاس گروهی', 'دوش', 'پارکینگ'], sports: ['اسپینینگ', 'زومبا', 'HIIT', 'TRX'], hours: '۷ صبح تا ۱۱ شب', gender: 'mixed', cover: 'from-ink-700 via-ink-800 to-ink-900', rating: 4.6, reviews: 188 },
    { ...gymBase, kind: 'pool', ownerId: 'u-ali', classes: [{ ...cl('k-a1', 'شنای کودکان (مقدماتی)', 'شنا', 'مربی نجات غریق', 1, '16:00', 45, 8, 150_000), audience: 'kids', ageMin: 5, ageMax: 10 }, { ...cl('k-a2', 'آکوا ایروبیک', 'آکوا ایروبیک', 'مریم فلاحی', 3, '10:00', 50, 15) }], id: 'g-aqua', name: 'مجموعه آبی آکوا', tagline: 'استخر، سونا و ماساژ', description: 'استخر نیمه‌المپیک، سونای خشک و بخار، جکوزی و ماساژ. سانس‌های بانوان و آقایان جدا.', address: 'جردن، خیابان طاهری', lat: 35.7700, lng: 51.4170, sessionPrice: 180_000, facilities: ['استخر', 'سونا خشک', 'سونا بخار', 'جکوزی', 'ماساژ'], sports: ['شنا', 'آکوا ایروبیک'], hours: '۸ صبح تا ۱۰ شب', gender: 'mixed', cover: 'from-ink-700 via-ink-800 to-ink-900', rating: 4.7, reviews: 421 },
    { ...gymBase, classes: [cl('k-l1', 'یوگای صبحگاهی', 'یوگا', 'نگار احمدی', 1, '09:00', 60, 14), cl('k-l2', 'پیلاتس', 'پیلاتس', 'نگار احمدی', 3, '10:30', 55, 12), cl('k-l3', 'ایروبیک', 'ایروبیک', 'مریم فلاحی', 5, '17:00', 60, 20)], id: 'g-lady', name: 'باشگاه بانوان رز', tagline: 'ویژه‌ی بانوان', description: 'یوگا، پیلاتس، ایروبیک و بدنسازی بانوان با محیطی آرام و امن.', address: 'پونک، بلوار عدل', lat: 35.7608, lng: 51.3290, sessionPrice: 85_000, facilities: ['یوگا', 'پیلاتس', 'مهدکودک', 'دوش'], sports: ['یوگا', 'پیلاتس', 'ایروبیک'], hours: '۸ صبح تا ۹ شب', gender: 'female', cover: 'from-ink-700 via-ink-800 to-ink-800', rating: 4.9, reviews: 256 },
    { ...gymBase, classes: [{ ...cl('k-f1', 'کاراته کودکان', 'کاراته', 'سنسی بهرامی', 2, '17:00', 60, 12, 90_000), audience: 'kids', ageMin: 6, ageMax: 12 }], id: 'g-fight', name: 'آکادمی رزمی شیر', tagline: 'بوکس، کیک‌بوکسینگ، MMA', description: 'رینگ استاندارد، کیسه‌های حرفه‌ای و مربیان قهرمان ملی.', address: 'انقلاب، خیابان وصال', lat: 35.7010, lng: 51.3960, sessionPrice: 110_000, facilities: ['رینگ', 'دوش', 'کمد'], sports: ['بوکس', 'کیک‌بوکسینگ', 'MMA'], hours: '۹ صبح تا ۱۱ شب', gender: 'male', cover: 'from-ink-900 via-ink-900 to-black', rating: 4.5, reviews: 97 },
    { ...gymBase, classes: [cl('k-c1', 'WOD صبح', 'کراس‌فیت', 'کاوه نیک‌نام', 0, '07:00', 60, 16), cl('k-c2', 'WOD عصر', 'کراس‌فیت', 'کاوه نیک‌نام', 2, '19:30', 60, 16), cl('k-c3', 'وزنه‌برداری المپیک', 'وزنه‌برداری', 'کاوه نیک‌نام', 4, '18:00', 75, 10)], id: 'g-cross', name: 'کراس‌فیت باکس ۲۱', tagline: 'WOD هر روز، جامعه‌ای پرانگیزه', description: 'باکس تخصصی کراس‌فیت با برنامه‌ی روزانه و رقابت‌های ماهانه.', address: 'شهرک غرب، فلامک', lat: 35.7570, lng: 51.3700, sessionPrice: 130_000, facilities: ['وزنه المپیک', 'Rig', 'روئینگ', 'پارکینگ'], sports: ['کراس‌فیت', 'وزنه‌برداری'], hours: '۶ صبح تا ۱۰ شب', gender: 'mixed', cover: 'from-ink-700 via-ink-800 to-ink-900', rating: 4.8, reviews: 143 },
    { ...gymBase, offPeak: { from: 12, to: 17, discountPct: 30 }, classes: [cl('k-y1', 'هاتا یوگا', 'یوگا', 'لیلا امینی', 0, '08:00', 75, 12, 120_000), cl('k-y2', 'وینیاسا', 'یوگا', 'لیلا امینی', 2, '18:00', 60, 12), cl('k-y3', 'مدیتیشن', 'مدیتیشن', 'لیلا امینی', 4, '20:00', 40, 15, 80_000)], id: 'g-yoga', name: 'استودیو یوگا نیلوفر', tagline: 'آرامش ذهن و بدن', description: 'یوگای هاتا، وینیاسا و مدیتیشن در فضایی دنج و نورگیر.', address: 'زعفرانیه، خیابان آصف', lat: 35.8040, lng: 51.4130, sessionPrice: 100_000, facilities: ['مت و تجهیزات', 'چای‌خانه'], sports: ['یوگا', 'مدیتیشن'], hours: '۷ صبح تا ۹ شب', gender: 'mixed', cover: 'from-ink-700 via-brand-500 to-ink-900', rating: 4.9, reviews: 77 },
    { ...gymBase, kind: 'turf', id: 'v-turf', name: 'چمن مصنوعی آزادی', tagline: 'زمین استاندارد فوتبال ۷ نفره', description: 'زمین چمن مصنوعی نسل جدید با نورپردازی شب، رختکن و دوش. اجاره‌ی ساعتی برای تیم‌ها.', address: 'شهرک غرب، بلوار دادمان', lat: 35.7620, lng: 51.3640, sessionPrice: 0, facilities: ['نورپردازی', 'رختکن', 'دوش', 'پارکینگ'], sports: ['فوتبال'], hours: '۸ صبح تا ۱ بامداد', gender: 'mixed', cover: 'from-ink-700 via-ink-800 to-ink-900', rating: 4.6, reviews: 58, rental: { hourlyPrice: 1_200_000, openFrom: 8, openTo: 24, maxHours: 3 } },
    { ...gymBase, kind: 'hall', id: 'v-hall', name: 'سالن چندمنظوره‌ی پارس', tagline: 'فوتسال، والیبال و بسکتبال', description: 'سالن سرپوشیده با کفپوش استاندارد و سکوی تماشاگر.', address: 'نارمک، میدان هفت حوض', lat: 35.7380, lng: 51.5030, sessionPrice: 0, facilities: ['رختکن', 'دوش', 'سکوی تماشاگر'], sports: ['فوتسال', 'والیبال', 'بسکتبال'], hours: '۸ صبح تا ۱۲ شب', gender: 'mixed', cover: 'from-ink-800 via-ink-800 to-ink-900', rating: 4.4, reviews: 33, rental: { hourlyPrice: 900_000, openFrom: 8, openTo: 24, maxHours: 3 } },
    { ...gymBase, kind: 'equestrian', id: 'v-horse', name: 'باشگاه سوارکاری نسیم', tagline: 'آموزش سوارکاری از مقدماتی تا پرش', description: 'مربیان فدراسیون، اسب‌های آرام برای مبتدی‌ها و میدان سرپوشیده.', address: 'کرج، محمدشهر', lat: 35.7700, lng: 50.9500, sessionPrice: 650_000, facilities: ['میدان سرپوشیده', 'کلاه و تجهیزات ایمنی', 'پارکینگ'], sports: ['سوارکاری'], hours: '۸ صبح تا غروب', gender: 'mixed', cover: 'from-ink-700 via-ink-800 to-ink-900', rating: 4.9, reviews: 41, classes: [cl('k-h1', 'آموزش مقدماتی', 'سوارکاری', 'مربی فدراسیون', 1, '09:00', 60, 4), cl('k-h2', 'سواری آزاد با مربی', 'سوارکاری', 'مربی فدراسیون', 4, '16:00', 60, 6)] },
    { ...gymBase, id: 'g-new', name: 'باشگاه انرژی', tagline: 'باشگاه جدید در انتظار تایید', description: 'باشگاه نوساز در تهرانپارس.', address: 'تهرانپارس، فلکه اول', lat: 35.7310, lng: 51.5370, sessionPrice: 70_000, facilities: ['پارکینگ'], sports: ['بدنسازی'], hours: '۸ صبح تا ۱۰ شب', gender: 'mixed', cover: 'from-ink-800 via-ink-900 to-ink-900', rating: 0, reviews: 0, approved: false },
  ]

  const coaches: CoachProfile[] = [
    { userId: 'u-coach1', verified: true, title: 'مربی بدنسازی و فیتنس', specialties: ['حجم عضلانی', 'چربی‌سوزی', 'آمادگی مسابقات'], experienceYears: 10, bio: 'دارای مدرک بین‌المللی ISSA و مربی درجه یک فدراسیون. بیش از ۵۰۰ شاگرد موفق.', rating: 4.9, students: 540, online: true, callPrice: 150_000, certificates: ['ISSA CPT', 'مربیگری درجه ۱ فدراسیون'], plans: [
      { id: 'cp-1', title: 'برنامه تمرینی ۸ هفته‌ای حجم', kind: 'workout', price: 450_000, durationWeeks: 8, description: 'برنامه‌ی اختصاصی ۴ تا ۵ روز در هفته بر اساس سطح و تجهیزات شما' },
      { id: 'cp-2', title: 'پکیج کامل تمرین + تغذیه', kind: 'both', price: 890_000, durationWeeks: 8, description: 'برنامه تمرینی و رژیم غذایی اختصاصی + پشتیبانی چت هفتگی' },
    ] },
    { userId: 'u-coach2', verified: true, title: 'کارشناس تغذیه ورزشی', specialties: ['کاهش وزن', 'رژیم کتو', 'تغذیه بانوان'], experienceYears: 7, bio: 'کارشناس ارشد علوم تغذیه. تخصص در کاهش وزن اصولی و پایدار بدون رژیم‌های سخت.', rating: 4.8, students: 320, online: false, callPrice: 120_000, certificates: ['کارشناسی ارشد تغذیه', 'Precision Nutrition L1'], plans: [
      { id: 'cp-3', title: 'رژیم کاهش وزن ۴ هفته‌ای', kind: 'diet', price: 380_000, durationWeeks: 4, description: 'رژیم منعطف با غذاهای ایرانی و لیست خرید هفتگی' },
      { id: 'cp-4', title: 'رژیم ۱۲ هفته‌ای + پیگیری', kind: 'diet', price: 950_000, durationWeeks: 12, description: 'اصلاح هر ۲ هفته + چت نامحدود' },
    ] },
  ]

  const doctors: DoctorProfile[] = [
    { userId: 'u-physio', kind: 'physio', mode: 'both', address: 'ونک، خیابان ملاصدرا، کلینیک حرکت', verified: true, specialty: 'فیزیوتراپی ورزشی', medicalCode: 'ف‌ت ۴۴۱۲۰', bio: 'توانبخشی پس از آسیب رباط و جراحی زانو، دردهای شانه و کمر ورزشکاران.', visitPrice: 450_000, rating: 4.8, visits: 312, slots: slots(), online: true },
    { userId: 'u-psych', kind: 'psych', mode: 'online', verified: true, specialty: 'روان‌شناسی ورزشی', medicalCode: 'ن‌ر ۷۷۸۱', bio: 'افزایش انگیزه و تمرکز، مدیریت اضطراب مسابقه و بازگشت ذهنی پس از آسیب.', visitPrice: 600_000, rating: 4.9, visits: 210, slots: slots(), online: true },
    { userId: 'u-massage', kind: 'massage', mode: 'inperson', address: 'جردن، مجموعه آبی آکوا', verified: true, specialty: 'ماساژ ورزشی و ریکاوری', medicalCode: 'فنی‌وحرفه‌ای ۵۵۲۱۹', bio: 'ماساژ بافت عمقی، ریکاوری پس از مسابقه و آزادسازی عضلات.', visitPrice: 700_000, rating: 4.7, visits: 540, slots: slots(), online: true },
    { userId: 'u-doctor', verified: true, specialty: 'متخصص پزشکی ورزشی', medicalCode: 'ن‌پ ۱۲۳۴۵۶', bio: 'فلوشیپ آسیب‌های ورزشی. مشاوره در زمینه‌ی آسیب‌ها، توانبخشی و چکاپ ورزشکاران.', visitPrice: 350_000, rating: 4.9, visits: 860, slots: slots(), online: true },
  ]

  const products: Product[] = [
    { id: 'p-1', sellerId: 'u-seller', name: 'پروتئین وی گلد استاندارد ۲٫۲۷ کیلو', brand: 'Optimum Nutrition', category: 'supplement', price: 4_950_000, discount: 10, stock: 24, description: '۲۴ گرم پروتئین در هر سروینگ، طعم شکلاتی', emoji: '', rating: 4.9, sold: 812, createdAt: ago(200) },
    { id: 'p-2', sellerId: 'u-seller', name: 'کراتین مونوهیدرات ۳۰۰ گرم', brand: 'Muscletech', category: 'supplement', price: 1_250_000, discount: 0, stock: 40, description: 'افزایش قدرت و حجم عضلات', emoji: '', rating: 4.8, sold: 530, createdAt: ago(190) },
    { id: 'p-3', sellerId: 'u-seller', name: 'BCAA ۴۰۰ گرم طعم هندوانه', brand: 'Scivation Xtend', category: 'supplement', price: 1_690_000, discount: 15, stock: 18, description: 'ریکاوری سریع‌تر پس از تمرین', emoji: '', rating: 4.6, sold: 301, createdAt: ago(180) },
    { id: 'p-4', sellerId: 'u-seller', name: 'دمبل قابل تنظیم ۲۴ کیلو', brand: 'Bowflex', category: 'equipment', price: 8_900_000, discount: 5, stock: 6, description: 'جایگزین ۱۵ جفت دمبل در خانه', emoji: '', rating: 4.7, sold: 64, createdAt: ago(170) },
    { id: 'p-5', sellerId: 'u-seller', name: 'مت یوگا ۸ میلی‌متری', brand: 'Liforme', category: 'equipment', price: 690_000, discount: 0, stock: 50, description: 'ضد لغزش و دوستدار محیط زیست', emoji: '', rating: 4.5, sold: 222, createdAt: ago(160) },
    { id: 'p-6', sellerId: 'u-seller', name: 'کش مقاومتی ۵ عددی', brand: 'TheraBand', category: 'equipment', price: 420_000, discount: 20, stock: 70, description: 'مناسب تمرین در خانه و سفر', emoji: '', rating: 4.4, sold: 410, createdAt: ago(150) },
    { id: 'p-7', sellerId: 'u-seller', name: 'ست لباس ورزشی دری‌فیت', brand: 'Nike', category: 'apparel', price: 1_850_000, discount: 0, stock: 12, description: 'تیشرت و شلوارک تنفس‌پذیر', emoji: '', rating: 4.6, sold: 98, createdAt: ago(140) },
    { id: 'p-8', sellerId: 'u-seller', name: 'کفش رانینگ پگاسوس', brand: 'Nike', category: 'apparel', price: 6_400_000, discount: 12, stock: 9, description: 'سبک و پاسخگو برای دویدن روزانه', emoji: '', rating: 4.8, sold: 77, createdAt: ago(130) },
    { id: 'p-9', sellerId: 'u-seller', name: 'شیکر هوشمند ۷۰۰ میل', brand: 'BlenderBottle', category: 'accessory', price: 350_000, discount: 0, stock: 100, description: 'با توپ فنری و درب ضدنشت', emoji: '', rating: 4.5, sold: 650, createdAt: ago(120) },
    { id: 'p-10', sellerId: 'u-seller', name: 'ساعت هوشمند ورزشی', brand: 'Xiaomi', category: 'accessory', price: 3_200_000, discount: 8, stock: 15, description: 'ضربان قلب، قدم‌شمار و GPS', emoji: '', rating: 4.6, sold: 143, createdAt: ago(110) },
  ]

  const restaurants: Restaurant[] = [
    { id: 'r-sabz', ownerId: 'u-rest', name: 'سالادبار سبزینه', description: 'سالادهای تازه و کاسه‌های پروتئینی', address: 'ونک، خیابان گاندی', lat: 35.7550, lng: 51.4120, cover: 'from-ink-700 via-ink-800 to-brand-600', rating: 4.8, deliveryMinutes: 30, open: true, approved: true },
    { id: 'r-fit', ownerId: 'u-rest', name: 'فیت‌کیچن', description: 'غذای رژیمی با کالری‌شماری دقیق', address: 'سعادت‌آباد، بلوار دریا', lat: 35.7760, lng: 51.3700, cover: 'from-ink-700 via-ink-800 to-ink-800', rating: 4.7, deliveryMinutes: 40, open: true, approved: true },
    { id: 'r-keto', ownerId: 'u-rest', name: 'کتو هاوس', description: 'غذاهای کتوژنیک و کم‌کربوهیدرات', address: 'جردن', lat: 35.7680, lng: 51.4150, cover: 'from-ink-800 via-ink-800 to-ink-800', rating: 4.6, deliveryMinutes: 45, open: true, approved: true },
  ]

  const foods: Food[] = [
    { id: 'f-1', restaurantId: 'r-sabz', name: 'سالاد سزار مرغ گریل', description: 'کاهو رسمی، مرغ گریل، پارمزان، سس ماست', price: 285_000, calories: 420, protein: 38, carbs: 18, fat: 20, tags: ['پرپروتئین'], emoji: '', available: true },
    { id: 'f-2', restaurantId: 'r-sabz', name: 'پوکه بول سالمون', description: 'برنج قهوه‌ای، سالمون، آووکادو، ادامامه', price: 465_000, calories: 560, protein: 34, carbs: 52, fat: 22, tags: ['امگا ۳'], emoji: '', available: true },
    { id: 'f-3', restaurantId: 'r-sabz', name: 'اسموتی سبز دتاکس', description: 'اسفناج، سیب سبز، زنجبیل، موز', price: 145_000, calories: 180, protein: 4, carbs: 38, fat: 1, tags: ['وگان'], emoji: '', available: true },
    { id: 'f-4', restaurantId: 'r-fit', name: 'سینه مرغ و کینوا', description: '۲۰۰ گرم سینه مرغ، کینوا، سبزیجات بخارپز', price: 310_000, calories: 480, protein: 48, carbs: 40, fat: 10, tags: ['پرپروتئین', 'حجم'], emoji: '', available: true },
    { id: 'f-5', restaurantId: 'r-fit', name: 'استیک گوساله و سیب‌زمینی شیرین', description: 'فیله گوساله ۱۸۰ گرمی', price: 520_000, calories: 610, protein: 45, carbs: 45, fat: 24, tags: ['حجم'], emoji: '', available: true },
    { id: 'f-6', restaurantId: 'r-fit', name: 'املت سفیده و جو دوسر', description: 'صبحانه‌ی ورزشی', price: 165_000, calories: 320, protein: 28, carbs: 35, fat: 6, tags: ['صبحانه', 'کم‌چرب'], emoji: '', available: true },
    { id: 'f-7', restaurantId: 'r-keto', name: 'برگر کتو بدون نان', description: 'گوشت گوساله، پنیر چدار، کاهو', price: 340_000, calories: 520, protein: 36, carbs: 6, fat: 38, tags: ['کتو'], emoji: '', available: true },
    { id: 'f-8', restaurantId: 'r-keto', name: 'پیتزا با خمیر گل‌کلم', description: 'کم‌کربوهیدرات و خوشمزه', price: 390_000, calories: 450, protein: 30, carbs: 12, fat: 30, tags: ['کتو', 'گیاهی'], emoji: '', available: true },
    { id: 'f-9', restaurantId: 'r-keto', name: 'دسر چیا و نارگیل', description: 'بدون شکر', price: 120_000, calories: 220, protein: 6, carbs: 9, fat: 17, tags: ['کتو', 'دسر'], emoji: '', available: true },
  ]

  const posts: Post[] = [
    { id: 'post-1', authorId: 'u-coach1', text: '۵ اشتباه رایج در اسکات که زانوهات رو داغون می‌کنه \n۱. زانو به داخل\n۲. پاشنه از زمین جدا\n۳. کمر گرد\n۴. نفس حبس\n۵. عمق ناکافی\nکدومش رو داری؟', gradient: 'from-ink-700 via-ink-800 to-ink-900', likes: ['u-sara', 'u-mina', 'u-reza'], saves: ['u-sara'], comments: [{ id: 'c1', authorId: 'u-mina', text: 'من شماره ۲', at: ago(3) }], createdAt: ago(5) },
    { id: 'post-2', authorId: 'u-reza', text: 'امروز ۲۱ کیلومتر رو زیر ۲ ساعت دویدم! ممنون از همه‌ی کسایی که توی چالش حمایت کردن.', gradient: 'from-ink-700 via-ink-800 to-ink-900', likes: ['u-sara', 'u-coach1', 'u-ali', 'u-mina'], saves: [], comments: [{ id: 'c2', authorId: 'u-coach1', text: 'دمت گرم قهرمان', at: ago(7) }], createdAt: ago(9), challengeId: 'ch-steps' },
    { id: 'post-3', authorId: 'u-coach2', text: 'یه صبحانه‌ی ۳۰۰ کالری پرپروتئین: ۲ تخم‌مرغ + ۲ سفیده + نصف نون سنگک + گوجه و خیار \nساده، ارزون، سیرکننده.', gradient: 'from-ink-700 via-ink-800 to-brand-700', likes: ['u-sara', 'u-hamed'], saves: ['u-sara', 'u-mina'], comments: [], createdAt: ago(20) },
    { id: 'post-4', authorId: 'u-ali', text: 'سونا و جکوزی آیرون‌من بازسازی شد با اشتراک کی‌فیت بدون ثبت‌نام بیاین!', gradient: 'from-ink-800 via-ink-800 to-ink-900', likes: ['u-reza'], saves: [], comments: [], createdAt: ago(30), gymId: 'g-iron' },
    { id: 'post-5', authorId: 'u-mina', text: 'روز ۹ از چالش ۳۰ روز تمرین کی دیگه هست؟', gradient: 'from-ink-800 via-ink-900 to-ink-900', likes: ['u-sara', 'u-coach1'], saves: [], comments: [], createdAt: ago(40), challengeId: 'ch-30day' },
  ]

  const stories: Story[] = [
    { id: 's-1', authorId: 'u-coach1', text: 'تمرین امروز: پا ۵×۵ اسکات', gradient: 'from-ink-700 via-ink-800 to-ink-900', seenBy: [], createdAt: ago(2) },
    { id: 's-2', authorId: 'u-reza', text: '۱۲٬۴۰۰ قدم تا الان', gradient: 'from-ink-700 via-ink-800 to-ink-900', seenBy: [], createdAt: ago(4) },
    { id: 's-3', authorId: 'u-coach2', text: 'یادتون نره آب بخورید', gradient: 'from-ink-700 via-ink-800 to-ink-900', seenBy: [], createdAt: ago(6) },
    { id: 's-4', authorId: 'u-mina', text: 'WOD امروز تموم شد', gradient: 'from-ink-700 via-ink-800 to-ink-900', seenBy: [], createdAt: ago(8) },
    { id: 's-5', authorId: 'u-ali', text: 'تخفیف ویژه‌ی آخر هفته در آیرون‌من', gradient: 'from-ink-800 via-ink-800 to-ink-900', seenBy: [], createdAt: ago(10) },
  ]

  const p = (userId: string, score: number) => ({ userId, score, joinedAt: ago(100), logs: [{ id: 'l-' + userId, at: ago(24), value: score, source: 'manual' as const, status: 'ok' as const }] })
  const challenges: Challenge[] = [
    { id: 'ch-steps', verification: 'proof', pool: 2_320_000, creatorId: 'u-coach1', title: 'چالش ۳۰۰ هزار قدم', description: 'در ۳۰ روز ۳۰۰٬۰۰۰ قدم بردار! هر روز قدم‌هات رو ثبت کن و با بقیه رقابت کن.', metric: 'steps', unit: 'قدم', goal: 300_000, entryFee: 100_000, creationFee: 500_000, sponsorPrize: 2_000_000, extraReward: 'یک ماه اشتراک طلایی برای نفر اول', prizes: [{ rank: 1, title: 'نفر اول', percent: 50 }, { rank: 2, title: 'نفر دوم', percent: 30 }, { rank: 3, title: 'نفر سوم', percent: 20 }], xpReward: 300, gradient: 'from-ink-700 via-ink-800 to-ink-900', emoji: '', startAt: ago(24 * 10), endAt: ahead(24 * 20), maxParticipants: 500, participants: [p('u-reza', 142_000), p('u-mina', 98_500), p('u-hamed', 61_200), p('u-coach2', 87_300)], status: 'active', createdAt: ago(24 * 11) },
    { id: 'ch-30day', verification: 'auto', pool: 1_120_000, creatorId: 'u-ali', title: '۳۰ روز، ۳۰ تمرین', description: 'هر روز حداقل یک جلسه تمرین. هر جلسه = ۱ امتیاز. سازگاری = قهرمانی!', metric: 'workouts', unit: 'جلسه', goal: 30, entryFee: 50_000, creationFee: 500_000, sponsorPrize: 1_000_000, extraReward: '۱۰ جلسه ورود رایگان به آیرون‌من', prizes: [{ rank: 1, title: 'نفر اول', percent: 60 }, { rank: 2, title: 'نفر دوم', percent: 40 }], xpReward: 250, gradient: 'from-ink-800 via-ink-900 to-ink-900', emoji: '', startAt: ago(24 * 9), endAt: ahead(24 * 21), maxParticipants: 300, participants: [p('u-mina', 9), p('u-sara', 6), p('u-reza', 8)], status: 'active', createdAt: ago(24 * 10) },
    { id: 'ch-loss', verification: 'proof', pool: 160_000, creatorId: 'u-coach2', title: 'چالش ۵ کیلو در ۶ هفته', description: 'کاهش وزن اصولی با همراهی کارشناس تغذیه. کاهش وزن هفتگی‌ات رو ثبت کن.', metric: 'weight_loss', unit: 'کیلوگرم', goal: 5, entryFee: 200_000, creationFee: 500_000, sponsorPrize: 0, extraReward: 'رژیم ۱۲ هفته‌ای رایگان', prizes: [{ rank: 1, title: 'نفر اول', percent: 50 }, { rank: 2, title: 'نفر دوم', percent: 30 }, { rank: 3, title: 'نفر سوم', percent: 20 }], xpReward: 400, gradient: 'from-ink-700 via-ink-800 to-brand-700', emoji: '', startAt: ago(24 * 3), endAt: ahead(24 * 39), maxParticipants: 200, participants: [p('u-hamed', 1.2)], status: 'active', createdAt: ago(24 * 4) },
    { id: 'ch-run', verification: 'proof', pool: 500_000, creatorId: 'u-reza', title: 'ماراتن مجازی ۴۲ کیلومتر', description: 'در دو هفته مجموعاً ۴۲ کیلومتر بدو. هر کجا، هر زمان!', metric: 'km', unit: 'کیلومتر', goal: 42, entryFee: 0, creationFee: 500_000, sponsorPrize: 500_000, extraReward: 'مدال دیجیتال ماراتن', prizes: [{ rank: 1, title: 'نفر اول', percent: 100 }], xpReward: 200, gradient: 'from-ink-700 via-ink-800 to-ink-900', emoji: '', startAt: ago(24), endAt: ahead(24 * 13), maxParticipants: 1000, participants: [p('u-reza', 12.5), p('u-mina', 6)], status: 'active', createdAt: ago(30) },
  ]

  const threads: Thread[] = [
    { id: 't-team1', members: ['u-mina', 'u-sara', 'u-reza'], context: 'team', title: 'صبح‌خیزها', teamId: 'tm-1', updatedAt: ago(5), messages: [
      { id: 'tm1', from: 'u-mina', text: 'بچه‌ها پنجشنبه ساعت ۷ کراس‌فیت باکس ۲۱، کی میاد؟', at: ago(6) },
      { id: 'tm2', from: 'u-reza', text: 'من هستم', at: ago(5) },
    ] },
    { id: 't-1', members: ['u-sara', 'u-coach1'], context: 'coach', updatedAt: ago(2), messages: [
      { id: 'm1', from: 'u-sara', text: 'سلام آقای کریمی، برای چربی‌سوزی شکمی چه پیشنهادی دارید؟', at: ago(3) },
      { id: 'm2', from: 'u-coach1', text: 'سلام سارا جان چربی‌سوزی موضعی نداریم؛ ترکیب تمرین مقاومتی + کسری کالری جواب میده. اگه بخوای برنامه‌ی اختصاصی برات می‌نویسم.', at: ago(2) },
    ] },
  ]

  const today = dayKey()
  // یک هفته سابقه‌ی فعالیت برای نمودار هفتگی
  const week = [[6, 7400, 35], [8, 9100, 50], [5, 4300, 20], [7, 6800, 40], [8, 11200, 60], [4, 3900, 15]]
  const dailyLogs: DailyLog[] = [
    ...week.map(([water, steps, workoutMinutes], i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return { userId: 'u-sara', day: dayKey(d), water, steps, workoutMinutes, calories: 1800, sleepHours: 7, missionsDone: [], rewardClaimed: true }
    }),
    { userId: 'u-sara', day: today, water: 3, steps: 3200, workoutMinutes: 0, calories: 900, sleepHours: 7, missionsDone: [], rewardClaimed: false },
  ]

  // چرخه‌ی نمونه برای کاربر نمایشی (روز سوم قاعدگی)
  const dayAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return dayKey(d)
  }

  const reviews: Review[] = [
    { id: 'rv-1', kind: 'gym', refId: 'g-iron', userId: 'u-sara', stars: 5, text: 'تجهیزات عالی و تمیز؛ پذیرش با QR خیلی سریع بود.', createdAt: ago(40), reply: 'ممنون از انرژی‌ات سارا جان!' },
    { id: 'rv-2', kind: 'gym', refId: 'g-iron', userId: 'u-reza', stars: 4, text: 'عصرها شلوغه ولی ساعت ۱۱ صبح خلوت و ارزون‌تره.', createdAt: ago(90) },
    { id: 'rv-3', kind: 'gym', refId: 'g-pulse', userId: 'u-mina', stars: 5, text: 'کلاس اسپینینگ سحر عالیه.', createdAt: ago(70) },
    { id: 'rv-4', kind: 'product', refId: 'p-1', userId: 'u-reza', stars: 5, text: 'اصل بود و سریع رسید.', createdAt: ago(50) },
  ]

  const workouts: WorkoutSession[] = [
    { id: 'w-1', userId: 'u-sara', day: dayAgo(5), title: 'بالاتنه', durationMin: 45, createdAt: ago(24 * 5), exercises: [
      { exerciseId: 'bench', sets: [{ reps: 10, weight: 25 }, { reps: 8, weight: 30 }, { reps: 8, weight: 30 }] },
      { exerciseId: 'row', sets: [{ reps: 12, weight: 20 }, { reps: 12, weight: 22.5 }] },
    ] },
    { id: 'w-2', userId: 'u-sara', day: dayAgo(3), title: 'پایین‌تنه', durationMin: 50, createdAt: ago(24 * 3), exercises: [
      { exerciseId: 'squat', sets: [{ reps: 10, weight: 35 }, { reps: 8, weight: 40 }, { reps: 6, weight: 45 }] },
      { exerciseId: 'hipthrust', sets: [{ reps: 12, weight: 40 }, { reps: 10, weight: 50 }] },
    ] },
  ]

  const meals: MealLog[] = [
    { id: 'ml-1', userId: 'u-sara', day: today, meal: 'breakfast', name: 'نان سنگک', qty: 1, kcal: 210, protein: 7, carbs: 42, fat: 1, source: 'db', createdAt: ago(5) },
    { id: 'ml-2', userId: 'u-sara', day: today, meal: 'breakfast', name: 'تخم‌مرغ آب‌پز', qty: 2, kcal: 156, protein: 13, carbs: 1, fat: 11, source: 'db', createdAt: ago(5) },
  ]

  const bodyEntries: BodyEntry[] = [
    ...[64.2, 63.8, 63.5, 63.1, 62.6, 62].map((w, i) => ({ id: `be-${i}`, userId: 'u-sara', day: dayAgo(35 - i * 7), weightKg: w, waistCm: 74 - i * 0.6, createdAt: ago(24 * (35 - i * 7)) })),
    { id: 'be-ib1', userId: 'u-sara', day: dayAgo(30), weightKg: 63.9, bodyFatPct: 27.4, muscleKg: 24.1, visceralFat: 6, bmr: 1380, waterPct: 51, source: 'inbody', gymId: 'g-iron', createdAt: ago(24 * 30) },
    { id: 'be-ib2', userId: 'u-sara', day: dayAgo(2), weightKg: 62, bodyFatPct: 25.1, muscleKg: 24.8, visceralFat: 5, bmr: 1405, waterPct: 53, source: 'inbody', gymId: 'g-iron', createdAt: ago(24 * 2) },
  ]

  const pic = (label: string, hue: number) =>
    'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="100%" height="100%" fill="hsl(${hue},25%,22%)"/><text x="50%" y="52%" font-family="sans-serif" font-size="34" fill="#fff" text-anchor="middle">${label}</text></svg>`)
  const used = (id: string, userId: string, gymId: string, daysAgo: number, paid: number) =>
    ({ id, userId, gymId, price: paid, paid, code: String(100000 + daysAgo * 37), paidWith: 'subscription' as const, status: 'used' as const, validUntil: ago(24 * daysAgo - 10), usedAt: ago(24 * daysAgo - 1), reviewed: true, createdAt: ago(24 * daysAgo) })

  return {
    version: 1,
    users,
    subscriptions: [
      { userId: 'u-sara', planId: 'plan-gold', credit: 1_540_000, startedAt: ago(24 * 8), expiresAt: ahead(24 * 22), freeChallengeUsed: 0, freeDoctorUsed: 0 },
      ...['u-reza', 'u-hamed', 'u-org'].map((userId) => ({ userId, planId: 'plan-silver', credit: 900_000, startedAt: ago(24 * 20), expiresAt: ahead(24 * 10), freeChallengeUsed: 0, freeDoctorUsed: 0, orgId: 'org-1' })),
    ],
    wallets: { 'u-sara': 1_250_000, 'u-ali': 8_400_000, 'u-coach1': 3_200_000, 'u-coach2': 1_900_000, 'u-seller': 12_500_000, 'u-doctor': 4_100_000, 'u-rest': 2_300_000, 'u-mina': 600_000, 'u-reza': 900_000, 'u-hamed': 300_000, 'u-admin': 0, 'u-org': 5_000_000, platform: 6_850_000, escrow: 4_100_000 },
    transactions: [
      { id: 'tx-seed1', type: 'subscription', from: 'u-sara', payerId: 'u-sara', to: 'platform', amount: 1_890_000, commission: 1_890_000, description: 'خرید اشتراک طلایی', createdAt: ago(24 * 8) },
      { id: 'tx-seed2', type: 'checkin', from: 'subscription', to: 'u-ali', payerId: 'u-sara', amount: 120_000, commission: 18_000, module: 'fityab', refId: 'g-iron', description: 'ورود سارا محمدی به باشگاه آیرون‌من', createdAt: ago(24 * 2) },
      { id: 'tx-seed3', type: 'coach_plan', from: 'u-mina', payerId: 'u-mina', to: 'u-coach1', amount: 890_000, commission: 178_000, module: 'fityar', description: 'خرید پکیج کامل تمرین + تغذیه', createdAt: ago(24 * 5) },
      { id: 'tx-seed4', type: 'shop_order', from: 'u-reza', payerId: 'u-reza', to: 'u-seller', amount: 4_455_000, commission: 445_500, module: 'shop', description: 'سفارش فروشگاه', createdAt: ago(24 * 3) },
    ],
    payouts: [{ id: 'po-1', userId: 'u-ali', amount: 3_000_000, iban: 'IR120170000000123456789012', status: 'pending', createdAt: ago(12) }],
    gyms,
    checkins: [
      { id: 'ci-seed', userId: 'u-sara', gymId: 'g-iron', price: 120_000, paid: 120_000, code: '482913', paidWith: 'subscription', status: 'used', validUntil: ago(24 * 2 - 10), usedAt: ago(24 * 2 - 1), reviewed: true, createdAt: ago(24 * 2) },
      used('ci-h1', 'u-mina', 'g-iron', 5, 120_000), used('ci-h2', 'u-mina', 'g-iron', 12, 120_000),
      used('ci-h3', 'u-reza', 'g-iron', 30, 120_000), used('ci-h4', 'u-reza', 'g-iron', 70, 120_000),
      used('ci-h5', 'u-hamed', 'g-iron', 60, 120_000),
    ],
    coaches,
    planOrders: [
      { id: 'po-seed', userId: 'u-mina', coachId: 'u-coach1', planId: 'cp-2', title: 'پکیج کامل تمرین + تغذیه', price: 890_000, status: 'pending', answers: 'قد ۱۶۸، وزن ۶۵، هدف: تناسب اندام، ۴ روز در هفته باشگاه', createdAt: ago(24 * 5) },
    ],
    threads,
    products,
    orders: [
      { id: 'o-seed', kind: 'shop', userId: 'u-reza', vendorId: 'u-seller', items: [{ refId: 'p-1', name: 'پروتئین وی گلد استاندارد ۲٫۲۷ کیلو', price: 4_455_000, qty: 1 }], total: 4_455_000, address: 'تهران، ونک', status: 'paid', createdAt: ago(24 * 3) },
    ],
    doctors,
    appointments: [],
    restaurants,
    foods,
    posts,
    stories,
    challenges,
    notifications: [
      { id: 'n-1', userId: 'u-sara', title: 'به کی‌فیت خوش اومدی!', body: 'با اشتراکت بدون ثبت‌نام وارد باشگاه‌های طرف قرارداد شو.', icon: '', link: '/fityab', read: false, at: ago(1) },
      { id: 'n-2', userId: 'u-sara', title: 'چالش جدید', body: 'چالش «ماراتن مجازی ۴۲ کیلومتر» شروع شد!', icon: '', link: '/challenges/ch-run', read: false, at: ago(20) },
    ],
    dailyLogs,
    cycles: [{ userId: 'u-sara', lastPeriodStart: dayAgo(2), cycleLength: 28, periodLength: 5, history: [dayAgo(58), dayAgo(30), dayAgo(2)], logs: [{ day: dayAgo(1), flow: 'medium', symptoms: ['cramps'], mood: 'ok' }] }],
    carts: {},
    aiChats: {},
    entryRequests: [],
    reviews,
    reports: [],
    tickets: [
      { id: 'tk-1', userId: 'u-sara', subject: 'کد ورود باشگاه', category: 'gym', status: 'answered', createdAt: ago(30), updatedAt: ago(28), messages: [
        { from: 'u-sara', text: 'سلام، کد ورود را در پذیرش وارد کردند ولی خطا داد.', at: ago(30) },
        { from: 'u-admin', text: 'سلام، کد شما بررسی و تأیید شد. اگر دوباره تکرار شد از اسکن QR استفاده کنید.', at: ago(28), staff: true },
      ] },
    ],
    workouts,
    meals,
    bodyEntries,
    orgs: [{ id: 'org-1', name: 'دیجی‌نو', adminId: 'u-org', code: 'DIGINO', planId: 'plan-silver', seats: 10, members: ['u-org', 'u-reza', 'u-hamed'], createdAt: ago(24 * 20) }],
    giftCards: [],
    coupons: [
      { id: 'cp-k20', code: 'KEYFIT20', pct: 20, maxAmount: 300_000, module: 'all', maxUses: 500, usedBy: [], expiresAt: ahead(24 * 60), active: true },
      { id: 'cp-wel', code: 'WELCOME', pct: 10, maxAmount: 200_000, module: 'subscription', maxUses: 1000, usedBy: [], expiresAt: ahead(24 * 90), active: true },
    ],
    teams: [
      { id: 'tm-1', name: 'صبح‌خیزها', ownerId: 'u-mina', members: ['u-mina', 'u-sara', 'u-reza'], code: 'SOBH42', threadId: 't-team1', goal: 'هفته‌ای ۳ جلسه تمرین با هم', createdAt: ago(24 * 9),
        sessions: [{ id: 'ts-1', title: 'کراس‌فیت صبح پنجشنبه', at: ahead(30), gymId: 'g-cross', createdBy: 'u-mina', going: ['u-mina', 'u-reza'], notGoing: [] }] },
    ],
    insurancePlans: DEFAULT_INSURANCE_PLANS.map((p) => ({ ...p })),
    policies: [{ id: 'pol-1', userId: 'u-reza', planId: 'ins-pro', number: 'KF-140508-0001', nationalId: '0012345678', startAt: ago(24 * 40), endAt: ahead(24 * 325), status: 'active', createdAt: ago(24 * 40) }],
    claims: [{ id: 'cl-1', policyId: 'pol-1', userId: 'u-reza', incidentAt: ago(24 * 6), sport: 'دویدن', description: 'پیچ‌خوردگی مچ پا هنگام دویدن در پارک؛ ویزیت ارتوپد و فیزیوتراپی.', amount: 4_800_000, documents: [], status: 'submitted', createdAt: ago(24 * 4), updatedAt: ago(24 * 4) }],
    liveClasses: [
      { id: 'lc-yoga', hostId: 'u-coach2', title: 'یوگای صبحگاهی آنلاین', sport: 'یوگا', description: 'یوگای ملایم برای شروع روز؛ مت و یک فضای ۲×۲ متری کافی است.', level: 'all', at: ahead(26), durationMin: 45, price: 120_000, capacity: 30, attendees: ['u-mina'], joined: [], link: 'https://meet.jit.si/keyfit-lcyoga7x2k', status: 'scheduled', createdAt: ago(48) },
      { id: 'lc-hiit', hostId: 'u-coach1', title: 'HIIT خانگی ۳۰ دقیقه‌ای', sport: 'HIIT', description: 'چربی‌سوزی بدون وسیله؛ آب و حوله فراموش نشود.', level: 'intermediate', at: ahead(50), durationMin: 30, price: 80_000, capacity: 50, attendees: ['u-reza'], joined: [], link: 'https://meet.jit.si/keyfit-lchiit9q1m', status: 'scheduled', createdAt: ago(30) },
    ],
    campaigns: [],
    events: [
      { id: 'ev-run', organizerId: 'u-ali', title: 'دوی ۱۰ کیلومتر دریاچه‌ی چیتگر', kind: 'race', sport: 'دویدن', description: 'مسیر دور دریاچه با زمان‌گیری، ایستگاه آب و مدال برای همه‌ی شرکت‌کنندگان. ساعت ۷ صبح شروع می‌شود.', at: ahead(24 * 10), location: 'دریاچه‌ی چیتگر، ورودی شمالی', city: 'تهران', lat: 35.7440, lng: 51.2120, fee: 250_000, capacity: 300, categories: ['۵ کیلومتر', '۱۰ کیلومتر'], gender: 'mixed', cover: 'from-ink-700 via-ink-800 to-ink-900', registrations: [{ userId: 'u-reza', bib: 101, category: '۱۰ کیلومتر', at: ago(24) }], approved: true, status: 'open', createdAt: ago(72) },
      { id: 'ev-hike', organizerId: 'u-coach1', title: 'صعود دسته‌جمعی توچال', kind: 'hike', sport: 'کوهپیمایی', description: 'از ایستگاه ۵ تا قله با سرپرست مجرب. کفش کوه، لباس گرم و آب الزامی است.', at: ahead(24 * 5), location: 'تله‌کابین توچال، ایستگاه ۵', city: 'تهران', fee: 0, capacity: 40, categories: [], gender: 'mixed', cover: 'from-ink-800 via-ink-900 to-ink-900', registrations: [], approved: true, status: 'open', createdAt: ago(40) },
      { id: 'ev-bench', organizerId: 'u-ali', title: 'مسابقه‌ی پرس سینه آیرون‌من', kind: 'tournament', sport: 'بدنسازی', description: 'رقابت دوستانه‌ی پرس سینه در سه رده‌ی وزنی.', at: ago(24 * 20), location: 'باشگاه آیرون‌من', city: 'تهران', fee: 100_000, capacity: 30, categories: [], gender: 'male', cover: 'from-ink-900 via-ink-900 to-black', registrations: [
        { userId: 'u-reza', bib: 101, at: ago(24 * 30), checkedIn: true, result: { rank: 1, note: '۱۲۰ کیلوگرم' } },
        { userId: 'u-hamed', bib: 102, at: ago(24 * 29), checkedIn: true, result: { rank: 2, note: '۱۰۰ کیلوگرم' } },
      ], approved: true, status: 'done', createdAt: ago(24 * 35) },
      { id: 'ev-futsal', organizerId: 'u-ali', title: 'جام فوتسال محلات', kind: 'tournament', sport: 'فوتسال', description: 'تورنمنت حذفی تیم‌های ۵ نفره.', at: ahead(24 * 20), location: 'سالن چندمنظوره‌ی پارس', city: 'تهران', fee: 1_500_000, capacity: 16, categories: [], gender: 'male', cover: 'from-ink-700 via-ink-800 to-ink-900', registrations: [], approved: false, status: 'open', createdAt: ago(5) },
    ],
    listings: [
      { id: 'ls-1', sellerId: 'u-hamed', title: 'جفت دمبل ۱۰ کیلویی روکش‌دار', category: 'equipment', condition: 'good', price: 1_200_000, description: 'یک سال استفاده، بدون ترک. تحویل حضوری در غرب تهران یا ارسال با پیک.', photos: [pic('دمبل ۱۰ کیلو', 200)], city: 'تهران', status: 'active', createdAt: ago(30) },
      { id: 'ls-2', sellerId: 'u-mina', title: 'کفش کراس‌فیت ریباک نانو سایز ۳۸', category: 'apparel', condition: 'like_new', price: 2_400_000, description: 'فقط سه جلسه پوشیده شده؛ سایز برایم کوچک بود. با جعبه.', photos: [pic('ریباک نانو ۳۸', 330)], city: 'تهران', status: 'active', createdAt: ago(50) },
      { id: 'ls-3', sellerId: 'u-reza', title: 'تردمیل خانگی تاشو', category: 'equipment', condition: 'good', price: 18_000_000, description: 'حداکثر سرعت ۱۴، شیب دستی، سالم. فقط تحویل حضوری (شرق تهران).', photos: [pic('تردمیل', 20)], city: 'تهران', status: 'active', createdAt: ago(70) },
    ],
    settings: { commissions: { ...DEFAULT_COMMISSIONS }, challengeCreationFee: 500_000, minWithdraw: 500_000, shippingFee: 60_000, freeShippingOver: 2_000_000, referralReward: 100_000, orgDiscountPct: 15, venueKinds: ['gym', 'pool', 'equestrian', 'hall', 'turf'] },
  }
}

/** دیتابیس خالی برای نسخه‌ی واقعی (بدون داده‌ی نمایشی) */
export function createEmpty(): DBState {
  return {
    version: 1, users: [], subscriptions: [], wallets: { platform: 0, escrow: 0 }, transactions: [], payouts: [], gyms: [], checkins: [], coaches: [],
    planOrders: [], threads: [], products: [], orders: [], doctors: [], appointments: [], restaurants: [], foods: [], posts: [], stories: [],
    challenges: [], notifications: [], dailyLogs: [], cycles: [], carts: {}, aiChats: {}, entryRequests: [], reviews: [], reports: [], tickets: [],
    workouts: [], meals: [], bodyEntries: [], orgs: [], giftCards: [], coupons: [],
    teams: [], insurancePlans: DEFAULT_INSURANCE_PLANS.map((p) => ({ ...p })), policies: [], claims: [], liveClasses: [], campaigns: [], events: [], listings: [],
    settings: { commissions: { ...DEFAULT_COMMISSIONS }, challengeCreationFee: 500_000, minWithdraw: 500_000, shippingFee: 60_000, freeShippingOver: 2_000_000, referralReward: 100_000, orgDiscountPct: 15, venueKinds: ['gym'] },
  }
}
