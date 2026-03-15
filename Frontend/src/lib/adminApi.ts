import API from './api';

// ===== Analytics =====
export const getAnalyticsOverview = () => API.get('/admin/analytics/overview');
export const getMonthlyUsers = (params?: Record<string, any>) =>
  API.get('/admin/analytics/monthly-users', { params });
export const getTopVendors = (params?: Record<string, any>) =>
  API.get('/admin/analytics/top-vendors', { params });
export const getTopOffers = (params?: Record<string, any>) =>
  API.get('/admin/analytics/top-offers', { params });

// ===== Coupon Management =====

/**
 * Get all coupons with pagination, search, and filtering
 * GET /api/admin/coupons
 */
export const getAllCoupons = (params?: Record<string, any>) =>
  API.get('/admin/coupons', { params });

/**
 * Get a specific coupon by ID
 * GET /api/admin/coupons/:id
 */
export const getCouponById = (couponId: string) =>
  API.get(`/admin/coupons/${couponId}`);

/**
 * Delete a coupon permanently
 * DELETE /api/admin/coupons/:id
 */
export const deleteCoupon = (couponId: string) =>
  API.delete(`/admin/coupons/${couponId}`);

/**
 * Update coupon status (approve or reject)
 * PATCH /api/admin/coupons/:id/status
 */
export const updateCouponStatus = (couponId: string, data: Record<string, any>) =>
  API.patch(`/admin/coupons/${couponId}/status`, data);

/**
 * Approve a coupon
 * PATCH /api/admin/offers/:id/approve
 */
export const approveCoupon = (couponId: string) =>
  API.patch(`/admin/offers/${couponId}/approve`);

/**
 * Reject a coupon
 * PATCH /api/admin/offers/:id/reject
 */
export const rejectCoupon = (couponId: string, data?: Record<string, any>) =>
  API.patch(`/admin/offers/${couponId}/reject`, data);

/**
 * Get pending offers with pagination and filters
 * GET /api/admin/pending-offers
 */
export const getPendingOffers = (params?: Record<string, any>) =>
  API.get('/admin/pending-offers', { params });

// ===== Notification Management =====

/**
 * Create a new system notification
 * POST /api/admin/notifications
 * 
 * Body:
 * {
 *   title: string,
 *   message: string,
 *   recipientType: "AllStudents" | "AllVendors" | "SpecificUser",
 *   userId?: string (required if recipientType is "SpecificUser")
 * }
 */
export const createNotification = (data: Record<string, any>) =>
  API.post('/admin/notifications', data);

/**
 * Get all notifications created by the logged-in admin
 * GET /api/admin/notifications
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - search: string (optional, searches title and message)
 */
export const getNotifications = (params?: Record<string, any>) =>
  API.get('/admin/notifications', { params });

/**
 * Delete a notification permanently
 * DELETE /api/admin/notifications/:id
 */
export const deleteNotification = (notificationId: string) =>
  API.delete(`/admin/notifications/${notificationId}`);

// ===== Platform Settings Management =====

/**
 * Fetch current global platform settings
 * GET /api/admin/settings
 * 
 * Returns:
 * {
 *   _id: string,
 *   platformName: string,
 *   studentVerificationRequired: boolean,
 *   vendorApprovalRequired: boolean,
 *   maxClaimsPerStudent: number,
 *   maintenanceMode: boolean,
 *   updatedBy: { _id, name, email, role },
 *   updatedAt: string (ISO date)
 * }
 */
export const getSettings = () => API.get('/admin/settings');

/**
 * Update global platform settings
 * PUT /api/admin/settings
 * 
 * Request Body (all fields optional):
 * {
 *   platformName?: string (1-100 chars),
 *   studentVerificationRequired?: boolean,
 *   vendorApprovalRequired?: boolean,
 *   maxClaimsPerStudent?: number (1-1000),
 *   maintenanceMode?: boolean
 * }
 * 
 * Returns: Updated settings document
 * 
 * SYSTEM IMPACTS:
 * - maintenanceMode: Controls platform access for non-admins
 * - studentVerificationRequired: Controls student onboarding flow
 * - vendorApprovalRequired: Controls vendor offer approval workflow
 * - maxClaimsPerStudent: Prevents abuse (max claims per day)
 * - platformName: Branding/display
 */
export const updateSettings = (data: Record<string, any>) =>
  API.put('/admin/settings', data);

