/**
 * ADMIN COUPON APPROVALS PAGE
 * =============================
 * 
 * PURPOSE: Admin review and manage vendor-submitted offers requiring approval
 * 
 * FEATURES:
 * - Display pending offers in a card-based layout
 * - Approve/reject offers with confirmation modals
 * - Search offers by title
 * - Filter offers by category
 * - Pagination support
 * - Toast notifications for actions
 * - Shows vendor details (name, email)
 * - Prevents approval of offers from blocked vendors
 * - Displays "No Pending Approvals" when empty
 * 
 * SECURITY:
 * - Frontend: ProtectedRoute ensures only admins access this page
 * - Backend: authenticateUser + authorizeRoles('admin') middleware
 * - API calls include JWT token from localStorage
 */

import { useEffect, useState } from 'react';
import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Eye, Search, Filter, LoaderCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '@/lib/api';

// ============ TYPES ============

interface Vendor {
  _id: string;
  name: string;
  businessName?: string;
  email: string;
  isBlocked: boolean;
}

interface Offer {
  _id: string;
  title: string;
  description?: string;
  discountType: string;
  discountValue: number;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  bannerImage?: string;
  expiryDate?: string;
  createdAt: string;
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
  type: 'success' | 'error' | 'info';
}

interface ModalState {
  isOpen: boolean;
  offerId?: string;
  action?: 'approve' | 'reject';
  offerTitle?: string;
  rejectionReason?: string;
}

// ============ COMPONENT ============

