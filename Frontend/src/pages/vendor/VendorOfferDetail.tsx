import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Copy, MapPin, Calendar, Percent, ArrowLeft, Clock } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMyVendorOffers } from '@/lib/api';

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
  viewCount: number;
  terms?: string;
  createdAt: string;
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

export function VendorOfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOffer = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await getMyVendorOffers({ page: 1, limit: 100 });
        const foundOffer = response.data.offers.find((o: any) => o._id === id);

        if (!foundOffer) {
          toast.error('Offer not found');
          navigate('/vendor/my-offers');
          return;
        }

        setOffer(foundOffer);
      } catch (error: any) {
        console.error('Error loading offer:', error);
        toast.error(error.response?.data?.message || 'Failed to load offer');
        navigate('/vendor/my-offers');
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-slate-600">Loading offer...</span>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100">
        <p className="text-slate-600 mb-4">Offer not found</p>
        <button
          onClick={() => navigate('/vendor/my-offers')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to My Offers
        </button>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const isExpired = offer.expiryDate && new Date(offer.expiryDate) <= new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/vendor/my-offers')}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Offer Details
        </h1>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        {/* Status Section */}
        <div className="bg-linear-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{offer.title}</h2>
              <p className="text-slate-600">{offer.description}</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(offer.status)}`}>
              {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
            </span>
          </div>

          {isExpired && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium">
              This offer has expired
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="text-sm text-indigo-600 font-semibold mb-1">Discount</div>
              <div className="text-3xl font-bold text-indigo-700">{offer.discountValue}%</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
              <div className="text-sm text-emerald-600 font-semibold mb-1">Total Claims</div>
              <div className="text-3xl font-bold text-emerald-700">{offer.claimCount}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="text-sm text-blue-600 font-semibold mb-1">Total Views</div>
              <div className="text-3xl font-bold text-blue-700">{offer.viewCount || 0}</div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">Category</label>
              <div className="inline-flex items-center px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium">
                {offer.category}
              </div>
            </div>

            {/* Coupon Code */}
            {offer.couponCode && (
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-2 block">Coupon Code</label>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 rounded-lg bg-slate-100 text-slate-900 font-mono font-semibold">
                    {offer.couponCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(offer.couponCode || '')}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Copy coupon code"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Expiry Date */}
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">Expiry Date</label>
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>
                  {offer.expiryDate ? formatDate(offer.expiryDate) : 'No expiry'}
                </span>
              </div>
            </div>

            {/* Created Date */}
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">Created Date</label>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>{formatDate(offer.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          {offer.terms && (
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">Terms & Conditions</label>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-slate-700 whitespace-pre-wrap">{offer.terms}</p>
              </div>
            </div>
          )}

          {/* Status-specific Messages */}
          {offer.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-semibold mb-2">Offer Rejected</p>
              <p className="text-red-600 text-sm">
                Your offer was rejected by admin. You can edit it and resubmit for approval.
              </p>
            </div>
          )}

          {offer.status === 'pending' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-700 font-semibold mb-2">Pending Admin Review</p>
              <p className="text-orange-600 text-sm">
                Your offer is waiting for admin approval. Once approved, it will be visible to students.
              </p>
            </div>
          )}

          {offer.status === 'approved' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-emerald-700 font-semibold mb-2">Active Offer</p>
              <p className="text-emerald-600 text-sm">
                Your offer is approved and visible to students. It has been claimed {offer.claimCount} time{offer.claimCount !== 1 ? 's' : ''}.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={() => navigate('/vendor/my-offers')}
            className="flex-1 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
          >
            Back to Offers
          </button>
          {offer.status !== 'approved' && (
            <button
              onClick={() => navigate(`/vendor/edit-offer/${offer._id}`)}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Edit Offer
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
