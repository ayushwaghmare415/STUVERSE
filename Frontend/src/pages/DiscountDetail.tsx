import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, CheckCircle2, Copy, Clock, Share2, Bookmark } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getCouponById, getSavedOffers, saveOffer, removeSavedOffer } from '@/lib/api';

export function DiscountDetail() {
  const { id } = useParams();
  const [coupon, setCoupon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError('');

    getCouponById(id)
      .then((res) => setCoupon(res.data))
      .catch((err) => {
        const message = err?.response?.data?.message || 'Failed to load offer details.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const checkSavedStatus = async () => {
      try {
        const response = await getSavedOffers();
        const savedIds = new Set((response.data || []).map((offer: any) => offer.id));
        setSaved(savedIds.has(id));
      } catch (err) {
        console.error('Error fetching saved offers:', err);
      }
    };

    checkSavedStatus();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-slate-600">Loading coupon details...</div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-red-600">{error}</div>
    );
  }

  if (!coupon) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-slate-600">Coupon not found.</div>
    );
  }

  const vendor = coupon.vendorId || {};
  const vendorName = vendor.businessName || vendor.name || 'Vendor';
  const vendorLogo = vendor.logo?.url || vendor.profileImage?.url || 'https://picsum.photos/seed/vendor/100/100';
  const bannerImage = coupon.bannerImage || 'https://picsum.photos/seed/offer/1200/400';
  const discountBadge = coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `$${coupon.discountValue} OFF`;
  const expiryDate = coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : 'No expiry';
  const location = vendor.businessAddress || vendor.address || 'Location not available';
  const code = coupon.couponCode || 'N/A';

  const distance = coupon.distance || 'N/A';

  const terms = typeof coupon.terms === 'string'
    ? coupon.terms.split(/\r?\n/).map((t: string) => t.trim()).filter((t: string) => t)
    : Array.isArray(coupon.terms)
      ? coupon.terms
      : [];

  const handleCopy = () => {
    if (code && code !== 'N/A') {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToggle = async () => {
    if (!coupon?._id) return;

    setSaving(true);
    try {
      if (saved) {
        await removeSavedOffer(coupon._id);
        setSaved(false);
        toast.success('Offer removed from saved offers');
      } else {
        await saveOffer(coupon._id);
        setSaved(true);
        toast.success('Offer added to saved offers');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update saved status';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto pb-12"
    >
      {/* Back Button */}
      <Link to="/browse" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Browse
      </Link>

      {/* Banner */}
      <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden mb-8 shadow-sm">
        <img 
          src={bannerImage} 
          alt="Banner" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-slate-900/40 to-transparent" />
        
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-white shadow-lg border-2 border-white overflow-hidden flex items-center justify-center p-1 shrink-0">
              <img src={vendorLogo} alt={vendorName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="text-white">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{vendorName}</h1>
                {vendor.isVerified && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              </div>
              <p className="text-slate-200 text-sm md:text-base flex items-center gap-1.5 opacity-90">
                <MapPin className="h-4 w-4" /> {location}
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex gap-3">
            <button className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-colors">
              <Share2 className="h-5 w-5" />
            </button>
            <button 
              onClick={handleSaveToggle}
              disabled={saving}
              className={`p-2.5 backdrop-blur-md rounded-full transition-colors ${saved ? 'bg-white text-indigo-600' : 'bg-white/20 hover:bg-white/30 text-white'}`}
            >
              {saving ? (
                <span className="h-5 w-5 flex items-center justify-center text-sm">⏳</span>
              ) : (
                <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold mb-4">
              {discountBadge}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{coupon.title}</h2>
            <p className="text-slate-600 leading-relaxed text-lg">
              {coupon.description}
            </p>
          </div>

          {/* Terms Accordion (Simplified) */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Terms & Conditions</h3>
            <ul className="space-y-3">
              {terms.length > 0 ? terms.map((term, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-600 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                  {term}
                </li>
              )) : (
                <li className="text-slate-500 text-sm">No terms provided.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg text-sm font-medium">
                <Clock className="h-4 w-4" />
                Expires: {expiryDate}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Discount Code</label>
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <code className="flex-1 text-center font-mono text-lg font-bold text-slate-900 tracking-wider">
                  {code}
                </code>
                <button 
                  onClick={handleCopy}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Copy Code"
                >
                  {copied ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
              Redeem Now
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              Show this code to the cashier or enter it at checkout.
            </p>
          </div>

          {/* Map Preview */}
          <div className="bg-slate-100 rounded-2xl h-48 border border-slate-200 overflow-hidden relative flex items-center justify-center">
            {/* Small Map Image */}
            <img 
              src="https://picsum.photos/seed/map/400/300?blur=2" 
              alt="Map" 
              className="absolute inset-0 w-full h-full object-cover opacity-50"
              referrerPolicy="no-referrer"
            />
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-10 w-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg mb-2">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-slate-900 shadow-sm">
                {distance} away
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
