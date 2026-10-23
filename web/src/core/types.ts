/**
 * مدل‌های دامنه‌ی کی‌فیت.
 * این لایه مستقل از UI و پلتفرم است تا بتوان آن را عیناً در اپ موبایل
 * (React Native / Capacitor) یا سرور استفاده کرد.
 */

export type ID = string
export type ISODate = string

export type Role = 'user' | 'gym' | 'coach' | 'seller' | 'doctor' | 'restaurant' | 'company' | 'admin'

/** ماژول‌هایی که درآمد کمیسیونی دارند */
export type RevenueModule = 'fityab' | 'fityar' | 'shop' | 'doctor' | 'buffet' | 'challenge' | 'insurance' | 'event' | 'market'

export interface User {
  id: ID
  name: string
  phone: string
  avatar?: string
  bio?: string
  city: string
  roles: Role[]
  gender?: 'male' | 'female'
  heightCm?: number
  weightKg?: number
  birthYear?: number
  goal?: 'lose' | 'gain' | 'fit'
  activityLevel?: 'low' | 'medium' | 'high'
  /** اطلاعات سلامت؛ فقط برای خود کاربر */
  health?: { injuries?: string; conditions?: string; allergies?: string }
  privacy?: { publicProfile: boolean; showBody: boolean }
  /** مربی/پزشکانی که اجازه‌ی دیدن پرونده‌ی سلامت را دارند */
  healthShares?: ID[]
  addresses?: Address[]
  reminders?: Reminders
  favoriteGyms?: ID[]
  blockedUsers?: ID[]
  /** کد معرفی اختصاصی و معرف */
  referralCode?: string
  referredBy?: ID
  referralRewarded?: boolean
  /** عضویت سازمانی */
  orgId?: ID
  /** ویدیوی معرفی پروفایل (مربی، باشگاه‌دار، کاربران برتر و ویژه) */
  introVideo?: string
  /** اعضای خانواده (فرزندان و…) که حساب جداگانه ندارند */
  family?: FamilyMember[]
  /** دستگاه‌ها و منابع داده‌ی سلامت متصل */
  devices?: Device[]
  /** امتیاز هفته‌ی جاری برای لیگ */
  weekXp?: { week: string; xp: number }
  xp: number
  streak: number
  lastActiveDay?: string // YYYY-MM-DD
  following: ID[]
  createdAt: ISODate
  blocked?: boolean
}

/** پروفایل چرخه‌ی قاعدگی (فقط بانوان، خصوصی) */
export interface CycleLog {
  day: string // YYYY-MM-DD
  flow?: 'light' | 'medium' | 'heavy'
  symptoms: string[]
  mood?: 'great' | 'ok' | 'low'
}

export interface CycleProfile {
  userId: ID
  /** حالت ردیاب: چرخه‌ی عادی، بارداری یا پس از زایمان */
  mode?: 'cycle' | 'pregnancy' | 'postpartum'
  /** تاریخ تقریبی زایمان (بارداری) یا تاریخ زایمان (پس از زایمان) */
  dueDate?: string
  lastPeriodStart: string // YYYY-MM-DD
  cycleLength: number
  periodLength: number
  history: string[]
  logs: CycleLog[]
}

export interface Subscription {
  userId: ID
  planId: ID
  /** اعتبار ریالی باقی‌مانده‌ی اشتراک که برای سانس‌ها مصرف می‌شود (تومان) */
  credit: number
  startedAt: ISODate
  expiresAt: ISODate
  /** مزایای مصرف‌شده در دوره‌ی فعلی اشتراک */
  freeChallengeUsed: number
  freeDoctorUsed: number
  /** اشتراک اهدایی سازمان */
  orgId?: ID
}

/** مزایای قابل اجرای هر پلن؛ تخفیف‌ها از سهم کی‌فیت پرداخت می‌شود نه از سهم ارائه‌دهنده */
export interface PlanBenefits {
  discounts: Partial<Record<RevenueModule, number>> // درصد
  freeChallengeEntries: number
  freeDoctorVisits: number
  badge: boolean
}

export interface SubscriptionPlan {
  id: ID
  name: string
  price: number
  credit: number
  durationDays: number
  color: string
  perks: string[]
  benefits: PlanBenefits
  popular?: boolean
}

