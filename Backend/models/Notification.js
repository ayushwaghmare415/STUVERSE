const mongoose = require('mongoose');

/**
 * STUVERSE NOTIFICATION MODEL
 * ============================
 * 
 * Tracks system notifications for students, vendors, and admins.
 * 
 * USAGE:
 * 1. Admin creates notifications via admin routes
 * 2. Students/Vendors fetch their notifications
 * 3. Users can mark as read or delete notifications
 * 
 * RECIPIENT TYPES:
 * - "Student": Sent to all students
 * - "Vendor": Sent to all vendors
 * - "AllUsers": Sent to all users (students and vendors)
 * - Specific user via userId
 */

const notificationSchema = new mongoose.Schema({
  // Notification content
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // Recipient configuration
  recipientType: { 
    type: String, 
    enum: ['Student', 'Vendor', 'AllUsers'], 
    required: true 
  },
  
  // Optional for specific user notifications
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Read status (true if read by the user)
  isRead: { type: Boolean, default: false },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
