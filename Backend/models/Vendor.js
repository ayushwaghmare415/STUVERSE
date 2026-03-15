const mongoose = require('mongoose');
const User = require('./User');

const vendorSchema = new mongoose.Schema({
  // Business Information
  businessName: { type: String, required: true },
  ownerName: { type: String },
  businessEmail: { type: String },
  phone: { type: String },
  category: { 
    type: String, 
    enum: ['Restaurant', 'Gym', 'Cafe', 'Clothing', 'Electronics', 'Books', 'Beauty', 'Other'],
    default: 'Other'
  },
  address: { type: String },
  website: { type: String },
  description: { type: String },
  
  // Logo/Business Image
  logo: {
    url: { type: String },
    public_id: { type: String }
  },
  
  // Verification Status
  isVerified: { type: Boolean, default: false },
  verificationBadge: { type: Boolean, default: false },
  
  // Profile Completion Tracking
  profileCompletion: {
    businessName: { type: Boolean, default: false },
    businessEmail: { type: Boolean, default: false },
    phone: { type: Boolean, default: false },
    category: { type: Boolean, default: false },
    address: { type: Boolean, default: false },
    website: { type: Boolean, default: false },
    description: { type: Boolean, default: false },
    logo: { type: Boolean, default: false }
  },
  
  // Geolocation for nearby vendor discovery
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate profile completion percentage before saving
vendorSchema.pre('save', function(next) {
  const completion = this.profileCompletion;
  const fields = Object.values(completion);
  const completedFields = fields.filter(f => f === true).length;
  this.completionPercentage = Math.round((completedFields / fields.length) * 100);
  this.updatedAt = Date.now();
  next();
});

// Create geospatial index for location-based queries
vendorSchema.index({ 'location': '2dsphere' });

module.exports = User.discriminator('Vendor', vendorSchema);
