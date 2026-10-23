import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BadgeCheck, BarChart3, Building2, ClipboardList, Cog, FileText, Flag, LifeBuoy, Package, QrCode, Stethoscope, Trophy, UserCog, Users, UtensilsCrossed, Wallet, Briefcase, Star, ShieldPlus } from 'lucide-react'
import { useSession } from '@/core/db'
import { touchDaily } from '@/core/services/engagement'
import { expireTickets } from '@/core/services/fityab'
import { REMOTE } from '@/core/client/remote'
import type { Role } from '@/core/types'
import { Toaster } from '@/ui/toast'
import { useMe } from '@/ui/hooks'
import { AppShell } from '@/layouts/AppShell'
import { PanelShell, type PanelLink } from '@/layouts/PanelShell'

import Login from '@/pages/Login'
import Home from '@/pages/Home'
const WalletPage = lazy(() => import('@/pages/Wallet'))
const Profile = lazy(() => import('@/pages/Profile'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const Messages = lazy(() => import('@/pages/Messages'))
const ChatThread = lazy(() => import('@/pages/ChatThread'))
const Orders = lazy(() => import('@/pages/Orders'))
const UserProfile = lazy(() => import('@/pages/UserProfile'))
const Tickets = lazy(() => import('@/pages/Tickets'))
const Medical = lazy(() => import('@/pages/Medical'))
const Support = lazy(() => import('@/pages/Support'))
const SupportThread = lazy(() => import('@/pages/SupportThread'))
const League = lazy(() => import('@/pages/League'))
const Invite = lazy(() => import('@/pages/Invite'))
const OrgPage = lazy(() => import('@/pages/OrgPage'))
const ClientHealth = lazy(() => import('@/pages/ClientHealth'))
const Workouts = lazy(() => import('@/modules/health/Workouts'))
const Nutrition = lazy(() => import('@/modules/health/Nutrition'))
const Progress = lazy(() => import('@/modules/health/Progress'))
const ProgramView = lazy(() => import('@/modules/fityar/ProgramView'))
const Teams = lazy(() => import('@/modules/teams/Teams'))
const TeamDetail = lazy(() => import('@/modules/teams/TeamDetail'))
const Insurance = lazy(() => import('@/pages/Insurance'))

const FitYab = lazy(() => import('@/modules/fityab/FitYab'))
const GymDetail = lazy(() => import('@/modules/fityab/GymDetail'))
const FitYar = lazy(() => import('@/modules/fityar/FitYar'))
const CoachDetail = lazy(() => import('@/modules/fityar/CoachDetail'))
const Shop = lazy(() => import('@/modules/shop/Shop'))
const ProductDetail = lazy(() => import('@/modules/shop/ProductDetail'))
const Buffet = lazy(() => import('@/modules/buffet/Buffet'))
const RestaurantPage = lazy(() => import('@/modules/buffet/RestaurantPage'))
const Doctors = lazy(() => import('@/modules/doctor/Doctors'))
const DoctorDetail = lazy(() => import('@/modules/doctor/DoctorDetail'))
const FitZone = lazy(() => import('@/modules/fitzone/FitZone'))
const Challenges = lazy(() => import('@/modules/challenges/Challenges'))
const ChallengeDetail = lazy(() => import('@/modules/challenges/ChallengeDetail'))
const CreateChallenge = lazy(() => import('@/modules/challenges/CreateChallenge'))

const PanelFinance = lazy(() => import('@/panels/shared/PanelFinance'))
const GymDashboard = lazy(() => import('@/panels/gym/GymDashboard'))
const GymEditor = lazy(() => import('@/panels/gym/GymEditor'))
const GymCheckins = lazy(() => import('@/panels/gym/GymCheckins'))
const CoachDashboard = lazy(() => import('@/panels/coach/CoachDashboard'))
const CoachOrders = lazy(() => import('@/panels/coach/CoachOrders'))
const CoachProfileEditor = lazy(() => import('@/panels/coach/CoachProfileEditor'))
const SellerDashboard = lazy(() => import('@/panels/seller/SellerDashboard'))
const VendorOrders = lazy(() => import('@/panels/shared/VendorOrders'))
const DoctorPanel = lazy(() => import('@/panels/doctor/DoctorPanel'))
const DoctorProfileEditor = lazy(() => import('@/panels/doctor/DoctorProfileEditor'))
const RestaurantPanel = lazy(() => import('@/panels/restaurant/RestaurantPanel'))
const AdminOverview = lazy(() => import('@/panels/admin/AdminOverview'))
const AdminUsers = lazy(() => import('@/panels/admin/AdminUsers'))
const AdminGyms = lazy(() => import('@/panels/admin/AdminGyms'))
const AdminFinance = lazy(() => import('@/panels/admin/AdminFinance'))
const AdminChallenges = lazy(() => import('@/panels/admin/AdminChallenges'))
const AdminSettings = lazy(() => import('@/panels/admin/AdminSettings'))
const AdminApprovals = lazy(() => import('@/panels/admin/AdminApprovals'))
const AdminModeration = lazy(() => import('@/panels/admin/AdminModeration'))
const AdminSupport = lazy(() => import('@/panels/admin/AdminSupport'))
const AdminInsurance = lazy(() => import('@/panels/admin/AdminInsurance'))
const GymReviews = lazy(() => import('@/panels/gym/GymReviews'))
const CompanyPanel = lazy(() => import('@/panels/company/CompanyPanel'))

const finance: PanelLink = { to: 'finance', label: 'درآمد و تسویه', icon: Wallet }

const PANELS: Record<Exclude<Role, 'user'>, PanelLink[]> = {
  gym: [
    { to: '/panel/gym', label: 'داشبورد', icon: BarChart3, end: true },
    { to: 'checkins', label: 'پذیرش ورود', icon: QrCode },
    { to: 'reviews', label: 'نظرات', icon: Star },
    { to: 'edit', label: 'ثبت باشگاه جدید', icon: Building2 },
    finance,
  ],
  coach: [
    { to: '/panel/coach', label: 'داشبورد', icon: BarChart3, end: true },
    { to: 'orders', label: 'سفارش برنامه‌ها', icon: ClipboardList },
    { to: 'profile', label: 'پروفایل و پکیج‌ها', icon: UserCog },
    finance,
  ],
  seller: [
    { to: '/panel/seller', label: 'محصولات', icon: Package, end: true },
    { to: 'orders', label: 'سفارش‌ها', icon: ClipboardList },
    finance,
  ],
  doctor: [
    { to: '/panel/doctor', label: 'نوبت‌ها', icon: Stethoscope, end: true },
    { to: 'profile', label: 'پروفایل و زمان‌بندی', icon: UserCog },
    finance,
  ],
  restaurant: [
    { to: '/panel/restaurant', label: 'منو و رستوران', icon: UtensilsCrossed, end: true },
    { to: 'orders', label: 'سفارش‌ها', icon: ClipboardList },
    finance,
  ],
  company: [{ to: '/panel/company', label: 'سلامت سازمان', icon: Briefcase, end: true }],
  admin: [
    { to: '/panel/admin', label: 'نمای کلی', icon: BarChart3, end: true },
    { to: 'users', label: 'کاربران و نقش‌ها', icon: Users },
    { to: 'gyms', label: 'باشگاه‌ها', icon: Building2 },
    { to: 'approvals', label: 'تأیید مدارک', icon: BadgeCheck },
    { to: 'moderation', label: 'گزارش تخلف', icon: Flag },
    { to: 'support', label: 'پشتیبانی', icon: LifeBuoy },
    { to: 'insurance', label: 'بیمه و خسارت', icon: ShieldPlus },
    { to: 'finance', label: 'مالی و تسویه', icon: FileText },
    { to: 'challenges', label: 'چالش‌ها', icon: Trophy },
    { to: 'settings', label: 'کمیسیون و تنظیمات', icon: Cog },
  ],
}

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const me = useMe()
  if (!me) return <Navigate to="/login" replace />
  if (!me.roles.includes(role)) return <Navigate to="/profile" replace />
  return <>{children}</>
}

export default function App() {
  const me = useMe()
  const theme = useSession((s) => s.theme)
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (!me) return
    touchDaily().catch(() => {})
    if (!REMOTE) expireTickets()
  }, [me?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => window.scrollTo(0, 0), [pathname, me?.id])

  if (!me) {
    return (
      <>
        <Toaster />
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </>
    )
  }

  const panel = (role: Exclude<Role, 'user'>) => (
    <RequireRole role={role}>
      <PanelShell role={role} links={PANELS[role]} />
    </RequireRole>
  )

  return (
    <>
      <Toaster />
      <Suspense fallback={<div className="flex h-dvh items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>}>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="u/:id" element={<UserProfile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<ChatThread />} />
          <Route path="orders" element={<Orders />} />
          <Route path="fityab" element={<FitYab />} />
          <Route path="fityab/:id" element={<GymDetail />} />
          <Route path="fityar" element={<FitYar />} />
          <Route path="fityar/coach/:id" element={<CoachDetail />} />
          <Route path="shop" element={<Shop />} />
          <Route path="shop/:id" element={<ProductDetail />} />
          <Route path="buffet" element={<Buffet />} />
          <Route path="buffet/:id" element={<RestaurantPage />} />
          <Route path="doctors" element={<Doctors />} />
          <Route path="doctors/:id" element={<DoctorDetail />} />
          <Route path="fitzone" element={<FitZone />} />
          <Route path="challenges" element={<Challenges />} />
          <Route path="challenges/new" element={<CreateChallenge />} />
          <Route path="challenges/:id" element={<ChallengeDetail />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="workouts" element={<Workouts />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="progress" element={<Progress />} />
          <Route path="medical" element={<Medical />} />
          <Route path="support" element={<Support />} />
          <Route path="support/:id" element={<SupportThread />} />
          <Route path="league" element={<League />} />
          <Route path="invite" element={<Invite />} />
          <Route path="org" element={<OrgPage />} />
          <Route path="program/:id" element={<ProgramView />} />
          <Route path="client/:id" element={<ClientHealth />} />
          <Route path="teams" element={<Teams />} />
          <Route path="teams/:id" element={<TeamDetail />} />
          <Route path="insurance" element={<Insurance />} />
        </Route>

        <Route path="/panel/gym" element={panel('gym')}>
          <Route index element={<GymDashboard />} />
          <Route path="checkins" element={<GymCheckins />} />
          <Route path="reviews" element={<GymReviews />} />
          <Route path="edit" element={<GymEditor />} />
          <Route path="edit/:id" element={<GymEditor />} />
          <Route path="finance" element={<PanelFinance />} />
        </Route>
        <Route path="/panel/coach" element={panel('coach')}>
          <Route index element={<CoachDashboard />} />
          <Route path="orders" element={<CoachOrders />} />
          <Route path="profile" element={<CoachProfileEditor />} />
          <Route path="finance" element={<PanelFinance />} />
        </Route>
        <Route path="/panel/seller" element={panel('seller')}>
          <Route index element={<SellerDashboard />} />
          <Route path="orders" element={<VendorOrders kind="shop" />} />
          <Route path="finance" element={<PanelFinance />} />
        </Route>
        <Route path="/panel/doctor" element={panel('doctor')}>
          <Route index element={<DoctorPanel />} />
          <Route path="profile" element={<DoctorProfileEditor />} />
          <Route path="finance" element={<PanelFinance />} />
        </Route>
        <Route path="/panel/restaurant" element={panel('restaurant')}>
          <Route index element={<RestaurantPanel />} />
          <Route path="orders" element={<VendorOrders kind="food" />} />
          <Route path="finance" element={<PanelFinance />} />
        </Route>
        <Route path="/panel/company" element={panel('company')}>
          <Route index element={<CompanyPanel />} />
        </Route>
        <Route path="/panel/admin" element={panel('admin')}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="gyms" element={<AdminGyms />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="challenges" element={<AdminChallenges />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="moderation" element={<AdminModeration />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="insurance" element={<AdminInsurance />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  )
}
