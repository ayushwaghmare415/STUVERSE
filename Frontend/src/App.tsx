/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import { Browse } from './pages/Browse';
import { StudentBrowse } from './pages/StudentBrowse';
import { Saved } from './pages/Saved';
import { Redemptions } from './pages/Redemptions';
import { Profile } from './pages/Profile';
import { DiscountDetail } from './pages/DiscountDetail';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import StudentDashboard from './pages/StudentDashboard';
import { StudentNotifications } from './pages/StudentNotifications';
import StudentVendors from './pages/StudentVendors';
import VendorDetail from './pages/VendorDetail';

// Vendor Pages
import { VendorLayout } from './components/vendor/layout/VendorLayout';
import VendorDashboard from './pages/vendor/VendorDashboard';
import { CreateOffer } from './pages/vendor/CreateOffer';
import { EditOffer } from './pages/vendor/EditOffer';
import { VendorOfferDetail } from './pages/vendor/VendorOfferDetail';
import { MyOffers } from './pages/vendor/MyOffers';
import { Analytics } from './pages/vendor/Analytics';
import { VendorRedemptions } from './pages/vendor/VendorRedemptions';
import { VendorProfile } from './pages/vendor/VendorProfile';

// Admin Pages
import { AdminLayout } from './components/admin/layout/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentManagement } from './pages/admin/StudentManagement';
import { VendorManagement } from './pages/admin/VendorManagement';
import { CouponApprovals } from './pages/admin/CouponApprovals';
import AdminCoupons from './pages/admin/AdminCoupons';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import SystemSettings from './pages/admin/SystemSettings';
import AdminNotifications from './pages/admin/AdminNotifications';
import { VendorActivity } from './pages/admin/VendorActivity';

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Main App Routes (Student) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="student" element={<ProtectedRoute element={<StudentDashboard />} requiredRole="student" />} />
          <Route path="browse" element={<ProtectedRoute element={<Browse />} requiredRole="student" />} />
          <Route path="browse/student" element={<ProtectedRoute element={<StudentBrowse />} requiredRole="student" />} />
          <Route path="saved" element={<ProtectedRoute element={<Saved />} requiredRole="student" />} />
          <Route path="redemptions" element={<ProtectedRoute element={<Redemptions />} requiredRole="student" />} />
          <Route path="profile" element={<ProtectedRoute element={<Profile />} requiredRole="student" />} />
          <Route path="discount/:id" element={<DiscountDetail />} />
          <Route path="notifications" element={<ProtectedRoute element={<StudentNotifications />} requiredRole="student" />} />
          {/* Vendor Discovery Routes */}
          <Route path="vendors" element={<ProtectedRoute element={<StudentVendors />} requiredRole="student" />} />
          <Route path="vendor-detail/:vendorId" element={<ProtectedRoute element={<VendorDetail />} requiredRole="student" />} />
        </Route>

        {/* Vendor Routes */}
        <Route path="/vendor" element={<ProtectedRoute element={<VendorLayout />} requiredRole="vendor" />}>
          <Route index element={<VendorDashboard />} />
          <Route path="create-offer" element={<CreateOffer />} />
          <Route path="edit-offer/:id" element={<EditOffer />} />
          <Route path="offer-detail/:id" element={<VendorOfferDetail />} />
          <Route path="my-offers" element={<MyOffers />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="redemptions" element={<VendorRedemptions />} />
          <Route path="profile" element={<VendorProfile />} />
        </Route>

        {/* Admin Routes - Protected by role-based access */}
        <Route path="/admin" element={<ProtectedRoute element={<AdminLayout />} requiredRole="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="vendors" element={<VendorManagement />} />
          <Route path="vendors/:id/activity" element={<VendorActivity />} />
          <Route path="approvals" element={<CouponApprovals />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>
      </Routes>
    </Router>
  );
}
