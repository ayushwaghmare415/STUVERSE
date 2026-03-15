import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { UploadCloud, MapPin, Tag, FileText, Calendar, Percent, DollarSign, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createVendorOffer } from '@/lib/api';
import { toast } from 'sonner';

/**
 * CREATE OFFER PAGE
 * ==================
 * 
 * This page allows vendors to create new offers/coupons that will be reviewed by admins
 * before becoming visible to students. This is part of the vendor offer management system.
 * 
 * WORKFLOW CONNECTION:
 * 1. Vendor fills form and submits → POST /api/vendor/offers
 * 2. Backend creates offer with status: 'pending'
 * 3. Admin notified via real-time socket
 * 4. Admin reviews in /admin/approvals
 * 5. If approved: status → 'approved' → appears in student browsing (/browse)
 * 6. Students can claim approved offers, which increments claimCount
 * 
 * SECURITY:
 * - Protected by ProtectedRoute with requiredRole="vendor"
 * - Backend middleware: authenticateUser + authorizeRoles("vendor")
 * - Blocked vendors denied access (checked in authenticateUser)
 * 
 * FORM VALIDATION:
 * - Required: title, description, category, discount, expiryDate
 * - Discount: 0-100 percentage
 * - Expiry: must be future date
 * - Success: "Offer submitted for admin approval"
 */
export function CreateOffer() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    discount: '',
    couponCode: '',
    expiryDate: '',
    terms: ''
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBannerChange = (file: File | null) => {
    setBannerFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setBannerPreview(url);
    } else {
      setBannerPreview(null);
    }
  };

  const handleBannerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBannerChange(e.dataTransfer.files[0]);
    }
  };

  const handleBannerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  React.useEffect(() => {
    return () => {
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [bannerPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.category || !formData.discount || !formData.expiryDate) {
        toast.error('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      const discount = Number(formData.discount);
      if (Number.isNaN(discount) || discount <= 0) {
        toast.error('Discount must be a number greater than 0');
        setIsLoading(false);
        return;
      }

      // Validate expiry date is in future
      if (new Date(formData.expiryDate) <= new Date()) {
        toast.error('Expiry date must be in the future');
        setIsLoading(false);
        return;
      }

      const offerData = new FormData();
      offerData.append('title', formData.title);
      offerData.append('description', formData.description);
      offerData.append('category', formData.category);
      offerData.append('discount', String(discount));
      offerData.append('expiryDate', formData.expiryDate);

      if (formData.couponCode) offerData.append('couponCode', formData.couponCode);
      if (formData.terms) offerData.append('terms', formData.terms);
      if (bannerFile) offerData.append('bannerImage', bannerFile);

      await createVendorOffer(offerData);
      toast.success('Offer submitted for admin approval');
      setIsSuccess(true);
      setBannerFile(null);
      setBannerPreview(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        discount: '',
        couponCode: '',
        expiryDate: '',
        terms: ''
      });
    } catch (error: any) {
      console.error('Error creating offer:', error);
      toast.error(error.response?.data?.message || 'Failed to create offer');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center"
      >
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Offer Submitted!</h2>
        <p className="text-slate-500 mb-6">
          Your offer has been submitted and is currently <span className="font-semibold text-orange-600">Pending Approval</span>. We will notify you once it's live.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            to="/vendor/my-offers"
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
          >
            View My Offers
          </Link>
          <button 
            onClick={() => setIsSuccess(false)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Create Another
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-8 pb-12"
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Create New Offer
        </h1>
        <p className="text-slate-500 mt-1">
          Design a compelling discount to attract verified students.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* Offer Details */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Offer Details</h3>
              <p className="text-xs text-slate-500">Basic information about your discount.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Offer Title</label>
              <input 
                type="text" 
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g. 50% OFF Frappuccinos" 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea 
                rows={4} 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the offer details..." 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" 
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none" 
                  required
                >
                  <option value="">Select a category</option>
                  <option value="Food">Food & Drink</option>
                  <option value="Tech">Technology</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Education">Education</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="date" 
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Discount Percentage</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    %
                  </div>
                  <input 
                    type="number" 
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    placeholder="50" 
                    min="1"
                    max="100"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Coupon Code (Optional)</label>
                <input 
                  type="text" 
                  name="couponCode"
                  value={formData.couponCode}
                  onChange={handleInputChange}
                  placeholder="e.g. SAVE50" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Media Upload */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Banner Image</h3>
              <p className="text-xs text-slate-500">Upload a high-quality image for your offer.</p>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleBannerDrop}
            onDragOver={handleBannerDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                handleBannerChange(file);
              }}
            />

            {bannerPreview ? (
              <>
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-48 object-cover rounded-xl mb-4"
                />
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  Click to change image
                </p>
                <p className="text-xs text-slate-500">SVG, PNG, JPG or GIF (max. 5MB)</p>
              </>
            ) : (
              <>
                <div className="h-16 w-16 bg-white border border-slate-100 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-8 w-8 text-indigo-500" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1">Click to upload or drag and drop</h4>
                <p className="text-xs text-slate-500">SVG, PNG, JPG or GIF (max. 5MB)</p>
                <p className="text-xs text-slate-400 mt-2">Recommended size: 1200x400px</p>
              </>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Location</h3>
              <p className="text-xs text-slate-500">Where can students redeem this offer?</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Store Address (Optional)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="123 Main St, City, State, ZIP" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              </div>
            </div>
            
            {/* Mock Map Picker */}
            <div className="h-48 bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center">
              <img src="https://picsum.photos/seed/map/800/400?blur=2" alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
              <div className="relative z-10 bg-white px-4 py-2 rounded-lg shadow-sm font-medium text-sm text-slate-700 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" />
                Pin location on map
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Terms & Conditions</h3>
              <p className="text-xs text-slate-500">Rules and restrictions for this offer.</p>
            </div>
          </div>

          <div>
            <textarea 
              rows={5} 
              name="terms"
              value={formData.terms}
              onChange={handleInputChange}
              placeholder="e.g. Valid only for currently enrolled students. Must present ID..." 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" 
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors">
            Save Draft
          </button>
          <button 
            type="submit" 
            disabled={isLoading}
            aria-disabled={isLoading}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit for Approval'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
