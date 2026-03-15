import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const normalizedBase = rawUrl.endsWith('/api')
  ? rawUrl
  : rawUrl.endsWith('/')
  ? `${rawUrl.slice(0, -1)}/api`
  : `${rawUrl}/api`;

const API = axios.create({
  baseURL: normalizedBase,
  withCredentials: true,
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Student API functions - Offers
export const browseOffers = (params?: { category?: string; search?: string; page?: number; limit?: number; sort?: 'newest' | 'discount' }) =>
  API.get('/student/offers', { params });

export const getApprovedOffers = (params?: { category?: string; search?: string; page?: number; limit?: number; sort?: 'newest' | 'discount' }) =>
  API.get('/offers/approved', { params });

export const getCouponById = (couponId: string) =>
  API.get(`/coupons/${couponId}`);

export const claimOffer = (offerId: string) =>
  API.post(`/student/claim/${offerId}`);

// Alternative endpoint for nearby offers (alias)
export const getNearbyOffersByLocation = (params?: { radius?: number; limit?: number; category?: string }) =>
  API.get('/offers/nearby', { params });

// ================================================
// REDEMPTIONS API
// ================================================

interface GetRedemptionsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'Claimed' | 'Redeemed' | 'Expired';
  sort?: 'newest' | 'oldest' | 'discount';
}

/**
 * Get all claims/redemptions for the logged-in student
 * Supports pagination, search, filtering by status, and sorting
 */
export const getRedemptions = (params?: GetRedemptionsParams) =>
  API.get('/student/redemptions', { params });

/**
 * Get redemption history for a specific student by id
 */
export const getStudentRedemptions = (studentId: string, params?: GetRedemptionsParams) =>
  API.get(`/redemptions/student/${studentId}`, { params });

/**
 * Redeem a claimed offer
 * Generates a unique redemption code and marks offer as "Redeemed"
 */
export const redeemOffer = (offerId: string) =>
  API.post(`/student/redeem-coupon/${offerId}`);

// ================================================
// SAVED OFFERS API
// ================================================

export const saveOffer = (offerId: string) =>
  API.post(`/student/save/${offerId}`);

export const getSavedOffers = () =>
  API.get('/student/saved');

export const removeSavedOffer = (offerId: string) =>
  API.delete(`/student/saved/${offerId}`);

// ================================================
// NOTIFICATIONS API
// ================================================

/**
 * Get notifications for the logged-in student
 */
export const getStudentNotifications = () =>
  API.get('/notifications/student');

export const getStudentNotificationsById = (studentId: string) =>
  API.get(`/notifications/student/${studentId}`);

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = (notificationId: string) =>
  API.patch(`/notifications/${notificationId}/read`);

/**
 * Delete a notification
 */
export const deleteNotification = (notificationId: string) =>
  API.delete(`/notifications/${notificationId}`);

// ================================================
// STUDENT PROFILE API
// ================================================

/**
 * Get student profile
 */
export const getStudentProfile = () => API.get('/student/profile');

/**
 * Update student profile
 */
export const updateStudentProfile = (data: { name?: string; phone?: string; college?: string; profileImage?: any }) =>
  API.put('/student/profile', data);

/**
 * Change student password
 */
export const changeStudentPassword = (data: { oldPassword: string; newPassword: string }) =>
  API.patch('/student/change-password', data);

/**
 * Upload student profile image
 */
export const uploadStudentProfileImage = (formData: FormData) =>
  API.post('/student/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

// ... other exports ...

// Default export of axios instance for convenience in components
export default API;

// ================================================
// VENDOR DISCOVERY API (for Students)
// ================================================
/**
 * Get all active vendors for student browsing
 * 
 * Returns vendors where:
 * - role = "vendor"
 * - isBlocked = false
 * 
 * Includes vendor info and count of approved offers
 */
export const getAllVendors = () =>
  API.get('/vendors');

/**
 * Get all approved, non-expired offers from a specific vendor
 * 
 * Returns vendor info and their available offers for claiming
 * 
 * @param vendorId - The ID of the vendor to fetch offers from
 */
export const getVendorOffers = (vendorId: string) =>
  API.get(`/vendors/${vendorId}/offers`);

// ================================================
// VENDOR DASHBOARD API
// ================================================
/**
 * Get vendor dashboard analytics
 * 
 * Returns comprehensive stats for vendor's offers and claims:
 * - totalOffers: Total number of offers created
 * - approvedOffers: Number of approved offers
 * - pendingOffers: Number of pending approval offers
 * - rejectedOffers: Number of rejected offers
 * - totalClaims: Total number of claims across all offers
 * - recentClaims: Array of recent redemption records
 */
export const getVendorDashboard = () =>
  API.get('/vendors/dashboard');

/**
 * Get detailed vendor analytics for dashboard
 * 
 * Returns comprehensive analytics data including summary cards, charts data, and top performing offers
 */
export const getVendorAnalytics = () =>
  API.get('/vendors/analytics');

/**
 * Get vendor analytics location data (student redemption locations)
 */
export const getVendorLocationAnalytics = (params?: { limit?: number; since?: string }) =>
  API.get('/vendors/analytics/location', { params });

/**
 * Update vendor business location coordinates
 */
export const updateVendorLocation = (data: { latitude: number; longitude: number; address?: string }) =>
  API.put('/vendor/location', data);

/**
 * Create a new offer for vendor
 * 
 * Creates a new coupon/offer that requires admin approval before students can see it
 * @param offerData - The offer data including title, description, category, etc.
 */
export const createVendorOffer = (offerData: FormData) =>
  API.post('/vendors/offers', offerData);


/**
 * Get all offers created by the authenticated vendor
 * 
 * Returns paginated list of vendor's offers with sorting by newest first
 * @param params - Pagination and filtering options
 */
export const getMyVendorOffers = (params?: { page?: number; limit?: number }) =>
  API.get('/vendors/offers', { params });

/**
 * Update a vendor offer
 * 
 * Allows editing of pending or rejected offers only
 * @param offerId - The ID of the offer to update
 * @param offerData - Updated offer data
 */
export const updateVendorOffer = (offerId: string, offerData: {
  title?: string;
  description?: string;
  category?: string;
  discount?: number;
  expiryDate?: string;
  couponCode?: string;
  terms?: string;
}) =>
  API.patch(`/vendors/offers/${offerId}`, offerData);

/**
 * Delete a vendor offer
 * 
 * Removes offer if it has no active claims
 * @param offerId - The ID of the offer to delete
 */
export const deleteVendorOffer = (offerId: string) =>
  API.delete(`/vendors/offers/${offerId}`);

/**
 * Get vendor redemptions
 * 
 * Returns paginated list of redemptions for vendor's offers with filtering options
 * @param params - Query parameters for filtering and pagination
 */
export const getVendorRedemptions = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  offerId?: string;
  status?: 'Claimed' | 'Redeemed' | 'Expired';
  startDate?: string;
  endDate?: string;
}) =>
  API.get('/vendors/redemptions', { params });