export type TxType =
  | 'topup'
  | 'subscription'
  | 'checkin'
  | 'coach_plan'
  | 'shop_order'
  | 'doctor_visit'
  | 'food_order'
  | 'challenge_create'
  | 'challenge_entry'
  | 'challenge_prize'
  | 'withdraw'
  | 'refund'
  | 'reward'
  | 'gift'
  | 'org_seats'
  | 'insurance'
  | 'claim_payout'
  | 'rental'
  | 'live_class'
  | 'event_entry'
  | 'market_buy'
  | 'market_release'

/** هر جابجایی پول یک سطر در دفتر کل (Ledger) است */
export interface Transaction {
  id: ID
  type: TxType
  from: ID | 'gateway' | 'subscription' | 'escrow'
  to: ID | 'platform' | 'escrow' | 'bank'
  /** کاربری که پول از حساب او خارج شده (برای پرداخت از اشتراک یا درگاه هم پر می‌شود) */
  payerId?: ID
  amount: number
  commission: number
  /** تخفیف اشتراک که کی‌فیت به جای کاربر پرداخت کرده */
  discount?: number
  module?: RevenueModule
  refId?: ID
  description: string
  createdAt: ISODate
}

export interface Payout {
  id: ID
  userId: ID
  amount: number
  iban: string
  status: 'pending' | 'paid' | 'rejected'
  createdAt: ISODate
}

export interface Media {
  type: 'image' | 'video'
  url: string
}

export interface Gym {
  id: ID
  ownerId: ID
  name: string
  tagline: string
  description: string
  address: string
  city: string
  lat: number
  lng: number
  phone: string
  sessionPrice: number
  facilities: string[]
  sports: string[]
  hours: string
  gender: 'male' | 'female' | 'mixed'
  media: Media[]
  cover: string // رنگ/گرادیان پیش‌فرض
  rating: number
  reviews: number
  approved: boolean
  createdAt: ISODate
  /** نوع مجموعه: باشگاه، استخر، باشگاه سوارکاری، سالن ورزشی، چمن مصنوعی */
  kind?: VenueKind
  /** اجاره‌ی ساعتی کل زمین/سالن (سالن ورزشی و چمن مصنوعی) */
  rental?: { hourlyPrice: number; openFrom: number; openTo: number; maxHours: number }
  /** ظرفیت هم‌زمان سالن (برای نمایش شلوغی) */
  capacity?: number
  classes?: GymClass[]
  /** تخفیف ساعات خلوت: از ساعت from تا to (۰ تا ۲۴) */
  offPeak?: { from: number; to: number; discountPct: number }
}

export type VenueKind = 'gym' | 'pool' | 'equestrian' | 'hall' | 'turf'

/** عضو خانواده؛ رزرو کلاس کودکان با حساب والد انجام می‌شود */
export interface FamilyMember {
  id: ID
  name: string
  relation: 'child' | 'spouse' | 'parent' | 'other'
  birthYear: number
  gender: 'male' | 'female'
  /** حساسیت، بیماری یا نکته برای مربی */
  notes?: string
}

export type DeviceKind = 'hr_monitor' | 'watch' | 'apple_health' | 'health_connect' | 'file'

export interface Device {
  id: ID
  kind: DeviceKind
  name: string
  connectedAt: ISODate
  lastSyncAt?: ISODate
}

/** کلاس گروهی هفتگی */
export interface GymClass {
  id: ID
  title: string
  sport: string
  coachName: string
  /** ۰ = شنبه … ۶ = جمعه */
  weekday: number
  time: string // HH:MM
  durationMin: number
  capacity: number
  /** اگر خالی باشد هزینه‌ی سانس عادی اعمال می‌شود */
  price?: number
  /** کلاس کودکان/نوجوانان با بازه‌ی سنی */
  audience?: 'adult' | 'kids'
  ageMin?: number
  ageMax?: number
}

