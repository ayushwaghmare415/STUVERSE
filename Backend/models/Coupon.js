const mongoose = require('mongoose');
const couponSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  discountType: { type: String, required: true },
  discountValue: { type: Number, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // student-facing category for filtering (Food, Tech, Fashion, Education)
  category: { type: String, enum: ['Food', 'Tech', 'Fashion', 'Education'], required: true },
  // admin workflow status
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft' },
  // track how many students have claimed this offer
  claimCount: { type: Number, default: 0 },
  claimedCount: { type: Number, default: 0 },
  maxClaims: { type: Number, default: 100 },
  // track how many times the offer detail has been viewed
  viewCount: { type: Number, default: 0 },
  expiryDate: { type: Date },
  bannerImage: { type: String },
  // coupon code for redemption
  couponCode: { type: String },
  // terms and conditions
  terms: { type: String },
  termsAndConditions: { type: String },
  storeAddress: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  // ADMIN APPROVAL TRACKING
  // approvedAt - timestamp when admin approved the offer
  approvedAt: { type: Date, default: null },
  // rejectionReason - optional reason provided by admin when rejecting
  rejectionReason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Compatibility with requested API property names
couponSchema.virtual('discountPercentage').get(function () {
  if (this.discountType === 'percentage') {
    return this.discountValue;
  }
  return null;
});

couponSchema.set('toJSON', { virtuals: true });
couponSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Coupon', couponSchema);
