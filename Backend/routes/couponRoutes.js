const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Redemption = require('../models/Redemption');
const Claim = require('../models/Claim');
const { authenticateUser, authorizeRoles } = require('../middleware/authorization');

// import student controller functions to keep logic tidy
const studentController = require('../controllers/studentController');
const vendorController = require('../controllers/vendorController');

// Vendor: Create coupon (status = pending by default; explicit status='draft' allowed)
router.post('/', authenticateUser, authorizeRoles('vendor'), async (req, res, next) => {
  try {
    if (!req.body.status) {
      req.body.status = 'pending';
    }

    if (req.body.submit || req.body.submitForApproval) {
      req.body.status = 'pending';
    }

    return vendorController.createOffer(req, res, next);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Student: View only approved coupons with optional filters
// base path allows existing Postman tests to hit /api/coupons
router.get('/', authenticateUser, authorizeRoles('student'), studentController.listOffers);

// `/approved` is an alias of `/` kept for backwards compatibility
router.get('/approved', authenticateUser, authorizeRoles('student'), studentController.listOffers);

// Student: view their claim history
router.get('/redeemed', authenticateUser, authorizeRoles('student'), studentController.getClaimHistory);

// Vendor: View own coupons
router.get('/my', authenticateUser, authorizeRoles('vendor'), async (req, res) => {
  try {
    const coupons = await Coupon.find({ vendorId: req.user._id });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor: See redemptions for own coupons
router.get('/my/redemptions', authenticateUser, authorizeRoles('vendor'), async (req, res) => {
  try {
    const redemptions = await Redemption.find({ vendorId: req.user._id }).populate('couponId studentId');
    res.json(redemptions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Public/Student: Get coupon detail (increment view count for analytics)
router.get('/:id', authenticateUser, authorizeRoles('student'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).populate('vendorId', 'isBlocked businessName name email phone businessAddress website description logo');
    if (!coupon) return res.status(404).json({ message: 'Offer not found' });
    // only approved offers are visible to students and vendors who own them
    if (coupon.status !== 'approved') return res.status(403).json({ message: 'Offer not available' });
    if (coupon.vendorId && coupon.vendorId.isBlocked) return res.status(403).json({ message: 'Offer not available' });

    // increment viewCount (non-blocking best effort)
    coupon.viewCount = (coupon.viewCount || 0) + 1;
    await coupon.save();

    const isClaimed = await Claim.exists({
      studentId: req.user._id,
      couponId: coupon._id
    });

    const responseCoupon = coupon.toObject();
    responseCoupon.isClaimed = Boolean(isClaimed);

    res.json(responseCoupon);
  } catch (err) {
    console.error('getCoupon error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Approve/Reject coupon
router.patch('/:id/status', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    if (req.app.get('io')) {
      const io = req.app.get('io');
      // Notify vendor for any status change
      io.to(`vendor_${coupon.vendorId}`).emit('coupon_approved', coupon);

      // Only notify students when offer is approved
      if (coupon.status === 'approved') {
        io.to('student_room').emit('coupon_approved', coupon);
        io.to('student_room').emit('newOffer', coupon);
        io.to('student_room').emit('newApprovedOffer', coupon);
      }

      // Notify admins about offer status update
      io.to('admin_room').emit('offerStatusUpdated', {
        offerId: coupon._id,
        status: coupon.status,
        title: coupon.title
      });
    }

    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Student: Redeem (claim) coupon by ID param
router.post('/:id/redeem', authenticateUser, authorizeRoles('student'), studentController.claimOffer);

// Student: Claim coupon by request body
router.post('/claim', authenticateUser, authorizeRoles('student'), (req, res, next) => {
  // Support body-based claim path for API clients: { couponId }
  req.params.id = req.body.couponId || req.body.id;
  if (!req.params.id) {
    return res.status(400).json({ message: 'couponId is required' });
  }
  return studentController.claimOffer(req, res, next);
});

module.exports = router;
