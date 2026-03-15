/**
 * ADMIN DASHBOARD
 * ================
 * 
 * This component serves as the main admin control center for STUVERSE.
 * Only users with role === "admin" can access this page (enforced via ProtectedRoute).
 * 
 * FEATURES:
 * 1. Real-time statistics dashboard with MongoDB aggregation
 * 2. Recent users table (last 10 registered)
 * 3. Pending offers list with approve/reject actions
 * 4. Loading states and error handling
 * 5. Responsive modern SaaS UI with Tailwind CSS
 * 
 * SECURITY:
 * - Frontend ProtectedRoute checks role before rendering
 * - Backend APIs protected with authenticateUser + authorizeRoles('admin')
 * - Passwords never returned from API
 * - Blocked users excluded from active counts
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StatCard } from '../../components/ui/StatCard';
import { Users, Store, Tag, Ticket, AlertCircle, Clock, Activity, CheckCircle, XCircle, LoaderCircle, RefreshCw } from 'lucide-react';
import API from '../../lib/api';
import { getSocket } from '@/lib/socket';

interface DashboardStats {
  totalStudents: number;
  totalVendors: number;
  totalOffers: number;
  pendingOffers: number;
  approvedOffers: number;
  rejectedOffers: number;
  totalClaims: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'vendor' | 'admin';
  createdAt: string;
}

interface Offer {
  _id: string;
  title: string;
  description?: string;
  discountType: string;
  discountValue: number;
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  claimCount: number;
  createdAt: string;
  vendor?: {
    _id: string;
    name: string;
    businessName?: string;
  };
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Display toast notification
   */
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  /**
   * Fetch dashboard data
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel for better performance
      const [statsRes, usersRes, offersRes] = await Promise.all([
        API.get('/admin/dashboard'),
        API.get('/admin/recent-users'),
        API.get('/admin/pending-offers')
      ]);

      setStats(statsRes.data);
      setRecentUsers(usersRes.data.users || []);
      setPendingOffers(offersRes.data.offers || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch dashboard data';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reload dashboard data
   */
  const handleRefresh = () => {
    fetchDashboardData();
  };

  /**
   * Approve offer
   */
  const handleApproveOffer = async (offerId: string) => {
    try {
      await API.patch(`/admin/coupons/${offerId}/status`, { status: 'approved' });
      showToast('Offer approved successfully!', 'success');
      // Remove from pending offers list
      setPendingOffers(prev => prev.filter(o => o._id !== offerId));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to approve offer';
      showToast(msg, 'error');
    }
  };

  /**
   * Reject offer
   */
  const handleRejectOffer = async (offerId: string) => {
    try {
      await API.patch(`/admin/coupons/${offerId}/status`, { status: 'rejected' });
      showToast('Offer rejected', 'success');
      // Remove from pending offers list
      setPendingOffers(prev => prev.filter(o => o._id !== offerId));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reject offer';
      showToast(msg, 'error');
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();

    // subscribe to real-time socket events
    const socket = getSocket();

    const incrementStat = (key: keyof DashboardStats, amount = 1) => {
      setStats((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: (prev[key] || 0) + amount } as DashboardStats;
      });
    };

    socket.on('studentRegistered', (data) => {
      showToast('New student registered', 'info');
      incrementStat('totalStudents');
      setRecentUsers((prev) => [
        {
          _id: data.student?.id || `new-${Date.now()}`,
          name: data.student?.name || 'New student',
          email: data.student?.email || 'n/a',
          role: 'student',
          createdAt: new Date().toISOString()
        },
        ...prev
      ].slice(0, 10));
    });

    socket.on('newStudentRegistered', (data) => {
      // legacy support
      showToast('New student registered', 'info');
      incrementStat('totalStudents');
      setRecentUsers((prev) => [
        {
          _id: data.student?.id || `new-${Date.now()}`,
          name: data.student?.name || 'New student',
          email: data.student?.email || 'n/a',
          role: 'student',
          createdAt: new Date().toISOString()
        },
        ...prev
      ].slice(0, 10));
    });

    socket.on('vendorRegistered', (data) => {
      showToast('New vendor joined', 'info');
      incrementStat('totalVendors');
    });

    socket.on('newVendorRegistered', (data) => {
      // legacy support
      showToast('New vendor joined', 'info');
      incrementStat('totalVendors');
    });

    socket.on('newOfferCreated', (data) => {
      showToast('New offer waiting for approval', 'info');
      incrementStat('totalOffers');
      incrementStat('pendingOffers');
      setPendingOffers((prev) => [
        {
          _id: data.offer?._id || `new-${Date.now()}`,
          title: data.offer?.title || 'New Offer',
          description: data.offer?.description || '',
          discountType: data.offer?.discountType || 'percentage',
          discountValue: data.offer?.discountValue ?? 0,
          status: data.offer?.status || 'pending',
          category: data.offer?.category || 'General',
          claimCount: data.offer?.claimCount ?? 0,
          createdAt: new Date().toISOString(),
          vendor: {
            _id: data.vendorId || data.offer?.vendorId || '',
            name: data.offer?.vendor?.name || '',
            businessName: data.offer?.vendor?.businessName || ''
          }
        },
        ...prev
      ].slice(0, 20));
    });

    socket.on('new_coupon_submitted', (data) => {
      showToast('Vendor submitted a new offer', 'info');
      fetchDashboardData();
    });

    socket.on('newOfferSubmitted', (data) => {
      // duplicate to satisfy spec name if received
      showToast('Vendor submitted a new offer', 'info');
      fetchDashboardData();
    });

    socket.on('offerStatusUpdate', (data) => {
      showToast(
        `Offer ${data.status.toLowerCase()}${data.title ? `: ${data.title}` : ''}`,
        'success'
      );
      fetchDashboardData();
    });

    socket.on('offerStatusUpdated', (data) => {
      // admin may receive updates from other admins
      showToast(
        `Offer ${data.status.toLowerCase()}${data.title ? `: ${data.title}` : ''}`,
        'success'
      );
      fetchDashboardData();
    });

    socket.on('couponRedeemed', (data) => {
      showToast('A coupon was redeemed', 'info');
      incrementStat('totalClaims');
      fetchDashboardData();
    });

    socket.on('adminBroadcast', (notif) => {
      showToast(notif.message || 'System notification', 'info');
    });

    socket.on('stats_update', () => {
      // catch-all update notifications from backend
      fetchDashboardData();
    });

    return () => {
      socket.off('studentRegistered');
      socket.off('newStudentRegistered');
      socket.off('vendorRegistered');
      socket.off('newVendorRegistered');
      socket.off('newOfferCreated');
      socket.off('new_coupon_submitted');
      socket.off('newOfferSubmitted');
      socket.off('offerStatusUpdate');
      socket.off('offerStatusUpdated');
      socket.off('couponRedeemed');
      socket.off('adminBroadcast');
      socket.off('stats_update');
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`px-4 py-3 rounded-lg text-white font-medium shadow-lg ${
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            }`}
          >
            {toast.message}
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Admin Dashboard <span className="text-2xl">👑</span>
          </h1>
          <p className="text-slate-500 mt-1">
            Control and monitor the entire STUVERSE platform
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={`h-5 w-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="font-medium text-red-900">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-sm text-red-700 hover:text-red-900 font-medium mt-1"
            >
              Try again →
            </button>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {!loading && stats && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <StatCard 
              title="Total Students" 
              value={stats.totalStudents.toLocaleString()} 
              icon={<Users className="h-5 w-5" />} 
              trend={{ value: 12, isPositive: true }}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatCard 
              title="Total Vendors" 
              value={stats.totalVendors.toLocaleString()} 
              icon={<Store className="h-5 w-5" />} 
              trend={{ value: 5, isPositive: true }}
              className="bg-orange-50/30 border-orange-100"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatCard 
              title="Total Offers" 
              value={stats.totalOffers.toLocaleString()} 
              icon={<Tag className="h-5 w-5" />} 
              trend={{ value: 15, isPositive: true }}
              className="bg-purple-50/30 border-purple-100"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <StatCard 
              title="Pending Approvals" 
              value={stats.pendingOffers.toString()} 
              icon={<AlertCircle className="h-5 w-5" />} 
              className="bg-red-50/30 border-red-100"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <StatCard 
              title="Approved Offers" 
              value={stats.approvedOffers.toLocaleString()} 
              icon={<CheckCircle className="h-5 w-5" />} 
              trend={{ value: 8, isPositive: true }}
              className="bg-emerald-50/30 border-emerald-100"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <StatCard 
              title="Rejected Offers" 
              value={stats.rejectedOffers.toLocaleString()} 
              icon={<XCircle className="h-5 w-5" />} 
              className="bg-slate-50/30 border-slate-100"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <StatCard 
              title="Total Redemptions" 
              value={stats.totalClaims.toLocaleString()} 
              icon={<Ticket className="h-5 w-5" />} 
              trend={{ value: 22, isPositive: true }}
              className="bg-blue-50/30 border-blue-100"
            />
          </motion.div>
        </motion.div>
      )}

      {/* Recent Users Section */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Role</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length > 0 ? (
                  recentUsers.map((user, idx) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                      <td className="px-6 py-4 text-slate-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'student' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'vendor' ? 'bg-orange-100 text-orange-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-slate-500">
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Pending Offers for Approval */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Pending Offer Approvals</h2>
            </div>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
              {pendingOffers.length} pending
            </span>
          </div>
          <div className="space-y-3 p-6">
            {pendingOffers.length > 0 ? (
              pendingOffers.map((offer, idx) => (
                <motion.div
                  key={offer._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-linear-to-r from-slate-50 to-slate-50/50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{offer.title}</h3>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{offer.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                        <span>
                          <span className="font-medium">Vendor:</span> {offer.vendor?.businessName || offer.vendor?.name}
                        </span>
                        <span>
                          <span className="font-medium">Discount:</span> {offer.discountValue}{offer.discountType === 'percentage' ? '%' : '₹'}
                        </span>
                        <span>
                          <span className="font-medium">Category:</span> {offer.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApproveOffer(offer._id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRejectOffer(offer._id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                <p className="text-slate-600 font-medium">All pending offers have been reviewed!</p>
                <p className="text-sm text-slate-500 mt-1">Great work keeping up with approvals.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

