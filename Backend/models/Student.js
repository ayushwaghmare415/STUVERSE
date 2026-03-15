const mongoose = require('mongoose');
const User = require('./User');

// discriminator schema only needs the extra fields or validation
const studentSchema = new mongoose.Schema({
  college: { type: String, required: true },
  
  // Current location for nearby vendor discovery
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: null
    },
    timestamp: { type: Date, default: null }
  }
});

module.exports = User.discriminator('Student', studentSchema);
