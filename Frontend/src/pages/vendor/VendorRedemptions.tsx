import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Download, Eye, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVendorRedemptions, getMyVendorOffers } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface Redemption {
  studentName: string;
  email: string;
  offerTitle: string;
  discount: string;
  couponCode: string;
  redeemedAt: string;
  status: 'Claimed' | 'Redeemed' | 'Expired';
}

interface Offer {
  _id: string;
  title: string;
}

interface RedemptionSummary {
  totalRedemptions: number;
  todaysRedemptions: number;
  mostPopularOffer: {
    offerId: string;
    title: string;
    redemptions: number;
  } | null;
}

interface RedemptionsResponse {
  success: boolean;
  summary?: RedemptionSummary;
  totalRedemptions: number;
  data: Redemption[];
}

export function VendorRedemptions() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRedemptionsAllTime, setTotalRedemptionsAllTime] = useState(0);
  const [totalRedemptions, setTotalRedemptions] = useState(0);
  const [todaysRedemptions, setTodaysRedemptions] = useState(0);
  const [mostPopularOffer, setMostPopularOffer] = useState<{
    title: string;
    redemptions: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffer, setSelectedOffer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const limit = 10;

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    fetchRedemptions();
  }, [currentPage, searchTerm, selectedOffer, selectedStatus, startDate, endDate]);

  useEffect(() => {
    // Connect to socket for real-time updates
    const socket = getSocket();

    const handleRedemptionUpdate = () => {
      fetchRedemptions();
    };

    // Listen for both camelCase and underscored event names
    socket.on('couponRedeemed', handleRedemptionUpdate);
    socket.on('coupon_redeemed', handleRedemptionUpdate);
    socket.on('newRedemption', handleRedemptionUpdate);
    socket.on('stats_update', handleRedemptionUpdate);

    // Cleanup
    return () => {
      socket.off('couponRedeemed', handleRedemptionUpdate);
      socket.off('coupon_redeemed', handleRedemptionUpdate);
      socket.off('newRedemption', handleRedemptionUpdate);
      socket.off('stats_update', handleRedemptionUpdate);
    };
  }, [currentPage, searchTerm, selectedOffer, selectedStatus, startDate, endDate]);

  const fetchOffers = async () => {
    try {
      const response: any = await getMyVendorOffers();
      const offersData = Array.isArray(response.data?.offers) ? response.data.offers : [];
      setOffers(offersData);
    } catch (error) {
      console.error('Error fetching offers:', error);
      setOffers([]);
    }
  };

  const fetchRedemptions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedOffer) params.offerId = selectedOffer;
      if (selectedStatus) params.status = selectedStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response: any = await getVendorRedemptions(params);
      
      // The API returns an object with `data`, `totalRedemptions`, and `summary`
      const payload = response.data || {};
      const data = Array.isArray(payload.data) ? payload.data : [];
      
      setRedemptions(data);
      setTotalRedemptions(payload.totalRedemptions || 0);
      setTotalPages(Math.ceil((payload.totalRedemptions || 0) / limit));

      const summary: RedemptionSummary | undefined = payload.summary;
      if (summary) {
        setTotalRedemptionsAllTime(summary.totalRedemptions || 0);
        setTodaysRedemptions(summary.todaysRedemptions || 0);
        setMostPopularOffer(summary.mostPopularOffer ? {
          title: summary.mostPopularOffer.title,
          redemptions: summary.mostPopularOffer.redemptions
        } : null);
      }
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      setRedemptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleOfferFilter = (value: string) => {
    setSelectedOffer(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  };

  const handleDateFilter = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedOffer('');
    setSelectedStatus('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'Redeemed': 'bg-green-50 text-green-700 border-green-200',
      'Claimed': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Expired': 'bg-red-50 text-red-700 border-red-200'
    };

    return (
      <span className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        statusClasses[status as keyof typeof statusClasses] || 'bg-gray-50 text-gray-700 border-gray-200'
      )}>
        {status}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Email', 'Offer Title', 'Discount', 'Coupon Code', 'Redemption Date', 'Status'];
    const csvContent = [
      headers.join(','),
      ...redemptions.map(r => [
        `"${r.studentName}"`,
        `"${r.email}"`,
        `"${r.offerTitle}"`,
        `"${r.discount}"`,
        `"${r.couponCode}"`,
        `"${r.redeemedAt}"`,
        `"${r.status}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redemptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
            Redemptions
          </h1>
          <p className="text-slate-500 mt-1">
            View and manage all student discount redemptions.
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm shrink-0"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-medium text-slate-500">Total Redemptions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalRedemptionsAllTime.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">Across all offers</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-medium text-slate-500">Today's Redemptions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{todaysRedemptions.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">Since midnight</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-medium text-slate-500">Most Popular Offer</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {mostPopularOffer ? mostPopularOffer.title : 'No redemptions yet'}
          </p>
          {mostPopularOffer && (
            <p className="mt-1 text-xs text-slate-500">
              {mostPopularOffer.redemptions.toLocaleString()} redemptions
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name or email..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={selectedOffer}
                onChange={(e) => handleOfferFilter(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all appearance-none outline-none min-w-40"
              >
                <option value="">All Offers</option>
                {offers.map((offer) => (
                  <option key={offer._id} value={offer._id}>
                    {offer.title}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all appearance-none outline-none min-w-32"
              >
                <option value="">All Status</option>
                <option value="Redeemed">Redeemed</option>
                <option value="Claimed">Claimed</option>
                <option value="Expired">Expired</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors flex items-center gap-2 shrink-0"
              >
                <Filter className="h-4 w-4" /> Filters
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-slate-100"
            >
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateFilter(e.target.value, endDate)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleDateFilter(startDate, e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                  />
                </div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-2">
                <Eye className="h-12 w-12 mx-auto mb-4" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">No redemptions found</h3>
              <p className="text-slate-500">No students have redeemed your offers yet.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Offer Title</th>
                  <th className="px-6 py-4">Discount</th>
                  <th className="px-6 py-4">Coupon Code</th>
                  <th className="px-6 py-4">Redemption Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {redemptions.map((redemption, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{redemption.studentName}</td>
                    <td className="px-6 py-4 text-slate-600">{redemption.email}</td>
                    <td className="px-6 py-4 text-slate-600">{redemption.offerTitle}</td>
                    <td className="px-6 py-4 text-slate-600">{redemption.discount}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{redemption.couponCode}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(redemption.redeemedAt)}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(redemption.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && redemptions.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalRedemptions)} of {totalRedemptions} entries
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                className="px-3 py-1 bg-slate-900 text-white rounded-md font-medium"
              >
                {currentPage}
              </button>
              {currentPage < totalPages && (
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50"
                >
                  {currentPage + 1}
                </button>
              )}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