/** بلیت ورود به باشگاه (سانس آزاد یا کلاس) */
export interface CheckIn {
  id: ID
  userId: ID
  gymId: ID
  /** مبلغ پایه‌ی سانس */
  price: number
  /** مبلغ پرداخت‌شده پس از تخفیف ساعت خلوت */
  paid?: number
  code: string
  paidWith: 'subscription' | 'wallet'
  status: 'active' | 'used' | 'cancelled' | 'expired'
  classId?: ID
  /** زمان شروع کلاس (برای رزرو کلاس) */
  slotAt?: ISODate
  validUntil?: ISODate
  usedAt?: ISODate
  offPeak?: boolean
  /** اجاره‌ی ساعتی: پایان رزرو */
  rentalEnd?: ISODate
  /** تیمی که رزرو برایش انجام شده */
  teamId?: ID
  /** رزرو برای عضو خانواده (کلاس کودکان) */
  memberId?: ID
  memberName?: string
  /** کمپین تخفیف باشگاه که روی این بلیت اعمال شد */
  campaignId?: ID
  /** ورود از طریق درخواست پذیرش */
  viaReception?: boolean
  txId?: ID
  reviewed?: boolean
  createdAt: ISODate
}

/** درخواست ورود که پذیرش باشگاه برای کاربر می‌فرستد و کاربر تأیید می‌کند */
export interface EntryRequest {
  id: ID
  gymId: ID
  userId: ID
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  createdAt: ISODate
}

export interface CoachPlan {
  id: ID
  title: string
  kind: 'workout' | 'diet' | 'both'
  price: number
  durationWeeks: number
  description: string
}

export interface CoachProfile {
  userId: ID
  /** تأیید مدارک توسط مدیر */
  verified?: boolean
  title: string
  specialties: string[]
  experienceYears: number
  bio: string
  rating: number
  students: number
  online: boolean
  callPrice: number
  plans: CoachPlan[]
  certificates: string[]
}

export interface PlanOrder {
  id: ID
  userId: ID
  coachId: ID
  planId: ID
  title: string
  price: number
  status: 'pending' | 'delivered'
  answers: string
  content?: string
  /** برنامه‌ی ساختاریافته‌ی هفتگی */
  program?: Program
  /** روزهای انجام‌شده با کلید w-d */
  done?: string[]
  createdAt: ISODate
}

export interface ProgramExercise {
  exerciseId: ID
  sets: number
  reps: string
  rest?: number
  note?: string
}

export interface ProgramDay {
  title: string
  exercises: ProgramExercise[]
  meals?: string
}

export interface Program {
  weeks: { days: ProgramDay[] }[]
  notes?: string
}

export interface Message {
  id: ID
  from: ID
  text: string
  at: ISODate
  kind?: 'text' | 'call' | 'system'
  /** لینک تماس تصویری */
  link?: string
}

export interface Thread {
  id: ID
  members: ID[]
  context: 'coach' | 'doctor' | 'direct' | 'team' | 'market'
  /** آگهی بازار دست‌دوم */
  listingId?: ID
  /** عنوان گفتگوی گروهی */
  title?: string
  teamId?: ID
  messages: Message[]
  updatedAt: ISODate
}

export interface Product {
  id: ID
  sellerId: ID
  name: string
  brand: string
  category: 'supplement' | 'equipment' | 'apparel' | 'accessory'
  price: number
  discount: number
  stock: number
  description: string
  image?: string
  emoji: string
  rating: number
  sold: number
  createdAt: ISODate
}

export interface CartItem {
  kind: 'product' | 'food'
  refId: ID
  qty: number
}

export interface OrderItem {
  refId: ID
  name: string
  price: number
  qty: number
}

export interface Order {
  id: ID
  kind: 'shop' | 'food'
  userId: ID
  vendorId: ID // فروشنده یا رستوران
  items: OrderItem[]
  total: number
  address: string
  status: 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
  shipping?: number
  discount?: number
  coupon?: string
  trackingCode?: string
  timeline?: { status: Order['status']; at: ISODate }[]
  reviewed?: boolean
  createdAt: ISODate
}

export interface Address {
  id: ID
  title: string
  text: string
  phone?: string
}

export interface Reminders {
  water: boolean
  workout: boolean
  period: boolean
  workoutTime: string // HH:MM
}

export interface Coupon {
  id: ID
  code: string
  pct: number
  /** سقف تخفیف به تومان */
  maxAmount: number
  module: 'shop' | 'buffet' | 'subscription' | 'all'
  maxUses: number
  usedBy: ID[]
  expiresAt: ISODate
  active: boolean
}

