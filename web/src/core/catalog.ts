/**
 * کاتالوگ ثابت: کتابخانه‌ی حرکات تمرینی و بانک غذاهای ایرانی.
 * مقادیر تغذیه‌ای تقریبی و برای یک واحد مصرفی رایج است.
 */

export type Muscle = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'full'

export interface Exercise {
  id: string
  name: string
  muscle: Muscle
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'kettlebell' | 'none'
  /** نکته‌ی اجرای صحیح */
  cue: string
  /** حرکت با وزنه است (برای محاسبه‌ی رکورد) */
  weighted: boolean
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'سینه',
  back: 'پشت',
  legs: 'پا',
  shoulders: 'سرشانه',
  arms: 'بازو',
  core: 'میان‌تنه',
  cardio: 'هوازی',
  full: 'تمام بدن',
}

export const EQUIPMENT_LABEL: Record<Exercise['equipment'], string> = {
  barbell: 'هالتر',
  dumbbell: 'دمبل',
  machine: 'دستگاه',
  bodyweight: 'وزن بدن',
  cable: 'سیم‌کش',
  kettlebell: 'کتل‌بل',
  none: 'بدون وسیله',
}

export const EXERCISES: Exercise[] = [
  { id: 'bench', name: 'پرس سینه هالتر', muscle: 'chest', equipment: 'barbell', weighted: true, cue: 'کتف‌ها جمع و پایین، هالتر تا وسط سینه پایین بیاید و آرنج حدود ۴۵ درجه باز باشد.' },
  { id: 'incline-db', name: 'پرس بالاسینه دمبل', muscle: 'chest', equipment: 'dumbbell', weighted: true, cue: 'نیمکت ۳۰ درجه، دمبل‌ها را کنترل‌شده پایین بیاورید.' },
  { id: 'pushup', name: 'شنای سوئدی', muscle: 'chest', equipment: 'bodyweight', weighted: false, cue: 'بدن یک خط صاف، سینه تا نزدیک زمین.' },
  { id: 'dip', name: 'دیپ پارالل', muscle: 'chest', equipment: 'bodyweight', weighted: false, cue: 'کمی به جلو خم شوید تا سینه بیشتر درگیر شود.' },
  { id: 'fly', name: 'قفسه سیم‌کش', muscle: 'chest', equipment: 'cable', weighted: true, cue: 'آرنج کمی خم و ثابت، حرکت از شانه.' },
  { id: 'pullup', name: 'بارفیکس', muscle: 'back', equipment: 'bodyweight', weighted: false, cue: 'از آویزان کامل شروع کنید و چانه را بالای میله ببرید.' },
  { id: 'row', name: 'زیربغل هالتر خم', muscle: 'back', equipment: 'barbell', weighted: true, cue: 'کمر صاف، هالتر را به سمت ناف بکشید.' },
  { id: 'latpull', name: 'زیربغل سیم‌کش از جلو', muscle: 'back', equipment: 'cable', weighted: true, cue: 'میله تا بالای سینه، کتف‌ها پایین.' },
  { id: 'deadlift', name: 'ددلیفت', muscle: 'back', equipment: 'barbell', weighted: true, cue: 'میله چسبیده به ساق، با فشار پا بلند کنید نه با کمر.' },
  { id: 'seatedrow', name: 'قایقی سیم‌کش', muscle: 'back', equipment: 'cable', weighted: true, cue: 'سینه جلو، دسته را به شکم بکشید.' },
  { id: 'squat', name: 'اسکوات هالتر', muscle: 'legs', equipment: 'barbell', weighted: true, cue: 'زانو هم‌راستای پنجه، پاشنه روی زمین، تا موازی پایین بروید.' },
  { id: 'goblet', name: 'اسکوات گابلت', muscle: 'legs', equipment: 'kettlebell', weighted: true, cue: 'وزنه جلوی سینه، تنه صاف.' },
  { id: 'lunge', name: 'لانج دمبل', muscle: 'legs', equipment: 'dumbbell', weighted: true, cue: 'زانوی جلو از پنجه جلوتر نرود، گام بلند.' },
  { id: 'legpress', name: 'پرس پا دستگاه', muscle: 'legs', equipment: 'machine', weighted: true, cue: 'کمر به پشتی چسبیده، زانو قفل نشود.' },
  { id: 'rdl', name: 'ددلیفت رومانیایی', muscle: 'legs', equipment: 'barbell', weighted: true, cue: 'لگن را عقب ببرید تا کشش همسترینگ را حس کنید.' },
  { id: 'hipthrust', name: 'هیپ تراست', muscle: 'legs', equipment: 'barbell', weighted: true, cue: 'در بالای حرکت باسن را منقبض نگه دارید.' },
  { id: 'calf', name: 'ساق پا ایستاده', muscle: 'legs', equipment: 'machine', weighted: true, cue: 'دامنه‌ی کامل، مکث در بالا.' },
  { id: 'ohp', name: 'پرس سرشانه هالتر', muscle: 'shoulders', equipment: 'barbell', weighted: true, cue: 'شکم سفت، هالتر در مسیر مستقیم بالای سر.' },
  { id: 'lateral', name: 'نشر جانب دمبل', muscle: 'shoulders', equipment: 'dumbbell', weighted: true, cue: 'تا ارتفاع شانه، بدون تاب دادن.' },
  { id: 'facepull', name: 'فیس‌پول', muscle: 'shoulders', equipment: 'cable', weighted: true, cue: 'طناب به سمت صورت، آرنج بالا.' },
  { id: 'curl', name: 'جلوبازو هالتر', muscle: 'arms', equipment: 'barbell', weighted: true, cue: 'آرنج کنار بدن ثابت.' },
  { id: 'hammer', name: 'جلوبازو چکشی', muscle: 'arms', equipment: 'dumbbell', weighted: true, cue: 'کف دست‌ها رو به هم.' },
  { id: 'pushdown', name: 'پشت‌بازو سیم‌کش', muscle: 'arms', equipment: 'cable', weighted: true, cue: 'فقط ساعد حرکت کند.' },
  { id: 'skull', name: 'پشت‌بازو خوابیده', muscle: 'arms', equipment: 'barbell', weighted: true, cue: 'هالتر تا پیشانی، آرنج ثابت.' },
  { id: 'plank', name: 'پلانک', muscle: 'core', equipment: 'none', weighted: false, cue: 'باسن هم‌سطح شانه، شکم سفت (تکرار = ثانیه).' },
  { id: 'crunch', name: 'کرانچ', muscle: 'core', equipment: 'none', weighted: false, cue: 'گردن را نکشید، با شکم بالا بیایید.' },
  { id: 'legraise', name: 'بالا آوردن پا', muscle: 'core', equipment: 'bodyweight', weighted: false, cue: 'کمر به زمین چسبیده.' },
  { id: 'russian', name: 'چرخش روسی', muscle: 'core', equipment: 'none', weighted: false, cue: 'چرخش از تنه، نه فقط دست‌ها.' },
  { id: 'run', name: 'دویدن', muscle: 'cardio', equipment: 'none', weighted: false, cue: 'گام کوتاه و منظم (تکرار = دقیقه).' },
  { id: 'bike', name: 'دوچرخه ثابت', muscle: 'cardio', equipment: 'machine', weighted: false, cue: 'مقاومت متوسط (تکرار = دقیقه).' },
  { id: 'rowerg', name: 'روئینگ', muscle: 'cardio', equipment: 'machine', weighted: false, cue: 'پا، تنه، دست به ترتیب (تکرار = دقیقه).' },
  { id: 'jumprope', name: 'طناب‌زنی', muscle: 'cardio', equipment: 'none', weighted: false, cue: 'روی پنجه، مچ بچرخد (تکرار = دقیقه).' },
  { id: 'burpee', name: 'برپی', muscle: 'full', equipment: 'bodyweight', weighted: false, cue: 'شنا، پرش و دست بالای سر.' },
  { id: 'kbswing', name: 'سوئینگ کتل‌بل', muscle: 'full', equipment: 'kettlebell', weighted: true, cue: 'نیرو از لگن، نه از دست‌ها.' },
  { id: 'clean', name: 'کلین هالتر', muscle: 'full', equipment: 'barbell', weighted: true, cue: 'کشش انفجاری و گرفتن روی سرشانه.' },
  { id: 'yoga', name: 'جریان یوگا', muscle: 'full', equipment: 'none', weighted: false, cue: 'تنفس آرام و هماهنگ (تکرار = دقیقه).' },
]

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id)

