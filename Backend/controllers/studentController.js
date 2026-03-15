// Basic controller for student-specific actions

const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Generate a short unique redemption code (6 hex characters, uppercase)
const generateUniqueRedemptionCode = async () => {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const exists = await Redemption.exists({ redemptionCode: code });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique redemption code after multiple attempts');
};

exports.getProfile = async (req, res) => {
  try {
    // Fetch user profile excluding password
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Redemption = require('../models/Redemption');
const Claim = require('../models/Claim');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const SavedOffer = require('../models/SavedOffer');

// ------------------------------------------------
// Student panel business logic
// ------------------------------------------------

/**
 * Get student dashboard data: stats, recent offers, notifications
 */
exports.getDashboard = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Total available coupons: approved, not expired (or no expiry date), from non-blocked vendors
    const totalAvailableCoupons = await Coupon.countDocuments({
      status: 'approved',
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: new Date() } }
      ],
      vendorId: { $nin: await User.find({ isBlocked: true }).distinct('_id') }
    });

    // Total claimed coupons by this student
    const totalClaimedCoupons = await Redemption.countDocuments({ studentId });

    // Recent offers: latest 5 approved coupons (including those without an expiry date)
    const recentOffers = await Coupon.find({
      status: 'approved',
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: new Date() } }
      ]
    })
      .populate('vendorId', 'businessName name email phone businessAddress isBlocked')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Filter out blocked vendors
    const filteredRecentOffers = recentOffers
      .filter(offer => !offer.vendorId.isBlocked)
      .map(offer => {
        const vendor = offer.vendorId || {};
        return {
          ...offer,
          vendorId: {
            vendorName: vendor.name,
            businessName: vendor.businessName,
            email: vendor.email,
            phoneNumber: vendor.phone,
            businessAddress: vendor.businessAddress
          }
        };
      });

    // Notifications for student
    const notifications = await Notification.find({
      $or: [
        { recipientType: 'AllStudents' },
        { recipientType: 'SpecificUser', userId: studentId }
      ]
    })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Add isRead status
    const notificationsWithRead = notifications.map(notif => ({
      ...notif,
      isRead: notif.readBy?.some(r => r.userId.toString() === studentId.toString()) || false
    }));

    res.json({
      totalAvailableCoupons,
      totalClaimedCoupons,
      recentOffers: filteredRecentOffers,
      notifications: notificationsWithRead
    });
  } catch (err) {
    console.error('getDashboard error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Fetch approved offers visible to students.  Supports optional
 * query parameters for category filtering, text search, sorting, and pagination.
 * Also hides coupons from vendors who have been blocked by an admin.
 */
exports.listOffers = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10, sort = 'newest' } = req.query;

    // Base filter: only approved, non-expired (or no expiry date) offers
    const baseFilter = {
      status: 'approved',
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: new Date() } }
      ]
    };

    // Apply category filter if provided
    if (category) {
      baseFilter.category = category;
    }

    // Build the final query, preserving expiry/category filters when searching
    let query = baseFilter;
    if (search) {
      const regex = new RegExp(search, 'i');
      query = {
        $and: [
          baseFilter,
          {
            $or: [
              { title: regex },
              { description: regex }
            ]
          }
        ]
      };
    }

    // Get total count for pagination
    const totalCoupons = await Coupon.countDocuments(query);

    // Determine sort order
    let sortOption = { createdAt: -1 }; // default newest
    if (sort === 'discount') {
      sortOption = { discountValue: -1 };
    }

    // Get paginated coupons
    const coupons = await Coupon.find(query)
      .populate('vendorId', 'isBlocked businessName name email phone businessAddress')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Filter out offers from vendors who have been blocked
    const filteredCoupons = coupons.filter(c => !c.vendorId.isBlocked);

    // Determine if current student has already claimed each coupon
    const claimedCouponIds = new Set(
      (await Claim.find({
        studentId: req.user._id,
        couponId: { $in: filteredCoupons.map(c => c._id) }
      }).distinct('couponId'))
      .map(id => id.toString())
    );

    // Map to required fields only
    const offers = filteredCoupons.map(coupon => {
      const vendor = coupon.vendorId || {};
      const vendorDetails = {
        vendorName: vendor.name,
        businessName: vendor.businessName,
        email: vendor.email,
        phoneNumber: vendor.phone,
        businessAddress: vendor.businessAddress
      };

      return {
        _id: coupon._id,
        title: coupon.title,
        description: coupon.description,
        category: coupon.category,
        discount: coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `$${coupon.discountValue} OFF`,
        bannerImage: coupon.bannerImage,
        vendorName: vendor.businessName || vendor.name || 'Unknown Vendor',
        vendorId: vendorDetails,
        expiryDate: coupon.expiryDate,
        claimCount: coupon.claimCount,
        isClaimed: claimedCouponIds.has(coupon._id.toString())
      };
    });

    res.json({
      offers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCoupons / limit),
        totalOffers: totalCoupons,
        hasNext: parseInt(page) * limit < totalCoupons,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('listOffers error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Student claims an offer (coupon).  Prevents duplicate claims and
 * increments the coupon's claimCount atomically. Ensures coupon is not expired
 * and that the vendor is not blocked.
 * 
 * Sets initial status to "Claimed" and records claimedAt timestamp.
 */
exports.claimOffer = async (req, res) => {
  try {
    const couponId = req.params.id || req.params.couponId;
    const studentId = req.user._id;

    if (!couponId) {
      return res.status(400).json({ message: 'Coupon ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ message: 'Invalid coupon ID' });
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Global platform settings guard
    const settings = await Settings.findOne();
    if (settings?.maintenanceMode) {
      return res.status(503).json({ message: 'Platform is under maintenance. Try again later.' });
    }

    if (settings?.studentVerificationRequired && !req.user.isVerified) {
      return res.status(403).json({ message: 'Student account not verified yet' });
    }

    if (settings?.maxClaimsPerStudent) {
      const totalStudentClaims = await Redemption.countDocuments({ studentId: req.user._id });
      if (totalStudentClaims >= settings.maxClaimsPerStudent) {
        return res.status(429).json({ message: 'You have reached daily claim limit' });
      }
    }

    if (coupon.status !== 'approved') {
      return res.status(400).json({ message: 'Coupon not approved yet' });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: 'Coupon expired' });
    }

    const vendor = await User.findById(coupon.vendorId);
    if (!vendor) {
      return res.status(400).json({ message: 'Vendor for this coupon does not exist' });
    }
    if (vendor.isBlocked) {
      return res.status(403).json({ message: 'Cannot claim offers from blocked vendor' });
    }

    const currentClaims = coupon.claimCount || coupon.claimedCount || 0;
    const maxClaims = coupon.maxClaims || 0;
    if (maxClaims > 0 && currentClaims >= maxClaims) {
      return res.status(400).json({ message: 'Coupon fully claimed' });
    }

    // Student may claim each coupon only once.
    const existingRedemption = await Redemption.findOne({ studentId, couponId });
    if (existingRedemption) {
      return res.status(400).json({ message: 'Coupon already claimed' });
    }

    const existingClaim = await Claim.findOne({ studentId, couponId });
    if (existingClaim) {
      return res.status(400).json({ message: 'Coupon already claimed' });
    }

    const claim = new Claim({
      studentId,
      couponId,
      claimedAt: new Date()
    });
    await claim.save();

    let redemptionCode;
    try {
      redemptionCode = await generateUniqueRedemptionCode();
    } catch (codeErr) {
      console.error('Redemption code generation error', codeErr);
      return res.status(503).json({ message: 'Could not generate unique redemption code, please try again.' });
    }

    const studentLocationCoords = req.user?.currentLocation?.coordinates;
    const studentLocation = Array.isArray(studentLocationCoords) && studentLocationCoords.length === 2
      && studentLocationCoords.every(coord => typeof coord === 'number' && !Number.isNaN(coord))
      ? {
          type: 'Point',
          coordinates: studentLocationCoords
        }
      : undefined;

    const redemption = new Redemption({
      studentId: req.user._id,
      studentName: req.user.name || '',
      studentEmail: req.user.email || '',
      couponId: coupon._id,
      vendorId: coupon.vendorId,
      offerTitle: coupon.title,
      couponCode: coupon.couponCode || null,
      discount: coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`,
      status: 'Claimed',
      claimedAt: new Date(),
      redemptionCode,
      ...(studentLocation ? { studentLocation } : {})
    });

    try {
      await redemption.save();
    } catch (saveErr) {
      console.error('Claim Coupon Error:', saveErr);
      return res.status(500).json({
        message: 'Internal server error',
        error: saveErr.message
      });
    }

    coupon.claimCount = currentClaims + 1;
    coupon.claimedCount = coupon.claimCount;
    await coupon.save();

    if (req.app.get('io')) {
      req.app.get('io').to('admin_room').emit('offer_claimed', {
        studentId: req.user._id,
        couponId: coupon._id,
        message: `${req.user.name || 'Student'} claimed "${coupon.title}"`
      });
      req.app.get('io').to(`vendor_${coupon.vendorId}`).emit('offer_claimed', {
        studentId: req.user._id,
        couponId: coupon._id,
        message: `A student claimed "${coupon.title}"`
      });
    }

    return res.status(201).json({
      message: 'Coupon claimed successfully',
      redemption,
      claimedAt: redemption.claimedAt,
      status: redemption.status
    });
  } catch (err) {
    console.error('claimOffer error', err);

    if (err?.code === 11000) {
      const duplicateField = err.keyValue ? Object.keys(err.keyValue)[0] : null;
      if (duplicateField === 'studentId' || duplicateField === 'couponId' || (err.keyPattern && err.keyPattern.studentId && err.keyPattern.couponId)) {
        return res.status(400).json({ message: 'You already claimed this coupon' });
      }
      if (duplicateField === 'redemptionCode' || (err.keyPattern && err.keyPattern.redemptionCode)) {
        return res.status(503).json({ message: 'Redemption code collision, please retry' });
      }
      return res.status(400).json({ message: 'You already claimed this coupon' });
    }

    return res.status(500).json({
      message: 'Internal server error',
      error: err.message || 'Unknown error'
    });
  }
};

/**
 * Get Redemption History with Pagination, Search, and Sorting
 * 
 * Returns all claims/redemptions for the logged-in student, with support for:
 * - Pagination (page, limit)
 * - Search by offer title or vendor name
 * - Filtering by status (Claimed, Redeemed, Expired)
 * - Sorting (newest, oldest, discount)
 * 
 * Includes full offer and vendor details for display.
 */
exports.getClaimHistory = async (req, res) => {
  try {
    const requestedStudentId = req.params.studentId || req.params.id;
    const studentId = requestedStudentId || req.user._id;

    // Ensure students can only access their own history (admins may access any)
    if (requestedStudentId && req.user.role !== 'admin' && req.user._id.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { page = 1, limit = 10, search = '', status = '', sort = 'newest' } = req.query;

    // Build query filter
    const query = { studentId };
    
    // Filter by status if provided
    if (status && ['Claimed', 'Redeemed', 'Expired'].includes(status)) {
      query.status = status;
    }

    // Build sort option
    let sortOption = { claimedAt: -1 }; // Default: newest first
    if (sort === 'oldest') {
      sortOption = { claimedAt: 1 };
    } else if (sort === 'discount') {
      sortOption = { 'couponId.discountValue': -1 }; // Sort by discount amount
    }

    // Get total count before pagination
    const totalRedemptions = await Redemption.countDocuments(query);

    // Fetch redemptions with population
    const redemptions = await Redemption.find(query)
      .populate({
        path: 'couponId',
        select: 'title description discountType discountValue expiryDate bannerImage vendorId category'
      })
      .populate('vendorId', 'businessName isBlocked')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Apply search filter on fetched data (after population)
    let filtered = redemptions;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filtered = redemptions.filter(r => 
        searchRegex.test(r.couponId?.title) || 
        searchRegex.test(r.vendorId?.businessName)
      );
    }

    // Check offer expiry status and update if needed
    const now = new Date();
    const formattedRedemptions = filtered.map(r => {
      let status = r.status;
      
      // If not yet expired, check coupon's expiry date
      if (r.couponId?.expiryDate && new Date(r.couponId.expiryDate) < now) {
        status = 'Expired';
      }

      const discountValue = r.couponId?.discountValue;
      const discountType = r.couponId?.discountType;

      let discountLabel = 'N/A';
      if (discountValue != null) {
        discountLabel = discountType === 'percentage'
          ? `${discountValue}% OFF`
          : `$${discountValue} OFF`;
      }

      return {
        id: r._id,
        offerId: r.couponId?._id,
        studentId: r.studentId,
        vendorId: r.vendorId?._id,
        offerTitle: r.couponId?.title || 'Deleted Offer',
        offerDescription: r.couponId?.description,
        vendorName: r.vendorId?.businessName || 'Unknown Vendor',
        discount: discountLabel,
        category: r.couponId?.category,
        status,
        claimedAt: r.claimedAt,
        redeemedAt: r.redeemedAt,
        redemptionCode: r.redemptionCode,
        expiryDate: r.couponId?.expiryDate,
        bannerImage: r.couponId?.bannerImage
      };
    });

    res.json({
      redemptions: formattedRedemptions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil((search ? filtered.length : totalRedemptions) / limit),
        totalRedemptions: search ? filtered.length : totalRedemptions,
        hasNext: parseInt(page) * limit < (search ? filtered.length : totalRedemptions),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('getClaimHistory error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Redeem a Claimed Offer
 * 
 * Generates a unique redemption code and marks the claim as "Redeemed".
 * Only claimed (not yet redeemed) offers can be redeemed.
 * The offer must not be expired.
 * 
 * Redemption Code Format: STUVRS-{VENDOR_ID}-{RANDOM_6_CHAR}-{TIMESTAMP}
 * Example: STUVRS-507F191E-ABC123-1700000000
 */
exports.redeemOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const studentId = req.user._id;

    // Find the claim
    const claim = await Redemption.findOne({
      studentId,
      couponId: offerId
    }).populate('couponId');

    if (!claim) {
      return res.status(404).json({ message: 'No claim found for this offer' });
    }

    // Check if already redeemed
    if (claim.status === 'Redeemed') {
      return res.status(400).json({ message: 'You already used this coupon', code: claim.redemptionCode });
    }

    // Check if offer has expired
    if (claim.couponId?.expiryDate && new Date(claim.couponId.expiryDate) < new Date()) {
      // Update status to Expired
      claim.status = 'Expired';
      await claim.save();
      return res.status(400).json({ message: 'Offer has expired' });
    }

    // Generate unique redemption code
    // Format: STUVRS-{VENDOR_ID_FIRST_6_CHARS}-{RANDOM_6_CHARS}-{TIMESTAMP}
    const vendorId = claim.vendorId.toString().substring(0, 6).toUpperCase();
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Math.floor(Date.now() / 1000);
    const redemptionCode = `STUVRS-${vendorId}-${randomChars}-${timestamp}`;

    // If we have the student's current location, store it with the redemption
    const studentLocationCoords = req.user?.currentLocation?.coordinates;
    if (Array.isArray(studentLocationCoords) && studentLocationCoords.length === 2) {
      claim.studentLocation = {
        type: 'Point',
        coordinates: studentLocationCoords
      };
    }

    // Update claim with redemption details
    claim.status = 'Redeemed';
    claim.redeemedAt = new Date();
    claim.redemptionCode = redemptionCode;
    await claim.save();

    // Emit socket events for vendors, admins and students
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const locationPayload = studentLocationCoords
        ? { studentLocation: { latitude: studentLocationCoords[1], longitude: studentLocationCoords[0] } }
        : {};

      io.to('admin_room').emit('offer_redeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `Offer redeemed with code: ${redemptionCode}`,
        ...locationPayload
      });
      // Alias the event so admin listeners can use expected name
      io.to('admin_room').emit('couponRedeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `Offer redeemed with code: ${redemptionCode}`,
        ...locationPayload
      });
      // Also emit underscored event name for backwards compatibility
      io.to('admin_room').emit('coupon_redeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `Offer redeemed with code: ${redemptionCode}`,
        ...locationPayload
      });

      io.to(`vendor_${claim.vendorId}`).emit('studentRedeemedNearby', {
        studentId,
        offerId,
        redemptionCode,
        message: `A student just redeemed your offer!`,
        ...locationPayload
      });
      io.to(`vendor_${claim.vendorId}`).emit('couponRedeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `A student just redeemed your offer!`,
        ...locationPayload
      });
      io.to(`vendor_${claim.vendorId}`).emit('coupon_redeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `A student just redeemed your offer!`,
        ...locationPayload
      });
      io.to(`vendor_${claim.vendorId}`).emit('newRedemption', {
        studentId,
        offerId,
        redemptionCode,
        message: `A student just redeemed your offer!`,
        ...locationPayload
      });
      // also emit a generic notification event
      io.to(`vendor_${claim.vendorId}`).emit('vendorNotification', {
        type: 'success',
        message: `Your coupon was just redeemed! Total redemptions increased.`,
        offerId,
        studentId
      });
      // emit stats update so dashboards can refresh if they prefer
      io.to(`vendor_${claim.vendorId}`).emit('stats_update', {
        vendorId: claim.vendorId,
        event: 'redemption',
        offerId
      });
      // notify all connected students (could be filtered client-side)
      io.to('student_room').emit('couponRedeemed', {
        studentId,
        offerId,
        redemptionCode,
        status: claim.status
      });
      io.to('student_room').emit('coupon_redeemed', {
        studentId,
        offerId,
        redemptionCode,
        status: claim.status
      });
      // send a student-specific notification for redemption
      io.to(`student_${studentId}`).emit('studentNotification', {
        title: 'Coupon redeemed successfully',
        message: `You redeemed an offer and received code: ${redemptionCode}`,
        offerId,
        redemptionCode
      });
    }

    res.json({
      message: 'Offer redeemed successfully',
      redemptionCode,
      redeemedAt: claim.redeemedAt,
      status: claim.status
    });
  } catch (err) {
    console.error('redeemOffer error', err);
    if (err.code === 11000) { // Duplicate key on redemptionCode
      return res.status(400).json({ message: 'Redemption code collision, please try again' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Redeem a coupon (create a redemption record if it doesn't exist, or redeem an existing claim). 
 * This endpoint allows a student to redeem a coupon in one action.
 * Ensures the student cannot redeem the same coupon twice.
 */
exports.redeemCoupon = async (req, res) => {
  try {
    const { offerId } = req.params;
    const studentId = req.user._id;

    if (!offerId) {
      return res.status(400).json({ message: 'Offer ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({ message: 'Invalid Offer ID format' });
    }

    // Ensure the offer exists, is approved, not expired, and vendor is not blocked
    const offer = await Coupon.findOne({
      _id: offerId,
      status: 'approved',
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: new Date() } }
      ]
    });

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found, not approved, or expired' });
    }

    const vendor = await User.findById(offer.vendorId);
    if (vendor && vendor.isBlocked) {
      return res.status(403).json({ message: 'Cannot redeem offers from blocked vendor' });
    }

    // Find existing redemption record (claim or redeemed)
    let redemption = await Redemption.findOne({ studentId, couponId: offerId });

    // If already redeemed, prevent duplicate redemption
    if (redemption && redemption.status === 'Redeemed') {
      return res.status(400).json({ message: 'You already used this coupon' });
    }

    // If the claim has already expired, prevent redemption
    if (redemption && redemption.status === 'Expired') {
      return res.status(400).json({ message: 'Offer has expired' });
    }

    // If have a claim but not yet redeemed, we'll redeem it
    if (redemption) {
      // If coupon expired while claimed
      if (offer.expiryDate && new Date(offer.expiryDate) < new Date()) {
        redemption.status = 'Expired';
        await redemption.save();
        return res.status(400).json({ message: 'Offer has expired' });
      }

      // Continue to redeem existing claim
    } else {
      // Create a new redemption record (student may redeem without prior claim)
      redemption = new Redemption({
        studentId,
        studentName: req.user.name,
        studentEmail: req.user.email,
        couponId: offer._id,
        vendorId: offer.vendorId,
        offerTitle: offer.title,
        couponCode: offer.couponCode || null,
        discount: offer.discountType === 'percentage' ? `${offer.discountValue}%` : `$${offer.discountValue}`,
        status: 'Claimed',
        claimedAt: new Date()
      });

      // Increment claim count on coupon
      offer.claimCount = (offer.claimCount || 0) + 1;
      await offer.save();
    }

    // Generate unique redemption code
    const vendorIdShort = offer.vendorId.toString().substring(0, 6).toUpperCase();
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Math.floor(Date.now() / 1000);
    const redemptionCode = `STUVRS-${vendorIdShort}-${randomChars}-${timestamp}`;

    // Save student's location if available
    const studentLocationCoords = req.user?.currentLocation?.coordinates;
    if (Array.isArray(studentLocationCoords) && studentLocationCoords.length === 2) {
      redemption.studentLocation = {
        type: 'Point',
        coordinates: studentLocationCoords
      };
    }

    redemption.status = 'Redeemed';
    redemption.redeemedAt = new Date();
    redemption.redemptionCode = redemptionCode;
    await redemption.save();

    // Emit socket events (reuse same logic as redeemOffer)
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const locationPayload = studentLocationCoords
        ? { studentLocation: { latitude: studentLocationCoords[1], longitude: studentLocationCoords[0] } }
        : {};

      io.to('admin_room').emit('offer_redeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `Offer redeemed with code: ${redemptionCode}`,
        ...locationPayload
      });
      io.to('admin_room').emit('couponRedeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `Offer redeemed with code: ${redemptionCode}`,
        ...locationPayload
      });
      io.to('admin_room').emit('coupon_redeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `Offer redeemed with code: ${redemptionCode}`,
        ...locationPayload
      });

      io.to(`vendor_${offer.vendorId}`).emit('studentRedeemedNearby', {
        studentId,
        offerId,
        redemptionCode,
        message: `A student just redeemed your offer!`,
        ...locationPayload
      });
      io.to(`vendor_${offer.vendorId}`).emit('couponRedeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `A student just redeemed your offer!`,
        ...locationPayload
      });
      io.to(`vendor_${offer.vendorId}`).emit('coupon_redeemed', {
        studentId,
        offerId,
        redemptionCode,
        message: `A student just redeemed your offer!`,
        ...locationPayload
      });
      io.to(`vendor_${offer.vendorId}`).emit('newRedemption', {
        studentId,
        offerId,
        redemptionCode,
        message: `A student just redeemed your offer!`,
        ...locationPayload
      });
      io.to(`vendor_${offer.vendorId}`).emit('vendorNotification', {
        type: 'success',
        message: `Your coupon was just redeemed! Total redemptions increased.`,
        offerId,
        studentId
      });
      io.to(`vendor_${offer.vendorId}`).emit('stats_update', {
        vendorId: offer.vendorId,
        event: 'redemption',
        offerId
      });
      io.to('student_room').emit('couponRedeemed', {
        studentId,
        offerId,
        redemptionCode,
        status: redemption.status
      });
      io.to('student_room').emit('coupon_redeemed', {
        studentId,
        offerId,
        redemptionCode,
        status: redemption.status
      });
      io.to(`student_${studentId}`).emit('studentNotification', {
        title: 'Coupon redeemed successfully',
        message: `You redeemed an offer and received code: ${redemptionCode}`,
        offerId,
        redemptionCode
      });
    }

    res.json({
      message: 'Coupon redeemed successfully',
      redemptionCode,
      redeemedAt: redemption.redeemedAt,
      status: redemption.status
    });
  } catch (err) {
    console.error('redeemCoupon error', err);
    if (err.code === 11000) { // Duplicate key on redemptionCode or unique index on studentId+couponId
      return res.status(400).json({ message: 'You already used this coupon' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Check if user is blocked
    if (req.user.isBlocked) {
      return res.status(403).json({ message: 'Account is blocked. Cannot update profile.' });
    }

    const allowedUpdates = ['name', 'phone', 'collegeName', 'profileImage'];
    const updates = {};

    // Only allow specified fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'collegeName') {
          updates.collegeName = req.body[field];
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // If profileImage is being updated, handle Cloudinary upload if needed
    // Assuming profileImage is an object with url and public_id
    if (req.body.profileImage) {
      updates.profileImage = req.body.profileImage;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Change student password
 * Verifies old password, hashes new password, updates securely
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old password and new password are required' });
    }

    // Check if user is blocked
    if (req.user.isBlocked) {
      return res.status(403).json({ message: 'Account is blocked. Cannot change password.' });
    }

    // Fetch user with password
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify old password
    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(req.user._id, { password: hashedPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// upload an ID image for verification
exports.uploadId = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // upload buffer to cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'student_ids', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    // update user record
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { idImage: { url: result.secure_url, public_id: result.public_id } },
      { new: true }
    ).select('-password');

    res.json({ message: 'ID uploaded', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to upload ID' });
  }
};

/** * Upload profile image
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Check if user is blocked
    if (req.user.isBlocked) {
      return res.status(403).json({ message: 'Account is blocked. Cannot upload profile image.' });
    }

    // upload buffer to cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'student_profiles', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // update user with profileImage
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        profileImage: {
          url: result.secure_url,
          public_id: result.public_id
        }
      },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profile image uploaded successfully', user });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
};

/** * SAVE AN OFFER
 * =============
 * Allows students to bookmark/save approved offers for later access.
 * Prevents duplicate saves and ensures only approved offers can be saved.
 */
exports.saveOffer = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { offerId } = req.params;

    // Validate offer exists and is approved
    const offer = await Coupon.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved offers can be saved' });
    }

    // Check if vendor is blocked
    const vendor = await User.findById(offer.vendorId);
    if (vendor.isBlocked) {
      return res.status(400).json({ message: 'Cannot save offers from blocked vendors' });
    }

    // Check if already saved (prevent duplicates)
    const existingSave = await SavedOffer.findOne({ studentId, offerId });
    if (existingSave) {
      return res.status(400).json({ message: 'Offer already saved' });
    }

    // Save the offer
    const savedOffer = new SavedOffer({ studentId, offerId });
    await savedOffer.save();

    // Emit notification to vendor
    if (req.app.get('io')) {
      req.app.get('io').to(`vendor_${offer.vendorId}`).emit('vendorNotification', {
        type: 'info',
        message: `A student saved your offer "${offer.title}"`,
        offerId: offer._id,
        studentId
      });
    }

    res.json({ message: 'Offer saved successfully' });
  } catch (err) {
    console.error('saveOffer error', err);
    if (err.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: 'Offer already saved' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET SAVED OFFERS
 * ================
 * Fetches all offers saved by the logged-in student.
 * Populates offer details and filters out expired or blocked vendor offers.
 */
exports.getSavedOffers = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Get saved offers with populated offer and vendor details
    const savedOffers = await SavedOffer.find({ studentId })
      .populate({
        path: 'offerId',
        populate: {
          path: 'vendorId',
          select: 'businessName name email phone businessAddress isBlocked'
        }
      })
      .sort({ savedAt: -1 })
      .lean();

    // Filter out offers that are no longer valid
    const validSavedOffers = savedOffers.filter(saved => {
      const offer = saved.offerId;
      if (!offer) return false; // Offer deleted

      // Check if offer is still approved
      if (offer.status !== 'approved') return false;

      // Check if vendor is blocked
      if (offer.vendorId?.isBlocked) return false;

      // Check if offer has expired
      if (offer.expiryDate && new Date(offer.expiryDate) < new Date()) return false;

      return true;
    });

    // Format response
    const formattedOffers = validSavedOffers.map(saved => {
      const vendor = saved.offerId.vendorId || {};
      return {
        id: saved.offerId._id,
        title: saved.offerId.title,
        description: saved.offerId.description,
        discountType: saved.offerId.discountType,
        discountValue: saved.offerId.discountValue,
        category: saved.offerId.category,
        vendorName: vendor.businessName || vendor.name || 'Unknown Vendor',
        vendorId: {
          vendorName: vendor.name,
          businessName: vendor.businessName,
          email: vendor.email,
          phoneNumber: vendor.phone,
          businessAddress: vendor.businessAddress
        },
        expiryDate: saved.offerId.expiryDate,
        bannerImage: saved.offerId.bannerImage,
        savedAt: saved.savedAt
      };
    });

    // If any saved offers are expiring soon, send a one-time notification for the student
    const now = new Date();
    const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const soonToExpire = validSavedOffers.filter(saved => {
      const expiry = saved.offerId.expiryDate ? new Date(saved.offerId.expiryDate) : null;
      return expiry && expiry > now && expiry <= soon;
    });

    if (soonToExpire.length && req.app.get('io')) {
      const notification = new Notification({
        title: 'Saved offer expiring soon',
        message: `You have ${soonToExpire.length} saved offer(s) expiring within 48 hours.`,
        recipientType: 'SpecificUser',
        userId: studentId,
        createdBy: studentId
      });
      await notification.save();

      req.app.get('io').to(`student_${studentId}`).emit('studentNotification', {
        title: notification.title,
        message: notification.message,
        notificationId: notification._id
      });
    }

    res.json(formattedOffers);
  } catch (err) {
    console.error('getSavedOffers error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * REMOVE SAVED OFFER
 * ==================
 * Removes an offer from the student's saved list.
 */
exports.removeSavedOffer = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { offerId } = req.params;

    // Find and delete the saved offer
    const deleted = await SavedOffer.findOneAndDelete({ studentId, offerId });

    if (!deleted) {
      return res.status(404).json({ message: 'Saved offer not found' });
    }

    res.json({ message: 'Offer removed from saved list' });
  } catch (err) {
    console.error('removeSavedOffer error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * STORE STUDENT LOCATION
 * ======================
 * Stores the student's current location (geolocation coordinates).
 * 
 * Request body:
 * {
 *   "latitude": 19.0760,
 *   "longitude": 72.8777
 * }
 * 
 * Updates the student's currentLocation with GeoJSON Point format for 
 * MongoDB geospatial queries.
 */
exports.storeLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ message: 'Latitude and longitude must be numbers' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Timestamp is computed once so we can return it even if the document doesn't contain it yet
    const timestamp = new Date();

    // Update student location with GeoJSON format
    const student = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'currentLocation.type': 'Point',
          'currentLocation.coordinates': [longitude, latitude], // GeoJSON format: [longitude, latitude]
          'currentLocation.timestamp': timestamp
        }
      },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      message: 'Location stored successfully',
      location: {
        latitude,
        longitude,
        timestamp
      }
    });
  } catch (err) {
    console.error('storeLocation error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET NEARBY VENDORS WITH OFFERS
 * ==============================
 * Finds vendors near the student's current location within a specified radius.
 * Returns nearby offers with distance information.
 * 
 * Query parameters:
 * - radius: Search radius in kilometers (default: 5)
 * - limit: Number of results (default: 10)
 * 
 * Returns:
 * [
 *   {
 *     "_id": vendorId,
 *     "vendorName": "Restaurant Name",
 *     "category": "Restaurant",
 *     "logo": { "url": "..." },
 *     "distance": 1.2,
 *     "offers": [
 *       {
 *         "_id": offerId,
 *         "title": "50% OFF",
 *         "description": "...",
 *         "discount": "50% OFF",
 *         "expiryDate": "2024-12-31",
 *         "claimCount": 45
 *       }
 *     ]
 *   }
 * ]
 */
exports.getNearbyVendors = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { radius = 5, limit = 10 } = req.query;

    // Fetch student's current location
    const student = await User.findById(studentId);
    if (!student || !student.currentLocation || !student.currentLocation.coordinates) {
      return res.status(400).json({ message: 'Student location not found. Please share your location first.' });
    }

    const studentCoords = student.currentLocation.coordinates;

    // Convert radius from km to meters for MongoDB query (5 km = 5000 m)
    const radiusInMeters = parseInt(radius) * 1000;

    // Query vendors within the radius using MongoDB geospatial query
    // Returns vendors sorted by distance
    const nearbyVendors = await User.find(
      {
        role: 'vendor',
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: studentCoords
            },
            $maxDistance: radiusInMeters
          }
        }
      },
      { location: { $meta: 'geoDistance' } }
    )
      .select('businessName category logo phone address')
      .limit(parseInt(limit))
      .lean();

    if (nearbyVendors.length === 0) {
      return res.json({
        message: 'No vendors found nearby',
        vendors: []
      });
    }

    // For each vendor, fetch their approved offers
    const vendorsWithOffers = await Promise.all(
      nearbyVendors.map(async (vendor) => {
        // Calculate distance in km
        const distance = vendor.location ? parseFloat((vendor.location[0] / 1000).toFixed(2)) : 0;

        // Get approved offers from this vendor (non-expired or no expiry date)
        const offers = await Coupon.find({
          vendorId: vendor._id,
          status: 'approved',
          $or: [
            { expiryDate: null },
            { expiryDate: { $gte: new Date() } }
          ]
        })
          .select('title description discountType discountValue expiryDate claimCount category')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        // Format offers
        const formattedOffers = offers.map(offer => ({
          _id: offer._id,
          title: offer.title,
          description: offer.description,
          discount: offer.discountType === 'percentage' 
            ? `${offer.discountValue}% OFF` 
            : `$${offer.discountValue} OFF`,
          expiryDate: offer.expiryDate,
          claimCount: offer.claimCount,
          category: offer.category
        }));

        return {
          _id: vendor._id,
          vendorName: vendor.businessName,
          category: vendor.category,
          logo: vendor.logo,
          phone: vendor.phone,
          address: vendor.address,
          distance,
          offers: formattedOffers
        };
      })
    );

    res.json({
      message: 'Nearby vendors retrieved successfully',
      studentLocation: {
        latitude: studentCoords[1],
        longitude: studentCoords[0]
      },
      searchRadius: radius,
      vendors: vendorsWithOffers
    });
  } catch (err) {
    console.error('getNearbyVendors error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET NEARBY OFFERS (Alternative Endpoint)
 * ========================================
 * Returns all nearby offers from vendors within the specified radius,
 * flattened into a single array without vendor grouping.
 * Useful for displaying all nearby deals at once.
 * 
 * Query parameters:
 * - latitude: Required latitude of the student
 * - longitude: Required longitude of the student
 * - radius: Search radius in kilometers (default: 5)
 * - limit: Maximum offers to return (default: 20)
 * - category: Optional filter by offer category
 * 
 * Returns:
 * [
 *   {
 *     "_id": offerId,
 *     "title": "50% OFF Pizza",
 *     "description": "...",
 *     "vendorName": "Pizza Place",
 *     "vendorId": "...",
 *     "distance": 1.2,
 *     "discount": "50% OFF",
 *     "expiryDate": "2024-12-31"
 *   }
 * ]
 */
exports.getNearbyOffers = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, limit = 20, category } = req.query;

    // Require lat/lng to perform a geospatial search
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusNum = parseFloat(radius) || 10;
    const limitNum = parseInt(limit, 10) || 20;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'Invalid latitude or longitude' });
    }

    // Find nearby vendors using a geospatial query
    const nearbyVendors = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          distanceField: 'distance',
          maxDistance: radiusNum * 1000,
          spherical: true,
          key: 'location',
          query: {
            role: 'vendor',
            isBlocked: false
          }
        }
      },
      {
        $project: {
          _id: 1,
          businessName: 1,
          location: 1,
          distance: 1
        }
      }
    ]);

    if (nearbyVendors.length === 0) {
      return res.json({
        message: 'No vendors found nearby',
        offers: []
      });
    }

    const vendorIds = nearbyVendors.map(v => v._id);

    // Build query for offers
    const offerQuery = {
      vendorId: { $in: vendorIds },
      status: 'approved',
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: new Date() } }
      ]
    };

    if (category) {
      offerQuery.category = category;
    }

    // Fetch offers and populate vendor data
    const offers = await Coupon.find(offerQuery)
      .populate('vendorId', 'businessName location')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    // Determine which nearby offers are claimed by current student
    const claimedCouponIds = new Set(
      (await Claim.find({
        studentId: req.user._id,
        couponId: { $in: offers.map(o => o._id) }
      }).distinct('couponId')).map(id => id.toString())
    );

    // Calculate distance for each offer using provided location
    const offersWithDistance = offers.map(offer => {
      const vendorCoords = offer.vendorId.location?.coordinates || [0, 0];
      
      // Simple distance calculation (Haversine formula for accuracy)
      const distance = calculateDistance(
        lat,
        lng,
        vendorCoords[1],
        vendorCoords[0]
      );

      return {
        _id: offer._id,
        title: offer.title,
        description: offer.description,
        vendorName: offer.vendorId.businessName,
        vendorId: offer.vendorId._id,
        vendorLocation: {
          latitude: vendorCoords[1],
          longitude: vendorCoords[0]
        },
        category: offer.category,
        discount: offer.discountType === 'percentage' 
          ? `${offer.discountValue}% OFF` 
          : `$${offer.discountValue} OFF`,
        expiryDate: offer.expiryDate,
        distance,
        claimCount: offer.claimCount,
        isClaimed: claimedCouponIds.has(offer._id.toString())
      };
    });

    // Sort by distance
    offersWithDistance.sort((a, b) => a.distance - b.distance);

    res.json({
      message: 'Nearby offers retrieved successfully',
      studentLocation: {
        latitude: lat,
        longitude: lng
      },
      searchRadius: radiusNum,
      offersCount: offersWithDistance.length,
      offers: offersWithDistance
    });
  } catch (err) {
    console.error('getNearbyOffers error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * HAVERSINE FORMULA - Calculate distance between two GPS coordinates
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}