/** نوع ارائه‌دهنده‌ی خدمات سلامت */
export type CareKind = 'doctor' | 'physio' | 'massage' | 'psych'

export interface DoctorProfile {
  userId: ID
  /** پزشک (پیش‌فرض)، فیزیوتراپ، ماساژ ورزشی یا روان‌شناس ورزشی */
  kind?: CareKind
  /** نحوه‌ی ارائه‌ی خدمت */
  mode?: 'online' | 'inperson' | 'both'
  /** نشانی مطب/کلینیک برای خدمات حضوری */
  address?: string
  specialty: string
  medicalCode: string
  bio: string
  visitPrice: number
  rating: number
  visits: number
  /** نوبت‌های آزاد به صورت ISO */
  slots: ISODate[]
  online: boolean
  /** تأیید پروانه‌ی نظام پزشکی توسط مدیر */
  verified?: boolean
}

export interface Appointment {
  id: ID
  userId: ID
  doctorId: ID
  at: ISODate
  price: number
  reason: string
  status: 'booked' | 'done' | 'cancelled'
  prescription?: string
  /** لینک ویزیت تصویری */
  callLink?: string
  /** حضوری یا آنلاین */
  mode?: 'online' | 'inperson'
  createdAt: ISODate
}

export interface Restaurant {
  id: ID
  ownerId: ID
  name: string
  description: string
  address: string
  lat: number
  lng: number
  cover: string
  rating: number
  deliveryMinutes: number
  open: boolean
  approved: boolean
}

export interface Food {
  id: ID
  restaurantId: ID
  name: string
  description: string
  price: number
  calories: number
  protein: number
  carbs: number
  fat: number
  tags: string[]
  emoji: string
  image?: string
  available: boolean
}

export interface Comment {
  id: ID
  authorId: ID
  text: string
  at: ISODate
}

export interface Post {
  id: ID
  authorId: ID
  text: string
  image?: string
  gradient?: string
  likes: ID[]
  saves: ID[]
  comments: Comment[]
  challengeId?: ID
  gymId?: ID
  tags?: string[]
  /** پنهان‌شده توسط مدیر */
  hidden?: boolean
  createdAt: ISODate
}

export interface Story {
  id: ID
  authorId: ID
  text: string
  image?: string
  gradient: string
  seenBy: ID[]
  createdAt: ISODate
}

export type ChallengeMetric = 'steps' | 'workouts' | 'minutes' | 'km' | 'weight_loss' | 'custom'

export interface ChallengeParticipant {
  userId: ID
  score: number
  joinedAt: ISODate
  logs: ChallengeLog[]
}

export interface ChallengeLog {
  id?: ID
  at: ISODate
  value: number
  note?: string
  /** عکس مدرک */
  proof?: string
  /** منبع داده: دستی، ورود تأییدشده به باشگاه، تمرین ثبت‌شده یا دستگاه متصل */
  source?: 'manual' | 'checkin' | 'workout' | 'device'
  /** وضعیت تأیید؛ فقط موارد ok در امتیاز حساب می‌شوند */
  status?: 'ok' | 'pending' | 'rejected'
}

export interface Prize {
  rank: number
  title: string
  /** درصد از صندوق جایزه */
  percent: number
}

export interface Challenge {
  id: ID
  creatorId: ID
  title: string
  description: string
  metric: ChallengeMetric
  unit: string
  goal: number
  entryFee: number
  creationFee: number
  sponsorPrize: number // جایزه‌ی نقدی که سازنده خودش اضافه می‌کند
  /** صندوق جایزه = جایزه‌ی اسپانسر + ورودی‌ها پس از کسر کمیسیون (در escrow نگهداری می‌شود) */
  pool: number
  extraReward: string // جایزه‌ی غیرنقدی (مثلا یک ماه اشتراک باشگاه)
  prizes: Prize[]
  xpReward: number
  gradient: string
  emoji: string
  startAt: ISODate
  endAt: ISODate
  maxParticipants: number
  participants: ChallengeParticipant[]
  status: 'active' | 'finished'
  winners?: { userId: ID; rank: number; amount: number }[]
  /** نحوه‌ی تأیید امتیاز: خودکار از داده‌های اپ یا با عکس مدرک و تأیید سازنده */
  verification?: 'auto' | 'proof' | 'none'
  /** چالش سازمانی */
  orgId?: ID
  /** چالش داخلی تیم هم‌تمرینی */
  teamId?: ID
  createdAt: ISODate
}

