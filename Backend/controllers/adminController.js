const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Redemption = require('../models/Redemption');

/**
 * STUVERSE ADMIN STUDENT MANAGEMENT
 * ===================================
 * 
 * This controller handles all admin operations on student accounts.
 * Admin can:
 * 1. View all students (with pagination)
 * 2. Search students by email or name
 * 3. View pending (unverified) students
 * 4. Verify a student account (set isVerified = true) -> Student can now login
 * 5. Block a student (set isBlocked = true) -> Student cannot login or claim offers
 * 6. Unblock a student (set isBlocked = false) -> Restore student access
 * 7. Delete a student account permanently
 * 
 * After student registers:
 * - isVerified = false (pending admin approval)
 * - Admin reviews student via GET /admin/students/pending
 * - Admin can verify (PATCH /admin/students/:id/verify) or delete
 * 
 * Student Verification vs Blocking:
 * - isVerified: Controls login permissions (false = cannot login)
 * - isBlocked: Controls all actions (true = cannot login OR claim offers)
 */

// ------------------------------------------------------------------
// Dashboard Stats
// ------------------------------------------------------------------

/**
 * GET /api/admin/dashboard
 * ========================
 * Get comprehensive dashboard statistics for admin panel.
 * Uses MongoDB aggregation for optimal performance.
 * 
 * Returns:
 * - totalStudents: Count of all students (excludes blocked students)
 * - totalVendors: Count of all vendors (excludes blocked vendors)
 * - totalOffers: Count of approved offers
 * - pendingOffers: Count of offers awaiting approval
 * - approvedOffers: Count of approved offers
 * - rejectedOffers: Count of rejected offers
 * - totalClaims: Count of redemptions
 * 
 * Security: Blocked users are excluded from active counts
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get active (non-blocked) student count
    const totalStudents = await User.countDocuments({ 
      role: 'student', 
      isBlocked: false 
    });

    // Get active (non-blocked) vendor count
    const totalVendors = await User.countDocuments({ 
      role: 'vendor', 
      isBlocked: false 
    });

    // Get offer stats for all vendors
    const offerStats = await Coupon.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          pending: [
            { $match: { status: 'pending' } },
            { $count: 'count' }
          ],
          approved: [
            { $match: { status: 'approved' } },
            { $count: 'count' }
          ],
          rejected: [
            { $match: { status: 'rejected' } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const totalOffers = offerStats[0].total[0]?.count || 0;
    const pendingOffers = offerStats[0].pending[0]?.count || 0;
    const approvedOffers = offerStats[0].approved[0]?.count || 0;
    const rejectedOffers = offerStats[0].rejected[0]?.count || 0;

    // Count total redemptions (claims)
    const totalClaims = await Redemption.countDocuments();

    res.json({
      totalStudents,
      totalVendors,
      totalOffers,
      pendingOffers,
      approvedOffers,
      rejectedOffers,
      totalClaims
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
};

/**
 * GET /api/admin/analytics/overview
 * ================================
 * Returns top-level counts used by the Admin Analytics page.
 * Business rules applied:
 * - Exclude blocked users from student/vendor counts
 * - Only count offers regardless of status for totalOffers, but active counts use approved status
 * - Do not return sensitive fields
 */
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student', isBlocked: false });
    const totalVendors = await User.countDocuments({ role: 'vendor', isBlocked: false });

    // Offer counts using aggregation for performance
    const offerStats = await Coupon.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
          approved: [{ $match: { status: 'approved' } }, { $count: 'count' }],
          rejected: [{ $match: { status: 'rejected' } }, { $count: 'count' }]
        }
      }
    ]);

    const totalOffers = offerStats[0].total[0]?.count || 0;
    const pendingOffers = offerStats[0].pending[0]?.count || 0;
    const approvedOffers = offerStats[0].approved[0]?.count || 0;
    const rejectedOffers = offerStats[0].rejected[0]?.count || 0;

    const totalClaims = await Redemption.countDocuments();

    return res.json({
      totalStudents,
      totalVendors,
      totalOffers,
      approvedOffers,
      pendingOffers,
      rejectedOffers,
      totalClaims
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ message: 'Failed to fetch analytics overview' });
  }
};

/**
 * GET /api/admin/analytics/monthly-users
 * ======================================
 * Returns user signups grouped by month for students (non-blocked).
 * Query params: start (ISO date), end (ISO date)
 */
exports.getMonthlyUsers = async (req, res) => {
  try {
    const { start, end } = req.query;
    const match = { role: 'student', isBlocked: false };

    if (start || end) {
      match.createdAt = {};
      if (start) match.createdAt.$gte = new Date(start);
      if (end) match.createdAt.$lte = new Date(end);
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
          label: { $concat: [ { $toString: '$_id.month' }, '-', { $toString: '$_id.year' } ] }
        }
      },
      { $sort: { year: 1, month: 1 } }
    ];

    const results = await User.aggregate(pipeline);
    res.json({ months: results });
  } catch (err) {
    console.error('Monthly users error:', err);
    res.status(500).json({ message: 'Failed to fetch monthly users' });
  }
};

