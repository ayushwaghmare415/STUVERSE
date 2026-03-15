const express = require('express');
const { authenticateUser, authorizeRoles } = require('../middleware/authorization');
const upload = require('../middleware/uploadMiddleware');
const { 
  getProfile, 
  updateProfile, 
  changePassword,
  uploadId, 
  uploadProfileImage,
  getDashboard,
  listOffers,
  claimOffer,
  getClaimHistory,
  redeemOffer,
  redeemCoupon,
  saveOffer,
  getSavedOffers,
  removeSavedOffer,
  storeLocation,
  getNearbyVendors,
  getNearbyOffers
} = require('../controllers/studentController');

const router = express.Router();

// Get current student profile
router.get('/profile', authenticateUser, authorizeRoles('student'), getProfile);

// Update profile information (name, phone, collegeName, profileImage)
router.put('/profile', authenticateUser, authorizeRoles('student'), updateProfile);

// Change password
router.patch('/change-password', authenticateUser, authorizeRoles('student'), changePassword);

// Upload profile image
router.post('/upload-profile-image', authenticateUser, authorizeRoles('student'), upload.single('profileImage'), uploadProfileImage);

// Upload student ID image for verification
router.post('/upload-id', authenticateUser, authorizeRoles('student'), upload.single('idImage'), uploadId);

// Student dashboard data
router.get('/dashboard', authenticateUser, authorizeRoles('student'), getDashboard);

// ================================================
// OFFERS & CLAIMS (REDEMPTIONS)
// ================================================

// List all approved offers (with optional filters and pagination)
router.get('/offers', authenticateUser, authorizeRoles('student'), listOffers);

// Claim an offer (add to student's redeemable list)
router.post('/offers/:id/claim', authenticateUser, authorizeRoles('student'), async (req, res, next) => {
  try {
    await claimOffer(req, res);
  } catch (err) {
    next(err);
  }
});

// Alias for /api/student/claim/:offerId
router.post('/claim/:offerId', authenticateUser, authorizeRoles('student'), async (req, res, next) => {
  req.params.id = req.params.offerId;
  try {
    await claimOffer(req, res);
  } catch (err) {
    next(err);
  }
});

// Get all claims/redemptions for student (with pagination, search, filtering, sorting)
router.get('/redemptions', authenticateUser, authorizeRoles('student'), getClaimHistory);
// alias to fulfill requested API route: /api/student/claimed
router.get('/claimed', authenticateUser, authorizeRoles('student'), getClaimHistory);

// Redeem a claimed offer (generate unique redemption code and mark as Redeemed)
router.post('/redeem/:offerId', authenticateUser, authorizeRoles('student'), redeemOffer);

// Redeem a coupon in one step (claim + redeem) - prevents duplicate redemption
router.post('/redeem-coupon/:offerId', authenticateUser, authorizeRoles('student'), redeemCoupon);

// ================================================
// SAVED OFFERS MANAGEMENT
// ================================================

// Save an offer for later
router.post('/save/:offerId', authenticateUser, authorizeRoles('student'), saveOffer);

// Get all saved offers
router.get('/saved', authenticateUser, authorizeRoles('student'), getSavedOffers);

// Remove a saved offer
router.delete('/saved/:offerId', authenticateUser, authorizeRoles('student'), removeSavedOffer);

// ================================================
// LOCATION-BASED VENDOR & OFFERS DISCOVERY
// ================================================

// Store student's current location (latitude, longitude)
router.post('/location', authenticateUser, authorizeRoles('student'), storeLocation);

// Get nearby vendors with their offers
router.get('/nearby-vendors', authenticateUser, authorizeRoles('student'), getNearbyVendors);

// Get nearby offers (flattened list)
router.get('/nearby-offers', authenticateUser, authorizeRoles('student'), getNearbyOffers);

module.exports = router;
