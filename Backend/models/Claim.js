const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  claimedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// ensure each student can claim each coupon once (unique compound index)
claimSchema.index({ studentId: 1, couponId: 1 }, { unique: true });

module.exports = mongoose.model('Claim', claimSchema);

