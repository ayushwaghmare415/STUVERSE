import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, CheckCircle, Clock, XCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { getVendorDashboard } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface DashboardData {
  totalOffers: number;
  approvedOffers: number;
  pendingOffers: number;
  rejectedOffers: number;
  totalClaims: number;
  recentClaims: Array<{
    _id: string;
    status: string;
    claimedAt: string;
    redeemedAt?: string;
    redemptionCode?: string;
    studentId: {
      name: string;
      email: string;
      collegeName?: string;
    };
    couponId: {
      title: string;
      discountValue: number;
      discountType: string;
    };
  }>;
}

export default function VendorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Connect to socket
    const socket = getSocket();

    // Listen for real-time events
    socket.on('couponRedeemed', (data) => {
      console.log('Coupon redeemed:', data);
      toast.success('A student just redeemed your offer!');
      // Update total claims
      setData(prev => prev ? { ...prev, totalClaims: prev.totalClaims + 1 } : null);
    });
    socket.on('coupon_redeemed', (data) => {
      console.log('Coupon redeemed (underscore):', data);
      toast.success('A student just redeemed your offer!');
      setData(prev => prev ? { ...prev, totalClaims: prev.totalClaims + 1 } : null);
    });

    socket.on('offerStatusUpdate', (data) => {
      console.log('Offer status update:', data);
      const { offerId, status } = data;
      toast.success(`Offer ${status.toLowerCase()}: ${data.title || 'Your offer'}`);
      // Refresh dashboard data to get updated counts
      fetchDashboardData();
    });

    socket.on('vendorNotification', (data) => {
      console.log('Vendor notification:', data);
      toast(data.message || 'New notification', {
        icon: data.type === 'success' ? '✅' : data.type === 'error' ? '❌' : 'ℹ️'
      });
    });

    socket.on('vendorApproved', (data) => {
      console.log('Vendor approved event:', data);
      toast.success(data.message || 'Your vendor account has been approved.');
      fetchDashboardData();
    });

    socket.on('vendorRejected', (data) => {
      console.log('Vendor rejected event:', data);
      toast.error(data.message || 'Your vendor account has been rejected.');
    });

    // stats_update triggers a dashboard refresh as well
    socket.on('stats_update', (data) => {
      console.log('Stats update event:', data);
      fetchDashboardData();
    });

    // Cleanup on unmount
    return () => {
      socket.off('couponRedeemed');
      socket.off('coupon_redeemed');
      socket.off('offerStatusUpdate');
      socket.off('vendorNotification');
      socket.off('vendorApproved');
      socket.off('vendorRejected');
      socket.off('stats_update');
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await getVendorDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load dashboard data</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = [
    { name: 'Total Offers', value: data.totalOffers, color: '#3B82F6' },
    { name: 'Approved', value: data.approvedOffers, color: '#10B981' },
    { name: 'Pending', value: data.pendingOffers, color: '#F59E0B' },
    { name: 'Rejected', value: data.rejectedOffers, color: '#EF4444' },
  ];

  const statsCards = [
    {
      title: 'Total Offers',
      value: data.totalOffers,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Approved Offers',
      value: data.approvedOffers,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Pending Offers',
      value: data.pendingOffers,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Total Claims',
      value: data.totalClaims,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor your offers performance and customer engagement</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Offer Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Offer Performance</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Claims Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Claims</h2>
          <p className="text-gray-600 text-sm">Latest customer redemptions for your offers</p>
        </div>
        <div className="overflow-x-auto">
          {data.recentClaims.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No claims yet</h3>
              <p className="mt-1 text-sm text-gray-500">Claims will appear here once customers redeem your offers</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Offer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Claimed At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.recentClaims.map((claim) => (
                  <tr key={claim._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {claim.studentId.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {claim.studentId.email}
                        </div>
                        {claim.studentId.collegeName && (
                          <div className="text-xs text-gray-400">
                            {claim.studentId.collegeName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{claim.couponId.title}</div>
                      <div className="text-sm text-gray-500">
                        {claim.couponId.discountType === 'percent'
                          ? `${claim.couponId.discountValue}% off`
                          : `$${claim.couponId.discountValue} off`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        claim.status === 'Redeemed'
                          ? 'bg-green-100 text-green-800'
                          : claim.status === 'Expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(claim.claimedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
