const express = require('express');
const { authenticateUser, authorizeRoles } = require('../middleware/authorization');
const upload = require('../middleware/uploadMiddleware');
const { 
  getProfile, 
  updateProfile, 
  uploadId,
  uploadLogo,
  createOffer, 
  updateOffer, 
  deleteOffer, 
  submitOffer,
  listMyOffers, 
  getOfferAnalytics,
  updateLocation,
  getAllVendors,
  getVendorOffers,
  getDashboard,
  getAnalytics,
  getLocationAnalytics,
  getRedemptions,
  getStats
} = require('../controllers/vendorController');

const router = express.Router();

// vendor profile endpoints
router.get('/profile', authenticateUser, authorizeRoles('vendor'), getProfile);
router.get('/stats', authenticateUser, authorizeRoles('vendor'), getStats);
router.put('/profile/update', authenticateUser, authorizeRoles('vendor'), updateProfile);
// kept for backwards compatibility
router.put('/profile', authenticateUser, authorizeRoles('vendor'), updateProfile);
// Update business location coordinates
router.put('/location', authenticateUser, authorizeRoles('vendor'), updateLocation);
router.post('/profile/logo', authenticateUser, authorizeRoles('vendor'), upload.single('logo'), uploadLogo);

// upload vendor ID document
router.post('/upload-id', authenticateUser, authorizeRoles('vendor'), upload.single('idImage'), uploadId);

// Vendor dashboard - analytics and overview
router.get('/dashboard', authenticateUser, authorizeRoles('vendor'), getDashboard);

// Vendor analytics dashboard - detailed analytics
router.get('/analytics', authenticateUser, authorizeRoles('vendor'), getAnalytics);

// Vendor analytics - student location heatmap
router.get('/analytics/location', authenticateUser, authorizeRoles('vendor'), getLocationAnalytics);

// Vendor redemptions - view all redemptions for vendor's offers
router.get('/redemptions', authenticateUser, authorizeRoles('vendor'), getRedemptions);

// Vendor offer management (Vendor Panel)
// Supports a banner image upload (multipart/form-data) via field "bannerImage"
router.post('/offers', authenticateUser, authorizeRoles('vendor'), upload.single('bannerImage'), createOffer); // CREATE: Vendors submit offers for admin approval
router.get('/offers', authenticateUser, authorizeRoles('vendor'), listMyOffers); // READ: Vendors view their own offers (all statuses)
router.patch('/offers/:id', authenticateUser, authorizeRoles('vendor'), updateOffer); // UPDATE: Vendors can edit pending offers
router.delete('/offers/:id', authenticateUser, authorizeRoles('vendor'), deleteOffer); // DELETE: Vendors can delete their offers
router.get('/offers/:id/analytics', authenticateUser, authorizeRoles('vendor'), getOfferAnalytics);

// Alias routes matching requested API spec (/api/vendor/coupons)
router.post('/coupons', authenticateUser, authorizeRoles('vendor'), upload.single('bannerImage'), createOffer);
router.get('/coupons', authenticateUser, authorizeRoles('vendor'), listMyOffers);
router.put('/coupons/:id', authenticateUser, authorizeRoles('vendor'), updateOffer);
router.put('/coupons/:id/submit', authenticateUser, authorizeRoles('vendor'), submitOffer);
router.delete('/coupons/:id', authenticateUser, authorizeRoles('vendor'), deleteOffer);
router.get('/coupons/:id/analytics', authenticateUser, authorizeRoles('vendor'), getOfferAnalytics);

// =========================================================
// STUDENT DISCOVERY ROUTES
// =========================================================
// These routes allow STUDENTS to discover vendors and their offers

// GET /api/vendors - List all active vendors (for student browsing)
// Used by: StudentVendors page to display vendor grid
router.get('/', authenticateUser, authorizeRoles('student'), getAllVendors);

// GET /api/vendors/:vendorId/offers - Get all approved offers by a specific vendor
// Used by: VendorDetail page to display vendor's offers
router.get('/:vendorId/offers', authenticateUser, authorizeRoles('student'), getVendorOffers);

module.exports = router;