/**
 * GET /api/admin/analytics/top-vendors
 * ====================================
 * Returns top vendors ranked by `sortBy` ("claims" | "offers").
 * Default sorts by claims (total claimCount across a vendor's approved offers).
 */
exports.getTopVendors = async (req, res) => {
  try {
    const { limit = 10, sortBy = 'claims' } = req.query;

    const pipeline = [
      { $match: { role: 'vendor', isBlocked: false } },
      {
        $lookup: {
          from: 'coupons',
          localField: '_id',
          foreignField: 'vendorId',
          as: 'offers'
        }
      },
      {
        $addFields: {
          approvedOffers: {
            $size: {
              $filter: { input: '$offers', as: 'o', cond: { $eq: ['$$o.status', 'approved'] } }
            }
          },
          totalClaims: {
            $reduce: {
              input: '$offers',
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.claimCount', 0] }] }
            }
          }
        }
      },
      { $project: { password: 0, offers: 0, __v: 0 } }
    ];

    // sort
    if (String(sortBy).toLowerCase() === 'offers') {
      pipeline.push({ $sort: { approvedOffers: -1 } });
    } else {
      pipeline.push({ $sort: { totalClaims: -1 } });
    }

    pipeline.push({ $limit: parseInt(limit, 10) });

    const vendors = await User.aggregate(pipeline);
    res.json({ vendors });
  } catch (err) {
    console.error('Top vendors error:', err);
    res.status(500).json({ message: 'Failed to fetch top vendors' });
  }
};

/**
 * GET /api/admin/analytics/top-offers
 * ===================================
 * Returns offers ranked by `claimCount` (only approved offers considered active).
 */
exports.getTopOffers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const pipeline = [
      { $match: { status: 'approved' } },
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          description: 1,
          claimCount: 1,
          category: 1,
          status: 1,
          vendor: { _id: '$vendor._id', name: '$vendor.name', businessName: '$vendor.businessName' },
          createdAt: 1
        }
      },
      { $sort: { claimCount: -1 } },
      { $limit: parseInt(limit, 10) }
    ];

    const offers = await Coupon.aggregate(pipeline);
    res.json({ offers });
  } catch (err) {
    console.error('Top offers error:', err);
    res.status(500).json({ message: 'Failed to fetch top offers' });
  }
};

/**
 * GET /api/admin/recent-users
 * ============================
 * Get recently registered users (students and vendors).
 * Returns the 10 most recent non-blocked users.
 * 
 * Returns array with:
 * - _id, name, email, role, createdAt
 */
exports.getRecentUsers = async (req, res) => {
  try {
    const recentUsers = await User.find({ isBlocked: false })
      .select('_id name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      users: recentUsers,
      count: recentUsers.length
    });
  } catch (err) {
    console.error('Recent users error:', err);
    res.status(500).json({ message: 'Failed to fetch recent users' });
  }
};

/**
 * GET /api/admin/recent-offers
 * =============================
 * Get recently created offers/coupons.
 * Returns the 10 most recent offers with vendor details.
 * 
 * Returns array with offer data including vendor name
 */
exports.getRecentOffers = async (req, res) => {
  try {
    const recentOffers = await Coupon.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          discountType: 1,
          discountValue: 1,
          status: 1,
          category: 1,
          claimCount: 1,
          createdAt: 1,
          'vendor.name': 1,
          'vendor._id': 1
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      offers: recentOffers,
      count: recentOffers.length
    });
  } catch (err) {
    console.error('Recent offers error:', err);
    res.status(500).json({ message: 'Failed to fetch recent offers' });
  }
};

/**
 * GET /api/admin/pending-offers
 * ==============================
 * Get all offers pending admin approval.
 * Supports pagination, search by title, and filtering by category.
 * Returns offers with status = 'pending' and vendor details.
 * 
 * Query Parameters:
 * - page (number, default 1): Pagination page number
 * - limit (number, default 10): Results per page
 * - search (string, optional): Search by offer title (case-insensitive)
 * - category (string, optional): Filter by category (Food, Tech, Fashion, Education)
 * 
 * Returns:
 * - offers: Array of pending offers with vendor details
 * - pagination: { total, page, limit, pages }
 * - totalPendingCount: Total number of pending approvals
 */
exports.getPendingOffers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: { status: 'pending' }
      }
    ];

    // Apply search filter (search by title)
    if (search && search.trim()) {
      pipeline.push({
        $match: {
          title: { $regex: search, $options: 'i' }
        }
      });
    }

    // Apply category filter
    if (category && category.trim()) {
      pipeline.push({
        $match: {
          category: category
        }
      });
    }

    // Lookup vendor details
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          discountType: 1,
          discountValue: 1,
          status: 1,
          category: 1,
          claimCount: 1,
          createdAt: 1,
          bannerImage: 1,
          expiryDate: 1,
          'vendor.name': 1,
          'vendor._id': 1,
          'vendor.businessName': 1,
          'vendor.email': 1,
          'vendor.isBlocked': 1
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    );

    // Get total count for pagination (before applying skip/limit)
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: 'total' });
    const countResult = await Coupon.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    // Apply pagination
    pipeline.push(
      { $skip: skip },
      { $limit: limitNum }
    );

    const pendingOffers = await Coupon.aggregate(pipeline);

    res.json({
      offers: pendingOffers,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum)
      },
      totalPendingCount: totalCount
    });
  } catch (err) {
    console.error('Pending offers error:', err);
    res.status(500).json({ message: 'Failed to fetch pending offers' });
  }
};

