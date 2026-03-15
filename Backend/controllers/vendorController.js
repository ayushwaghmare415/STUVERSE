// Vendor Profile Controller - MERN Stack Stuverse Application

const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Redemption = require('../models/Redemption');

/**
 * GET VENDOR PROFILE
 * ==================
 * Route: GET /api/vendors/profile
 * Auth: Required (JWT)
 * Role: vendor
 * 
 * Get logged-in vendor's complete profile including business details
 * and profile completion percentage
 */
exports.getProfile = async (req, res) => {
  try {
    const vendor = await User.findById(req.user._id).select('-password');
    
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }
    
    // Calculate profile completion percentage
    let completionPercentage = 0;
    if (vendor.profileCompletion) {
      const fields = Object.values(vendor.profileCompletion);
      const completedFields = fields.filter(f => f === true).length;
      completionPercentage = Math.round((completedFields / fields.length) * 100);
    }
    
    res.json({
      success: true,
      vendor: {
        _id: vendor._id,
        vendorName: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        category: vendor.businessCategory,
        address: vendor.businessAddress,
        phone: vendor.phone,
        phoneNumber: vendor.phone,
        businessCategory: vendor.businessCategory,
        businessAddress: vendor.businessAddress,
        website: vendor.website,
        description: vendor.description,
        profileImage: vendor.profileImage || vendor.logo,
        accountStatus: vendor.status,
        createdAt: vendor.createdAt,
        profileCompletion: vendor.profileCompletion,
        completionPercentage,
        // Keep raw fields for backward compatibility
        name: vendor.name,
        phone: vendor.phone,
        logo: vendor.logo,
        status: vendor.status,
        ...vendor.toObject(),
      }
    });
  } catch (err) {
    console.error('Error fetching vendor profile:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching profile' 
    });
  }
};

/**
 * UPDATE VENDOR PROFILE
 * =====================
 * Route: PUT /api/vendors/profile
 * Auth: Required (JWT)
 * Role: vendor
 * 
 * Update vendor's business profile information
 * Only vendors can update their own profile
 * 
 * Request Body:
 * {
 *   "businessName": "Pizza Hub",
 *   "ownerName": "Rohit Sharma",
 *   "businessEmail": "vendor@email.com",
 *   "phone": "9876543210",
 *   "category": "Restaurant",
 *   "address": "Mumbai, India",
 *   "website": "https://pizzahub.com",
 *   "description": "Best pizza deals for students"
 * }
 */
