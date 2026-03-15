const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles } = require('../middleware/authorization');
const adminCtrl = require('../controllers/adminController');
const settingsCtrl = require('../controllers/settingsController');
const Notification = require('../models/Notification');

/**
 * ADMIN ROUTES - STUDENT MANAGEMENT
 * ==================================
 * All routes require:
 * 1. Valid JWT token (Bearer token in Authorization header)
 * 2. Admin role (authorizeRoles('admin'))
 * 
 * STUDENT REGISTRATION FLOW:
 * 1. Student registers at POST /auth/register
 * 2. Account created with isVerified = false
 * 3. Admin reviews at GET /admin/students/pending
 * 4. Admin verifies with PATCH /admin/students/:id/verify
 * 5. Student can now login and claim offers
 * 
 * STUDENT CONTROL:
 * - Block: PATCH /admin/students/:id/block (disables login & claiming)
 * - Unblock: PATCH /admin/students/:id/unblock (restores access)
 * - Delete: DELETE /admin/students/:id (permanent removal)
 */

// ===== Student Management Endpoints =====

/**
 * GET /admin/students
 * List all students (verified and unverified)
 * Query params: page=1&limit=20
 */
router.get('/students', authenticateUser, authorizeRoles('admin'), adminCtrl.listStudents);

/**
 * GET /admin/students/search?email=...&name=...&college=...
 * Search students by email, name, or college
 * Query params: email=&name=&college=&page=1&limit=20
 */
router.get('/students/search', authenticateUser, authorizeRoles('admin'), adminCtrl.searchStudents);

/**
 * GET /admin/students/pending
 * List students pending verification (isVerified = false)
 * Main endpoint admins use to review new registrations
 * Query params: page=1&limit=20
 */
router.get('/students/pending', authenticateUser, authorizeRoles('admin'), adminCtrl.listPendingStudents);

/**
 * PATCH /admin/students/:id/verify
 * Verify a student (set isVerified = true)
 * After this, student can login via POST /auth/login
 */
router.patch('/students/:id/verify', authenticateUser, authorizeRoles('admin'), adminCtrl.verifyStudent);

/**
 * PATCH /admin/students/:id/block
 * Block a student (set isBlocked = true)
 * Blocked students cannot login or claim offers
 * Body: { reason: "optional reason for blocking" }
 */
router.patch('/students/:id/block', authenticateUser, authorizeRoles('admin'), adminCtrl.blockStudent);

/**
 * PATCH /admin/students/:id/unblock
 * Unblock a student (set isBlocked = false)
 * Restores student access to login and claim offers
 */
router.patch('/students/:id/unblock', authenticateUser, authorizeRoles('admin'), adminCtrl.unblockStudent);

/**
 * DELETE /admin/students/:id
 * Permanently delete a student account
 * Removes student and all associated redemptions
 */
router.delete('/students/:id', authenticateUser, authorizeRoles('admin'), adminCtrl.deleteStudent);

/**
 * LEGACY: Approve student (use /verify instead)
 * Kept for backward compatibility with existing Postman collections
 */
router.patch('/students/:id/approve', authenticateUser, authorizeRoles('admin'), adminCtrl.verifyStudent);

// ---------- Vendor endpoints ----------
// listing with pagination/search/filter is supported by controller
router.get('/vendors', authenticateUser, authorizeRoles('admin'), adminCtrl.listVendors);
router.get('/vendors/pending', authenticateUser, authorizeRoles('admin'), adminCtrl.listPendingVendors);
router.put('/vendors/:id/approve', authenticateUser, authorizeRoles('admin'), adminCtrl.approveVendor);
router.patch('/vendors/:id/approve', authenticateUser, authorizeRoles('admin'), adminCtrl.approveVendor); // legacy
router.put('/vendors/:id/reject', authenticateUser, authorizeRoles('admin'), adminCtrl.rejectVendor);

// actions specific to vendor accounts
router.patch('/vendors/:id/block', authenticateUser, authorizeRoles('admin'), adminCtrl.blockVendor);
router.patch('/vendors/:id/unblock', authenticateUser, authorizeRoles('admin'), adminCtrl.unblockVendor);
router.delete('/vendors/:id', authenticateUser, authorizeRoles('admin'), adminCtrl.deleteVendor);
// get offers created by the vendor (admin view)
router.get('/vendors/:id/offers', authenticateUser, authorizeRoles('admin'), adminCtrl.getVendorOffers);
// get comprehensive activity data for a vendor
router.get('/vendors/:id/activity', authenticateUser, authorizeRoles('admin'), adminCtrl.getVendorActivity);

// ===== User Management (Block/Unblock) =====

/**
 * PATCH /admin/users/:id/block
 * Block any user (student or vendor)
 * Generic action for admin account controls
 */
router.patch('/users/:id/block', authenticateUser, authorizeRoles('admin'), adminCtrl.blockUser);

/**
 * PATCH /admin/users/:id/unblock
 * Unblock any user (student or vendor)
 * Generic action for admin account controls
 */
router.patch('/users/:id/unblock', authenticateUser, authorizeRoles('admin'), adminCtrl.unblockUser);

// ---------- Coupons/Offers ----------
// Legacy endpoints
router.get('/coupons/legacy', authenticateUser, authorizeRoles('admin'), adminCtrl.listCoupons); // optional ?status=pending/approved/rejected
router.get('/coupons/pending', authenticateUser, authorizeRoles('admin'), adminCtrl.listPendingCoupons);

