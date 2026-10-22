import type {
  Challenge, CoachProfile, DoctorProfile, Food, Gym, Post, Product, Restaurant, Story, User, Thread, DailyLog,
} from './types'
import { DEFAULT_COMMISSIONS } from './config'
import type { DBState } from './db'
import { dayKey } from './format'

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
const ahead = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

function mkUser(id: string, name: string, roles: User['roles'], extra: Partial<User> = {}): User {
  // کاربران نمایشی دیروز فعال بوده‌اند تا استریک‌شان حفظ شود
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return {
    id, name, roles, lastActiveDay: extra.streak ? dayKey(y) : undefined, phone: '09120000000', city: 'تهران', xp: 0, streak: 0, following: [], createdAt: ago(24 * 60), ...extra,
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
    mkUser('u-sara', 'سارا محمدی', ['user'], { phone: '09121111111', xp: 740, streak: 6, gender: 'female', heightCm: 165, weightKg: 62, birthYear: 1377, goal: 'fit', bio: 'عاشق دویدن و یوگا', following: ['u-coach1', 'u-ali'] }),
    mkUser('u-ali', 'علی رضایی', ['user', 'gym'], { phone: '09122222222', xp: 1300, streak: 12, bio: 'مدیر باشگاه‌های آیرون‌من و پالس' }),
    mkUser('u-coach1', 'مهدی کریمی', ['user', 'coach'], { phone: '09123333333', xp: 3100, streak: 40, bio: 'مربی بدنسازی و فیتنس | ۱۰ سال سابقه' }),
    mkUser('u-coach2', 'نگار احمدی', ['user', 'coach'], { phone: '09124444444', xp: 2200, streak: 18, bio: 'مربی تغذیه و کاهش وزن' }),
    mkUser('u-seller', 'رضا پاورمکس', ['user', 'seller'], { phone: '09125555555', xp: 300, bio: 'فروشگاه مکمل پاورمکس' }),
    mkUser('u-doctor', 'دکتر لیلا صادقی', ['user', 'doctor'], { phone: '09126666666', xp: 500, bio: 'متخصص پزشکی ورزشی' }),
    mkUser('u-rest', 'سالادبار سبزینه', ['user', 'restaurant'], { phone: '09127777777', xp: 150 }),
    mkUser('u-admin', 'مدیر کی‌فیت', ['user', 'admin'], { phone: '09120000001', xp: 0 }),
    mkUser('u-mina', 'مینا کاظمی', ['user'], { xp: 980, streak: 9, bio: 'کراس‌فیت' }),
    mkUser('u-reza', 'رضا نوری', ['user'], { xp: 1650, streak: 21, bio: 'دونده‌ی ماراتن' }),
    mkUser('u-hamed', 'حامد یوسفی', ['user'], { xp: 420, streak: 3 }),
  ]

  const gymBase = { ownerId: 'u-ali', city: 'تهران', phone: '021-88000000', approved: true, createdAt: ago(500), media: [] as Gym['media'] }
  const gyms: Gym[] = [
    { ...gymBase, id: 'g-iron', name: 'باشگاه آیرون‌من', tagline: 'بدنسازی حرفه‌ای با تجهیزات روز', description: 'سالن ۸۰۰ متری با دستگاه‌های Technogym، سونا، جکوزی و مربیان مجرب. مناسب بدنسازی، فیتنس و کراس‌فیت.', address: 'ونک، خیابان ملاصدرا', lat: 35.7575, lng: 51.4085, sessionPrice: 120_000, facilities: ['سونا', 'جکوزی', 'پارکینگ', 'کمد اختصاصی', 'بوفه'], sports: ['بدنسازی', 'فیتنس', 'کراس‌فیت'], hours: '۶ صبح تا ۱۲ شب', gender: 'mixed', cover: 'from-ink-800 via-ink-800 to-ink-900', rating: 4.8, reviews: 312, media: [{ type: 'video', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' }] },
    { ...gymBase, id: 'g-pulse', name: 'فیتنس پالس', tagline: 'کلاس‌های گروهی پرانرژی', description: 'اسپینینگ، زومبا، HIIT و TRX با بهترین مربیان. فضای شاد و صمیمی.', address: 'سعادت‌آباد، میدان کاج', lat: 35.7797, lng: 51.3740, sessionPrice: 95_000, facilities: ['کلاس گروهی', 'دوش', 'پارکینگ'], sports: ['اسپینینگ', 'زومبا', 'HIIT', 'TRX'], hours: '۷ صبح تا ۱۱ شب', gender: 'mixed', cover: 'from-ink-700 via-ink-800 to-ink-900', rating: 4.6, reviews: 188 },
    { ...gymBase, ownerId: 'u-ali', id: 'g-aqua', name: 'مجموعه آبی آکوا', tagline: 'استخر، سونا و ماساژ', description: 'استخر نیمه‌المپیک، سونای خشک و بخار، جکوزی و ماساژ. سانس‌های بانوان و آقایان جدا.', address: 'جردن، خیابان طاهری', lat: 35.7700, lng: 51.4170, sessionPrice: 180_000, facilities: ['استخر', 'سونا خشک', 'سونا بخار', 'جکوزی', 'ماساژ'], sports: ['شنا', 'آکوا ایروبیک'], hours: '۸ صبح تا ۱۰ شب', gender: 'mixed', cover: 'from-ink-700 via-ink-800 to-ink-900', rating: 4.7, reviews: 421 },
    { ...gymBase, id: 'g-lady', name: 'باشگاه بانوان رز', tagline: 'ویژه‌ی بانوان', description: 'یوگا، پیلاتس، ایروبیک و بدنسازی بانوان با محیطی آرام و امن.', address: 'پونک، بلوار عدل', lat: 35.7608, lng: 51.3290, sessionPrice: 85_000, facilities: ['یوگا', 'پیلاتس', 'مهدکودک', 'دوش'], sports: ['یوگا', 'پیلاتس', 'ایروبیک'], hours: '۸ صبح تا ۹ شب', gender: 'female', cover: 'from-ink-700 via-ink-800 to-ink-800', rating: 4.9, reviews: 256 },
    { ...gymBase, id: 'g-fight', name: 'آکادمی رزمی شیر', tagline: 'بوکس، کیک‌بوکسینگ، MMA', description: 'رینگ استاندارد، کیسه‌های حرفه‌ای و مربیان قهرمان ملی.', address: 'انقلاب، خیابان وصال', lat: 35.7010, lng: 51.3960, sessionPrice: 110_000, facilities: ['رینگ', 'دوش', 'کمد'], sports: ['بوکس', 'کیک‌بوکسینگ', 'MMA'], hours: '۹ صبح تا ۱۱ شب', gender: 'male', cover: 'from-ink-900 via-ink-900 to-black', rating: 4.5, reviews: 97 },
    { ...gymBase, id: 'g-cross', name: 'کراس‌فیت باکس ۲۱', tagline: 'WOD هر روز، جامعه‌ای پرانگیزه', description: 'باکس تخصصی کراس‌فیت با برنامه‌ی روزانه و رقابت‌های ماهانه.', address: 'شهرک غرب، فلامک', lat: 35.7570, lng: 51.3700, sessionPrice: 130_000, facilities: ['وزنه المپیک', 'Rig', 'روئینگ', 'پارکینگ'], sports: ['کراس‌فیت', 'وزنه‌برداری'], hours: '۶ صبح تا ۱۰ شب', gender: 'mixed', cover: 'from-ink-700 via-ink-800 to-ink-900', rating: 4.8, reviews: 143 },
    { ...gymBase, id: 'g-yoga', name: 'استودیو یوگا نیلوفر', tagline: 'آرامش ذهن و بدن', description: 'یوگای هاتا، وینیاسا و مدیتیشن در فضایی دنج و نورگیر.', address: 'زعفرانیه، خیابان آصف', lat: 35.8040, lng: 51.4130, sessionPrice: 100_000, facilities: ['مت و تجهیزات', 'چای‌خانه'], sports: ['یوگا', 'مدیتیشن'], hours: '۷ صبح تا ۹ شب', gender: 'mixed', cover: 'from-ink-700 via-brand-500 to-ink-900', rating: 4.9, reviews: 77 },
    { ...gymBase, id: 'g-new', name: 'باشگاه انرژی', tagline: 'باشگاه جدید در انتظار تایید', description: 'باشگاه نوساز در تهرانپارس.', address: 'تهرانپارس، فلکه اول', lat: 35.7310, lng: 51.5370, sessionPrice: 70_000, facilities: ['پارکینگ'], sports: ['بدنسازی'], hours: '۸ صبح تا ۱۰ شب', gender: 'mixed', cover: 'from-ink-800 via-ink-900 to-ink-900', rating: 0, reviews: 0, approved: false },
  ]

  const coaches: CoachProfile[] = [
    { userId: 'u-coach1', title: 'مربی بدنسازی و فیتنس', specialties: ['حجم عضلانی', 'چربی‌سوزی', 'آمادگی مسابقات'], experienceYears: 10, bio: 'دارای مدرک بین‌المللی ISSA و مربی درجه یک فدراسیون. بیش از ۵۰۰ شاگرد موفق.', rating: 4.9, students: 540, online: true, callPrice: 150_000, certificates: ['ISSA CPT', 'مربیگری درجه ۱ فدراسیون'], plans: [
      { id: 'cp-1', title: 'برنامه تمرینی ۸ هفته‌ای حجم', kind: 'workout', price: 450_000, durationWeeks: 8, description: 'برنامه‌ی اختصاصی ۴ تا ۵ روز در هفته بر اساس سطح و تجهیزات شما' },
      { id: 'cp-2', title: 'پکیج کامل تمرین + تغذیه', kind: 'both', price: 890_000, durationWeeks: 8, description: 'برنامه تمرینی و رژیم غذایی اختصاصی + پشتیبانی چت هفتگی' },
    ] },
    { userId: 'u-coach2', title: 'کارشناس تغذیه ورزشی', specialties: ['کاهش وزن', 'رژیم کتو', 'تغذیه بانوان'], experienceYears: 7, bio: 'کارشناس ارشد علوم تغذیه. تخصص در کاهش وزن اصولی و پایدار بدون رژیم‌های سخت.', rating: 4.8, students: 320, online: false, callPrice: 120_000, certificates: ['کارشناسی ارشد تغذیه', 'Precision Nutrition L1'], plans: [
      { id: 'cp-3', title: 'رژیم کاهش وزن ۴ هفته‌ای', kind: 'diet', price: 380_000, durationWeeks: 4, description: 'رژیم منعطف با غذاهای ایرانی و لیست خرید هفتگی' },
      { id: 'cp-4', title: 'رژیم ۱۲ هفته‌ای + پیگیری', kind: 'diet', price: 950_000, durationWeeks: 12, description: 'اصلاح هر ۲ هفته + چت نامحدود' },
    ] },
  ]

  const doctors: DoctorProfile[] = [
    { userId: 'u-doctor', specialty: 'متخصص پزشکی ورزشی', medicalCode: 'ن‌پ ۱۲۳۴۵۶', bio: 'فلوشیپ آسیب‌های ورزشی. مشاوره در زمینه‌ی آسیب‌ها، توانبخشی و چکاپ ورزشکاران.', visitPrice: 350_000, rating: 4.9, visits: 860, slots: slots(), online: true },
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

  const p = (userId: string, score: number) => ({ userId, score, joinedAt: ago(100), logs: [{ at: ago(24), value: score }] })
  const challenges: Challenge[] = [
    { id: 'ch-steps', pool: 2_320_000, creatorId: 'u-coach1', title: 'چالش ۳۰۰ هزار قدم', description: 'در ۳۰ روز ۳۰۰٬۰۰۰ قدم بردار! هر روز قدم‌هات رو ثبت کن و با بقیه رقابت کن.', metric: 'steps', unit: 'قدم', goal: 300_000, entryFee: 100_000, creationFee: 500_000, sponsorPrize: 2_000_000, extraReward: 'یک ماه اشتراک طلایی برای نفر اول', prizes: [{ rank: 1, title: 'نفر اول', percent: 50 }, { rank: 2, title: 'نفر دوم', percent: 30 }, { rank: 3, title: 'نفر سوم', percent: 20 }], xpReward: 300, gradient: 'from-ink-700 via-ink-800 to-ink-900', emoji: '', startAt: ago(24 * 10), endAt: ahead(24 * 20), maxParticipants: 500, participants: [p('u-reza', 142_000), p('u-mina', 98_500), p('u-hamed', 61_200), p('u-coach2', 87_300)], status: 'active', createdAt: ago(24 * 11) },
    { id: 'ch-30day', pool: 1_120_000, creatorId: 'u-ali', title: '۳۰ روز، ۳۰ تمرین', description: 'هر روز حداقل یک جلسه تمرین. هر جلسه = ۱ امتیاز. سازگاری = قهرمانی!', metric: 'workouts', unit: 'جلسه', goal: 30, entryFee: 50_000, creationFee: 500_000, sponsorPrize: 1_000_000, extraReward: '۱۰ جلسه ورود رایگان به آیرون‌من', prizes: [{ rank: 1, title: 'نفر اول', percent: 60 }, { rank: 2, title: 'نفر دوم', percent: 40 }], xpReward: 250, gradient: 'from-ink-800 via-ink-900 to-ink-900', emoji: '', startAt: ago(24 * 9), endAt: ahead(24 * 21), maxParticipants: 300, participants: [p('u-mina', 9), p('u-sara', 6), p('u-reza', 8)], status: 'active', createdAt: ago(24 * 10) },
    { id: 'ch-loss', pool: 160_000, creatorId: 'u-coach2', title: 'چالش ۵ کیلو در ۶ هفته', description: 'کاهش وزن اصولی با همراهی کارشناس تغذیه. کاهش وزن هفتگی‌ات رو ثبت کن.', metric: 'weight_loss', unit: 'کیلوگرم', goal: 5, entryFee: 200_000, creationFee: 500_000, sponsorPrize: 0, extraReward: 'رژیم ۱۲ هفته‌ای رایگان', prizes: [{ rank: 1, title: 'نفر اول', percent: 50 }, { rank: 2, title: 'نفر دوم', percent: 30 }, { rank: 3, title: 'نفر سوم', percent: 20 }], xpReward: 400, gradient: 'from-ink-700 via-ink-800 to-brand-700', emoji: '', startAt: ago(24 * 3), endAt: ahead(24 * 39), maxParticipants: 200, participants: [p('u-hamed', 1.2)], status: 'active', createdAt: ago(24 * 4) },
    { id: 'ch-run', pool: 500_000, creatorId: 'u-reza', title: 'ماراتن مجازی ۴۲ کیلومتر', description: 'در دو هفته مجموعاً ۴۲ کیلومتر بدو. هر کجا، هر زمان!', metric: 'km', unit: 'کیلومتر', goal: 42, entryFee: 0, creationFee: 500_000, sponsorPrize: 500_000, extraReward: 'مدال دیجیتال ماراتن', prizes: [{ rank: 1, title: 'نفر اول', percent: 100 }], xpReward: 200, gradient: 'from-ink-700 via-ink-800 to-ink-900', emoji: '', startAt: ago(24), endAt: ahead(24 * 13), maxParticipants: 1000, participants: [p('u-reza', 12.5), p('u-mina', 6)], status: 'active', createdAt: ago(30) },
  ]

  const threads: Thread[] = [
    { id: 't-1', members: ['u-sara', 'u-coach1'], context: 'coach', updatedAt: ago(2), messages: [
      { id: 'm1', from: 'u-sara', text: 'سلام آقای کریمی، برای چربی‌سوزی شکمی چه پیشنهادی دارید؟', at: ago(3) },
      { id: 'm2', from: 'u-coach1', text: 'سلام سارا جان چربی‌سوزی موضعی نداریم؛ ترکیب تمرین مقاومتی + کسری کالری جواب میده. اگه بخوای برنامه‌ی اختصاصی برات می‌نویسم.', at: ago(2) },
    ] },
  ]

  const today = dayKey()
  const dailyLogs: DailyLog[] = [
    { userId: 'u-sara', day: today, water: 3, steps: 3200, workoutMinutes: 0, calories: 900, sleepHours: 7, missionsDone: [], rewardClaimed: false },
  ]

  return {
    version: 1,
    users,
    subscriptions: [
      { userId: 'u-sara', planId: 'plan-gold', credit: 1_540_000, startedAt: ago(24 * 8), expiresAt: ahead(24 * 22), freeChallengeUsed: 0, freeDoctorUsed: 0 },
    ],
    wallets: { 'u-sara': 1_250_000, 'u-ali': 8_400_000, 'u-coach1': 3_200_000, 'u-coach2': 1_900_000, 'u-seller': 12_500_000, 'u-doctor': 4_100_000, 'u-rest': 2_300_000, 'u-mina': 600_000, 'u-reza': 900_000, 'u-hamed': 300_000, 'u-admin': 0, platform: 6_850_000, escrow: 4_100_000 },
    transactions: [
      { id: 'tx-seed1', type: 'subscription', from: 'u-sara', payerId: 'u-sara', to: 'platform', amount: 1_890_000, commission: 1_890_000, description: 'خرید اشتراک طلایی', createdAt: ago(24 * 8) },
      { id: 'tx-seed2', type: 'checkin', from: 'subscription', to: 'u-ali', payerId: 'u-sara', amount: 120_000, commission: 18_000, module: 'fityab', refId: 'g-iron', description: 'ورود سارا محمدی به باشگاه آیرون‌من', createdAt: ago(24 * 2) },
      { id: 'tx-seed3', type: 'coach_plan', from: 'u-mina', payerId: 'u-mina', to: 'u-coach1', amount: 890_000, commission: 178_000, module: 'fityar', description: 'خرید پکیج کامل تمرین + تغذیه', createdAt: ago(24 * 5) },
      { id: 'tx-seed4', type: 'shop_order', from: 'u-reza', payerId: 'u-reza', to: 'u-seller', amount: 4_455_000, commission: 445_500, module: 'shop', description: 'سفارش فروشگاه', createdAt: ago(24 * 3) },
    ],
    payouts: [{ id: 'po-1', userId: 'u-ali', amount: 3_000_000, iban: 'IR120170000000123456789012', status: 'pending', createdAt: ago(12) }],
    gyms,
    checkins: [
      { id: 'ci-seed', userId: 'u-sara', gymId: 'g-iron', price: 120_000, code: '482913', paidWith: 'subscription', status: 'used', createdAt: ago(24 * 2) },
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
    carts: {},
    aiChats: {},
    settings: { commissions: { ...DEFAULT_COMMISSIONS }, challengeCreationFee: 500_000, minWithdraw: 500_000 },
  }
}