exports.updateProfile = async (req, res) => {
  try {
    const {
      vendorName,
      businessName,
      businessEmail,
      email,
      ownerName,
      phoneNumber,
      phone,
      category,
      businessCategory,
      address,
      businessAddress,
      website,
      description
    } = req.body;

    // Build updates object
    const updates = {};
    const profileCompletion = {};

    if (vendorName !== undefined || ownerName !== undefined) {
      const nameValue = vendorName ?? ownerName;
      updates.name = nameValue;
      profileCompletion.vendorName = String(nameValue).trim().length > 0;
    }

    if (businessName !== undefined) {
      updates.businessName = businessName;
      profileCompletion.businessName = businessName.trim().length > 0;
    }

    // Allow clients to send either businessEmail or email
    const emailValue = businessEmail ?? email;
    if (emailValue !== undefined) {
      updates.email = emailValue;
      profileCompletion.businessEmail = String(emailValue).trim().length > 0;
    }

    // Allow clients to send either phoneNumber or phone
    const phoneValue = phoneNumber ?? phone;
    if (phoneValue !== undefined) {
      updates.phone = phoneValue;
      profileCompletion.phoneNumber = String(phoneValue).trim().length > 0;
    }

    // Allow for multiple naming variations for category/address
    const categoryValue = businessCategory ?? category;
    if (categoryValue !== undefined) {
      updates.businessCategory = categoryValue;
      profileCompletion.businessCategory = String(categoryValue).trim().length > 0;
    }

    const addressValue = businessAddress ?? address;
    if (addressValue !== undefined) {
      updates.businessAddress = addressValue;
      profileCompletion.businessAddress = String(addressValue).trim().length > 0;
    }

    if (website !== undefined) {
      updates.website = website;
      profileCompletion.website = website.trim().length > 0;
    }

    if (description !== undefined) {
      updates.description = description;
      profileCompletion.description = description.trim().length > 0;
    }

    // Update profile completion tracking
    if (Object.keys(profileCompletion).length > 0) {
      const currentUser = await User.findById(req.user._id);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }
      updates.profileCompletion = {
        ...(currentUser.profileCompletion || {}),
        ...profileCompletion
      };
    }

    // Update vendor document
    const vendor = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Calculate completion percentage
    let completionPercentage = 0;
    if (vendor.profileCompletion) {
      const fields = Object.values(vendor.profileCompletion);
      const completedFields = fields.filter(f => f === true).length;
      completionPercentage = Math.round((completedFields / fields.length) * 100);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      vendor: {
        _id: vendor._id,
        vendorName: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        category: vendor.businessCategory,
        address: vendor.businessAddress,
        phone: vendor.phone,
        phoneNumber: vendor.phone,
        businessCategory: vendor.businessCategory,
        businessAddress: vendor.businessAddress,
        website: vendor.website,
        description: vendor.description,
        profileImage: vendor.profileImage || vendor.logo,
        accountStatus: vendor.status,
        createdAt: vendor.createdAt,
        profileCompletion: vendor.profileCompletion,
        completionPercentage,
        // Keep compatibility
        name: vendor.name,
        phone: vendor.phone,
        logo: vendor.logo,
        status: vendor.status,
        ...vendor.toObject()
      }
    });
  } catch (err) {
    console.error('Error updating vendor profile:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

/**
 * UPDATE VENDOR BUSINESS LOCATION
 * ================================
 * Route: PUT /api/vendor/location
 *
 * Request body:
 * {
 *   "latitude": 12.34,
 *   "longitude": 56.78,
 *   "address": "123 Main St, City"
 * }
 */
exports.updateLocation = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { latitude, longitude, address } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ success: false, message: 'Latitude and longitude must be numbers' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    const updates = {
      'location.type': 'Point',
      'location.coordinates': [longitude, latitude]
    };

    if (typeof address === 'string' && address.trim().length > 0) {
      updates.businessAddress = address;
    }

    const vendor = await User.findByIdAndUpdate(vendorId, { $set: updates }, { new: true });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        latitude,
        longitude,
        address: vendor.businessAddress
      }
    });
  } catch (err) {
    console.error('Error updating vendor location:', err);
    res.status(500).json({ success: false, message: 'Server error while updating location' });
  }
};

// allow vendor to upload business ID or verification document
exports.uploadId = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'vendor_ids', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

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

/**
 * UPLOAD BUSINESS LOGO
 * ====================
 * Route: POST /api/vendors/profile/logo
 * Auth: Required (JWT)
 * Role: vendor
 * 
 * Upload or update vendor's business logo
 * Stores image on Cloudinary and updates vendor document
 */
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file provided' 
      });
    }

    // Get existing vendor data
    const vendor = await User.findById(req.user._id);
    
    // Delete old logo from Cloudinary if it exists
    if (vendor.logo && vendor.logo.public_id) {
      try {
        await cloudinary.uploader.destroy(vendor.logo.public_id);
      } catch (err) {
        console.warn('Failed to delete old logo:', err);
      }
    }

    // Upload new logo
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'vendor_logos', 
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    // Update vendor with new logo (stored under both logo and profileImage for compatibility)
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        logo: {
          url: result.secure_url,
          public_id: result.public_id
        },
        profileImage: {
          url: result.secure_url,
          public_id: result.public_id
        },
        'profileCompletion.logo': true
      },
      { new: true }
    ).select('-password');

    res.json({ 
      success: true, 
      message: 'Logo uploaded successfully', 
      vendor: updated 
    });
  } catch (err) {
    console.error('Error uploading logo:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload logo' 
    });
  }
};



