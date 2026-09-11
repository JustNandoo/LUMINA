import { Navigate, Route, Routes } from 'react-router-dom'

import AdminLayout from '../components/layout/AdminLayout'
import { GuestRoute, ProtectedRoute } from './RouteGuards'
import UserLayout from '../components/layout/UserLayout'

import PublicLayout from '../components/layout/PublicLayout'
import Landing from '../pages/landing/Landing'
import About from '../pages/landing/About'
import Features from '../pages/landing/Features'
import Help from '../pages/landing/Help'
import Pricing from '../pages/landing/Pricing'
import Auth from '../pages/auth/Auth'
import ForgotPassword from '../pages/auth/ForgotPassword'
import OtpVerification from '../pages/auth/OtpVerification'
import ResetPassword from '../pages/auth/ResetPassword'

import Home from '../pages/user/home/Home'
import Explore from '../pages/user/explore/Explore'
import BusinessPotential from '../pages/user/business/BusinessPotential'
import Profile from '../pages/user/profile/Profile'
import Subscription from '../pages/user/subscription/Subscription'

import AdminHome from '../pages/admin/AdminHome'
import MapManagement from '../pages/admin/MapManagement'
import UserManagement from '../pages/admin/UserManagement'
import {
  B2BPackageManagement,
  RoleManagement,
} from '../pages/admin/RoleManagement'
import B2BPartnerManagement from '../pages/admin/B2BPartnerManagement'
import SurveyDataManagement from '../pages/admin/SurveyDataManagement'

/**
 * Tiga kelompok route:
 *   publik  — landing & autentikasi, tanpa cangkang
 *   /app    — sisi pengguna, memakai UserLayout + UserSidebar
 *   /admin  — sisi admin, memakai AdminLayout + AdminSidebar
 * Halaman peta dan potensi bisnis dipakai kedua sisi, tetapi tiap sisi
 * mendaftarkannya sendiri agar sidebar-nya tidak ikut berganti.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/help" element={<Help />} />
      </Route>
      {/* Halaman auth hanya untuk tamu; yang sudah login dilempar ke /app/home. */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Auth key="login" initialMode="login" />} />
        <Route
          path="/signup"
          element={<Auth key="signup" initialMode="signup" />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
      {/* OTP & reset password tetap terbuka: dipakai juga lewat link dari email. */}
      <Route path="/verify-otp" element={<OtpVerification />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<UserLayout />}>
          <Route index element={<Navigate to="/app/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="business-insights" element={<BusinessPotential />} />
          <Route path="profile" element={<Profile />} />
          <Route path="subscription" element={<Subscription />} />
        </Route>

        {/* TODO: backend belum punya kolom role — semua akun yang login masih
            bisa membuka /admin. Tambahkan pengecekan role begitu API-nya ada. */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route path="map" element={<MapManagement />} />
          <Route path="business-potential" element={<BusinessPotential />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="b2b-packages" element={<B2BPackageManagement />} />
          <Route path="b2b-partners" element={<B2BPartnerManagement />} />
          <Route path="survey-data" element={<SurveyDataManagement />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
