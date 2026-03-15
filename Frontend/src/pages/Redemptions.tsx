import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TicketCheck, ExternalLink, Loader2, Copy, Check, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRedemptions, redeemOffer } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Redemption {
  id: string;
  offerId: string;
  offerTitle: string;
  offerDescription: string;
  vendorName: string;
  discount: string;
  status: 'Claimed' | 'Redeemed' | 'Expired';
  claimedAt: string;
  redeemedAt: string | null;
  redemptionCode: string | null;
  expiryDate: string;
  category: string;
}

type SortOption = 'newest' | 'oldest' | 'discount';
type StatusFilter = '' | 'Claimed' | 'Redeemed' | 'Expired';

export function Redemptions() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sort, setSort] = useState<SortOption>('newest');
  
  // Redeeming state
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch redemptions
  const fetchRedemptions = async (pageNum: number) => {
    try {
      setLoading(true);
      setError('');
      const response = await getRedemptions({
        page: pageNum,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
        sort
      });
      
      if (response.data.redemptions) {
        setRedemptions(response.data.redemptions);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch redemptions';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and refetch on filter change
  useEffect(() => {
    setPage(1); // Reset to first page when filters change
  }, [search, statusFilter, sort]);

  useEffect(() => {
    fetchRedemptions(page);
  }, [page, search, statusFilter, sort]);

  // Handle redemption
  const handleRedeem = async (offerId: string) => {
    try {
      setRedeemingId(offerId);
      const response = await redeemOffer(offerId);
      
      toast.success(`Offer redeemed! Code: ${response.data.redemptionCode}`);
      
      // Update local state
      setRedemptions(redemptions.map(r => 
        r.offerId === offerId 
          ? {
              ...r,
              status: 'Redeemed',
              redemptionCode: response.data.redemptionCode,
              redeemedAt: response.data.redeemedAt
            }
          : r
      ));
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to redeem offer';
      toast.error(message);
    } finally {
      setRedeemingId(null);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Getting status badge config
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Redeemed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          label: 'Redeemed'
        };
      case 'Claimed':
        return {
          icon: <Clock className="h-4 w-4" />,
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          label: 'Claimed'
        };
      case 'Expired':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          bg: 'bg-slate-50',
          text: 'text-slate-600',
          label: 'Expired'
        };
      default:
        return {
          icon: null,
          bg: 'bg-slate-50',
          text: 'text-slate-600',
          label: status
        };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          My Redemptions
        </h1>
        <p className="text-slate-500 mt-1">
          Manage your claimed and redeemed discount offers.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        {/* Search & Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search offers or vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="Claimed">Claimed</option>
              <option value="Redeemed">Redeemed</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sort By
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="discount">Best Discount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Redemptions Card Layout */}
      {!loading && !error && redemptions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {redemptions.map((redemption) => {
            const badge = getStatusBadge(redemption.status);
            const isRedeemed = redemption.status === 'Redeemed';
            const isExpired = redemption.status === 'Expired';

            return (
              <motion.div
                key={redemption.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5"
              >
                {/* Header with Status Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {redemption.offerTitle}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {redemption.vendorName}
                    </p>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                    badge.bg,
                    badge.text
                  )}>
                    {badge.icon}
                    {badge.label}
                  </span>
                </div>

                {/* Discount */}
                <div className="mb-4 p-3 bg-linear-to-r from-indigo-50 to-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">
                    {redemption.discount}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="space-y-3 mb-4 pb-4 border-b border-slate-100">
                  {/* Claimed Date */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Claimed</span>
                    <span className="font-medium text-slate-900">
                      {formatDate(redemption.claimedAt)}
                    </span>
                  </div>

                  {/* Expiry Date */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Expires</span>
                    <span className={cn(
                      "font-medium",
                      isExpired ? "text-red-600" : "text-slate-900"
                    )}>
                      {formatDate(redemption.expiryDate)}
                    </span>
                  </div>

                  {/* Redeemed Date */}
                  {isRedeemed && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Redeemed</span>
                      <span className="font-medium text-emerald-600">
                        {formatDate(redemption.redeemedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Redemption Code Section */}
                {isRedeemed && redemption.redemptionCode && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Redemption Code
                    </label>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <code className="flex-1 font-mono text-sm font-semibold text-slate-900 break-all">
                        {redemption.redemptionCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(redemption.redemptionCode!)}
                        className="shrink-0 p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === redemption.redemptionCode ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                {!isRedeemed && !isExpired && (
                  <button
                    onClick={() => handleRedeem(redemption.offerId)}
                    disabled={redeemingId === redemption.offerId}
                    className={cn(
                      "w-full py-2 px-4 rounded-lg font-medium text-sm transition-all",
                      "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    {redeemingId === redemption.offerId ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redeeming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Redeem Now
                      </>
                    )}
                  </button>
                )}

                {isExpired && (
                  <button disabled className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-slate-100 text-slate-500 cursor-not-allowed">
                    Offer Expired
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && redemptions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-slate-200">
          <TicketCheck className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium mb-2">
            {search || statusFilter ? 'No redemptions found' : 'No claimed offers yet'}
          </p>
          <p className="text-slate-500 text-sm">
            {search || statusFilter 
              ? 'Try adjusting your filters' 
              : 'Browse and claim offers to see them here'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
