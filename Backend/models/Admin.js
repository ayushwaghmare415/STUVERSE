const mongoose = require('mongoose');
const User = require('./User');

// Admin has no extra fields beyond base user schema but is useful for
// clarity and future expansion.
const adminSchema = new mongoose.Schema({});
module.exports = User.discriminator('Admin', adminSchema);