/**
 * CREATE VENDOR OFFER
 * ====================
 * 
 * This endpoint allows vendors to create new offers/coupons that require admin approval
 * before they become visible to students. This is a critical part of the approval workflow:
 * 
 * VENDOR CREATION FLOW:
 * 1. Vendor submits offer via POST /api/vendor/offers
 * 2. Offer is created with status: 'pending' (not visible to students)
 * 3. Admin receives notification via socket (real-time dashboard update)
 * 4. Admin reviews offer in /admin/approvals page
 * 5. If approved: status changes to 'approved' → visible in student browsing
 * 6. If rejected: status changes to 'rejected' → vendor notified, can resubmit
 * 
 * SECURITY & BUSINESS RULES:
 * - Only authenticated vendors can create offers (enforced by middleware)
 * - Vendors can only create offers for their own account (vendorId = req.user._id)
 * - Blocked vendors cannot access this endpoint (checked in authenticateUser)
 * - Expired offers cannot be created (expiryDate validation)
 * - New offers start with claimCount: 0 and status: 'pending'
 * 
 * CONNECTION TO STUDENT SYSTEM:
 * - Students can only see offers with status: 'approved' (enforced in student routes)
 * - Approved offers appear in /browse, /saved, /student/vendors, etc.
 * - Students claim approved offers, incrementing claimCount
 * 
 * @param {Object} req.body - Offer data from vendor form
 * @param {string} req.body.title - Required: Offer title
 * @param {string} req.body.description - Required: Offer description  
 * @param {string} req.body.category - Required: 'Food', 'Tech', 'Fashion', 'Education'
 * @param {number} req.body.discount - Required: Discount percentage (0-100)
 * @param {string} req.body.expiryDate - Optional: ISO date string
 * @param {string} req.body.couponCode - Optional: Redemption code
 * @param {string} req.body.terms - Optional: Terms and conditions
 */