export interface Notification {
  id: ID
  userId: ID
  title: string
  body: string
  link?: string
  icon: string
  read: boolean
  at: ISODate
}

export interface DailyLog {
  userId: ID
  day: string // YYYY-MM-DD
  water: number // لیوان
  steps: number
  workoutMinutes: number
  calories: number
  sleepHours: number
  /** ضربان قلب در حال استراحت (از ساعت هوشمند) */
  restingHr?: number
  /** منبع قدم‌ها: دستی یا دستگاه (فقط قدم دستگاه در چالش خودکار حساب می‌شود) */
  stepsSource?: 'manual' | 'device'
  missionsDone: string[]
  rewardClaimed: boolean
}

export interface PlatformSettings {
  commissions: Record<RevenueModule, number> // درصد
  challengeCreationFee: number
  minWithdraw: number
  /** هزینه‌ی ارسال فروشگاه و حد ارسال رایگان */
  shippingFee?: number
  freeShippingOver?: number
  /** پاداش معرفی برای هر دو طرف */
  referralReward?: number
  /** تخفیف خرید سازمانی (درصد) */
  orgDiscountPct?: number
  /** انواع مجموعه‌های فعال در فیت‌یاب (فازبندی توسعه) */
  venueKinds?: VenueKind[]
}

/* ───────── نظرها، گزارش‌ها و پشتیبانی ───────── */

export interface Review {
  id: ID
  kind: 'gym' | 'product' | 'food' | 'coach' | 'doctor'
  refId: ID
  userId: ID
  stars: number
  text: string
  image?: string
  reply?: string
  createdAt: ISODate
}

export interface Report {
  id: ID
  reporterId: ID
  kind: 'post' | 'comment' | 'user' | 'story' | 'listing'
  refId: ID
  /** شناسه‌ی پست والد برای نظرها */
  parentId?: ID
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: ISODate
}

export interface Ticket {
  id: ID
  userId: ID
  subject: string
  category: 'payment' | 'gym' | 'order' | 'account' | 'other'
  status: 'open' | 'answered' | 'closed'
  messages: { from: ID; text: string; at: ISODate; staff?: boolean }[]
  createdAt: ISODate
  updatedAt: ISODate
}

/* ───────── تمرین، تغذیه و پیشرفت ───────── */

export interface WorkoutSet {
  reps: number
  weight: number
}

export interface WorkoutSession {
  id: ID
  userId: ID
  day: string // YYYY-MM-DD
  title: string
  durationMin: number
  exercises: { exerciseId: ID; sets: WorkoutSet[] }[]
  note?: string
  /** اگر از برنامه‌ی مربی انجام شده */
  program?: { orderId: ID; week: number; day: number }
  /** ضربان قلب از سنسور بلوتوث */
  hr?: { avg: number; max: number }
  /** شرکت در کلاس آنلاین زنده */
  liveClassId?: ID
  createdAt: ISODate
}

export interface MealLog {
  id: ID
  userId: ID
  day: string
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  qty: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  source: 'db' | 'buffet' | 'custom' | 'photo'
  createdAt: ISODate
}

export interface BodyEntry {
  id: ID
  userId: ID
  day: string
  weightKg?: number
  waistCm?: number
  hipCm?: number
  chestCm?: number
  armCm?: number
  bodyFatPct?: number
  /** آنالیز ترکیب بدن (InBody) */
  muscleKg?: number
  visceralFat?: number
  bmr?: number
  waterPct?: number
  /** منبع: ثبت خود کاربر یا دستگاه InBody باشگاه */
  source?: 'manual' | 'inbody'
  gymId?: ID
  photo?: string
  createdAt: ISODate
}

/* ───────── سازمان‌ها، هدیه و معرفی ───────── */

export interface Org {
  id: ID
  name: string
  adminId: ID
  /** کد عضویت کارمندان */
  code: string
  planId: ID
  seats: number
  members: ID[]
  createdAt: ISODate
}

export interface GiftCard {
  id: ID
  code: string
  planId: ID
  fromId: ID
  toPhone: string
  message?: string
  redeemedBy?: ID
  createdAt: ISODate
}

