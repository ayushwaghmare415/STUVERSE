/**
 * VENDOR DETAIL PAGE
 * ==================
 * 
 * PURPOSE:
 * This page displays detailed information about a specific vendor and all their
 * approved, non-expired offers. Students can view offers and claim them.
 * 
 * FEATURES:
 * - Display vendor header with logo, name, and business info
 * - Show all vendor's approved, non-expired offers in a list
 * - Offer cards with discount information
 * - Claim button for each offer (if not already claimed)
 * - Loading and error handling
 * 
 * ROUTE PROTECTION:
 * - Only visible to logged-in students
 * - URL: http://localhost:3000/vendor-detail/:vendorId
 * 
 * BUSINESS LOGIC:
 * - Fetch vendor data and offers from GET /api/vendors/:vendorId/offers
 * - Display offers only if:
 *   - status = "approved"
 *   - expiryDate >= today (not expired)
 * - Each offer shows: title, description, discount, claim count
 * - Students can claim offers from this page
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getVendorOffers, claimOffer } from '@/lib/api';

interface Offer {
  _id: string;
  title: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  category: string;
  claimCount: number;
  expiryDate: string;
  bannerImage?: string;
  createdAt: string;
}

interface VendorData {
  _id: string;
  name: string;
  businessName: string;
  profileImage?: {
    url?: string;
  };
}

export default function VendorDetail() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingOfferId, setClaimingOfferId] = useState<string | null>(null);
  const [claimedOffers, setClaimedOffers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (vendorId) {
      fetchVendorOffers();
    }
  }, [vendorId]);

  const fetchVendorOffers = async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await getVendorOffers(vendorId);
      setVendor(response.data.vendor);
      setOffers(response.data.offers || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load vendor offers';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error fetching vendor offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimOffer = async (offerId: string) => {
    try {
      setClaimingOfferId(offerId);
      const response = await claimOffer(offerId);
      toast.success('Offer claimed successfully! View your redemptions to proceed.');
      setClaimedOffers(prev => new Set([...prev, offerId]));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to claim offer';
      toast.error(errorMsg);
      console.error('Error claiming offer:', err);
    } finally {
      setClaimingOfferId(null);
    }
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percent') {
      return `${value}% OFF`;
    }
    return `$${value} OFF`;
  };

  const formatExpiryDate = (date: string) => {
    const expiryDate = new Date(date);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return 'Expires Tomorrow';
    return `Expires in ${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendor details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchVendorOffers}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/vendors')}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Back to Vendors
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Vendor not found</p>
          <button
            onClick={() => navigate('/vendors')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Vendors
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-8"
    >
      {/* Vendor Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-lg shadow-md overflow-hidden"
      >
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 h-24"></div>
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4">
            {/* Vendor Logo */}
            {vendor.profileImage?.url ? (
              <img
                src={vendor.profileImage.url}
                alt={vendor.name}
                className="h-24 w-24 bg-white rounded-lg shadow border-4 border-white object-cover"
              />
            ) : (
              <div className="h-24 w-24 bg-white rounded-lg shadow border-4 border-white flex items-center justify-center">
                <span className="text-gray-400">No Logo</span>
              </div>
            )}
            <div className="pb-2 flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
              {vendor.businessName && (
                <p className="text-gray-600 text-lg">{vendor.businessName}</p>
              )}
            </div>
            <button
              onClick={() => navigate('/vendors')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              ← Back to Vendors
            </button>
          </div>
        </div>
      </motion.div>

      {/* Offers Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Available Offers ({offers.length})
        </h2>

        {offers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No active offers from this vendor at the moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer, index) => (
              <motion.div
                key={offer._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
              >
                <div className="flex flex-col md:flex-row items-stretch">
                  {/* Banner Image */}
                  <div className="w-full md:w-48 h-40 md:h-auto bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center p-4 md:shrink-0">
                    {offer.bannerImage ? (
                      <img
                        src={offer.bannerImage}
                        alt={offer.title}
                        className="h-full w-full object-cover rounded"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-gray-400 text-sm">Offer Image</p>
                      </div>
                    )}
                  </div>

                  {/* Offer Details */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      {/* Title and Discount Badge */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 flex-1">
                          {offer.title}
                        </h3>
                        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-lg font-bold text-lg whitespace-nowrap">
                          {formatDiscount(offer.discountType, offer.discountValue)}
                        </div>
                      </div>

                      {/* Description */}
                      {offer.description && (
                        <p className="text-gray-600 text-sm mb-3">{offer.description}</p>
                      )}

                      {/* Category and Expiry */}
                      <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {offer.category}
                        </span>
                        <span className={`font-medium ${
                          new Date(offer.expiryDate) < new Date() ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatExpiryDate(offer.expiryDate)}
                        </span>
                      </div>

                      {/* Claims Count */}
                      <p className="text-xs text-gray-500">
                        {offer.claimCount} {offer.claimCount === 1 ? 'student has' : 'students have'} claimed this offer
                      </p>
                    </div>
                  </div>

                  {/* Claim Button */}
                  <div className="p-4 flex items-center justify-center md:flex-none md:w-32">
                    <button
                      onClick={() => handleClaimOffer(offer._id)}
                      disabled={
                        claimingOfferId === offer._id ||
                        claimedOffers.has(offer._id) ||
                        new Date(offer.expiryDate) < new Date()
                      }
                      className={`w-full md:w-full px-4 py-2 rounded font-medium transition-colors duration-200 ${
                        claimedOffers.has(offer._id)
                          ? 'bg-green-100 text-green-800 cursor-default'
                          : new Date(offer.expiryDate) < new Date()
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : claimingOfferId === offer._id
                          ? 'bg-blue-400 text-white cursor-wait'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {claimedOffers.has(offer._id)
                        ? '✓ Claimed'
                        : claimingOfferId === offer._id
                        ? 'Claiming...'
                        : new Date(offer.expiryDate) < new Date()
                        ? 'Expired'
                        : 'Claim'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-2">💡 How claiming works:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>✓ Click "Claim" to add an offer to your redemptions</li>
          <li>✓ You'll get a unique code to use at the vendor's location</li>
          <li>✓ Once redeemed, the offer will be marked as "Redeemed"</li>
        </ul>
      </div>
    </motion.div>
  );
}
