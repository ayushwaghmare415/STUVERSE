import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Edit, Trash2, Eye, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMyVendorOffers, deleteVendorOffer } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Offer {
  _id: string;
  title: string;
  description: string;
  category: string;
  discountType: string;
  discountValue: number;
  couponCode?: string;
  expiryDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  claimCount: number;
  createdAt: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalOffers: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'pending': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export function MyOffers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; offer: Offer | null }>({
    isOpen: false,
    offer: null
  });

  const fetchOffers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await getMyVendorOffers({ page, limit: 10 });
      setOffers(response.data.offers);
      setPagination(response.data.pagination);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers(currentPage);
  }, [currentPage]);

  const handleDelete = async (offer: Offer) => {
    try {
      if (offer.claimCount > 0) {
        toast.error('Cannot delete offers with active claims');
        setDeleteModal({ isOpen: false, offer: null });
        return;
      }
      await deleteVendorOffer(offer._id);
      toast.success('Offer deleted successfully');
      setDeleteModal({ isOpen: false, offer: null });
      // Refresh the current page
      fetchOffers(currentPage);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete offer');
    }
  };

  const filteredOffers = offers.filter(offer =>
    offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    offer.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    offer.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            My Offers
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your active, pending, and past student discounts.
          </p>
        </div>
        <button
          onClick={() => navigate('/vendor/create-offer')}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm shrink-0 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Offer
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search offers by title, category, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Offers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-slate-600">Loading offers...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Offer Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Claims
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Expiry Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        {searchTerm ? 'No offers match your search.' : 'No offers found. Create your first offer!'}
                      </td>
                    </tr>
                  ) : (
                    filteredOffers.map((offer) => (
                      <tr key={offer._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">{offer.title}</div>
                            <div className="text-sm text-slate-500 truncate max-w-xs">
                              {offer.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {offer.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-900">
                            {offer.discountValue}% OFF
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border",
                            getStatusColor(offer.status)
                          )}>
                            {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900">{offer.claimCount}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-600">
                            {offer.expiryDate ? formatDate(offer.expiryDate) : 'No expiry'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {offer.status !== 'approved' ? (
                              <button
                                onClick={() => navigate(`/vendor/edit-offer/${offer._id}`)}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit offer"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            ) : (
                              <div
                                className="p-1.5 text-slate-300 cursor-not-allowed"
                                title="Approved offers cannot be edited"
                              >
                                <Edit className="h-4 w-4" />
                              </div>
                            )}
                            <button
                              onClick={() => navigate(`/vendor/offer-detail/${offer._id}`)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {offer.claimCount === 0 ? (
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, offer })}
                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete offer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <div
                                className="p-1.5 text-slate-300 cursor-not-allowed"
                                title="Cannot delete offers with active claims"
                              >
                                <Trash2 className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalOffers)} of {pagination.totalOffers} offers
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={!pagination.hasPrev}
                    className="p-2 text-slate-600 hover:text-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!pagination.hasNext}
                    className="p-2 text-slate-600 hover:text-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.offer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Offer</h3>
            {deleteModal.offer.claimCount > 0 ? (
              <>
                <p className="text-slate-600 mb-6">
                  Cannot delete "{deleteModal.offer.title}" because it has {deleteModal.offer.claimCount} active claim{deleteModal.offer.claimCount > 1 ? 's' : ''}. 
                  Please contact admin if deletion is necessary.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ isOpen: false, offer: null })}
                    className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-600 mb-6">
                  Are you sure you want to delete "{deleteModal.offer.title}"? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ isOpen: false, offer: null })}
                    className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteModal.offer)}
                    className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