/* ───────── هم‌تیمی‌ها ───────── */

export interface TeamSession {
  id: ID
  title: string
  at: ISODate
  gymId?: ID
  note?: string
  createdBy: ID
  going: ID[]
  notGoing: ID[]
}

export interface Team {
  id: ID
  name: string
  ownerId: ID
  members: ID[]
  /** کد دعوت */
  code: string
  threadId: ID
  goal?: string
  sessions: TeamSession[]
  createdAt: ISODate
}

/* ───────── بیمه‌ی ورزشی ───────── */

export interface InsurancePlan {
  id: ID
  name: string
  provider: string
  /** حق بیمه‌ی سالانه (تومان) */
  price: number
  /** سقف پوشش هزینه‌ی درمان حادثه‌ی ورزشی */
  medicalCover: number
  /** غرامت نقص عضو/فوت ناشی از حادثه */
  accidentCover: number
  /** فرانشیز (درصد سهم بیمه‌شده) */
  deductiblePct: number
  sports: string[]
  perks: string[]
  active: boolean
}

export interface InsurancePolicy {
  id: ID
  userId: ID
  planId: ID
  number: string
  nationalId: string
  startAt: ISODate
  endAt: ISODate
  status: 'active' | 'expired' | 'cancelled'
  createdAt: ISODate
}

export interface InsuranceClaim {
  id: ID
  policyId: ID
  userId: ID
  incidentAt: ISODate
  sport: string
  description: string
  amount: number
  documents: string[]
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'paid'
  approvedAmount?: number
  note?: string
  createdAt: ISODate
  updatedAt: ISODate
}

/* ───────── کلاس آنلاین زنده ───────── */

export interface LiveClass {
  id: ID
  hostId: ID
  title: string
  sport: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'all'
  at: ISODate
  durationMin: number
  /** صفر = رایگان */
  price: number
  capacity: number
  attendees: ID[]
  /** کسانی که واقعاً وارد کلاس شدند */
  joined: ID[]
  /** لینک کلاس؛ فقط برای ثبت‌نام‌شده‌ها ارسال می‌شود */
  link: string
  status: 'scheduled' | 'cancelled'
  createdAt: ISODate
}

/* ───────── باشگاه‌دار: ارتباط با اعضا ───────── */

export type MemberSegment = 'all' | 'new' | 'active' | 'at_risk' | 'lost'

export interface GymCampaign {
  id: ID
  gymId: ID
  segment: MemberSegment
  title: string
  body: string
  /** تخفیف اختصاصی برای ورود بعدی (از سهم باشگاه) */
  pct?: number
  expiresAt?: ISODate
  recipients: ID[]
  usedBy: ID[]
  createdAt: ISODate
}

/* ───────── رویدادهای ورزشی ───────── */

export interface EventRegistration {
  userId: ID
  bib: number
  /** مسافت/رده‌ی انتخابی */
  category?: string
  at: ISODate
  checkedIn?: boolean
  result?: { rank?: number; time?: string; note?: string }
}

export interface SportEvent {
  id: ID
  organizerId: ID
  title: string
  kind: 'race' | 'hike' | 'tournament' | 'workshop' | 'other'
  sport: string
  description: string
  at: ISODate
  location: string
  city: string
  lat?: number
  lng?: number
  fee: number
  capacity: number
  categories: string[]
  gender: 'male' | 'female' | 'mixed'
  cover: string
  registrations: EventRegistration[]
  approved: boolean
  status: 'open' | 'closed' | 'done' | 'cancelled'
  createdAt: ISODate
}

/* ───────── بازار دست‌دوم ───────── */

export interface Listing {
  id: ID
  sellerId: ID
  title: string
  category: 'equipment' | 'apparel' | 'accessory' | 'supplement' | 'other'
  condition: 'new' | 'like_new' | 'good' | 'fair'
  price: number
  description: string
  photos: string[]
  city: string
  status: 'active' | 'reserved' | 'sold' | 'removed'
  /** خرید امن: پول تا تأیید دریافت نزد کی‌فیت می‌ماند */
  deal?: { buyerId: ID; status: 'paid' | 'shipped' | 'done' | 'cancelled'; address: string; tracking?: string; paidAt: ISODate; shippedAt?: ISODate; doneAt?: ISODate }
  createdAt: ISODate
}
