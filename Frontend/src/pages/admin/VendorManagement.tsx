import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, AlertCircle, CheckCircle2, XCircle, Trash2, Eye, Loader, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import API from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Vendor {
  _id: string;
  name: string;
  email: string;
  businessName?: string;
  category?: string;
  status?: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  totalOffers?: number;
  approvedOffers?: number;
  pendingOffers?: number;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const getStatusLabel = (vendor: Vendor): string => {
  if (vendor.isBlocked) return 'Blocked';
  const status = vendor.status?.toString() || (vendor.isVerified ? 'Approved' : 'Pending');
  return status;
};

const getStatusColor = (vendor: Vendor) => {
  if (vendor.isBlocked) return 'bg-red-50 text-red-700 border-red-200';
  const status = vendor.status?.toString() || (vendor.isVerified ? 'Approved' : 'Pending');
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'pending':
    default:
      return 'bg-orange-50 text-orange-700 border-orange-200';
  }
};

export function VendorManagement() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalOffers, setModalOffers] = useState<any[] | null>(null);

  const fetchVendors = async (page = 1, search = '', status = '') => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const { data } = await API.get(`/admin/vendors?${params}`);
      setVendors(data.vendors);
      setPagination(data.pagination);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch vendors';
      setError(msg);
      console.error('Fetch vendors error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // debounce search and filters
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors(1, searchQuery, statusFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') setSuccess(msg);
    else setError(msg);
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this vendor? They will be able to login and create offers.')) return;
    setActionLoading(id);
    try {
      await API.put(`/admin/vendors/${id}/approve`);
      showToast('Vendor approved', 'success');
      fetchVendors(pagination.page, searchQuery, statusFilter);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to approve', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this vendor? They will be unable to login.')) return;
    setActionLoading(id);
    try {
      await API.put(`/admin/vendors/${id}/reject`);
      showToast('Vendor rejected', 'success');
      fetchVendors(pagination.page, searchQuery, statusFilter);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reject', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (id: string) => {
    if (!confirm('Block this vendor? They will be unable to login or create offers.')) return;
    setActionLoading(id);
    try {
      await API.patch(`/admin/vendors/${id}/block`);
      showToast('Vendor blocked', 'success');
      fetchVendors(pagination.page, searchQuery, statusFilter);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to block', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (id: string) => {
    if (!confirm('Unblock this vendor?')) return;
    setActionLoading(id);
    try {
      await API.patch(`/admin/vendors/${id}/unblock`);
      showToast('Vendor unblocked', 'success');
      fetchVendors(pagination.page, searchQuery, statusFilter);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to unblock', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete vendor permanently? This cannot be undone.')) return;
    setActionLoading(id);
    try {
      await API.delete(`/admin/vendors/${id}`);
      showToast('Vendor deleted', 'success');
      fetchVendors(pagination.page, searchQuery, statusFilter);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewOffers = async (id: string) => {
    try {
      const { data } = await API.get(`/admin/vendors/${id}/offers`);
      setModalOffers(data.offers);
    } catch (err: any) {
      showToast('Cannot fetch offers', 'error');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      fetchVendors(newPage, searchQuery, statusFilter);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Vendor Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage vendor accounts across the platform.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          {success}
        </motion.div>
      )}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </motion.div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none outline-none min-w-36"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500">Loading vendors...</p>
          </div>
        )}

        {!isLoading && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Vendor Name</th>
                    <th className="px-6 py-4">Business</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                        No vendors found
                      </td>
                    </tr>
                  ) : (
                    vendors.map((v) => (
                      <tr key={v._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            {v.name.charAt(0).toUpperCase()}
                          </div>
                          {v.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{v.businessName || '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{v.email}</td>
                        <td className="px-6 py-4 text-slate-600">{v.category || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(v))}>
                            {getStatusLabel(v)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => navigate(`/admin/vendors/${v._id}/activity`)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View activity"
                            >
                              <Activity className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleViewOffers(v._id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View offers"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {getStatusLabel(v) === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(v._id)}
                                  disabled={actionLoading === v._id}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Approve vendor"
                                >
                                  {actionLoading === v._id ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => handleReject(v._id)}
                                  disabled={actionLoading === v._id}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Reject vendor"
                                >
                                  {actionLoading === v._id ? <Loader className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                </button>
                              </>
                            )}
                            {!v.isBlocked && (
                              <button
                                onClick={() => handleBlock(v._id)}
                                disabled={actionLoading === v._id}
                                className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Block vendor"
                              >
                                {actionLoading === v._id ? <Loader className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                              </button>
                            )}
                            {v.isBlocked && (
                              <button
                                onClick={() => handleUnblock(v._id)}
                                disabled={actionLoading === v._id}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Unblock vendor"
                              >
                                {actionLoading === v._id ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(v._id)}
                              disabled={actionLoading === v._id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete vendor"
                            >
                              {actionLoading === v._id ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Showing {vendors.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} vendors
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={cn(
                          "px-3 py-1 rounded-md transition-colors",
                          pageNum === pagination.page
                            ? "bg-indigo-50 text-indigo-600 font-medium border border-indigo-200"
                            : "border border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {pagination.pages > 5 && <span className="px-2 py-1">...</span>}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Offers modal */}
      {modalOffers && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 relative">
            <button className="absolute top-2 right-2 text-slate-500 hover:text-slate-800" onClick={() => setModalOffers(null)}>
              ×
            </button>
            <h2 className="text-lg font-semibold mb-4">Vendor Offers</h2>
            {modalOffers.length === 0 ? (
              <p className="text-slate-500">No offers found.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {modalOffers.map((o: any) => (
                  <li key={o._id} className="border-b border-slate-200 pb-2">{o.title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
