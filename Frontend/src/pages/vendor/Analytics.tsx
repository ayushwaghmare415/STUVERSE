import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingBag, CheckCircle, Users, Ticket, AlertCircle, XCircle } from 'lucide-react';
import { getVendorAnalytics } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface AnalyticsData {
  summaryCards: {
    totalOffersCreated: number;
    totalActiveOffers: number;
    totalStudentsUsedCoupons: number;
    totalCouponRedemptions: number;
    offerApprovalStatus: {
      approved: number;
      pending: number;
      rejected: number;
    };
  };
  charts: {
    couponUsagePerOffer: Array<{ name: string; redemptions: number }>;
    dailyRedemptions: Array<{ date: string; redemptions: number }>;
    offerStatusDistribution: Array<{ name: string; value: number; color: string }>;
  };
  topPerformingOffers: Array<{
    title: string;
    discount: number;
    totalViews: number;
    totalRedemptions: number;
    status: string;
    createdDate: string;
  }>;
}

const StatCard = ({ title, value, icon, trend }: { title: string; value: string | number; icon: React.ReactNode; trend?: { value: number; isPositive: boolean } }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group"
  >
    <div className="flex items-start justify-between">
      <div className="space-y-4">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-600">{title}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
            {trend && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                trend.isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await getVendorAnalytics();
        setAnalyticsData(response.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Connect to socket for real-time updates
    const socket = getSocket();

    // Refresh analytics when relevant events occur
    const handleUpdate = () => {
      fetchAnalytics();
    };

    socket.on('couponRedeemed', handleUpdate);
    socket.on('coupon_redeemed', handleUpdate);
    socket.on('offerStatusUpdate', handleUpdate);
    socket.on('vendorNotification', handleUpdate);
    socket.on('stats_update', handleUpdate);

    // Cleanup
    return () => {
      socket.off('couponRedeemed', handleUpdate);
      socket.off('coupon_redeemed', handleUpdate);
      socket.off('offerStatusUpdate', handleUpdate);
      socket.off('vendorNotification', handleUpdate);
      socket.off('stats_update', handleUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-900 text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-600 text-lg">{error || 'No data available'}</div>
      </div>
    );
  }

  const { summaryCards, charts, topPerformingOffers } = analyticsData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 bg-white min-h-screen text-slate-900 p-6"
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Analytics Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Track the performance of your discount offers.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Offers Created"
          value={summaryCards.totalOffersCreated}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          title="Active Offers"
          value={summaryCards.totalActiveOffers}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Students Used Coupons"
          value={summaryCards.totalStudentsUsedCoupons}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Total Redemptions"
          value={summaryCards.totalCouponRedemptions}
          icon={<Ticket className="h-5 w-5" />}
        />
      </div>

      {/* Offer Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-600">Approved</h3>
              <span className="text-2xl font-bold text-slate-900">{summaryCards.offerApprovalStatus.approved}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-600">Pending</h3>
              <span className="text-2xl font-bold text-slate-900">{summaryCards.offerApprovalStatus.pending}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-600">Rejected</h3>
              <span className="text-2xl font-bold text-slate-900">{summaryCards.offerApprovalStatus.rejected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Coupon Usage Per Offer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-6">Coupon Usage Per Offer</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.couponUsagePerOffer}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  dy={10}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#FFFFFF'
                  }}
                  cursor={{ fill: '#F1F5F9' }}
                />
                <Bar dataKey="redemptions" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart: Daily Redemptions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-6">Daily Redemptions</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.dailyRedemptions}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#FFFFFF'
                  }}
                  cursor={{ stroke: '#E2E8F0', strokeWidth: 2 }}
                />
                <Line type="monotone" dataKey="redemptions" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Offer Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 w-full">
            <h3 className="font-semibold text-slate-900 mb-2">Offer Status Distribution</h3>
            <p className="text-sm text-slate-500 mb-6">Distribution of your offers by approval status.</p>

            <div className="space-y-4">
              {charts.offerStatusDistribution.map((entry, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm font-medium text-slate-700">{entry.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-64 w-full md:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.offerStatusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {charts.offerStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performing Offers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Top Performing Offers</h3>
          <p className="text-sm text-slate-500 mt-1">Your offers ranked by redemption performance.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Offer Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Redemptions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {topPerformingOffers.map((offer, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{offer.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{offer.discount}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{offer.totalViews}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{offer.totalRedemptions}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      offer.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      offer.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {offer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{offer.createdDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
