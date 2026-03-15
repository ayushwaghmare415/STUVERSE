/**
 * VENDOR CARD COMPONENT
 * ====================
 * 
 * A reusable card component for displaying vendor information in grid layouts.
 * 
 * FEATURES:
 * - Display vendor logo/image
 * - Show vendor name and business name
 * - Display category badge
 * - Show total count of approved offers
 * - "View Offers" button with navigation
 * - Hover effects and animations
 * 
 * PROPS:
 * - vendor: Vendor data object
 * - onViewOffers: Callback when "View Offers" button is clicked
 */

import { motion } from 'framer-motion';
import React from 'react';

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

interface VendorCardProps {
  vendor: Vendor;
  onViewOffers: (vendorId: string) => void;
  index?: number;
}

export function VendorCard({ vendor, onViewOffers, index = 0, ...rest }: VendorCardProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
    >
      {/* Vendor Logo Container */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 h-32 flex items-center justify-center p-4">
        {vendor.profileImage?.url ? (
          <img
            src={vendor.profileImage.url}
            alt={vendor.name}
            className="h-24 w-24 object-cover rounded"
          />
        ) : (
          <div className="h-24 w-24 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-400 text-sm">No Logo</span>
          </div>
        )}
      </div>

      {/* Vendor Info */}
      <div className="p-4">
        {/* Vendor Name */}
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {vendor.name}
        </h3>

        {/* Business Name */}
        {vendor.businessName && (
          <p className="text-sm text-gray-600 truncate mb-2">
            {vendor.businessName}
          </p>
        )}

        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
            {vendor.category || 'General'}
          </span>
        </div>

        {/* Offers Count */}
        <div className="mb-4 p-3 bg-linear-to-r from-blue-50 to-indigo-50 rounded">
          <p className="text-center">
            <span className="text-2xl font-bold text-blue-600">
              {vendor.totalApprovedOffers}
            </span>
            <p className="text-xs text-gray-600">
              Active {vendor.totalApprovedOffers === 1 ? 'Offer' : 'Offers'}
            </p>
          </p>
        </div>

        {/* View Offers Button */}
        <button
          onClick={() => onViewOffers(vendor._id)}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors duration-200"
        >
          View Offers
        </button>
      </div>
    </motion.div>
  );
}
