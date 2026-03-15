import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  Zap,
  Navigation,
  Camera,
  Map as MapIcon
} from 'lucide-react';
import { DiscountCard } from '@/components/ui/DiscountCard';
import { 
  storeStudentLocation, 
  getNearbyOffers, 
  claimOffer, 
  saveOffer,
  removeSavedOffer,
  getSavedOffers
} from '@/lib/api';
import toast from 'react-hot-toast';

interface NearbyOffer {
  _id: string;
  title: string;
  description: string;
  vendorName: string;
  vendorId: string;
  category: string;
  discount: string;
  expiryDate: string;
  distance: number;
  claimCount: number;
  isClaimed?: boolean;
}

interface StudentLocation {
  latitude: number;
  longitude: number;
}

export function StudentBrowse() {
  const [offers, setOffers] = useState<NearbyOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [location, setLocation] = useState<StudentLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radius, setRadius] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(new Set());
  const [savedOffersLoading, setSavedOffersLoading] = useState(false);

  const fetchSavedOffers = async () => {
    setSavedOffersLoading(true);
    try {
      const response = await getSavedOffers();
      const ids = new Set((response.data || []).map((offer: any) => offer.id));
      setSavedOfferIds(ids);
    } catch (error) {
      console.error('Error fetching saved offers:', error);
    } finally {
      setSavedOffersLoading(false);
    }
  };

  const categories = ['Food', 'Tech', 'Fashion', 'Education'];

  /**
   * Request user's geolocation using browser Geolocation API
   */
  const requestLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      toast.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });

          // Send location to backend
          await storeStudentLocation(latitude, longitude);
          toast.success('Location detected! Finding nearby offers...');
          
          // Fetch nearby offers
          await fetchNearbyOffers(latitude, longitude);
        } catch (error) {
          console.error('Error storing location:', error);
          toast.error('Failed to store location');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission required to find nearby offers.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        setLocationError(errorMessage);
        toast.error(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  /**
   * Fetch nearby offers from backend
   */
  const fetchNearbyOffers = async (lat?: number, lng?: number) => {
    setLoading(true);
    try {
      const lat_val = lat || location?.latitude;
      const lng_val = lng || location?.longitude;

      if (!lat_val || !lng_val) {
        toast.error('Please share your location first');
        setLoading(false);
        return;
      }

      const response = await getNearbyOffers(lat_val, lng_val, radius, 50, activeCategory || undefined);
      setOffers(response.data.offers || []);
    } catch (error: any) {
      console.error('Error fetching nearby offers:', error);
      if (error.response?.status === 400) {
        toast.error('Please share your location first');
      } else {
        toast.error('Failed to load nearby offers');
      }
    } finally {
      setLoading(false);
    }
  };

  // Request location and saved offers on component mount
  useEffect(() => {
    requestLocation();
    fetchSavedOffers();
  }, [requestLocation]);

  // Fetch offers when radius or category changes
  useEffect(() => {
    if (location) {
      fetchNearbyOffers();
    }
  }, [radius, activeCategory]);

  // Filter offers by search term
  const filteredOffers = offers.filter(offer => 
    offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    offer.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    offer.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClaim = async (offerId: string) => {
    setClaiming(offerId);
    try {
      await claimOffer(offerId);
      toast.success('Offer claimed successfully!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to claim offer';
      toast.error(message);
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
          const newSet = new Set(prev);
          newSet.delete(offerId);
          return newSet;
        });
        toast.success('Offer removed from saved');
      } else {
        await saveOffer(offerId);
        setSavedOfferIds(prev => new Set(prev).add(offerId));
        toast.success('Offer saved!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save offer';
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white pb-20">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-linear-to-r from-indigo-600 to-purple-600 text-white px-4 py-8 sticky top-0 z-40 shadow-lg"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MapPin className="h-8 w-8" />
              Nearby Offers
            </h1>
            {location && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={requestLocation}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full backdrop-blur transition-all"
              >
                <Navigation className="h-4 w-4" />
                Update Location
              </motion.button>
            )}
          </div>

          {/* Location Status Bar */}
          {locationLoading ? (
            <div className="flex items-center gap-2 text-white/80 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Detecting your location...</span>
            </div>
          ) : location ? (
            <div className="flex items-center gap-2 text-white/90 bg-white/10 px-3 py-2 rounded-lg w-fit">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                Latitude: {location.latitude.toFixed(4)} | Longitude: {location.longitude.toFixed(4)}
              </span>
            </div>
          ) : locationError ? (
            <div className="flex items-center gap-2 text-orange-200 bg-orange-500/20 px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{locationError}</span>
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* Location Permission Prompt */}
      {locationError && !location && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-orange-50 border-l-4 border-orange-500 p-6 mx-4 my-6 rounded-r-lg"
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 mb-2">Location Required</h3>
              <p className="text-orange-800 mb-4">
                We need your location to show you nearby vendor offers. Enable location access in your browser settings and try again.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={requestLocation}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Navigation className="h-4 w-4" />
                {locationLoading ? 'Detecting...' : 'Enable Location'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 space-y-4"
        >
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search offers by title or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Radius and Category Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Radius Selector */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Radius: {radius} km
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-2 bg-linear-to-r from-indigo-400 to-purple-400 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 km</span>
                <span>20 km</span>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </motion.button>
                {categories.map(cat => (
                  <motion.button
                    key={cat}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Info */}
        {!loading && location && (
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="font-medium text-slate-700">
                {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''} within {radius} km
              </span>
            </div>
            {location && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                <MapIcon className="h-4 w-4" />
                View on Map (Optional)
              </motion.button>
            )}
          </div>
        )}

        {/* Offers Grid */}
        {loading && location ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="h-12 w-12 text-indigo-600" />
            </motion.div>
            <p className="mt-4 text-slate-600 font-medium">Loading nearby offers...</p>
          </div>
        ) : !location ? (
          <div className="text-center py-20">
            <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium mb-2">Please share your location</p>
            <p className="text-slate-400 text-sm">We need your location to show nearby offers</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-slate-50 rounded-2xl"
          >
            <Camera className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-2">No offers found</p>
            <p className="text-slate-400 text-sm">
              Try expanding your search radius or changing the category
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredOffers.map((offer, index) => (
              <motion.div
                key={offer._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <DiscountCard
                  id={offer._id}
                  vendorName={offer.vendorName}
                  vendorLogo="https://via.placeholder.com/48?text=Vendor"
                  discountBadge={offer.discount}
                  title={offer.title}
                  description={offer.description}
                  expiryDate={new Date(offer.expiryDate).toLocaleDateString()}
                  isVerified={true}
                  distance={`${offer.distance} km away`}
                  claimCount={offer.claimCount}
                  isClaimed={offer.isClaimed || false}
                  isSaved={savedOfferIds.has(offer._id)}
                  onClaim={() => handleClaim(offer._id)}
                  claiming={claiming === offer._id}
                  customButton={
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
                        <span className="text-2xl">
                          {savedOfferIds.has(offer._id) ? '❤️' : '🤍'}
                        </span>
                      )}
                    </motion.button>
                  }
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