export interface FoodItem {
  id: string
  name: string
  unit: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** بانک غذاهای رایج ایرانی (برای هر واحد) */
export const FOOD_DB: FoodItem[] = [
  { id: 'sangak', name: 'نان سنگک', unit: 'یک کف دست', kcal: 210, protein: 7, carbs: 42, fat: 1 },
  { id: 'barbari', name: 'نان بربری', unit: 'یک کف دست', kcal: 230, protein: 7, carbs: 45, fat: 2 },
  { id: 'lavash', name: 'نان لواش', unit: 'یک عدد', kcal: 90, protein: 3, carbs: 18, fat: 0.5 },
  { id: 'egg', name: 'تخم‌مرغ آب‌پز', unit: 'یک عدد', kcal: 78, protein: 6.5, carbs: 0.5, fat: 5.5 },
  { id: 'omelet', name: 'املت گوجه', unit: 'یک بشقاب', kcal: 280, protein: 14, carbs: 10, fat: 20 },
  { id: 'cheese', name: 'پنیر لیقوان', unit: '۳۰ گرم', kcal: 80, protein: 5, carbs: 1, fat: 6 },
  { id: 'walnut', name: 'گردو', unit: '۴ مغز', kcal: 130, protein: 3, carbs: 3, fat: 13 },
  { id: 'dates', name: 'خرما', unit: '۳ عدد', kcal: 70, protein: 0.5, carbs: 18, fat: 0 },
  { id: 'honey', name: 'عسل', unit: 'یک قاشق غذاخوری', kcal: 64, protein: 0, carbs: 17, fat: 0 },
  { id: 'oat', name: 'جو دوسر پخته', unit: 'یک کاسه', kcal: 160, protein: 6, carbs: 27, fat: 3 },
  { id: 'milk', name: 'شیر کم‌چرب', unit: 'یک لیوان', kcal: 100, protein: 8, carbs: 12, fat: 2.5 },
  { id: 'yogurt', name: 'ماست کم‌چرب', unit: 'یک کاسه کوچک', kcal: 90, protein: 8, carbs: 10, fat: 2 },
  { id: 'doogh', name: 'دوغ', unit: 'یک لیوان', kcal: 60, protein: 4, carbs: 5, fat: 2 },
  { id: 'rice', name: 'برنج کته', unit: '۴ قاشق', kcal: 160, protein: 3, carbs: 36, fat: 0.5 },
  { id: 'polo', name: 'چلو', unit: 'یک کفگیر', kcal: 200, protein: 4, carbs: 44, fat: 2 },
  { id: 'kabab-koobideh', name: 'کباب کوبیده', unit: 'یک سیخ', kcal: 250, protein: 18, carbs: 2, fat: 19 },
  { id: 'joojeh', name: 'جوجه کباب', unit: 'یک سیخ', kcal: 220, protein: 32, carbs: 2, fat: 9 },
  { id: 'chicken', name: 'سینه مرغ گریل', unit: '۱۰۰ گرم', kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 'fish', name: 'ماهی قزل‌آلا', unit: '۱۰۰ گرم', kcal: 150, protein: 21, carbs: 0, fat: 7 },
  { id: 'tuna', name: 'تن ماهی آبکش‌شده', unit: 'نصف قوطی', kcal: 120, protein: 25, carbs: 0, fat: 2 },
  { id: 'beef', name: 'گوشت گوساله لخم', unit: '۱۰۰ گرم', kcal: 200, protein: 26, carbs: 0, fat: 10 },
  { id: 'ghormeh', name: 'خورش قورمه‌سبزی', unit: 'یک کاسه', kcal: 290, protein: 16, carbs: 14, fat: 19 },
  { id: 'gheimeh', name: 'خورش قیمه', unit: 'یک کاسه', kcal: 330, protein: 15, carbs: 25, fat: 19 },
  { id: 'fesenjan', name: 'خورش فسنجان', unit: 'یک کاسه', kcal: 420, protein: 18, carbs: 24, fat: 29 },
  { id: 'adasi', name: 'عدسی', unit: 'یک کاسه', kcal: 230, protein: 14, carbs: 35, fat: 4 },
  { id: 'ash', name: 'آش رشته', unit: 'یک کاسه', kcal: 270, protein: 10, carbs: 40, fat: 8 },
  { id: 'abgoosht', name: 'آبگوشت', unit: 'یک کاسه', kcal: 450, protein: 25, carbs: 30, fat: 25 },
  { id: 'kookoo', name: 'کوکو سبزی', unit: 'یک برش', kcal: 180, protein: 7, carbs: 6, fat: 14 },
  { id: 'kotlet', name: 'کتلت', unit: 'یک عدد', kcal: 160, protein: 8, carbs: 10, fat: 10 },
  { id: 'lobia', name: 'خوراک لوبیا', unit: 'یک کاسه', kcal: 240, protein: 13, carbs: 38, fat: 4 },
  { id: 'salad-shirazi', name: 'سالاد شیرازی', unit: 'یک کاسه', kcal: 50, protein: 2, carbs: 9, fat: 0.5 },
  { id: 'salad', name: 'سالاد سبز با روغن زیتون', unit: 'یک کاسه', kcal: 120, protein: 2, carbs: 8, fat: 9 },
  { id: 'potato', name: 'سیب‌زمینی آب‌پز', unit: 'یک عدد متوسط', kcal: 130, protein: 3, carbs: 30, fat: 0 },
  { id: 'pasta', name: 'ماکارونی', unit: 'یک بشقاب', kcal: 450, protein: 18, carbs: 60, fat: 15 },
  { id: 'pizza', name: 'پیتزا مخلوط', unit: 'یک برش', kcal: 285, protein: 12, carbs: 34, fat: 11 },
  { id: 'sandwich', name: 'ساندویچ الویه', unit: 'یک عدد', kcal: 480, protein: 14, carbs: 45, fat: 27 },
  { id: 'apple', name: 'سیب', unit: 'یک عدد', kcal: 95, protein: 0.5, carbs: 25, fat: 0 },
  { id: 'banana', name: 'موز', unit: 'یک عدد', kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: 'orange', name: 'پرتقال', unit: 'یک عدد', kcal: 62, protein: 1.2, carbs: 15, fat: 0 },
  { id: 'watermelon', name: 'هندوانه', unit: 'یک برش', kcal: 85, protein: 1.7, carbs: 21, fat: 0.4 },
  { id: 'almond', name: 'بادام', unit: '۱۰ عدد', kcal: 70, protein: 2.5, carbs: 2.5, fat: 6 },
  { id: 'pistachio', name: 'پسته', unit: '۲۰ عدد', kcal: 80, protein: 3, carbs: 4, fat: 6.5 },
  { id: 'tea', name: 'چای با یک قند', unit: 'یک استکان', kcal: 20, protein: 0, carbs: 5, fat: 0 },
  { id: 'coffee', name: 'قهوه تلخ', unit: 'یک فنجان', kcal: 5, protein: 0, carbs: 0, fat: 0 },
  { id: 'whey', name: 'پروتئین وی', unit: 'یک اسکوپ', kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
  { id: 'cola', name: 'نوشابه', unit: 'یک قوطی', kcal: 140, protein: 0, carbs: 39, fat: 0 },
  { id: 'cake', name: 'کیک یزدی', unit: 'یک عدد', kcal: 180, protein: 3, carbs: 24, fat: 8 },
  { id: 'zoolbia', name: 'زولبیا و بامیه', unit: '۵۰ گرم', kcal: 220, protein: 2, carbs: 30, fat: 11 },
]

export const MEAL_LABEL = { breakfast: 'صبحانه', lunch: 'ناهار', dinner: 'شام', snack: 'میان‌وعده' } as const
