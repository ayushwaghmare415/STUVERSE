import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Store, Ticket, LoaderCircle } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { getAnalyticsOverview, getMonthlyUsers, getTopVendors, getTopOffers } from '@/lib/adminApi';
import { getSocket } from '@/lib/socket';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899'];

export function AdminAnalytics() {
  const [overview, setOverview] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [topOffers, setTopOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [ov, monthlyRes, vendorsRes, offersRes] = await Promise.all([
          getAnalyticsOverview(),
          getMonthlyUsers({ start: fromDate || undefined, end: toDate || undefined }),
          getTopVendors({ limit: 6, sortBy: 'claims' }),
          getTopOffers({ limit: 8 })
        ]);

        setOverview(ov.data);
        setMonthly(monthlyRes.data.months || []);
        setVendors(vendorsRes.data.vendors || []);
        setTopOffers(offersRes.data.offers || []);
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to load analytics';
        setError(msg);
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    const socket = getSocket();
    socket.on('studentRegistered', () => {
      showToast('New student registered', 'info');
      fetchAll();
    });
    socket.on('newStudentRegistered', () => {
      // legacy support
      showToast('New student registered', 'info');
      fetchAll();
    });
    socket.on('vendorRegistered', () => {
      showToast('New vendor joined', 'info');
      fetchAll();
    });
    socket.on('newVendorRegistered', () => {
      // legacy support
      showToast('New vendor joined', 'info');
      fetchAll();
    });
    socket.on('couponRedeemed', () => {
      showToast('Coupon redeemed', 'info');
      fetchAll();
    });
    socket.on('stats_update', () => {
      // generic stats update event
      fetchAll();
    });
    socket.on('adminBroadcast', (notif) => {
      showToast(notif.message || 'System notification', 'info');
    });

    return () => {
      socket.off('studentRegistered');
      socket.off('newStudentRegistered');
      socket.off('vendorRegistered');
      socket.off('newVendorRegistered');
      socket.off('couponRedeemed');
      socket.off('stats_update');
      socket.off('adminBroadcast');
    };
  }, [fromDate, toDate]);

  // prepare chart data
  const studentGrowth = monthly.map(m => ({ name: `${m.month}/${m.year}`, students: m.count }));
  const vendorGrowth = vendors.map((v, i) => ({ name: v.businessName || v.name || `Vendor ${i+1}`, vendors: v.approvedOffers || 0 }));
  const redemptionsData = [{ name: 'Total', redemptions: overview?.totalClaims || 0 }];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
        <p className="text-slate-500 mt-1">Platform-wide performance and growth metrics.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">From:</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border rounded-md p-2" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">To:</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border rounded-md p-2" />
        </div>
        <div className="ml-auto text-sm text-slate-500">Date range filters monthly data</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total Students" value={loading ? '...' : String(overview?.totalStudents || 0)} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Total Vendors" value={loading ? '...' : String(overview?.totalVendors || 0)} icon={<Store className="h-5 w-5" />} />
        <StatCard title="Approved Offers" value={loading ? '...' : String(overview?.approvedOffers || 0)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Total Redemptions" value={loading ? '...' : String(overview?.totalClaims || 0)} icon={<Ticket className="h-5 w-5" />} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <LoaderCircle className="animate-spin h-8 w-8 text-slate-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Growth */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-6">Student Growth</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studentGrowth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="students" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vendor Growth */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-6">Top Vendors (by claims)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorGrowth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="vendors" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Coupon Redemptions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-6">Coupon Redemptions</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={redemptionsData}>
                  <defs>
                    <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="redemptions" stroke="#4F46E5" fillOpacity={1} fill="url(#colorRedemptions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Offers Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
            <h3 className="font-semibold text-slate-900 mb-6">Top Offers (by claims)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm text-slate-600">Offer</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-600">Vendor</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-600">Category</th>
                    <th className="px-4 py-2 text-right text-sm text-slate-600">Claims</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topOffers.map((o) => (
                    <tr key={o._id}>
                      <td className="px-4 py-3 text-sm text-slate-700">{o.title}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{o.vendor?.businessName || o.vendor?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{o.category}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">{o.claimCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded shadow ${t.type === 'success' ? 'bg-green-50 text-green-800' : t.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-800'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
