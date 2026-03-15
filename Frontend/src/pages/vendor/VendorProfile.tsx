import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  UploadCloud,
  Save,
  X,
  Edit,
  ShieldCheck,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import React from 'react';
import API from '@/lib/api';

// simple SVG placeholders encoded as data URIs (avoids external network calls)
const PLACEHOLDER_160 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect width='160' height='160' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='20'%3ENo%20Logo%3C/text%3E%3C/svg%3E";


interface VendorData {
  _id: string;
  name: string;
  email: string;
  businessName: string;
  ownerName: string;
  businessEmail: string;
  phone: string;
  category: string;
  address: string;
  website: string;
  description: string;
  logo?: {
    url: string;
    public_id: string;
  };
  profileImage?: {
    url: string;
    public_id: string;
  };
  isVerified: boolean;
  accountStatus?: 'Pending' | 'Approved' | 'Rejected';
  verificationBadge: boolean;
  profileCompletion?: {
    businessName: boolean;
    businessEmail: boolean;
    phone: boolean;
    category: boolean;
    address: boolean;
    website: boolean;
    description: boolean;
    logo: boolean;
  };
  completionPercentage?: number;
  createdAt?: string;
  idImage?: {
    url: string;
    public_id: string;
  };
}

const CATEGORIES = [
  'Restaurant',
  'Gym',
  'Cafe',
  'Clothing',
  'Electronics',
  'Books',
  'Beauty',
  'Other',
];

export function VendorProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalOffersCreated: number;
    totalRedemptions: number;
    activeOffers: number;
  } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    businessEmail: '',
    phone: '',
    category: '',
    address: '',
    website: '',
    description: '',
  });

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [{ data: profileData }, { data: statsData }] = await Promise.all([
        API.get('/vendor/profile'),
        API.get('/vendor/stats'),
      ]);

      setProfile(profileData.vendor);
      setStats(statsData.stats);

      setFormData({
        businessName: profileData.vendor.businessName || '',
        ownerName: profileData.vendor.ownerName || '',
        businessEmail: profileData.vendor.businessEmail || '',
        phone: profileData.vendor.phone || '',
        category: profileData.vendor.category || '',
        address: profileData.vendor.address || '',
        website: profileData.vendor.website || '',
        description: profileData.vendor.description || '',
      });
    } catch (err: any) {
      console.error('Failed to load profile', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      const formDataObj = new FormData();
      formDataObj.append('logo', file);

      const { data } = await API.post('/vendor/profile/logo', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfile(data.vendor);
      setSuccess('Logo uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Upload failed', err);
      setError(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError('');

      const { data } = await API.put('/vendor/profile/update', formData);

      setProfile(data.vendor);
      setEditMode(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to update profile', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        businessName: profile.businessName || '',
        ownerName: profile.ownerName || '',
        businessEmail: profile.businessEmail || '',
        phone: profile.phone || '',
        category: profile.category || '',
        address: profile.address || '',
        website: profile.website || '',
        description: profile.description || '',
      });
    }
    setEditMode(false);
    setError('');
  };

  const handleLogoFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleLogoUpload(file);
    }
  };

  const preventDefault = (e: React.DragEvent) => e.preventDefault();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <Building2 className="h-8 w-8 text-indigo-600" />
          </div>
          <p className="mt-4 text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Business Profile
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your vendor account and business details.
          </p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Offers Created
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.totalOffersCreated}
                </p>
              </div>
              <Zap className="h-6 w-6 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Active Offers
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.activeOffers}
                </p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Total Redemptions
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.totalRedemptions}
                </p>
              </div>
              <Building2 className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>
      )}

      {/* Success & Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-emerald-700 font-medium">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700 font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Completion Bar */}
      {profile && (
        <div className="bg-linear-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">Profile Completion</h3>
            </div>
            <span className="text-2xl font-bold text-indigo-600">
              {profile.completionPercentage || 0}%
            </span>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${profile.completionPercentage || 0}%`,
              }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="bg-linear-to-r from-indigo-500 to-blue-500 rounded-full h-full"
            />
          </div>
        </div>
      )}

      {/* Profile Card - View Mode */}
      {!editMode && profile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="flex flex-col md:flex-row gap-8">
            {/* Logo Section */}
            <div className="shrink-0 flex flex-col items-center">
              <div
                className="relative"
                onDrop={handleLogoDrop}
                onDragOver={preventDefault}
                onDragEnter={preventDefault}
              >
                <img
                  src={
                    profile.logo?.url ||
                    PLACEHOLDER_160
                  }
                  alt="Business Logo"
                  className="h-40 w-40 rounded-2xl object-cover ring-4 ring-indigo-100 shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <label
                  htmlFor="logoInput"
                  className="absolute bottom-2 right-2 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg"
                >
                  <UploadCloud className="h-5 w-5" />
                  <input
                    type="file"
                    id="logoInput"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoFileInput}
                    disabled={uploading}
                  />
                </label>
              </div>
              {uploading && (
                <p className="text-xs text-indigo-600 mt-2 font-medium">
                  Uploading...
                </p>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    {profile.businessName || 'Business Name'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {profile.accountStatus === 'Approved' ? (
                      <span className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                        Approved
                      </span>
                    ) : profile.accountStatus === 'Pending' ? (
                      <span className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="h-5 w-5" />
                        Pending Approval
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        Rejected
                      </span>
                    )}
                    {profile.createdAt && (
                      <span className="text-xs text-slate-500">
                        Member since {new Date(profile.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Owner Name */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Owner Name
                  </p>
                  <p className="text-slate-900 font-medium">
                    {profile.ownerName || 'Not provided'}
                  </p>
                </div>

                {/* Category */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Category
                  </p>
                  <p className="text-slate-900 font-medium">
                    {profile.category || 'Not provided'}
                  </p>
                </div>

                {/* Email */}
                <div className="flex items-start gap-2">
                  <Mail className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Email
                    </p>
                    <p className="text-slate-900 break-all">
                      {profile.businessEmail || profile.email}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-2">
                  <Phone className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Phone
                    </p>
                    <p className="text-slate-900">
                      {profile.phone || 'Not provided'}
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-2 md:col-span-2">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Address
                    </p>
                    <p className="text-slate-900">
                      {profile.address || 'Not provided'}
                    </p>
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-start gap-2 md:col-span-2">
                  <Globe className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Website
                    </p>
                    <p className="text-slate-900">
                      {profile.website ? (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          {profile.website}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="flex items-start gap-2 md:col-span-2">
                  <FileText className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <p className="text-slate-900">
                      {profile.description || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Edit Form */}
      {editMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm"
        >
          <h3 className="text-xl font-bold text-slate-900 mb-6">
            Edit Business Information
          </h3>

          <div className="space-y-6">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="e.g., Pizza Hub"
              />
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Owner Name
              </label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="e.g., Rohit Sharma"
              />
            </div>

            {/* Business Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Business Email *
              </label>
              <input
                type="email"
                name="businessEmail"
                value={formData.businessEmail}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="business@email.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="9876543210"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Business Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="e.g., Mumbai, India"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Website URL
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="https://yourwebsite.com"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Business Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Tell students about your business and offers..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-slate-100">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Business License Section */}
      {profile?.idImage?.url && !editMode && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Business License
          </h3>
          <img
            src={profile.idImage.url}
            alt="Business License"
            className="max-h-64 mx-auto rounded-lg border border-slate-200"
          />
        </div>
      )}
    </motion.div>
  );
}
