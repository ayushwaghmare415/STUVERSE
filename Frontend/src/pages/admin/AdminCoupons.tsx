/**
 * ADMIN COUPONS MANAGEMENT PAGE
 * =============================
 * 
 * PURPOSE: Admin can view and manage all coupons/offers in the system
 * 
 * FEATURES:
 * - View all coupons (Pending, Approved, Rejected)
 * - Approve/Reject coupons from pending status
 * - Delete coupons permanently
 * - Search by title
 * - Filter by status and category
 * - Pagination
 * - Status badges with color coding
 * - Vendor information display
 * - Toast notifications
 * - Loading states and error handling
 * 
 * SECURITY:
 * - Frontend: ProtectedRoute ensures only admins access this page
 * - Backend: authenticateUser + authorizeRoles('admin') middleware
 * - API calls include JWT token from localStorage
 * - Prevents approval of offers from blocked vendors
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Search,
  Filter,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCheck,
  Ban,
} from 'lucide-react';
import API from '@/lib/api';

// ============ TYPES ============

interface Vendor {
  _id: string;
  name: string;
  businessName?: string;
  email: string;
  isBlocked: boolean;
}

interface Coupon {
  _id: string;
  title: string;
  description?: string;
  discountType: string;
  discountValue: number;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  bannerImage?: string;
  expiryDate?: string;
  claimCount: number;
  viewCount: number;
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  vendor: Vendor;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface DeleteModalState {
  isOpen: boolean;
  couponId?: string;
  couponTitle?: string;
}

interface ActionModalState {
  isOpen: boolean;
  couponId?: string;
  action?: 'approve' | 'reject';
  couponTitle?: string;
  rejectionReason?: string;
}

// ============ COMPONENT ============

export default function AdminCoupons() {
  // ============ STATE ============
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ============ FILTERS & SEARCH ============
  const [searchTitle, setSearchTitle] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // ============ MODAL STATES ============
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
  });
  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
  });

  // ============ CONSTANTS ============
  const categories = ['all', 'Food', 'Tech', 'Fashion', 'Education'];
  const statuses = ['all', 'pending', 'approved', 'rejected'];

  // ============ UTILITY FUNCTIONS ============

  /**
   * Display toast notification
   */
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  /**
   * Format date
   */
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Format discount display
   */
  const formatDiscount = (discountType: string, discountValue: number) => {
    if (discountType === 'percentage') {
      return `${discountValue}% OFF`;
    }
    return `$${discountValue} OFF`;
  };

  /**
   * Get status badge styling
   */
  const getStatusBadgeStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactElement }> = {
      pending: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: <Clock className="w-3.5 h-3.5" />,
      },
      approved: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        icon: <CheckCheck className="w-3.5 h-3.5" />,
      },
      rejected: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        icon: <Ban className="w-3.5 h-3.5" />,
      },
    };
    return styles[status] || styles['pending'];
  };

  // ============ API FUNCTIONS ============

  /**
   * Fetch coupons from API with filters
   */
  const fetchCoupons = async (page = 1, search = '', status = 'all', category = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = {
        page,
        limit: 10,
      };

      if (search.trim()) {
        params.search = search;
      }

      if (status !== 'all') {
        params.status = status;
      }

      if (category !== 'all') {
        params.category = category;
      }

      const response = await API.get('/admin/coupons', { params });

      if (response.data.success) {
        setCoupons(response.data.coupons);
        setPagination(response.data.pagination);
      } else {
        setError(response.data.message || 'Failed to fetch coupons');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch coupons';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Approve a coupon
   */
  const handleApprove = async () => {
    if (!actionModal.couponId) return;

    try {
      setActionLoading(actionModal.couponId);
      const response = await API.patch(`/admin/offers/${actionModal.couponId}/approve`);

      if (response.data.message) {
        showToast(response.data.message, 'success');
      }

      closeActionModal();
      fetchCoupons(currentPage, searchTitle, selectedStatus, selectedCategory);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to approve coupon';
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Reject a coupon
   */
  const handleReject = async () => {
    if (!actionModal.couponId) return;

    try {
      setActionLoading(actionModal.couponId);
      const response = await API.patch(`/admin/offers/${actionModal.couponId}/reject`, {
        rejectionReason: actionModal.rejectionReason || undefined,
      });

      if (response.data.message) {
        showToast(response.data.message, 'success');
      }

      closeActionModal();
      fetchCoupons(currentPage, searchTitle, selectedStatus, selectedCategory);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to reject coupon';
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Delete a coupon
   */
  const handleDelete = async () => {
    if (!deleteModal.couponId) return;

    try {
      setActionLoading(deleteModal.couponId);
      const response = await API.delete(`/admin/coupons/${deleteModal.couponId}`);

      if (response.data.message) {
        showToast(response.data.message, 'success');
      }

      closeDeleteModal();
      fetchCoupons(currentPage, searchTitle, selectedStatus, selectedCategory);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete coupon';
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ============ MODAL HANDLERS ============

  /**
   * Open action modal (approve/reject)
   */
  const openActionModal = (
    action: 'approve' | 'reject',
    couponId: string,
    couponTitle: string
  ) => {
    setActionModal({
      isOpen: true,
      action,
      couponId,
      couponTitle,
      rejectionReason: '',
    });
  };

  /**
   * Close action modal
   */
  const closeActionModal = () => {
    setActionModal({ isOpen: false });
  };

  /**
   * Open delete modal
   */
  const openDeleteModal = (couponId: string, couponTitle: string) => {
    setDeleteModal({
      isOpen: true,
      couponId,
      couponTitle,
    });
  };

  /**
   * Close delete modal
   */
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false });
  };

  // ============ FILTER HANDLERS ============

  /**
   * Handle search submission
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCoupons(1, searchTitle, selectedStatus, selectedCategory);
  };

  /**
   * Handle status filter change
   */
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    fetchCoupons(1, searchTitle, status, selectedCategory);
  };

  /**
   * Handle category filter change
   */
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    fetchCoupons(1, searchTitle, selectedStatus, category);
  };

  /**
   * Handle pagination change
   */
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page);
      fetchCoupons(page, searchTitle, selectedStatus, selectedCategory);
    }
  };

  // ============ LIFECYCLE ============

  useEffect(() => {
    fetchCoupons(1, '', 'all', 'all');
  }, []);

  // ============ RENDER ============

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Coupon Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage all vendor coupons and discount offers across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50">
          <span className="text-sm font-semibold text-blue-700">
            Total: {pagination.total}
          </span>
        </div>
      </motion.div>

      {/* SEARCH & FILTERS */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-4"
      >
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by coupon title..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Search
          </button>
        </form>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  Status: {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c === 'all' ? 'All' : c}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* ERROR STATE */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span className="text-red-800">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOADING STATE */}
      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <LoaderCircle className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-slate-600">Loading coupons...</p>
        </motion.div>
      ) : coupons.length === 0 ? (
        // EMPTY STATE
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-lg"
        >
          <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No coupons found</p>
          <p className="text-slate-500 text-sm mt-1">
            Try adjusting your search or filters
          </p>
        </motion.div>
      ) : (
        <>
          {/* COUPONS TABLE */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Expiry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <AnimatePresence>
                    {coupons.map((coupon) => {
                      const statusStyle = getStatusBadgeStyle(coupon.status);
                      const isExpired = coupon.expiryDate
                        ? new Date(coupon.expiryDate) < new Date()
                        : false;

                      return (
                        <motion.tr
                          key={coupon._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="hover:bg-slate-50 transition"
                        >
                          {/* Title */}
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {coupon.title}
                            {isExpired && (
                              <div className="text-xs text-red-600 mt-1">Expired</div>
                            )}
                          </td>

                          {/* Vendor */}
                          <td className="px-6 py-4 text-sm text-slate-600">
                            <div className="font-medium text-slate-900">
                              {coupon.vendor?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {coupon.vendor?.email}
                            </div>
                            {coupon.vendor?.isBlocked && (
                              <div className="text-xs text-red-600 font-medium mt-1">
                                ⚠️ Vendor Blocked
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-6 py-4 text-sm text-slate-600">
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                              {coupon.category}
                            </span>
                          </td>

                          {/* Discount */}
                          <td className="px-6 py-4 text-sm font-bold text-green-600">
                            {formatDiscount(coupon.discountType, coupon.discountValue)}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 text-sm">
                            <div
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full w-fit text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              {statusStyle.icon}
                              {coupon.status.charAt(0).toUpperCase() + coupon.status.slice(1)}
                            </div>
                          </td>

                          {/* Expiry Date */}
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(coupon.expiryDate)}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              {/* Approve Button (only for pending) */}
                              {coupon.status === 'pending' && (
                                <button
                                  onClick={() =>
                                    openActionModal('approve', coupon._id, coupon.title)
                                  }
                                  disabled={actionLoading === coupon._id}
                                  className="p-1.5 hover:bg-green-50 rounded-lg transition text-green-600 hover:text-green-700 disabled:opacity-50"
                                  title="Approve"
                                >
                                  {actionLoading === coupon._id ? (
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              {/* Reject Button (only for pending) */}
                              {coupon.status === 'pending' && (
                                <button
                                  onClick={() =>
                                    openActionModal('reject', coupon._id, coupon.title)
                                  }
                                  disabled={actionLoading === coupon._id}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-600 hover:text-red-700 disabled:opacity-50"
                                  title="Reject"
                                >
                                  {actionLoading === coupon._id ? (
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              {/* Delete Button */}
                              <button
                                onClick={() =>
                                  openDeleteModal(coupon._id, coupon.title)
                                }
                                disabled={actionLoading === coupon._id}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-600 hover:text-red-700 disabled:opacity-50"
                                title="Delete"
                              >
                                {actionLoading === coupon._id ? (
                                  <LoaderCircle className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>

                              {/* View Details Button */}
                              <button
                                className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600 hover:text-blue-700"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {pagination.pages > 1 && (
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.pages} • Showing{' '}
                  {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-2 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="p-2 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h2 className="text-lg font-bold text-slate-900">Delete Coupon?</h2>
              </div>

              <p className="text-slate-600">
                Are you sure you want to delete "<strong>{deleteModal.couponTitle}</strong>"? This
                action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={actionLoading === deleteModal.couponId}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === deleteModal.couponId}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === deleteModal.couponId ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTION CONFIRMATION MODAL */}
      <AnimatePresence>
        {actionModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-md w-full p-6 space-y-4"
            >
              {actionModal.action === 'approve' ? (
                <>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <h2 className="text-lg font-bold text-slate-900">Approve Coupon?</h2>
                  </div>
                  <p className="text-slate-600">
                    Approve "<strong>{actionModal.couponTitle}</strong>"? This will make it visible
                    to students.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-600" />
                    <h2 className="text-lg font-bold text-slate-900">Reject Coupon?</h2>
                  </div>
                  <p className="text-slate-600">
                    Reject "<strong>{actionModal.couponTitle}</strong>"? Provide a reason (optional).
                  </p>

                  {actionModal.action === 'reject' && (
                    <textarea
                      value={actionModal.rejectionReason || ''}
                      onChange={(e) =>
                        setActionModal({
                          ...actionModal,
                          rejectionReason: e.target.value,
                        })
                      }
                      placeholder="Reason for rejection (optional)..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                      rows={3}
                    />
                  )}
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeActionModal}
                  disabled={actionLoading === actionModal.couponId}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={actionModal.action === 'approve' ? handleApprove : handleReject}
                  disabled={actionLoading === actionModal.couponId}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${
                    actionModal.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading === actionModal.couponId ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      {actionModal.action === 'approve' ? 'Approving...' : 'Rejecting...'}
                    </>
                  ) : (
                    <>
                      {actionModal.action === 'approve' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-4 right-4 space-y-2 z-40 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, y: 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: 0 }}
              className={`px-4 py-3 rounded-lg text-sm font-medium text-white pointer-events-auto ${
                toast.type === 'success'
                  ? 'bg-green-600'
                  : toast.type === 'error'
                  ? 'bg-red-600'
                  : toast.type === 'warning'
                  ? 'bg-amber-600'
                  : 'bg-blue-600'
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