// ------------------------------------------------------------------
// STUDENT MANAGEMENT
// ------------------------------------------------------------------

/**
 * List all students (verified and unverified)
 * GET /admin/students
 */
exports.listStudents = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    const total = await User.countDocuments({ role: 'student' });
    
    res.json({
      students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('List students error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Search students by email, name, or college
 * GET /admin/students/search?email=...&name=...&college=...
 */
exports.searchStudents = async (req, res) => {
  try {
    const { email, name, college, page = 1, limit = 20 } = req.query;
    const query = { role: 'student' };
    
    if (email) {
      query.email = { $regex: email, $options: 'i' };
    }
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (college) {
      query.college = { $regex: college, $options: 'i' };
    }
    
    const skip = (page - 1) * limit;
    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    const total = await User.countDocuments(query);
    
    res.json({
      students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Search students error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * List PENDING (unverified) students waiting for admin approval
 * GET /admin/students/pending
 * This is the main endpoint admins use to review new student registrations
 */
exports.listPendingStudents = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const students = await User.find({ role: 'student', isVerified: false })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    const total = await User.countDocuments({ role: 'student', isVerified: false });
    
    res.json({
      message: `${total} students pending verification`,
      students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('List pending students error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * VERIFY a student account (set isVerified = true)
 * PATCH /admin/students/:id/verify
 * After calling this, student can login via /auth/login
 */
exports.verifyStudent = async (req, res) => {
  try {
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, status: 'Approved' },
      { new: true }
    ).select('-password');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    if (student.role !== 'student') {
      return res.status(400).json({ message: 'User is not a student' });
    }
    
    res.json({
      message: `Student ${student.name} verified successfully`,
      student
    });
  } catch (err) {
    console.error('Verify student error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * REJECT/CANCEL a pending student registration
 * DELETE /admin/students/:id
 * Use this to reject a pending student without verification
 */
exports.rejectStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    if (student.role !== 'student') {
      return res.status(400).json({ message: 'User is not a student' });
    }
    
    if (req.user._id.equals(req.params.id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      message: `Student registration rejected and account deleted`
    });
  } catch (err) {
    console.error('Reject student error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * BLOCK a student (set isBlocked = true)
 * PATCH /admin/students/:id/block
 * Blocked students cannot login or claim offers
 */
exports.blockStudent = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    ).select('-password');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    if (student.role !== 'student') {
      return res.status(400).json({ message: 'User is not a student' });
    }
    
    res.json({
      message: `Student ${student.name} has been blocked`,
      reason: reason || 'No reason provided',
      student
    });
  } catch (err) {
    console.error('Block student error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * UNBLOCK a student (set isBlocked = false)
 * PATCH /admin/students/:id/unblock
 * Restores student access to login and claim offers
 */
exports.unblockStudent = async (req, res) => {
  try {
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    ).select('-password');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    if (student.role !== 'student') {
      return res.status(400).json({ message: 'User is not a student' });
    }
    
    res.json({
      message: `Student ${student.name} has been unblocked`,
      student
    });
  } catch (err) {
    console.error('Unblock student error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a student account permanently
 * DELETE /admin/students/:id
 * Removes student and all associated redemptions
 */
exports.deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    if (student.role !== 'student') {
      return res.status(400).json({ message: 'User is not a student' });
    }
    
    if (req.user._id.equals(req.params.id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    await Redemption.deleteMany({ studentId: req.params.id });
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      message: `Student account and all associated data deleted`
    });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// VENDOR MANAGEMENT
// ------------------------------------------------------------------
/**
 * Vendor accounts require admin oversight similar to students but with
 * a few key differences:
 *
 * 1. Vendors register with a businessName and must be verified before
 *    they can create offers. Admin uses the pending list to approve.
 * 2. isVerified controls whether a vendor can login.
 * 3. isBlocked suspends a vendor completely:
 *      - cannot login (authMiddleware denies access)
 *      - cannot create new offers (checked in vendorController)
 *      - existing offers will be hidden from students (studentController filters)
 * 4. Admin may view all vendors with pagination, search, and filter by blocked
 *    status. Counts of total/approved/pending offers help the admin decide.
 *
 * The endpoints below implement listing, actions and audit for vendor data.
 */

/**
 * GET /api/admin/vendors
 * ======================
 * Returns a paginated list of vendors with offer counts and status.
 *
 * Query parameters:
 *   - page (number, default 1)
 *   - limit (number, default 20)
 *   - search (string)  // matches name or email
 *   - isBlocked (true|false)  // filter by blocked status
 *
 * Response shape mirrors the student endpoint, except each vendor object
 * includes `totalOffers`, `approvedOffers` and `pendingOffers`.
 * The password field is always omitted.
 */
exports.listVendors = async (req, res) => {
  try {
    let { page = 1, limit = 20, search, status, isBlocked } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // build base match stage
    const match = { role: 'vendor' };

    // Support search by name or email
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      match.$or = [{ name: regex }, { email: regex }];
    }

    // Support blocking filter (legacy)
    if (typeof isBlocked !== 'undefined') {
      if (isBlocked === 'true' || isBlocked === 'false') {
        match.isBlocked = isBlocked === 'true';
      }
    }

    // Build computed status based on existing fields:
    // - Blocked vendors appear as "Blocked"
    // - If explicit status exists (Pending/Approved/Rejected), use it
    // - Otherwise fall back to isVerified (true -> Approved, false -> Pending)
    const statusPipeline = {
      $addFields: {
        status: {
          $cond: [
            { $eq: ['$isBlocked', true] },
            'Blocked',
            {
              $cond: [
                { $ifNull: ['$status', false] },
                '$status',
                {
                  $cond: [{ $eq: ['$isVerified', true] }, 'Approved', 'Pending']
                }
              ]
            }
          ]
        }
      }
    };

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      statusPipeline,
      {
        $lookup: {
          from: 'coupons',
          localField: '_id',
          foreignField: 'vendorId',
          as: 'offers'
        }
      },
      {
        $addFields: {
          totalOffers: { $size: '$offers' },
          approvedOffers: {
            $size: {
              $filter: {
                input: '$offers',
                as: 'o',
                cond: { $eq: ['$$o.status', 'approved'] }
              }
            }
          },
          pendingOffers: {
            $size: {
              $filter: {
                input: '$offers',
                as: 'o',
                cond: { $eq: ['$$o.status', 'pending'] }
              }
            }
          }
        }
      }
    ];

    // Apply status filter if provided
    if (status) {
      const normalized = status.toString().toLowerCase();
      const allowed = ['pending', 'approved', 'rejected', 'blocked'];
      if (allowed.includes(normalized)) {
        pipeline.push({ $match: { status: new RegExp(`^${normalized}$`, 'i') } });
      }
    }

    pipeline.push({ $project: { password: 0, offers: 0 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const vendors = await User.aggregate(pipeline);

    // Total count needs to match filter criteria as well
    const countPipeline = [
      { $match: match },
      statusPipeline
    ];
    if (status) {
      const normalized = status.toString().toLowerCase();
      const allowed = ['pending', 'approved', 'rejected', 'blocked'];
      if (allowed.includes(normalized)) {
        countPipeline.push({ $match: { status: new RegExp(`^${normalized}$`, 'i') } });
      }
    }
    countPipeline.push({ $count: 'count' });

    const countResult = await User.aggregate(countPipeline);
    const total = countResult[0]?.count || 0;

    res.json({
      vendors,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('List vendors error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.listPendingVendors = async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor', isVerified: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ vendors, count: vendors.length });
  } catch (err) {
    console.error('List pending vendors error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.approveVendor = async (req, res) => {
  try {
    const vendor = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, status: 'Approved' },
      { new: true }
    ).select('-password');

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Notify vendor in real-time that their account was approved
    const io = req.app.get('io');
    if (io) {
      io.to(`vendor_${vendor._id}`).emit('vendorApproved', {
        message: 'Your vendor account has been approved.',
        vendorId: vendor._id
      });
    }

    res.json(vendor);
  } catch (err) {
    console.error('Approve vendor error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * REJECT a specific vendor
 * PUT /admin/vendors/:id/reject
 */
exports.rejectVendor = async (req, res) => {
  try {
    const vendor = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: false, status: 'Rejected' },
      { new: true }
    ).select('-password');

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Notify vendor in real-time that their account was rejected
    const io = req.app.get('io');
    if (io) {
      io.to(`vendor_${vendor._id}`).emit('vendorRejected', {
        message: 'Your vendor account has been rejected.',
        vendorId: vendor._id
      });
    }

    res.json(vendor);
  } catch (err) {
    console.error('Reject vendor error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * BLOCK a specific vendor
 * PATCH /admin/vendors/:id/block
 */
exports.blockVendor = async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    if (vendor.role !== 'vendor') {
      return res.status(400).json({ message: 'User is not a vendor' });
    }
    vendor.isBlocked = true;
    await vendor.save();
    res.json({ message: `Vendor ${vendor.name} has been blocked`, vendor: vendor.toObject({ versionKey: false, getters: true }) });
  } catch (err) {
    console.error('Block vendor error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * UNBLOCK a specific vendor
 * PATCH /admin/vendors/:id/unblock
 */
exports.unblockVendor = async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    if (vendor.role !== 'vendor') {
      return res.status(400).json({ message: 'User is not a vendor' });
    }
    vendor.isBlocked = false;
    await vendor.save();
    res.json({ message: `Vendor ${vendor.name} has been unblocked`, vendor: vendor.toObject({ versionKey: false, getters: true }) });
  } catch (err) {
    console.error('Unblock vendor error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE a vendor and associated offers
 * DELETE /admin/vendors/:id
 */
exports.deleteVendor = async (req, res) => {
  try {
    if (req.user._id.equals(req.params.id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const vendor = await User.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    if (vendor.role !== 'vendor') {
      return res.status(400).json({ message: 'User is not a vendor' });
    }

    // remove all coupons created by this vendor
    await Coupon.deleteMany({ vendorId: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Vendor and related offers deleted' });
  } catch (err) {
    console.error('Delete vendor error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET offers created by a specific vendor
 * GET /admin/vendors/:id/offers
 * optional query params page & limit
 */
exports.getVendorOffers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const vendor = await User.findById(req.params.id);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const query = { vendorId: req.params.id };
    const offers = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Coupon.countDocuments(query);

    res.json({ offers, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total/limit) } });
  } catch (err) {
    console.error('Get vendor offers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


/**
 * Block a user (vendor or student)
 * PATCH /admin/users/:id/block
 */
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);

  /**
   * Unblock a user (vendor or student)
   * PATCH /admin/users/:id/unblock
   */
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


/**
 * Delete a user (vendor or student)
 * DELETE /admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    // prevent self‑deletion accidentally
    if (req.user._id.equals(req.params.id)) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


// ------------------------------------------------------------------
// COUPON/OFFER MANAGEMENT
// ------------------------------------------------------------------

/**
 * List all coupons with optional status filter
 * GET /admin/coupons?status=pending
 */
exports.listCoupons = async (req, res) => {
  try {
    const { status } = req.query; // optional filter
    const query = {};
    if (status) query.status = status;
    const coupons = await Coupon.find(query);
    res.json(coupons);

  /**
   * Create coupon as admin
   * POST /admin/coupons
   * Admin-created coupons follow the same approval logic as vendor offers.
   * If status is 'approved', this coupon is broadcast to students immediately.
   * Otherwise it is pending and shown to admins for manual approval.
   */
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      discountType = 'percentage',
      discountValue,
      expiryDate,
      bannerImage,
      couponCode,
      terms,
      termsAndConditions,
      storeAddress,
      location,
      maxClaims
    } = req.body;

    if (!title || !description || !category || Number.isNaN(Number(discountValue))) {
      return res.status(400).json({ message: 'Missing required fields: title, description, category, discountValue' });
    }

    const numericDiscountValue = Number(discountValue);
    if (numericDiscountValue < 0 || numericDiscountValue > 100) {
      return res.status(400).json({ message: 'discountValue must be between 0 and 100' });
    }

    if (!['Food', 'Tech', 'Fashion', 'Education'].includes(category)) {
      return res.status(400).json({ message: 'category must be one of Food, Tech, Fashion, Education' });
    }

    if (expiryDate && new Date(expiryDate) <= new Date()) {
      return res.status(400).json({ message: 'Expiry date must be in the future' });
    }

    const status = 'pending';
    const coupon = new Coupon({
      title,
      description,
      category,
      discountType,
      discountValue: numericDiscountValue,
      vendorId: req.user._id,
      status,
      expiryDate,
      bannerImage,
      couponCode,
      terms,
      termsAndConditions: termsAndConditions || terms || '',
      storeAddress,
      location,
      maxClaims: Number.isNaN(Number(maxClaims)) || Number(maxClaims) <= 0 ? 100 : Number(maxClaims),
      claimCount: 0,
      claimedCount: 0
    });

    await coupon.save();

    if (req.app.get('io')) {
      const io = req.app.get('io');
      // Notify all admins that a new coupon has been created by admin
      io.to('admin_room').emit('newOfferCreated', {
        offer: coupon,
        adminId: req.user._id,
        message: `Admin created a new coupon: ${coupon.title}`
      });
      io.to('admin_room').emit('new_coupon_submitted', {
        coupon,
        adminId: req.user._id,
        message: `Admin created a new coupon: ${coupon.title}`
      });
      io.to('admin_room').emit('newOfferSubmitted', {
        coupon,
        adminId: req.user._id,
        message: `Admin created a new coupon: ${coupon.title}`
      });
    }

    res.status(201).json({ message: 'Coupon created and pending approval', coupon });
  } catch (err) {
    console.error('createCoupon (admin) error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Change coupon status (approve or reject)
 * PATCH /admin/coupons/:id/status
 * 
 * Body:
 * {
 *   status: "approved" | "rejected",
 *   rejectionReason: "optional reason when rejecting"
 * }
 * 
 * Rules:
 * - Cannot approve offers from blocked vendors
 * - Cannot double-approve or double-reject
 * - Sets approvedAt timestamp when approving
 * - Stores rejectionReason when rejecting
 */
exports.changeCouponStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected"' });
    }

    // Find the coupon
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Prevent double approval/rejection
    if (coupon.status !== 'pending') {
      return res.status(400).json({
        message: `Offer already ${coupon.status}. Cannot change status of non-pending offers.`
      });
    }

    // If approving, check if vendor is blocked
    if (status === 'approved') {
      const vendor = await User.findById(coupon.vendorId);
      if (!vendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }
      if (vendor.isBlocked) {
        return res.status(403).json({
          message: 'Cannot approve offers from blocked vendors. Unblock the vendor first.'
        });
      }
    }

    // Prepare update object
    const updateData = { status };

    // If approving, set approvedAt timestamp
    if (status === 'approved') {
      updateData.approvedAt = new Date();
    }

    // If rejecting, store rejection reason (optional)
    if (status === 'rejected') {
      updateData.rejectionReason = rejectionReason || 'No reason provided';
    }

    // Update coupon
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('vendorId', 'name businessName email');

    // Emit status update to connected clients
    if (req.app.get('io')) {
      const io = req.app.get('io');

      // Notify vendors and admins of status changes
      const vendorRoom = `vendor_${updatedCoupon.vendorId?._id || updatedCoupon.vendorId}`;
      io.to(vendorRoom).emit('offerStatusUpdate', {
        offerId: updatedCoupon._id,
        status: updatedCoupon.status,
        title: updatedCoupon.title
      });
      io.to('admin_room').emit('offerStatusUpdated', {
        offerId: updatedCoupon._id,
        status: updatedCoupon.status,
        title: updatedCoupon.title
      });

      // Only notify students when approved
      if (updatedCoupon.status === 'approved') {
        io.to('student_room').emit('newApprovedOffer', updatedCoupon);
        io.to('student_room').emit('coupon_approved', updatedCoupon);
        io.to('student_room').emit('newOffer', updatedCoupon);
        io.to('student_room').emit('studentNotification', {
          title: 'New offer available',
          message: `A new offer has been approved: ${updatedCoupon.title}`,
          offer: updatedCoupon
        });
      }
    }

    res.json({
      message: `Offer has been ${status}`,
      offer: updatedCoupon
    });
  } catch (err) {
    console.error('Change coupon status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * APPROVE an offer
 * PATCH /api/admin/offers/:id/approve
 * 
 * Rules:
 * - Vendor cannot be blocked
 * - Offer must be pending
 * - Sets approvedAt timestamp
 */
exports.approveOffer = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check if already approved or rejected
    if (coupon.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot approve offer. Current status: ${coupon.status}`
      });
    }

    // Check if vendor is blocked
    const vendor = await User.findById(coupon.vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    if (vendor.isBlocked) {
      return res.status(403).json({
        message: 'Cannot approve offers from blocked vendors. Unblock the vendor first.'
      });
    }

    // Update offer status and set approvedAt timestamp
    const approvedOffer = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedAt: new Date()
      },
      { new: true }
    ).populate('vendorId', 'name businessName email');

    // emit real-time updates for students once an offer goes live
    if (req.app.get('io')) {
        const io = req.app.get('io');
        // modern event name for students
        io.to('student_room').emit('newApprovedOffer', approvedOffer);
        // maintain legacy event names for existing clients
        io.to('student_room').emit('newOffer', approvedOffer);
        io.to('student_room').emit('coupon_approved', approvedOffer);
        // also emit semantically named notification event
        io.to('student_room').emit('studentNotification', {
          title: 'New offer available',
          message: `A new offer has been approved: ${approvedOffer.title}`,
          offer: approvedOffer
        });
        // inform other admins the status changed
        io.to('admin_room').emit('offerStatusUpdated', {
          offerId: coupon._id,
          status: 'approved',
          title: coupon.title
        });
        // notify the vendor
        io.to(`vendor_${coupon.vendorId}`).emit('offerStatusUpdate', {
          offerId: coupon._id,
          status: 'approved',
          title: coupon.title
        });
        // send notification as well
        io.to(`vendor_${coupon.vendorId}`).emit('vendorNotification', {
          type: 'success',
          message: `Your offer "${coupon.title}" has been approved!`,
          offerId: coupon._id
        });
        // stats update
        io.to(`vendor_${coupon.vendorId}`).emit('stats_update', {
        offerId: coupon._id
      });
    }

    res.json({
      message: 'Offer approved successfully',
      offer: approvedOffer
    });
  } catch (err) {
    console.error('Approve offer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * REJECT an offer
 * PATCH /api/admin/offers/:id/reject
 * 
 * Body: { rejectionReason: "optional reason" }
 * 
 * Rules:
 * - Offer must be pending
 * - Stores rejection reason if provided
 */
exports.rejectOffer = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check if already approved or rejected
    if (coupon.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot reject offer. Current status: ${coupon.status}`
      });
    }

    // Update offer status and set rejection reason
    const rejectedOffer = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason: rejectionReason || 'No reason provided'
      },
      { new: true }
    ).populate('vendorId', 'name businessName email');

    // emit real-time update to vendor
    if (req.app.get('io')) {
      const io = req.app.get('io');
      // notify other admins of status change
      io.to('admin_room').emit('offerStatusUpdated', {
        offerId: coupon._id,
        status: 'rejected',
        title: coupon.title,
        reason: rejectionReason
      });
      io.to(`vendor_${coupon.vendorId}`).emit('offerStatusUpdate', {
        offerId: coupon._id,
        status: 'rejected',
        title: coupon.title,
        reason: rejectionReason
      });
      // send notification of rejection
      io.to(`vendor_${coupon.vendorId}`).emit('vendorNotification', {
        type: 'error',
        message: `Your offer "${coupon.title}" was rejected.`,
        offerId: coupon._id,
        reason: rejectionReason
      });
      // stats update
      io.to(`vendor_${coupon.vendorId}`).emit('stats_update', {
        vendorId: coupon.vendorId,
        event: 'offerRejection',
        offerId: coupon._id
      });
    }

    res.json({
      message: 'Offer rejected successfully',
      offer: rejectedOffer
    });
  } catch (err) {
    console.error('Reject offer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * List pending coupons (awaiting approval)
 * GET /admin/coupons/pending
 */
exports.listPendingCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ status: 'pending' });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/admin/coupons
 * ========================
 * Fetch ALL coupons (Approved, Pending, Rejected) with full admin visibility
 * 
 * Supports:
 * - Pagination (page, limit)
 * - Search by title
 * - Filter by status (Pending/Approved/Rejected)
 * - Filter by category
 * 
 * Returns:
 * - coupons: Array of coupon objects with vendor details
 * - pagination: Total count and page info
 * 
 * Security: Populated with vendor details (name, businessName, email)
 * Excludes sensitive fields from vendor data
 */
exports.getAllCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, category } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline
    const pipeline = [];

    // Build match filters
    const matchStage = {};

    // Filter by status if provided
    if (status && status.trim()) {
      const statusValue = status.toLowerCase();
      if (['pending', 'approved', 'rejected'].includes(statusValue)) {
        matchStage.status = statusValue;
      }
    }

    // Filter by category if provided
    if (category && category.trim()) {
      matchStage.category = category;
    }

    // Search by title if provided
    if (search && search.trim()) {
      matchStage.title = { $regex: search, $options: 'i' };
    }

    // Add match stage if there are any filters
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Count total before pagination
    const countPipeline = [...pipeline];
    const countResult = await Coupon.aggregate([
      ...countPipeline,
      { $count: 'total' }
    ]);
    const total = countResult[0]?.total || 0;

    // Lookup vendor details and project specific fields
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          discountType: 1,
          discountValue: 1,
          category: 1,
          status: 1,
          expiryDate: 1,
          bannerImage: 1,
          claimCount: 1,
          viewCount: 1,
          createdAt: 1,
          approvedAt: 1,
          rejectionReason: 1,
          'vendor._id': 1,
          'vendor.name': 1,
          'vendor.businessName': 1,
          'vendor.email': 1,
          'vendor.isBlocked': 1
        }
      },
      // Sort by creation date (newest first)
      { $sort: { createdAt: -1 } },
      // Add pagination
      { $skip: skip },
      { $limit: limitNum }
    );

    const coupons = await Coupon.aggregate(pipeline);

    res.json({
      success: true,
      coupons,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Get all coupons error:', err);
    res.status(500).json({ message: 'Server error fetching coupons' });
  }
};

/**
 * DELETE /api/admin/coupons/:id
 * =============================
 * Admin can permanently remove a coupon from the system
 * 
 * Rules:
 * - Can delete any coupon (Pending, Approved, or Rejected)
 * - Admin action is final and irreversible
 * - Returns deleted coupon details in response
 */
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Store details for response before deletion
    const deletedCoupon = coupon.toObject();

    // Delete the coupon
    await Coupon.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Coupon deleted successfully',
      coupon: deletedCoupon
    });
  } catch (err) {
    console.error('Delete coupon error:', err);
    res.status(500).json({ message: 'Server error deleting coupon' });
  }
};

/**
 * GET /api/admin/coupons/:id
 * ==========================
 * Fetch detailed information about a specific coupon
 * Includes full vendor details for admin review
 */
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('vendorId', 'name businessName email phone isBlocked');

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json({
      success: true,
      coupon
    });
  } catch (err) {
    console.error('Get coupon by ID error:', err);
    res.status(500).json({ message: 'Server error fetching coupon' });
  }
};

// ==========================================
// ADMIN NOTIFICATIONS MANAGEMENT
// ==========================================

const Notification = require('../models/Notification');

/**
 * POST /api/admin/notifications
 * =============================
 * Create a new system notification
 * 
 * Body:
 * {
 *   title: string (required),
 *   message: string (required),
 *   recipientType: "AllStudents" | "AllVendors" | "SpecificUser" (required),
 *   userId: ObjectId (required if recipientType is "SpecificUser")
 * }
 * 
 * BUSINESS RULES:
 * - Only admins can create notifications (enforced by middleware)
 * - recipientType determines who receives notification
 * - If SpecificUser, userId must be provided
 * - Validation ensures required fields are present
 * 
 * RESPONSE:
 * - 201: Notification created successfully
 * - 400: Validation error (missing fields or SpecificUser without userId)
 * - 401: Not authenticated
 * - 403: Not authorized (only admin)
 * - 500: Server error
 */
exports.createNotification = async (req, res) => {
  try {
    const { title, message, recipientType, userId } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({ 
        message: 'Title and message are required' 
      });
    }

    if (!recipientType || !['AllStudents', 'AllVendors', 'SpecificUser'].includes(recipientType)) {
      return res.status(400).json({ 
        message: 'Valid recipientType required: AllStudents, AllVendors, or SpecificUser' 
      });
    }

    if (recipientType === 'SpecificUser') {
      if (!userId) {
        return res.status(400).json({ 
          message: 'userId is required for SpecificUser recipient type' 
        });
      }
      // Verify user exists
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(400).json({ 
          message: 'User not found' 
        });
      }
    }

    // Create notification
    const notification = new Notification({
      title,
      message,
      recipientType,
      userId: recipientType === 'SpecificUser' ? userId : null,
      createdBy: req.user._id
    });

    await notification.save();

    // broadcast real-time notification based on recipientType
    if (req.app.get('io')) {
      const io = req.app.get('io');
      if (recipientType === 'AllStudents') {
        io.to('student_room').emit('newNotification', notification);
        io.to('student_room').emit('notification', notification); // legacy
        io.to('student_room').emit('adminBroadcast', notification);
        io.to('student_room').emit('studentNotification', {
          title: notification.title,
          message: notification.message,
          notificationId: notification._id
        });
      } else if (recipientType === 'AllVendors') {
        io.to('vendor_room').emit('newNotification', notification);
        io.to('vendor_room').emit('notification', notification);
        io.to('vendor_room').emit('adminBroadcast', notification);
      } else if (recipientType === 'SpecificUser') {
        io.to(`student_${userId}`).emit('newNotification', notification);
        io.to(`student_${userId}`).emit('notification', notification);
        io.to(`student_${userId}`).emit('adminBroadcast', notification);
        io.to(`student_${userId}`).emit('studentNotification', {
          title: notification.title,
          message: notification.message,
          notificationId: notification._id
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ message: 'Server error creating notification' });
  }
};

/**
 * GET /api/admin/vendors/:id/activity
 * ===================================
 * Get comprehensive activity data for a specific vendor
 * 
 * Returns:
 * - vendor: Basic vendor info
 * - offers: All offers created by vendor with stats
 * - redemptions: All redemptions of vendor's offers
 * - activity: Timeline of recent activities
 * - stats: Summary statistics
 */
exports.getVendorActivity = async (req, res) => {
  try {
    const vendorId = req.params.id;

    // Get vendor details
    const vendor = await User.findById(vendorId).select('-password');
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Get all offers by this vendor
    const offers = await Coupon.find({ vendorId })
      .sort({ createdAt: -1 })
      .select('title description status discountType discountValue category claimCount viewCount createdAt approvedAt rejectionReason expiryDate');

    // Get all redemptions for this vendor's offers
    const redemptions = await Redemption.find({ vendorId })
      .populate('studentId', 'name email')
      .populate('couponId', 'title discountType discountValue')
      .sort({ createdAt: -1 })
      .select('status claimedAt redeemedAt redemptionCode studentId couponId');

    // Calculate statistics
    const totalOffers = offers.length;
    const approvedOffers = offers.filter(o => o.status === 'approved').length;
    const pendingOffers = offers.filter(o => o.status === 'pending').length;
    const rejectedOffers = offers.filter(o => o.status === 'rejected').length;
    const totalClaims = offers.reduce((sum, o) => sum + (o.claimCount || 0), 0);
    const totalRedemptions = redemptions.filter(r => r.status === 'Redeemed').length;

    // Create activity timeline (recent 50 items)
    const activities = [];

    // Add offer creation activities
    offers.slice(0, 20).forEach(offer => {
      activities.push({
        type: 'offer_created',
        timestamp: offer.createdAt,
        data: {
          offerId: offer._id,
          title: offer.title,
          status: offer.status
        }
      });
    });

    // Add redemption activities
    redemptions.slice(0, 20).forEach(redemption => {
      activities.push({
        type: 'redemption',
        timestamp: redemption.redeemedAt || redemption.claimedAt,
        data: {
          redemptionId: redemption._id,
          offerTitle: redemption.couponId.title,
          studentName: redemption.studentId.name,
          status: redemption.status,
          redemptionCode: redemption.redemptionCode
        }
      });
    });

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit to 50 most recent activities
    const recentActivities = activities.slice(0, 50);

    res.json({
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        isVerified: vendor.isVerified,
        isBlocked: vendor.isBlocked,
        createdAt: vendor.createdAt
      },
      offers,
      redemptions,
      stats: {
        totalOffers,
        approvedOffers,
        pendingOffers,
        rejectedOffers,
        totalClaims,
        totalRedemptions
      },
      recentActivities
    });
  } catch (err) {
    console.error('Get vendor activity error:', err);
    res.status(500).json({ message: 'Failed to fetch vendor activity' });
  }
};
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    // Build search query
    const searchQuery = { createdBy: req.user._id };
    if (search) {
      const regex = new RegExp(search, 'i');
      searchQuery.$or = [
        { title: regex },
        { message: regex }
      ];
    }

    // Fetch notifications with pagination
    const notifications = await Notification.find(searchQuery)
      .populate('createdBy', 'name email')
      .populate('userId', 'name email role')
      .populate('readBy.userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    const total = await Notification.countDocuments(searchQuery);

    res.json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

/**
 * DELETE /api/admin/notifications/:id
 * ====================================
 * Delete a notification permanently
 * 
 * BUSINESS RULES:
 * - Only the admin who created the notification can delete it
 * - Deletes the notification and all read status records
 * 
 * RESPONSE:
 * - 200: Notification deleted successfully
 * - 404: Notification not found or unauthorized
 * - 401: Not authenticated
 * - 403: Not authorized
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ 
        message: 'Notification not found or unauthorized' 
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
};