// ================================================
// VENDOR PROFILE API
// ================================================

interface VendorProfileData {
  businessName?: string;
  ownerName?: string;
  businessEmail?: string;
  phone?: string;
  category?: string;
  address?: string;
  website?: string;
  description?: string;
}

/**
 * Get authenticated vendor's profile
 * 
 * Returns vendor profile with completion percentage
 */
export const getVendorProfile = () =>
  API.get('/vendor/profile');

/**
 * Get vendor stats for profile dashboard
 * 
 * Returns:
 * - totalOffersCreated
 * - totalRedemptions
 * - activeOffers
 */
export const getVendorStats = () =>
  API.get('/vendor/stats');

/**
 * Update vendor profile
 * 
 * Updates business details like name, email, phone, category, etc.
 * @param profileData - The updated profile data
 */
export const updateVendorProfile = (profileData: VendorProfileData) =>
  API.put('/vendor/profile/update', profileData);

/**
 * Upload vendor business logo
 * 
 * Uploads logo image to Cloudinary
 * @param logoFile - The logo image file
 */
export const uploadVendorLogo = (logoFile: File) => {
  const formData = new FormData();
  formData.append('logo', logoFile);
  return API.post('/vendor/profile/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// ================================================
// STUDENT LOCATION & NEARBY DISCOVERY API
// ================================================

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Store student's current location
 * 
 * Sends student's GPS coordinates to the backend.
 * This enables location-based vendor and offer discovery.
 * 
 * @param latitude - Student's latitude coordinate
 * @param longitude - Student's longitude coordinate
 */
export const storeStudentLocation = (latitude: number, longitude: number) =>
  API.post('/student/location', { latitude, longitude });

/**
 * Get nearby vendors with their offers
 * 
 * Returns vendors within the specified radius of the student's location,
 * grouped with their approved offers.
 * 
 * Query parameters:
 * - radius: Search radius in kilometers (default: 5)
 * - limit: Maximum vendors to return (default: 10)
 * 
 * @param radius - Search radius in km (default: 5)
 * @param limit - Maximum vendors to return (default: 10)
 */
export const getNearbyVendors = (radius: number = 5, limit: number = 10) =>
  API.get('/student/nearby-vendors', { params: { radius, limit } });

/**
 * Get nearby offers (flattened list)
 * 
 * Returns all approved offers from vendors within the specified radius,
 * sorted by distance. More suitable for browsing all deals at once.
 * 
 * Query parameters:
 * - radius: Search radius in kilometers (default: 5)
 * - limit: Maximum offers to return (default: 20)
 * - category: Optional offer category filter
 * 
 * @param radius - Search radius in km (default: 5)
 * @param limit - Maximum offers to return (default: 20)
 * @param category - Optional category filter
 */
export const getNearbyOffers = (
  latitude: number,
  longitude: number,
  radius: number = 5,
  limit: number = 20,
  category?: string
) =>
  API.get('/student/nearby-offers', {
    params: { latitude, longitude, radius, limit, ...(category && { category }) }
  });

