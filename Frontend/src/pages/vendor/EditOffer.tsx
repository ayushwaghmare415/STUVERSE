import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UploadCloud, MapPin, Tag, FileText, Calendar, Percent, DollarSign, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { updateVendorOffer, getMyVendorOffers } from '@/lib/api';
import { toast } from 'sonner';

/**
 * EDIT OFFER PAGE
 * ===============
 *
 * This page allows vendors to edit their existing offers that are still editable.
 * Only offers with status 'pending' or 'rejected' can be modified.
 *
 * WORKFLOW CONNECTION:
 * 1. Vendor clicks edit on MyOffers page → navigates to /vendor/edit-offer/:id
 * 2. Page loads existing offer data via GET /api/vendor/offers (filtered by ID)
 * 3. Vendor modifies form and submits → PATCH /api/vendor/offers/:id
 * 4. Backend validates: only vendor owner can edit, status must be editable
 * 5. If approved offers cannot be edited (business rule)
 *
 * SECURITY:
 * - Protected by ProtectedRoute with requiredRole="vendor"
 * - Backend middleware: authenticateUser + authorizeRoles("vendor")
 * - Only offer owner can access (enforced by backend)
 * - Status validation prevents editing approved offers
 *
 * FORM VALIDATION:
 * - Required: title, description, category, discount
 * - Discount: 0-100 percentage
 * - Expiry: must be future date (if provided)
 * - Success: "Offer updated successfully"
 */
export function EditOffer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOffer, setIsLoadingOffer] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    discount: 0,
    couponCode: '',
    expiryDate: '',
    terms: ''
  });

  // Load existing offer data
  useEffect(() => {
    const loadOffer = async () => {
      if (!id) return;

      try {
        setIsLoadingOffer(true);
        // Get all offers and find the specific one
        const response = await getMyVendorOffers({ page: 1, limit: 100 });
        const offer = response.data.offers.find((o: any) => o._id === id);

        if (!offer) {
          toast.error('Offer not found');
          navigate('/vendor/my-offers');
          return;
        }

        // Check if offer is editable
        if (offer.status === 'approved') {
          toast.error('Approved offers cannot be edited. Contact admin if changes are needed.');
          navigate('/vendor/my-offers');
          return;
        }

        // Populate form with existing data
        setFormData({
          title: offer.title || '',
          description: offer.description || '',
          category: offer.category || '',
          discount: offer.discountValue || 0,
          couponCode: offer.couponCode || '',
          expiryDate: offer.expiryDate ? new Date(offer.expiryDate).toISOString().split('T')[0] : '',
          terms: offer.terms || ''
        });
      } catch (error: any) {
        console.error('Error loading offer:', error);
        toast.error(error.response?.data?.message || 'Failed to load offer');
        navigate('/vendor/my-offers');
      } finally {
        setIsLoadingOffer(false);
      }
    };

    loadOffer();
  }, [id, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'discount' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.category || !formData.discount) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate expiry date is in future if provided
      if (formData.expiryDate && new Date(formData.expiryDate) <= new Date()) {
        toast.error('Expiry date must be in the future');
        return;
      }

      const offerData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        discount: formData.discount,
        expiryDate: formData.expiryDate || undefined,
        couponCode: formData.couponCode || undefined,
        terms: formData.terms || undefined
      };

      await updateVendorOffer(id, offerData);
      toast.success('Offer updated successfully');
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Error updating offer:', error);
      toast.error(error.response?.data?.message || 'Failed to update offer');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingOffer) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-slate-600">Loading offer...</span>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center"
      >
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Offer Updated!</h2>
        <p className="text-slate-600 mb-6">
          Your offer has been successfully updated. If it was previously rejected, it will be resubmitted for admin approval.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/vendor/my-offers"
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            View My Offers
          </Link>
          <Link
            to="/vendor/create-offer"
            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
          >
            Create Another
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/vendor/my-offers"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Edit Offer
          </h1>
          <p className="text-slate-500 mt-1">
            Update your offer details. Changes will be reviewed by admin if previously rejected.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Offer Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., 20% Off All Electronics"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
            >
              <option value="">Select a category</option>
              <option value="Food">Food</option>
              <option value="Tech">Tech</option>
              <option value="Fashion">Fashion</option>
              <option value="Education">Education</option>
            </select>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Discount Percentage *
            </label>
            <div className="relative">
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleInputChange}
                min="0"
                max="100"
                placeholder="e.g., 20"
                className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                required
              />
              <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Expiry Date
            </label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Coupon Code */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Coupon Code (Optional)
            </label>
            <input
              type="text"
              name="couponCode"
              value={formData.couponCode}
              onChange={handleInputChange}
              placeholder="e.g., SAVE20"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Describe your offer in detail..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
              required
            />
          </div>

          {/* Terms */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Terms & Conditions (Optional)
            </label>
            <textarea
              name="terms"
              value={formData.terms}
              onChange={handleInputChange}
              rows={3}
              placeholder="Any terms or conditions for redemption..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Offer
          </button>
        </div>
      </form>
    </motion.div>
  );
}