exports.createOffer = async (req, res) => {
  try {
    const { title, description, category, expiryDate, couponCode, terms } = req.body;
    const discount = Number(req.body.discount);

    // Validate required fields as specified in requirements
    if (!title || !description || !category || Number.isNaN(discount)) {
      return res.status(400).json({ message: 'Missing required fields: title, description, category, discount' });
    }

    // Validate discount is a valid percentage
    if (discount < 0 || discount > 100) {
      return res.status(400).json({ message: 'Discount must be a number between 0 and 100' });
    }

    // Validate expiryDate is not in the past (business rule: no expired offers)
    if (expiryDate && new Date(expiryDate) <= new Date()) {
      return res.status(400).json({ message: 'Expiry date must be in the future' });
    }

    // Upload banner image if provided
    let bannerImageUrl = null;
    if (req.file && req.file.buffer) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'offer_banners',
            resource_type: 'image',
            quality: 'auto',
            fetch_format: 'auto'
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
      bannerImageUrl = result.secure_url;
    }

    // Create offer with status: pending by default (admin workflow), draft only when explicitly requested
    const maxClaimsParsed = req.body.maxClaims !== undefined ? Number(req.body.maxClaims) : 100;
    const maxClaims = Number.isNaN(maxClaimsParsed) || maxClaimsParsed <= 0 ? 100 : maxClaimsParsed;

    const requestedStatus = (req.body.status || '').toString().toLowerCase();
    const allowDraft = requestedStatus === 'draft';
    const isPending = req.body.submit || req.body.submitForApproval || requestedStatus === 'pending' || !requestedStatus;
    const status = isPending ? 'pending' : (allowDraft ? 'draft' : 'pending');

    const coupon = new Coupon({
      title,
      description,
      category,
      discountType: 'percentage', // Fixed as percentage for simplicity
      discountValue: discount,
      vendorId: req.user._id, // Vendor can only create offers for themselves
      status, // 'draft' or 'pending'
      expiryDate,
      bannerImage: bannerImageUrl,
      couponCode,
      terms,
      termsAndConditions: req.body.termsAndConditions || terms || '',
      storeAddress: req.body.storeAddress || '',
      location: req.body.location || undefined,
      maxClaims,
      claimCount: 0,
      claimedCount: 0
    });
    
    await coupon.save();
    
    // Real-time notification to admin dashboard via WebSocket
    // This allows admins to see new submissions immediately without page refresh
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to('admin_room').emit('newOfferCreated', {
        offer: coupon,
        vendorId: req.user._id,
        message: `New offer "${title}" submitted by ${req.user.businessName || req.user.name}`
      });
      // Legacy event names for backwards compatibility
      io.to('admin_room').emit('new_coupon_submitted', { 
        coupon, 
        vendorId: req.user._id,
        message: `New offer "${title}" submitted by ${req.user.businessName || req.user.name}`
      });
      io.to('admin_room').emit('newOfferSubmitted', {
        coupon,
        vendorId: req.user._id,
        message: `New offer "${title}" submitted by ${req.user.businessName || req.user.name}`
      });

      // Provide a generic stats update for listeners
      io.to('admin_room').emit('stats_update', {
        event: 'newOffer',
        offerId: coupon._id,
        vendorId: req.user._id
      });
    }
    
    res.status(201).json({
      message: status === 'pending' ? 'Offer submitted successfully. Pending admin approval.' : 'Draft saved successfully.',
      offer: coupon
    });
  } catch (err) {
    console.error('createOffer error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * SUBMIT DRAFT OFFER FOR ADMIN APPROVAL
 * PUT /api/vendor/coupons/:id/submit
 */
exports.submitOffer = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (!coupon.vendorId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to submit this offer' });
    }

    if (coupon.status === 'approved') {
      return res.status(400).json({ message: 'Offer is already approved' });
    }

    if (coupon.status === 'pending') {
      return res.status(400).json({ message: 'Offer is already pending approval' });
    }

    coupon.status = 'pending';
    coupon.rejectionReason = null;
    await coupon.save();

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to('admin_room').emit('newOfferSubmitted', {
        offer: coupon,
        vendorId: req.user._id,
        message: `Offer submitted for approval: ${coupon.title}`
      });
    }

    return res.json({ message: 'Coupon submitted for approval', offer: coupon });
  } catch (err) {
    console.error('submitOffer error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// update an offer owned by the vendor. Vendors cannot change status.
/**
 * UPDATE VENDOR OFFER
 * ====================
 * 
 * This endpoint allows vendors to edit their offers, but only if they are still editable.
 * Once an offer is approved by admin, vendors cannot modify it to prevent gaming the system.
 * 
 * EDITABLE STATUSES:
 * - 'pending': Vendor can still make changes before admin review
 * - 'rejected': Vendor can resubmit after fixing issues
 * 
 * NON-EDITABLE STATUSES:
 * - 'approved': Offer is live for students, cannot be changed
 * 
 * SECURITY & BUSINESS RULES:
 * - Only vendor who owns the offer can edit it
 * - Status field cannot be modified by vendor (only admin can approve/reject)
 * - All other fields can be updated (title, description, discount, etc.)
 * - Validation ensures discount is valid percentage, expiry date is future, etc.
 * 
 * @param {Object} req.body - Updated offer data
 * @param {string} req.params.id - Offer ID to update
 */
exports.updateOffer = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Offer not found' });
    if (!coupon.vendorId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to edit this offer' });
    }

    // Business rule: Only allow editing if status is 'pending' or 'rejected'
    if (coupon.status === 'approved') {
      return res.status(400).json({ message: 'Cannot edit approved offers. Contact admin if changes are needed.' });
    }

    // Validate updated data
    const { title, description, category, discount, expiryDate, couponCode, terms } = req.body;

    if (title && !title.trim()) return res.status(400).json({ message: 'Title cannot be empty' });
    if (description && !description.trim()) return res.status(400).json({ message: 'Description cannot be empty' });
    if (category && !['Food', 'Tech', 'Fashion', 'Education'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    if (discount !== undefined && (typeof discount !== 'number' || discount < 0 || discount > 100)) {
      return res.status(400).json({ message: 'Discount must be a number between 0 and 100' });
    }
    if (expiryDate && new Date(expiryDate) <= new Date()) {
      return res.status(400).json({ message: 'Expiry date must be in the future' });
    }

    // Apply updates (status cannot be changed by vendor)
    const updates = { ...req.body };
    delete updates.status; // Prevent vendor from changing status

    // ensure maxClaims stays positive
    if (updates.maxClaims !== undefined) {
      const parsedMaxClaims = Number(updates.maxClaims);
      if (Number.isNaN(parsedMaxClaims) || parsedMaxClaims <= 0) {
        return res.status(400).json({ message: 'maxClaims must be a positive number' });
      }
      updates.maxClaims = parsedMaxClaims;
    }

    if (updates.location !== undefined && updates.location.coordinates && Array.isArray(updates.location.coordinates)) {
      // keep as is
    }

    if (updates.termsAndConditions === undefined && updates.terms !== undefined) {
      updates.termsAndConditions = updates.terms;
    }

    Object.assign(coupon, updates);

    // Keep counts in sync
    coupon.claimedCount = coupon.claimCount;

    await coupon.save();

    res.json({
      message: 'Offer updated successfully',
      offer: coupon
    });
  } catch (err) {
    console.error('updateOffer error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// delete an offer owned by the vendor
/**
 * DELETE VENDOR OFFER
 * ====================
 * 
 * This endpoint allows vendors to delete their own offers, but with important safeguards.
 * Offers with active claims cannot be deleted to maintain data integrity and prevent
 * students from losing access to claimed offers.
 * 
 * DELETION RULES:
 * - Vendor can only delete their own offers
 * - Cannot delete offers that have been claimed by students (claimCount > 0)
 * - Can delete offers in any status (pending, approved, rejected)
 * - Deleted offers will not appear in student browsing
 * 
 * BUSINESS IMPACT:
 * - Deleting approved offers removes them from student view immediately
 * - Students with existing claims may still be able to redeem (depending on implementation)
 * - Analytics and history are preserved in redemption records
 * 
 * @param {string} req.params.id - Offer ID to delete
 */
exports.deleteOffer = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Offer not found' });
    if (!coupon.vendorId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this offer' });
    }

    // Business rule: Prevent deletion if offer has active claims
    if (coupon.claimCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete offer with active claims. Contact admin if removal is necessary.'
      });
    }

    await coupon.deleteOne(); // Use deleteOne instead of deprecated remove()
    
    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    console.error('deleteOffer error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// list all offers created by the current vendor
/**
 * GET VENDOR OFFERS
 * ==================
 * 
 * This endpoint returns all offers created by the authenticated vendor.
 * Supports pagination and sorting for better UX in vendor dashboard.
 * 
 * SORTING:
 * - Default: createdAt descending (newest first)
 * - Shows most recent offers at the top
 * 
 * PAGINATION:
 * - page: Page number (1-based)
 * - limit: Items per page (default 10)
 * - Returns total count for frontend pagination controls
 * 
 * RESPONSE INCLUDES:
 * - All offer fields needed for vendor management
 * - Status badges, claim counts, expiry dates
 * - Pagination metadata
 * 
 * @param {number} req.query.page - Page number (optional, default 1)
 * @param {number} req.query.limit - Items per page (optional, default 10)
 */
exports.listMyOffers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Coupon.countDocuments({ vendorId: req.user._id });

    // Fetch offers with pagination and sorting
    const offers = await Coupon.find({ vendorId: req.user._id })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .select('title description category discountType discountValue couponCode expiryDate status claimCount viewCount createdAt');

    const totalPages = Math.ceil(total / limit);

    res.json({
      offers,
      pagination: {
        currentPage: page,
        totalPages,
        totalOffers: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('listMyOffers error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// basic analytics for a single offer: total views and total claims
exports.getOfferAnalytics = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Offer not found' });
    if (!coupon.vendorId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const totalClaims = coupon.claimCount || 0;
    const totalViews = coupon.viewCount || 0;

    res.json({ totalViews, totalClaims });
  } catch (err) {
    console.error('getOfferAnalytics error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =========================================================
// Student Discovery: Get All Active Vendors
// =========================================================
/**
 * GET /api/vendors
 * 
 * PURPOSE: Allow students to browse all vendors on the platform
 * 
 * BUSINESS RULES:
 * - Only return vendors where role = "vendor" and isBlocked = false
 * - Include vendor information: name, businessName, category, logo, profileImage
 * - Count total approved (non-expired) offers for each vendor
 * - No authentication required for basic vendor listing
 * 
 * RESPONSE:
 * {
 *   vendors: [
 *     {
 *       _id: string,
 *       name: string (vendor name),
 *       businessName: string,
 *       category: string (if available),
 *       profileImage: { url, public_id } (logo),
 *       totalApprovedOffers: number
 *     }
 *   ]
 * }
 */
exports.getAllVendors = async (req, res) => {
  try {
    // Fetch all vendors that are NOT blocked
    const vendors = await User.find({ 
      role: 'vendor', 
      isBlocked: false 
    }).select('name businessName profileImage category');

    // For each vendor, count their approved, non-expired offers
    const vendorsWithOffers = await Promise.all(
      vendors.map(async (vendor) => {
        const totalApprovedOffers = await Coupon.countDocuments({
          vendorId: vendor._id,
          status: 'approved',
          $or: [
            { expiryDate: null },
            { expiryDate: { $gte: new Date() } }
          ]
        });

        return {
          _id: vendor._id,
          name: vendor.name,
          businessName: vendor.businessName || '',
          category: vendor.category || 'General',
          profileImage: vendor.profileImage || { url: null },
          totalApprovedOffers
        };
      })
    );

    res.json({ vendors: vendorsWithOffers });
  } catch (err) {
    console.error('getAllVendors error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =========================================================
// Student Discovery: Get Offers by Specific Vendor
// =========================================================
/**
 * GET /api/vendors/:vendorId/offers
 * 
 * PURPOSE: Allow students to view all approved offers from a specific vendor
 * 
 * BUSINESS RULES:
 * - Only return offers where:
 *   - vendorId matches the requested vendor
 *   - status = "approved"
 *   - expiryDate >= today (not expired)
 * - Return offer details: title, description, discount, category, claimCount
 * - Hide expired offers from students
 * - Validate that vendor exists and is not blocked
 * 
 * RESPONSE:
 * {
 *   vendor: {
 *     _id: string,
 *     name: string,
 *     businessName: string,
 *     profileImage: { url, public_id }
 *   },
 *   offers: [
 *     {
 *       _id: string,
 *       title: string,
 *       description: string,
 *       discountType: string (percent/fixed),
 *       discountValue: number,
 *       category: string,
 *       claimCount: number,
 *       expiryDate: date,
 *       bannerImage: string,
 *       createdAt: date
 *     }
 *   ]
 * }
 */
exports.getVendorOffers = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Validate vendor exists and is not blocked
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    if (vendor.isBlocked) {
      return res.status(403).json({ message: 'Vendor is blocked' });
    }

    // Fetch all approved offers from this vendor (also include those without an expiry date)
    const offers = await Coupon.find({
      vendorId: vendorId,
      status: 'approved',
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: new Date() } }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        businessName: vendor.businessName || '',
        profileImage: vendor.profileImage || { url: null }
      },
      offers
    });
  } catch (err) {
    console.error('getVendorOffers error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/vendor/stats
 *
 * Vendor Stats API - Provides key metrics for the vendor profile page.
 *
 * Returns:
 * - totalOffersCreated: Total number of offers created by the vendor
 * - totalRedemptions: Total number of redemptions for the vendor's offers
 * - activeOffers: Count of approved, non-expired offers
 */
exports.getStats = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const totalOffersCreated = await Coupon.countDocuments({ vendorId });
    const totalRedemptions = await Redemption.countDocuments({ vendorId });
    const activeOffers = await Coupon.countDocuments({
      vendorId,
      status: 'approved',
      $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }]
    });

    res.json({
      success: true,
      stats: {
        totalOffersCreated,
        totalRedemptions,
        activeOffers
      }
    });
  } catch (err) {
    console.error('getStats error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/vendor/dashboard
 * 
 * Vendor Dashboard API - Provides comprehensive analytics for vendor's offers and claims
 * 
 * Business Logic:
 * - Vendors can only view their own data (enforced by req.user._id)
 * - Connects vendor offers (coupons) with student claims (redemptions)
 * - Admin approval system: new offers start as "pending", admin approves to "approved"
 * - Blocked vendors cannot access this endpoint (handled by authMiddleware)
 * - Only approved offers can be claimed by students
 * 
 * Data Flow:
 * 1. Vendor creates offer → status: "pending"
 * 2. Admin reviews → status: "approved" or "rejected"
 * 3. Students claim approved offers → redemption records created
 * 4. Vendor views dashboard → sees offer stats and claim activity
 */
exports.getDashboard = async (req, res) => {
  try {
    const vendorId = req.user._id;

    // Get offer statistics
    const offerStats = await Coupon.aggregate([
      { $match: { vendorId } },
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          approvedOffers: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pendingOffers: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          rejectedOffers: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      }
    ]);

    const stats = offerStats[0] || {
      totalOffers: 0,
      approvedOffers: 0,
      pendingOffers: 0,
      rejectedOffers: 0
    };

    // Get total claims (sum of claimCount from all offers)
    const totalClaimsResult = await Coupon.aggregate([
      { $match: { vendorId } },
      { $group: { _id: null, totalClaims: { $sum: '$claimCount' } } }
    ]);

    stats.totalClaims = totalClaimsResult[0]?.totalClaims || 0;

    // Get recent claims (last 10 redemptions for this vendor's offers)
    const recentClaims = await Redemption.find({ vendorId })
      .populate('studentId', 'name email collegeName')
      .populate('couponId', 'title discountValue discountType')
      .sort({ claimedAt: -1 })
      .limit(10)
      .select('status claimedAt redeemedAt redemptionCode');

    res.json({
      ...stats,
      recentClaims
    });
  } catch (err) {
    console.error('getDashboard error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/vendors/analytics
 * 
 * Vendor Analytics Dashboard API - Provides detailed analytics for vendor's offers and performance
 * 
 * Returns comprehensive analytics data including:
 * - Summary cards data
 * - Charts data for visualizations
 * - Top performing offers table
 * 
 * Business Logic:
 * - Vendors can only view their own data (enforced by req.user._id)
 * - Includes active offers (approved and not expired)
 * - Tracks unique students who used coupons
 * - Provides daily redemption trends
 * - Shows offer performance metrics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const vendorId = req.user._id;

    // Summary Cards Data
    const offerStats = await Coupon.aggregate([
      { $match: { vendorId } },
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          totalActiveOffers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'approved'] },
                    { $or: [{ $eq: ['$expiryDate', null] }, { $gte: ['$expiryDate', new Date()] }] }
                  ]
                },
                1,
                0
              ]
            }
          },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          totalViews: { $sum: '$viewCount' },
          totalRedemptions: { $sum: '$claimCount' }
        }
      }
    ]);

    const stats = offerStats[0] || {
      totalOffers: 0,
      totalActiveOffers: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      totalViews: 0,
      totalRedemptions: 0
    };

    // Total unique students who used coupons (from redemptions)
    const uniqueStudentsResult = await Redemption.distinct('studentId', { vendorId });
    stats.totalStudentsUsedCoupons = uniqueStudentsResult.length;

    // Charts Data

    // 1. Bar Chart: Coupon Usage Per Offer
    const couponUsageData = await Coupon.find({ vendorId })
      .select('title claimCount')
      .sort({ claimCount: -1 })
      .limit(10); // Top 10 offers by redemptions

    const barChartData = couponUsageData.map(offer => ({
      name: offer.title.length > 20 ? offer.title.substring(0, 20) + '...' : offer.title,
      redemptions: offer.claimCount || 0
    }));

    // 2. Line Chart: Daily Redemptions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRedemptions = await Redemption.aggregate([
      {
        $match: {
          vendorId,
          claimedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$claimedAt' }
          },
          redemptions: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    const lineChartData = dailyRedemptions.map(day => ({
      date: new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' }),
      redemptions: day.redemptions
    }));

    // 3. Pie Chart: Offer Status Distribution
    const pieChartData = [
      { name: 'Approved', value: stats.approved, color: '#10B981' },
      { name: 'Pending', value: stats.pending, color: '#F59E0B' },
      { name: 'Rejected', value: stats.rejected, color: '#EF4444' }
    ];

    // Top Performing Offers Table
    const topOffers = await Coupon.find({ vendorId })
      .select('title discountValue viewCount claimCount status createdAt')
      .sort({ claimCount: -1, viewCount: -1 })
      .limit(10);

    const topPerformingOffers = topOffers.map(offer => ({
      title: offer.title,
      discount: offer.discountValue,
      totalViews: offer.viewCount || 0,
      totalRedemptions: offer.claimCount || 0,
      status: offer.status,
      createdDate: offer.createdAt.toLocaleDateString()
    }));

    res.json({
      summaryCards: {
        totalOffersCreated: stats.totalOffers,
        totalActiveOffers: stats.totalActiveOffers,
        totalStudentsUsedCoupons: stats.totalStudentsUsedCoupons,
        totalCouponRedemptions: stats.totalRedemptions,
        offerApprovalStatus: {
          approved: stats.approved,
          pending: stats.pending,
          rejected: stats.rejected
        }
      },
      charts: {
        couponUsagePerOffer: barChartData,
        dailyRedemptions: lineChartData,
        offerStatusDistribution: pieChartData
      },
      topPerformingOffers
    });
  } catch (err) {
    console.error('getAnalytics error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/vendor/analytics/location
 *
 * Returns student redemption locations for the vendor's offers.
 * Used for mapping where students are redeeming coupons from.
 * 
 * Query Parameters:
 * - limit: max number of location points (default: 200)
 * - since: ISO date to filter redemptions (optional)
 */
exports.getLocationAnalytics = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { limit = 200, since } = req.query;

    const match = {
      vendorId,
      status: 'Redeemed',
      studentLocation: { $ne: null }
    };

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate)) {
        match.redeemedAt = { $gte: sinceDate };
      }
    }

    const redemptions = await Redemption.find(match)
      .sort({ redeemedAt: -1 })
      .limit(Math.min(1000, parseInt(limit, 10) || 200))
      .select('studentId redeemedAt studentLocation')
      .populate('studentId', 'name email');

    const locations = redemptions
      .filter((r) => r.studentLocation && Array.isArray(r.studentLocation.coordinates))
      .map((r) => ({
        studentId: r.studentId?._id,
        studentName: r.studentId?.name,
        studentEmail: r.studentId?.email,
        redeemedAt: r.redeemedAt,
        latitude: r.studentLocation.coordinates[1],
        longitude: r.studentLocation.coordinates[0]
      }));

    res.json({
      success: true,
      totalPoints: locations.length,
      locations
    });
  } catch (err) {
    console.error('getLocationAnalytics error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/vendor/redemptions
 * 
 * Get all redemptions for the authenticated vendor's offers
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - search: Search by student name or email
 * - offerId: Filter by specific offer
 * - status: Filter by redemption status ('Claimed', 'Redeemed', 'Expired')
 * - startDate: Filter by redemption date start (ISO string)
 * - endDate: Filter by redemption date end (ISO string)
 * 
 * Returns:
 * - success: boolean
 * - totalRedemptions: total count
 * - data: array of redemption objects with populated student and offer info
 */
exports.getRedemptions = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const {
      page = 1,
      limit = 10,
      search,
      offerId,
      status,
      startDate,
      endDate
    } = req.query;

    // Build match conditions
    const matchConditions = { vendorId };

    // Filter by specific offer if provided
    if (offerId) {
      matchConditions.couponId = offerId;
    }

    // Filter by status if provided
    if (status) {
      matchConditions.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      matchConditions.redeemedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start)) matchConditions.redeemedAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end)) matchConditions.redeemedAt.$lte = end;
      }
      // If both are invalid, remove the filter entirely
      if (Object.keys(matchConditions.redeemedAt).length === 0) {
        delete matchConditions.redeemedAt;
      }
    }

    // Add search filter by student name/email (efficient for small datasets)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const matchingStudents = await User.find({
        $or: [
          { name: { $regex: searchRegex } },
          { email: { $regex: searchRegex } }
        ]
      }).select('_id');

      const studentIds = matchingStudents.map((s) => s._id);

      // If no students match, return early
      if (studentIds.length === 0) {
        return res.json({
          success: true,
          totalRedemptions: 0,
          data: []
        });
      }

      matchConditions.studentId = { $in: studentIds };
    }

    // Count total redemptions (after filters)
    const totalRedemptions = await Redemption.countDocuments(matchConditions);

    // Summary stats (for dashboard cards)
    const totalRedemptionsAllTime = await Redemption.countDocuments({ vendorId });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaysRedemptions = await Redemption.countDocuments({
      vendorId,
      redeemedAt: { $gte: todayStart, $lte: todayEnd }
    });

    const popularOfferAgg = await Redemption.aggregate([
      { $match: { vendorId } },
      { $group: { _id: '$couponId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    let mostPopularOffer = null;
    if (popularOfferAgg.length > 0) {
      const topOffer = popularOfferAgg[0];
      const offer = await Coupon.findById(topOffer._id).select('title');
      if (offer) {
        mostPopularOffer = {
          offerId: offer._id,
          title: offer.title,
          redemptions: topOffer.count
        };
      }
    }

    if (totalRedemptions === 0) {
      return res.json({
        success: true,
        summary: {
          totalRedemptions: totalRedemptionsAllTime,
          todaysRedemptions,
          mostPopularOffer
        },
        totalRedemptions: 0,
        data: []
      });
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNumber - 1) * pageSize;

    // Fetch redemptions with related student & offer info
    const redemptions = await Redemption.find(matchConditions)
      .sort({ redeemedAt: -1, claimedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('studentId', 'name email')
      .populate('couponId', 'title discountValue discountType couponCode');

    // Map to API response shape
    const data = redemptions.map((r) => ({
      studentName: r.studentId?.name || 'Unknown',
      email: r.studentId?.email || 'Unknown',
      offerTitle: r.couponId?.title || 'Unknown',
      discount: r.couponId
        ? `${r.couponId.discountValue || 0}${r.couponId.discountType === 'percentage' ? '%' : '$'}`
        : 'N/A',
      couponCode: r.redemptionCode || r.couponId?.couponCode || '',
      redeemedAt: r.redeemedAt || r.claimedAt,
      status: r.status
    }));

    res.json({
      success: true,
      summary: {
        totalRedemptions: totalRedemptionsAllTime,
        todaysRedemptions,
        mostPopularOffer
      },
      totalRedemptions,
      data
    });
  } catch (err) {
    console.error('getRedemptions error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
