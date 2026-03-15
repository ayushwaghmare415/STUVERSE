const mongoose = require('mongoose');

/**
 * SAVED OFFER MODEL
 * =================
 *
 * This model allows students to bookmark/save offers they like for easy access later.
 * Saved offers help students manage coupons from vendors approved by admin.
 *
 * BUSINESS RULES:
 * - Students can only save approved offers
 * - Prevents duplicate saves for the same offer by same student
 * - Offers are hidden if vendor becomes blocked or offer expires
 * - Students cannot modify vendor offers, only save/remove bookmarks
 */

const savedOfferSchema = new mongoose.Schema({
  // Reference to the student who saved the offer
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Reference to the offer (coupon) being saved
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true
  },

  // Timestamp when the offer was saved
  savedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate saves and optimize queries
savedOfferSchema.index({ studentId: 1, offerId: 1 }, { unique: true });

// Index for efficient queries by student
savedOfferSchema.index({ studentId: 1, savedAt: -1 });

module.exports = mongoose.model('SavedOffer', savedOfferSchema);