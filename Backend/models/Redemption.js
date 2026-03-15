const mongoose = require('mongoose');

/**
 * Redemption / Claim Schema
 * 
 * This model tracks when students claim offers (coupons) and when they redeem them.
 * A student can claim an offer once, and later redeem it with a unique code.
 * 
 * Status values:
 * - "Claimed": Student has claimed the offer but not redeemed it yet
 * - "Redeemed": Student has completed redemption with a unique code
 * - "Expired": The offer's expiry date has passed
 */
const redemptionSchema = new mongoose.Schema({
  // Reference to the student who claimed/redeemed the offer
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Reference to the coupon/offer being claimed
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
  
  // Reference to the vendor who owns the offer (denormalized for faster queries)
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Snapshot fields for faster reporting and filtering
  studentName: { type: String },
  studentEmail: { type: String },
  offerTitle: { type: String },
  couponCode: { type: String },
  discount: { type: String },

  // Record where the student was when they redeemed the offer
  studentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: undefined
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined
    }
  },

  // Status tracking: Claimed -> Redeemed -> (can check expiry)
  status: {
    type: String,
    enum: ['Claimed', 'Redeemed', 'Expired'],
    default: 'Claimed'
  },
  
  // Timestamp when student claimed the offer
  claimedAt: { type: Date, default: Date.now },
  
  // Timestamp when student redeemed the offer (null if not yet redeemed)
  redeemedAt: { type: Date, default: null },
  
  // Unique redemption code generated when offer is claimed (or redeemed)
  // Used by vendors to verify redemption in-store
  redemptionCode: { type: String, required: true, unique: true, uppercase: true, trim: true }
}, { timestamps: true });

// Geospatial index for student location tracking
redemptionSchema.index({ studentLocation: '2dsphere' });
// Ensure redemption code is indexed uniquely for fast lookups and uniqueness enforcement
redemptionSchema.index({ redemptionCode: 1 }, { unique: true });

// Prevent duplicate claims: one student can claim one offer only once
redemptionSchema.index({ studentId: 1, couponId: 1 }, { unique: true });

// Index for efficient queries by student and status
redemptionSchema.index({ studentId: 1, status: 1 });

// Index for efficient queries by student and vendor when enforcing one-per-vendor rule
redemptionSchema.index({ studentId: 1, vendorId: 1, status: 1 });

// Index for redemption code lookups (for vendor verification)
redemptionSchema.index({ redemptionCode: 1 });

module.exports = mongoose.model('Redemption', redemptionSchema);