// New comprehensive endpoints
// POST /api/admin/coupons - admin-created coupon
router.post('/coupons', authenticateUser, authorizeRoles('admin'), adminCtrl.createCoupon);

// GET /api/admin/coupons - fetch all coupons with filters, search, pagination
router.get('/coupons', authenticateUser, authorizeRoles('admin'), adminCtrl.getAllCoupons);

// GET /api/admin/coupons/:id - get specific coupon details
router.get('/coupons/:id', authenticateUser, authorizeRoles('admin'), adminCtrl.getCouponById);

// DELETE /api/admin/coupons/:id - permanently delete coupon
router.delete('/coupons/:id', authenticateUser, authorizeRoles('admin'), adminCtrl.deleteCoupon);

// PATCH /api/admin/coupons/:id/status - change coupon status
router.patch('/coupons/:id/status', authenticateUser, authorizeRoles('admin'), adminCtrl.changeCouponStatus);

// Pending offers endpoint (with full pagination/search/filter)
router.get('/pending-offers', authenticateUser, authorizeRoles('admin'), adminCtrl.getPendingOffers);

// Dedicated approve/reject endpoints with enhanced validation
router.patch('/offers/:id/approve', authenticateUser, authorizeRoles('admin'), adminCtrl.approveOffer);
router.patch('/offers/:id/reject', authenticateUser, authorizeRoles('admin'), adminCtrl.rejectOffer);
router.put('/coupons/:id/approve', authenticateUser, authorizeRoles('admin'), adminCtrl.approveOffer);
router.put('/coupons/:id/reject', authenticateUser, authorizeRoles('admin'), adminCtrl.rejectOffer);

// legacy single-action endpoint used in Postman collection
router.patch('/approve-coupon/:id', authenticateUser, authorizeRoles('admin'), adminCtrl.changeCouponStatus);

// ===== Miscellaneous =====

// ---------- Miscellaneous ----------
router.delete('/users/:id', authenticateUser, authorizeRoles('admin'), adminCtrl.deleteUser);
router.get('/dashboard', authenticateUser, authorizeRoles('admin'), adminCtrl.getDashboardStats);

// ===== Dashboard Analytics =====

/**
 * GET /admin/recent-users
 * Get list of 10 most recently registered users
 * Used to show recent activity in dashboard
 */
router.get('/recent-users', authenticateUser, authorizeRoles('admin'), adminCtrl.getRecentUsers);

/**
 * GET /admin/recent-offers
 * Get list of 10 most recently created offers
 * Used to show recent activity in dashboard
 */
router.get('/recent-offers', authenticateUser, authorizeRoles('admin'), adminCtrl.getRecentOffers);

/**
 * Analytics endpoints for Admin UI
 */
router.get('/analytics/overview', authenticateUser, authorizeRoles('admin'), adminCtrl.getAnalyticsOverview);
router.get('/analytics/monthly-users', authenticateUser, authorizeRoles('admin'), adminCtrl.getMonthlyUsers);
router.get('/analytics/top-vendors', authenticateUser, authorizeRoles('admin'), adminCtrl.getTopVendors);
router.get('/analytics/top-offers', authenticateUser, authorizeRoles('admin'), adminCtrl.getTopOffers);

// ===== Admin Notifications =====

/**
 * POST /admin/notifications
 * Create a new system-wide notification
 * 
 * Body:
 * {
 *   title: string (required),
 *   message: string (required),
 *   recipientType: "AllStudents" | "AllVendors" | "SpecificUser" (required),
 *   userId: ObjectId (required if recipientType is "SpecificUser")
 * }
 * 
 * Only admins can create notifications
 * Admin receives a toast confirming notification sent
 */
router.post('/notifications', authenticateUser, authorizeRoles('admin'), adminCtrl.createNotification);

/**
 * GET /admin/notifications
 * Fetch all notifications created by the logged-in admin
 * 
 * Query params:
 * - page: 1 (default)
 * - limit: 20 (default)
 * - search: optional text search in title/message
 * 
 * Returns paginated list with user details populated
 */
router.get('/notifications', authenticateUser, authorizeRoles('admin'), adminCtrl.getNotifications);

/**
 * DELETE /admin/notifications/:id
 * Remove a notification permanently
 * 
 * Only the admin who created the notification can delete it
 * This will prevent future users from receiving it
 */
router.delete('/notifications/:id', authenticateUser, authorizeRoles('admin'), adminCtrl.deleteNotification);

// ===== Platform Settings Management =====

/**
 * GET /admin/settings
 * Fetch current global platform settings.
 * These settings control:
 * - Student verification workflow
 * - Vendor approval workflow
 * - Platform maintenance mode
 * - Per-student claim limits
 * 
 * Creates default settings if none exist (initialization).
 */
router.get('/settings', authenticateUser, authorizeRoles('admin'), settingsCtrl.getSettings);

/**
 * PUT /admin/settings
 * Update global platform settings.
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
 * IMPORTANT SYSTEM EFFECTS:
 * 
 * maintenanceMode = true:
 * - Students cannot access dashboards (403 redirect)
 * - Vendors cannot create/edit offers (403 redirect)
 * - Students cannot claim offers (403 redirect)
 * - Only admins retain full access
 * 
 * studentVerificationRequired = false:
 * - All pending students automatically gain access
 * - New students auto-verified, can claim immediately
 * 
 * vendorApprovalRequired = false:
 * - All pending vendor offers auto-approved
 * - New offers skip admin approval workflow
 */
router.put('/settings', authenticateUser, authorizeRoles('admin'), settingsCtrl.updateSettings);

module.exports = router;
