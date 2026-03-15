/**
 * STUDENT VENDORS PAGE
 * ====================
 * 
 * PURPOSE:
 * This page allows students to discover and browse all active vendors on the platform.
 * Students can see vendor information (logo, name, business name, category) and
 * the total number of approved offers each vendor has.
 * 
 * FEATURES:
 * - Display vendors in a responsive grid layout
 * - Show vendor branding (logo, name, business name)
 * - Display total approved offers per vendor
 * - "View Offers" button to navigate to vendor detail page
 * - Loading and error handling
 * 
 * ROUTE PROTECTION:
 * - Only visible to logged-in students
 * - Protected by ProtectedRoute with requiredRole="student"
 * - URL: http://localhost:3000/vendors
 * 
 * BUSINESS LOGIC:
 * - Fetch vendors from GET /api/vendors (students only)
 * - Each vendor's data includes:
 *   - _id, name, businessName, category
 *   - profileImage (logo)
 *   - totalApprovedOffers (count of active offers)
 * - Blocked vendors are not shown (filtered on backend)
 * - Vendors are presented in a card grid format
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getAllVendors } from '@/lib/api';
import { VendorCard } from '@/components/ui/VendorCard';

interface Vendor {
  _id: string;
  name: string;
  businessName: string;
  category: string;
  profileImage?: {
    url?: string;
  };
  totalApprovedOffers: number;
}

export default function StudentVendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all vendors on component mount
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllVendors();
      setVendors(response.data.vendors || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load vendors';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOffers = (vendorId: string) => {
    navigate(`/vendor-detail/${vendorId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchVendors}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No vendors available at the moment</p>
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Discover Vendors</h1>
        <p className="text-gray-600 mt-2">Browse all active vendors and their exclusive offers</p>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {vendors.map((vendor, index) => (
          <VendorCard 
            key={vendor._id} 
            vendor={vendor} 
            onViewOffers={handleViewOffers}
            index={index}
          />
        ))}
      </div>

      {/* Statistics Footer */}
      <div className="mt-12 p-6 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg text-center">
        <p className="text-gray-700">
          Showing <span className="font-semibold text-blue-600">{vendors.length}</span> active{' '}
          {vendors.length === 1 ? 'vendor' : 'vendors'} with exclusive offers for students
        </p>
      </div>
    </motion.div>
  );
}
