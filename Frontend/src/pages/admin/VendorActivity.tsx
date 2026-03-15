import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Package,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import API from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';

interface Vendor {
  _id: string;
  name: string;
  email: string;
  businessName?: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
}

interface Offer {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  discountType: string;
  discountValue: number;
  category: string;
  claimCount: number;
  viewCount: number;
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  expiryDate?: string;
}

interface Redemption {
  _id: string;
  status: 'Claimed' | 'Redeemed' | 'Expired';
  claimedAt: string;
  redeemedAt?: string;
  redemptionCode?: string;
  studentId: {
    name: string;
    email: string;
  };
  couponId: {
    title: string;
    discountType: string;
    discountValue: number;
  };
}

interface Activity {
  type: 'offer_created' | 'redemption';
  timestamp: string;
  data: any;
}

interface VendorActivityData {
  vendor: Vendor;
  offers: Offer[];
  redemptions: Redemption[];
  stats: {
    totalOffers: number;
    approvedOffers: number;
    pendingOffers: number;
    rejectedOffers: number;
    totalClaims: number;
    totalRedemptions: number;
  };
  recentActivities: Activity[];
}

export function VendorActivity() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<VendorActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchVendorActivity();
    }
  }, [id]);

  const fetchVendorActivity = async () => {
    try {
      setIsLoading(true);
      const { data: activityData } = await API.get(`/admin/vendors/${id}/activity`);
      setData(activityData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch vendor activity');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'offer_created': return <Package className="h-4 w-4" />;
      case 'redemption': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'offer_created':
        return `Created offer "${activity.data.title}" (${activity.data.status})`;
      case 'redemption':
        return `${activity.data.status === 'Redeemed' ? 'Redeemed' : 'Claimed'} "${activity.data.offerTitle}" by ${activity.data.studentName}`;
      default:
        return 'Unknown activity';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading vendor activity...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Data</h2>
          <p className="text-slate-500 mb-4">{error || 'Vendor not found'}</p>
          <button
            onClick={() => navigate('/admin/vendors')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Vendors
          </button>
        </div>
      </div>
    );
  }

  const { vendor, offers, redemptions, stats, recentActivities } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/vendors')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Vendor Activity
          </h1>
          <p className="text-slate-500 mt-1">
            {vendor.businessName || vendor.name} • {vendor.email}
          </p>
        </div>
      </div>

      {/* Vendor Info Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              {vendor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{vendor.name}</h2>
              <p className="text-slate-600">{vendor.email}</p>
              {vendor.businessName && (
                <p className="text-slate-500 text-sm">{vendor.businessName}</p>
              )}
              <p className="text-slate-500 text-sm mt-1">
                Joined {formatDistanceToNow(new Date(vendor.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
              vendor.isBlocked
                ? "bg-red-50 text-red-700 border-red-200"
                : vendor.isVerified
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-orange-50 text-orange-700 border-orange-200"
            )}>
              {vendor.isBlocked ? 'Blocked' : vendor.isVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-600">Total Offers</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalOffers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-600">Approved</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.approvedOffers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-slate-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.pendingOffers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-slate-600">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.rejectedOffers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-600">Total Claims</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalClaims}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-slate-600">Redemptions</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalRedemptions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <p className="text-slate-500 text-sm mt-1">Latest actions and events</p>
          </div>
          <div className="p-6">
            {recentActivities.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">{getActivityDescription(activity)}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Offers Overview */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Offers Overview</h3>
            <p className="text-slate-500 text-sm mt-1">All offers created by this vendor</p>
          </div>
          <div className="p-6">
            {offers.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No offers created yet</p>
            ) : (
              <div className="space-y-4">
                {offers.slice(0, 10).map((offer) => (
                  <div key={offer._id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{offer.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{offer.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>{offer.discountValue}{offer.discountType === 'percentage' ? '%' : '$'} off</span>
                          <span>{offer.category}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {offer.viewCount} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {offer.claimCount} claims
                          </span>
                        </div>
                      </div>
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                        getStatusColor(offer.status)
                      )}>
                        {offer.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Created {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
                {offers.length > 10 && (
                  <p className="text-sm text-slate-500 text-center">
                    And {offers.length - 10} more offers...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Redemptions Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Redemptions</h3>
          <p className="text-slate-500 text-sm mt-1">All redemptions of this vendor's offers</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Offer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Claimed</th>
                <th className="px-6 py-4">Redeemed</th>
                <th className="px-6 py-4">Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No redemptions yet
                  </td>
                </tr>
              ) : (
                redemptions.map((redemption) => (
                  <tr key={redemption._id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{redemption.studentId.name}</p>
                        <p className="text-slate-500 text-xs">{redemption.studentId.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{redemption.couponId.title}</p>
                        <p className="text-slate-500 text-xs">
                          {redemption.couponId.discountValue}{redemption.couponId.discountType === 'percentage' ? '%' : '$'} off
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                        redemption.status === 'Redeemed'
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : redemption.status === 'Claimed'
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                      )}>
                        {redemption.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(redemption.claimedAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {redemption.redeemedAt
                        ? format(new Date(redemption.redeemedAt), 'MMM dd, yyyy')
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {redemption.redemptionCode || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}