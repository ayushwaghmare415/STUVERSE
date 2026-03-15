import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';

// placeholders for when vendor banners/logos are missing
const PLACEHOLDER_100 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='16'%3ENo%20Logo%3C/text%3E%3C/svg%3E";
import { Tag, Zap, Bookmark, Search, Bell, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { DiscountCard } from '@/components/ui/DiscountCard';
import { MapboxMap, MapMarker } from '@/components/ui/MapboxMap';
import {
  claimOffer,
  getApprovedOffers,
  getNearbyOffers,
  storeStudentLocation,
  getSavedOffers,
  getStudentNotificationsById,
  getStudentProfile,
  getStudentRedemptions
} from '@/lib/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

interface Offer {
  _id: string;
  title: string;
  description: string;
  discount: string;
  discountType?: string;
  discountValue?: number;
  category: string;
  expiryDate: string;
  bannerImage?: string;
  vendorName: string;
  vendorBusinessName?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  vendorId?: {
    vendorName?: string;
    businessName?: string;
    email?: string;
    phoneNumber?: string;
    businessAddress?: string;
  };
  claimCount?: number;
  distance?: number; // in kilometers
  vendorLocation?: { latitude: number; longitude: number };
}

interface SavedOffer {
  id: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: number;
  category: string;
  vendorName: string;
  expiryDate: string;
  bannerImage?: string;
  savedAt: string;
}

interface Redemption {
  id: string;
  offerId: string;
  offerTitle: string;
  vendorName: string;
  discount: string;
  status: string;
  claimedAt: string;
  redeemedAt?: string;
  redemptionCode?: string;
  expiryDate?: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function StudentDashboard() {
  const [studentId, setStudentId] = useState<string | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersPage, setOffersPage] = useState(1);
  const [offersHasMore, setOffersHasMore] = useState(true);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersTotal, setOffersTotal] = useState(0);

  const [studentLocation, setStudentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyOffers, setNearbyOffers] = useState<Offer[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const normalizeOffer = (raw: any): Offer => {
    const vendor = raw.vendorId || {};

    return {
      _id: raw._id || raw.id,
      title: raw.title,
      description: raw.description,
      discount: raw.discount || (raw.discountType === 'percentage'
        ? `${raw.discountValue}% OFF`
        : `$${raw.discountValue} OFF`),
      discountType: raw.discountType,
      discountValue: raw.discountValue,
      category: raw.category,
      expiryDate: raw.expiryDate,
      bannerImage: raw.bannerImage,
      vendorName: raw.vendorName || vendor.businessName || vendor.name || 'Unknown Vendor',
      vendorBusinessName: vendor.businessName,
      vendorEmail: vendor.email,
      vendorPhone: vendor.phoneNumber || vendor.phone,
      vendorAddress: vendor.businessAddress,
      vendorId: vendor,
      claimCount: raw.claimCount
    };
  };

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [fetchingMore, setFetchingMore] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await getStudentProfile();
      setStudentId(data._id);
      return data._id;
    } catch (err) {
      console.error('Failed to fetch profile', err);
      return null;
    }
  }, []);

  const fetchOffers = useCallback(
    async (pageNum = 1, reset = false) => {
      try {
        if (reset) {
          setOffersLoading(true);
        } else {
          setFetchingMore(true);
        }

        const params: any = {
          page: pageNum,
          limit: 12
        };
        if (searchTerm) params.search = searchTerm;
        if (selectedCategory) params.category = selectedCategory;

        const { data } = await getApprovedOffers(params);
        if (reset) {
          setOffers((data.offers || []).map(normalizeOffer));
        } else {
          setOffers(prev => [...prev, ...(data.offers || []).map(normalizeOffer)]);
        }
        setOffersTotal(data.pagination?.totalOffers ?? 0);
        setOffersHasMore(data.pagination?.hasNext ?? false);
        setOffersPage(pageNum);
      } catch (err) {
        console.error('Failed to fetch offers', err);
      } finally {
        setOffersLoading(false);
        setFetchingMore(false);
      }
    },
    [searchTerm, selectedCategory]
  );

  const fetchSavedOffers = useCallback(async () => {
    try {
      const { data } = await getSavedOffers();
      setSavedOffers(data);
    } catch (err) {
      console.error('Failed to fetch saved offers', err);
    }
  }, []);

  const fetchRedemptions = useCallback(
    async (id: string | null) => {
      if (!id) return;
      try {
        const { data } = await getStudentRedemptions(id, { limit: 10, page: 1 });
        setRedemptions(data.redemptions || []);
      } catch (err) {
        console.error('Failed to fetch redemption history', err);
      }
    },
    []
  );

  const fetchNotifications = useCallback(
    async (id: string | null) => {
      if (!id) return;
      try {
        const { data } = await getStudentNotificationsById(id);
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    },
    []
  );

  const fetchNearbyOffers = useCallback(async () => {
    if (!studentLocation) return;

    try {
      setNearbyLoading(true);
      const { data } = await getNearbyOffers(
        studentLocation.latitude,
        studentLocation.longitude,
        10,
        20
      );
      setNearbyOffers(data.offers || []);
    } catch (err) {
      console.error('Failed to fetch nearby offers', err);
    } finally {
      setNearbyLoading(false);
    }
  }, [studentLocation]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      const id = await fetchProfile();
      if (!id) {
        setLoading(false);
        return;
      }

      // Attempt to capture browser geolocation and send to backend
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setStudentLocation({ latitude, longitude });
            try {
              await storeStudentLocation(latitude, longitude);
              const { data } = await getNearbyOffers(latitude, longitude, 10, 20);
              setNearbyOffers(data.offers || []);
            } catch (err) {
              console.warn('Failed to store student location', err);
            }
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              toast.error('Location permission required to find nearby offers.');
            } else {
              console.warn('Geolocation failed', error);
            }
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }

      await Promise.all([
        fetchOffers(1, true),
        fetchSavedOffers(),
        fetchRedemptions(id),
        fetchNotifications(id)
      ]);

      // Fetch nearby offers after we have a location
      fetchNearbyOffers();

      if (mounted) setLoading(false);
    };

    init();
    return () => {
      mounted = false;
    };
  }, [fetchOffers, fetchProfile, fetchSavedOffers, fetchNotifications, fetchRedemptions]);

  useEffect(() => {
    setOffers([]);
    setOffersPage(1);
    setOffersHasMore(true);
    fetchOffers(1, true);
  }, [searchTerm, selectedCategory, fetchOffers]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL || '', {
      auth: { token }
    });

    socket.on('connect_error', (err: any) => {
      console.error('Socket connection error', err.message);
    });

    socket.on('newApprovedOffer', (offer: any) => {
      const normalized = normalizeOffer(offer);
      toast.success(`New offer: ${normalized.title}`);
      setOffers(prev => [normalized, ...prev]);
    });

    socket.on('newOffer', (offer: any) => {
      const normalized = normalizeOffer(offer);
      toast.success(`New offer: ${normalized.title}`);
      setOffers(prev => [normalized, ...prev]);
    });

    socket.on('coupon_approved', (offer: any) => {
      const normalized = normalizeOffer(offer);
      toast.success(`New offer: ${normalized.title}`);
      setOffers(prev => [normalized, ...prev]);
    });

    socket.on('couponRedeemed', (data: any) => {
      if (data.studentId && studentId && data.studentId === studentId) {
        toast.success('Your redemption was recorded');
        fetchRedemptions(studentId);
      }
    });

    socket.on('studentNotification', (notif: Notification) => {
      toast(notif.message || 'New notification', { icon: '���' });
      setNotifications(prev => [notif, ...prev]);
    });

    socket.on('newNotification', (notif: Notification) => {
      toast('New notification', { icon: '���' });
      setNotifications(prev => [notif, ...prev]);
    });

    socket.on('notification', (notif: Notification) => {
      toast('New notification', { icon: '���' });
      setNotifications(prev => [notif, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [studentId, fetchRedemptions]);

  const handleClaim = async (offerId: string) => {
    setClaiming(offerId);
    try {
      await claimOffer(offerId);
      toast.success('Offer claimed successfully!');
      if (studentId) {
        fetchRedemptions(studentId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to claim offer');
    } finally {
      setClaiming(null);
    }
  };

  const loadMore = () => {
    if (offersHasMore) {
      fetchOffers(offersPage + 1);
    }
  };

  const handleSearch = () => {
    setOffers([]);
    setOffersPage(1);
    setOffersHasMore(true);
    fetchOffers(1, true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 p-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Student Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Browse and claim amazing offers from verified vendors.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Available Coupons"
          value={offersTotal.toString()}
          icon={<Tag className="h-5 w-5" />}
        />
        <StatCard
          title="Claimed Coupons"
          value={redemptions.length.toString()}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Saved Offers"
          value={savedOffers.length.toString()}
          icon={<Bookmark className="h-5 w-5" />}
        />
        <StatCard
          title="Notifications"
          value={notifications.length.toString()}
          icon={<Bell className="h-5 w-5" />}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Categories</option>
          <option value="Food">Food</option>
          <option value="Tech">Tech</option>
          <option value="Fashion">Fashion</option>
          <option value="Education">Education</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Offers Grid */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Available Offers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers
            .filter((offer, index, self) => index === self.findIndex((o) => o._id === offer._id))
            .map((offer) => (
              <div key={offer._id} className="relative">
                <DiscountCard
                  id={offer._id}
                vendorName={offer.vendorName}
                vendorBusinessName={offer.vendorBusinessName}
                vendorEmail={offer.vendorEmail}
                vendorPhone={offer.vendorPhone}
                vendorAddress={offer.vendorAddress}
                vendorLogo={offer.bannerImage || PLACEHOLDER_100}
                discountBadge={offer.discount}
                title={offer.title}
                description={offer.description}
                expiryDate={new Date(offer.expiryDate).toLocaleDateString()}
                isVerified={true}
                distance=""
                onClaim={() => handleClaim(offer._id)}
                claiming={claiming === offer._id}
              />
            </div>
          ))}
        </div>
        {offersHasMore && (
          <div className="text-center mt-6">
            <button
              onClick={loadMore}
              disabled={fetchingMore}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {fetchingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </section>

      {/* Saved Offers */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-4">Saved Offers</h2>
          <span className="text-sm text-slate-500">You'll get a notification before saved offers expire.</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedOffers
            .filter((offer, index, self) => index === self.findIndex((o) => (o.id || o._id) === (offer.id || offer._id)))
            .map((offer) => (
              <div key={offer.id || offer._id}>
                <DiscountCard
                  id={offer.id}
                vendorName={offer.vendorName}
                vendorBusinessName={offer.vendorId?.businessName}
                vendorEmail={offer.vendorId?.email}
                vendorPhone={offer.vendorId?.phoneNumber}
                vendorAddress={offer.vendorId?.businessAddress}
                vendorLogo={offer.bannerImage || PLACEHOLDER_100}
                discountBadge={
                  offer.discountType === 'percentage'
                    ? `${offer.discountValue}% OFF`
                    : `$${offer.discountValue} OFF`
                }
                title={offer.title}
                description={offer.description}
                expiryDate={new Date(offer.expiryDate).toLocaleDateString()}
                isVerified={true}
                distance=""
                onClaim={() => handleClaim(offer.id)}
                claiming={claiming === offer.id}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Redemption History */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Redemption History</h2>
        {redemptions.length === 0 ? (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-100">
            <p className="text-sm text-slate-600">No redemptions yet. Claim an offer to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {redemptions.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{r.offerTitle}</h3>
                    <p className="text-xs text-slate-500">{r.vendorName}</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-2">{r.discount}</p>
                <p className="text-xs text-slate-400 mt-2">Claimed: {new Date(r.claimedAt).toLocaleDateString()}</p>
                {r.redemptionCode && (
                  <p className="text-xs text-slate-400 mt-1">Code: {r.redemptionCode}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notifications */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`p-4 rounded-lg border ${notif.isRead ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}
            >
              <h3 className="font-semibold">{notif.title}</h3>
              <p className="text-sm text-gray-600">{notif.message}</p>
              <p className="text-xs text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
