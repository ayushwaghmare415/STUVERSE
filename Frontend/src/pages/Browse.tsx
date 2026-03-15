import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { DiscountCard } from '@/components/ui/DiscountCard';
import { browseOffers, claimOffer, saveOffer, getSavedOffers, removeSavedOffer } from '@/lib/api';
import toast from 'react-hot-toast';

interface Offer {
  _id: string;
  title: string;
  description: string;
  category: string;
  discount: string;
  vendorName: string;
  vendorBusinessName?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  isClaimed?: boolean;
  vendorId?: {
    vendorName?: string;
    businessName?: string;
    email?: string;
    phoneNumber?: string;
    businessAddress?: string;
  };
  expiryDate: string;
  claimCount: number;
}

const categories = ['All', 'Food', 'Tech', 'Fashion', 'Education'];

export function Browse() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sort, setSort] = useState<'newest' | 'discount'>('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(new Set());

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 12, sort };
      if (search) params.search = search;
      if (activeCategory !== 'All') params.category = activeCategory;
      const response = await browseOffers(params);
      setOffers(response.data.offers);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchSavedOffers();
  }, [search, activeCategory, sort, page]);

  const fetchSavedOffers = async () => {
    try {
      const response = await getSavedOffers();
      const ids = new Set((response.data || []).map((offer: any) => offer.id));
      setSavedOfferIds(ids);
    } catch (error) {
      console.error('Error fetching saved offers:', error);
    }
  };

  const handleClaim = async (offerId: string) => {
    setClaiming(offerId);
    try {
      await claimOffer(offerId);
      toast.success('Offer claimed successfully!');
      // Refresh offers to update claim count
      fetchOffers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to claim offer');
    } finally {
      setClaiming(null);
    }
  };

  const handleSave = async (offerId: string) => {
    setSaving(offerId);
    try {
      if (savedOfferIds.has(offerId)) {
        await removeSavedOffer(offerId);
        setSavedOfferIds(prev => {
          const updated = new Set(prev);
          updated.delete(offerId);
          return updated;
        });
        toast.success('Offer removed from saved list');
      } else {
        await saveOffer(offerId);
        setSavedOfferIds(prev => new Set(prev).add(offerId));
        toast.success('Offer saved to your collection!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save offer');
    } finally {
      setSaving(null);
    }
  };

  const mappedOffers = offers.map(offer => ({
    id: offer._id,
    vendorName: offer.vendorName,
    vendorBusinessName: offer.vendorBusinessName || offer.vendorId?.businessName,
    vendorEmail: offer.vendorEmail || offer.vendorId?.email,
    vendorPhone: offer.vendorPhone || offer.vendorId?.phoneNumber,
    vendorAddress: offer.vendorAddress || offer.vendorId?.businessAddress,
    vendorLogo: 'https://picsum.photos/seed/' + offer.vendorName + '/100/100', // placeholder
    discountBadge: offer.discount,
    title: offer.title,
    description: offer.description,
    expiryDate: new Date(offer.expiryDate).toLocaleDateString(),
    isVerified: true, // assume approved are verified
    isSaved: savedOfferIds.has(offer._id),
    isClaimed: offer.isClaimed || false,
    distance: undefined,
    claimCount: offer.claimCount,
    onClaim: () => handleClaim(offer._id),
    claiming: claiming === offer._id,
    customButton: (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleSave(offer._id)}
        className="absolute top-4 right-4 z-20"
        disabled={saving === offer._id}
      >
        {saving === offer._id ? (
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
        ) : (
          <span className="text-2xl">{savedOfferIds.has(offer._id) ? '❤️' : '🤍'}</span>
        )}
      </motion.button>
    )
  }));

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
          Browse Offers
        </h1>
        <p className="text-slate-500 mt-1">
          Find the best deals from approved vendors.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by title or description..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors md:w-auto w-full">
            <SlidersHorizontal className="h-4 w-4" />
            More Filters
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'newest' | 'discount')}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="newest">Newest</option>
            <option value="discount">Highest Discount</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm h-80 animate-pulse">
              <div className="h-32 bg-slate-100"></div>
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                <div className="h-5 bg-slate-100 rounded"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {mappedOffers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <DiscountCard {...offer} />
            </motion.div>
          ))}
        </div>
      )}
      
      {offers.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-slate-500">No offers found matching your criteria.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {pagination.currentPage} of {pagination.totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!pagination.hasNext}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
