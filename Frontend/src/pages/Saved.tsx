import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookmarkX, Search, Loader2 } from 'lucide-react';
import { DiscountCard } from '@/components/ui/DiscountCard';
import { getSavedOffers, removeSavedOffer, claimOffer } from '@/lib/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface SavedOffer {
  id: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: number;
  category: string;
  vendorName: string;
  vendorId?: {
    vendorName?: string;
    businessName?: string;
    email?: string;
    phoneNumber?: string;
    businessAddress?: string;
  };
  expiryDate: string;
  bannerImage?: string;
  savedAt: string;
}

export function Saved() {
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<SavedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Fetch saved offers on component mount
  useEffect(() => {
    fetchSavedOffers();
  }, []);

  // Filter offers based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOffers(savedOffers);
    } else {
      const filtered = savedOffers.filter(offer =>
        offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOffers(filtered);
    }
  }, [savedOffers, searchTerm]);

  const fetchSavedOffers = async () => {
    try {
      setLoading(true);
      const response = await getSavedOffers();
      setSavedOffers(response.data);
    } catch (error: any) {
      console.error('Error fetching saved offers:', error);
      toast.error(error.response?.data?.message || 'Failed to load saved offers');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (offerId: string) => {
    try {
      setRemoving(offerId);
      await removeSavedOffer(offerId);
      setSavedOffers(prev => prev.filter(offer => offer.id !== offerId));
      toast.success('Offer removed from saved list');
    } catch (error: any) {
      console.error('Error removing saved offer:', error);
      toast.error(error.response?.data?.message || 'Failed to remove offer');
    } finally {
      setRemoving(null);
    }
  };

  const handleClaimOffer = async (offerId: string) => {
    try {
      setClaiming(offerId);
      await claimOffer(offerId);
      toast.success('Offer claimed successfully!');
      // Optionally remove from saved list after claiming
      // setSavedOffers(prev => prev.filter(offer => offer.id !== offerId));
    } catch (error: any) {
      console.error('Error claiming offer:', error);
      toast.error(error.response?.data?.message || 'Failed to claim offer');
    } finally {
      setClaiming(null);
    }
  };

  const formatDiscountBadge = (offer: SavedOffer) => {
    if (offer.discountType === 'percentage') {
      return `${offer.discountValue}% OFF`;
    } else if (offer.discountType === 'fixed') {
      return `$${offer.discountValue} OFF`;
    }
    return `${offer.discountValue}`;
  };

  const formatExpiryDate = (dateString: string) => {
    if (!dateString) return 'No expiry';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center py-24"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="text-slate-600">Loading saved offers...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Saved Offers
        </h1>
        <p className="text-slate-500 mt-1">
          Your bookmarked discounts for quick access.
        </p>
      </div>

      {/* Search Bar */}
      {savedOffers.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search saved offers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
      )}

      {filteredOffers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOffers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative"
            >
              <DiscountCard
                id={offer.id}
                vendorName={offer.vendorName}
                vendorBusinessName={offer.vendorId?.businessName}
                vendorEmail={offer.vendorId?.email}
                vendorPhone={offer.vendorId?.phoneNumber}
                vendorAddress={offer.vendorId?.businessAddress}
                vendorLogo={offer.bannerImage || `https://picsum.photos/seed/${offer.vendorName}/100/100`}
                discountBadge={formatDiscountBadge(offer)}
                title={offer.title}
                description={offer.description}
                expiryDate={formatExpiryDate(offer.expiryDate)}
                isVerified={true}
                isSaved={true}
                onClaim={() => handleClaimOffer(offer.id)}
                claiming={claiming === offer.id}
                customButton={
                  <button
                    onClick={() => handleRemoveSaved(offer.id)}
                    disabled={removing === offer.id}
                    className="absolute top-4 right-12 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-slate-200 hover:bg-white transition-colors disabled:opacity-50"
                    title="Remove from saved"
                  >
                    {removing === offer.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                    ) : (
                      <BookmarkX className="h-4 w-4 text-slate-600 hover:text-red-500" />
                    )}
                  </button>
                }
              />
            </motion.div>
          ))}
        </div>
      ) : savedOffers.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Search className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No matching offers</h3>
          <p className="text-slate-500 text-sm max-w-sm text-center">
            No saved offers match your search. Try different keywords.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <BookmarkX className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No saved offers</h3>
          <p className="text-slate-500 text-sm max-w-sm text-center">
            You haven't saved any offers yet. Browse the catalog and bookmark the ones you like.
          </p>
          <Link
            to="/browse"
            className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Browse Offers
          </Link>
        </div>
      )}
    </motion.div>
  );
}
