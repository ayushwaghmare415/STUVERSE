const mongoose = require('mongoose');

/**
 * STUVERSE GLOBAL SETTINGS
 * ========================
 * 
 * Single document model for managing global platform configuration.
 * IMPORTANT: This collection should only have ONE document (id: ObjectId for "default")
 * 
 * IMPACT ON SYSTEM BEHAVIOR:
 * 
 * 1. maintenanceMode = true:
 *    - Students cannot access dashboards (403 error redirects them)
 *    - Vendors cannot create/edit offers
 *    - Students cannot claim offers
 *    - Only admins can access admin panel
 *    - Webhook: Broadcast notification to all online users
 * 
 * 2. studentVerificationRequired = true:
 *    - Students must be verified by admin before claiming ANY offer
 *    - Student signup sets isVerified = false
 *    - Admin must PATCH /admin/students/:id/verify before student can claim
 *    - If false: Auto-verified, can claim immediately
 * 
 * 3. vendorApprovalRequired = true:
 *    - Vendors must be approved by admin before offers go live
 *    - New offers created by vendors have status = 'pending'
 *    - Admin reviews via GET /admin/coupons?status=pending
 *    - If false: New offers auto-approved (status = 'approved')
 * 
 * 4. maxClaimsPerStudent:
 *    - Limits how many offers a student can claim in one session
 *    - Prevents system abuse (e.g., claiming 1000 offers instantly)
 *    - Checked when student tries to PATCH /student/claim/:couponId
 * 
 * INITIALIZATION:
 * - Run once on first admin login or server startup
 * - Check if exists: Settings.findOne({})
 * - If null, create default: Settings.create({ platformName: "Stuverse", ... })
 */

const settingsSchema = new mongoose.Schema({
  // Platform branding
  platformName: {
    type: String,
    default: 'Stuverse',
    required: true,
    minlength: 1,
    maxlength: 100,
  },

  // Student Account Management
  studentVerificationRequired: {
    type: Boolean,
    default: true,
    description: 'If true, students must be verified by admin before claiming offers',
  },

  // Vendor Account Management
  vendorApprovalRequired: {
    type: Boolean,
    default: true,
    description: 'If true, new vendor offers require admin approval before going live',
  },

  // Platform Limits
  maxClaimsPerStudent: {
    type: Number,
    default: 10,
    min: 1,
    max: 1000,
    description: 'Maximum number of offers a student can claim per day',
  },

  // Platform Status
  maintenanceMode: {
    type: Boolean,
    default: false,
    description:
      'If true, platform is in maintenance. Students & Vendors get 503 error. Only admins can access.',
  },

  // Audit Trail
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'Admin ID who last updated settings',
  },

  updatedAt: {
    type: Date,
    default: Date.now,
    description: 'Timestamp of last update',
  },
});

module.exports = mongoose.model('Settings', settingsSchema);