export function CouponApprovals() {
  // ============ STATE ============
  const [offers, setOffers] = useState<Offer[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ============ FILTERS & SEARCH ============
  const [searchTitle, setSearchTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // ============ MODAL STATE ============
  const [modal, setModal] = useState<ModalState>({
    isOpen: false
  });

  const categories = ['all', 'Food', 'Tech', 'Fashion', 'Education'];

  // ============ FUNCTIONS ============

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
   * Fetch pending offers from API
   */
  const fetchPendingOffers = async (page = 1, search = '', category = 'all') => {
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

      if (category !== 'all') {
        params.category = category;
      }

      const response = await API.get('/admin/pending-offers', { params });

      setOffers(response.data.offers);
      setPagination(response.data.pagination);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch pending offers';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open confirmation modal for approve/reject action
   */
  const openModal = (action: 'approve' | 'reject', offerId: string, offerTitle: string) => {
    setModal({
      isOpen: true,
      action,
      offerId,
      offerTitle,
      rejectionReason: ''
    });
  };

  /**
   * Close modal
   */
  const closeModal = () => {
    setModal({ isOpen: false });
  };

  /**
   * APPROVE an offer
   */
  const handleApprove = async () => {
    if (!modal.offerId) return;

    try {
      setActionLoading(modal.offerId);
      await API.patch(`/admin/offers/${modal.offerId}/approve`);

      showToast('Offer approved successfully', 'success');
      closeModal();
      fetchPendingOffers(pagination.page, searchTitle, selectedCategory);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to approve offer';
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * REJECT an offer
   */
  const handleReject = async () => {
    if (!modal.offerId) return;

    try {
      setActionLoading(modal.offerId);
      await API.patch(`/admin/offers/${modal.offerId}/reject`, {
        rejectionReason: modal.rejectionReason || undefined
      });

      showToast('Offer rejected successfully', 'success');
      closeModal();
      fetchPendingOffers(pagination.page, searchTitle, selectedCategory);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to reject offer';
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Handle search form submission
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPendingOffers(1, searchTitle, selectedCategory);
  };

  /**
   * Handle category filter change
   */
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    fetchPendingOffers(1, searchTitle, category);
  };

  /**
   * Handle pagination change
   */
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page);
      fetchPendingOffers(page, searchTitle, selectedCategory);
    }
  };

  /**
   * Format date
   */
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  // ============ LIFECYCLE ============

  useEffect(() => {
    fetchPendingOffers(1, '', 'all');
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
            Offer Approvals
          </h1>
          <p className="text-slate-500 mt-1">
            Review and approve new discount offers submitted by vendors.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
          {pagination.total} Pending
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by offer title..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Search
          </button>
        </form>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-slate-500" />
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* LOADING STATE */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-12"
        >
          <div className="text-center space-y-4">
            <LoaderCircle className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-slate-500">Loading pending offers...</p>
          </div>
        </motion.div>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={() => fetchPendingOffers(1, searchTitle, selectedCategory)}
            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* EMPTY STATE */}
      {!loading && offers.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-12 text-center"
        >
          <div className="space-y-2">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold text-slate-900">No Pending Approvals</h3>
            <p className="text-slate-500">All offers have been reviewed.</p>
          </div>
        </motion.div>
      )}

      {/* OFFERS GRID */}
      {!loading && offers.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {offers.map((offer, index) => (
              <motion.div
                key={offer._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group flex flex-col"
              >
                {/* IMAGE HEADER */}
                <div className="h-40 relative overflow-hidden bg-linear-to-br from-slate-100 to-slate-200">
                  {offer.bannerImage ? (
                    <img
                      src={offer.bannerImage}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Eye className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-orange-50 text-orange-700 border-orange-200">
                      Pending Review
                    </span>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* DISCOUNT BADGE & VENDOR */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold">
                      {formatDiscount(offer.discountType, offer.discountValue)}
                    </div>
                    <span className="text-xs font-medium text-slate-500 px-2 py-1 bg-slate-50 rounded">
                      {offer.category}
                    </span>
                  </div>

                  {/* TITLE */}
                  <h3 className="font-semibold text-slate-900 text-base mb-2 line-clamp-2">
                    {offer.title}
                  </h3>

                  {/* VENDOR INFO */}
                  <div className="mb-3 pb-3 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-600">
                      {offer.vendor.businessName || offer.vendor.name}
                    </p>
                    <p className="text-xs text-slate-500">{offer.vendor.email}</p>
                    {offer.vendor.isBlocked && (
                      <p className="text-xs text-red-600 font-semibold mt-1">⚠️ Vendor Blocked</p>
                    )}
                  </div>

                  {/* METADATA */}
                  <div className="space-y-1 text-xs text-slate-500">
                    {offer.expiryDate && (
                      <p>Expires: {formatDate(offer.expiryDate)}</p>
                    )}
                    <p>Submitted: {formatDate(offer.createdAt)}</p>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="grid grid-cols-2 border-t border-slate-100 divide-x divide-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => openModal('approve', offer._id, offer.title)}
                    disabled={actionLoading === offer._id || offer.vendor.isBlocked}
                    className="py-3 flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === offer._id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => openModal('reject', offer._id, offer.title)}
                    disabled={actionLoading === offer._id}
                    className="py-3 flex items-center justify-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === offer._id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* PAGINATION */}
          {pagination.pages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-2 pt-6"
            >
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex gap-1">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.pages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <span className="text-sm text-slate-600 ml-4">
                Page {currentPage} of {pagination.pages} ({pagination.total} total)
              </span>
            </motion.div>
          )}
        </>
      )}

      {/* CONFIRMATION MODAL */}
      {modal.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-6"
          >
            {/* HEADER */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                {modal.action === 'approve'
                  ? 'Approve Offer?'
                  : 'Reject Offer?'}
              </h2>
              <p className="text-sm text-slate-600">
                {modal.offerTitle}
              </p>
            </div>

            {/* REJECTION REASON (IF REJECTING) */}
            {modal.action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  value={modal.rejectionReason}
                  onChange={(e) => setModal({ ...modal, rejectionReason: e.target.value })}
                  placeholder="E.g., Offer violates terms of service"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                  rows={3}
                />
              </div>
            )}

            {/* MESSAGE */}
            <p className="text-sm text-slate-600">
              {modal.action === 'approve'
                ? 'This offer will be visible to students and they can claim it.'
                : 'This offer will be rejected and hidden from students.'}
            </p>

            {/* ACTIONS */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={modal.action === 'approve' ? handleApprove : handleReject}
                disabled={actionLoading !== null}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                  modal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                }`}
              >
                {actionLoading !== null && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {modal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-4 right-4 space-y-2 z-40">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`px-4 py-3 rounded-lg font-medium text-white ${
              toast.type === 'success'
                ? 'bg-emerald-600'
                : toast.type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
            }`}
          >
            {toast.message}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
