const mongoose = require('mongoose');

/**
 * STUVERSE USER MODEL
 * ==================
 * 
 * This base User model is used for all user types: students, vendors, and admins.
 * It implements the following authentication and authorization flow:
 * 
 * STUDENT REGISTRATION FLOW:
 * 1. Student registers with name, email, password, and college
 * 2. Password is hashed using bcrypt (strength: 10 rounds)
 * 3. Account is created with: isVerified = false, isBlocked = false
 * 4. Account requires ADMIN VERIFICATION before student can login
 * 
 * ADMIN CONTROLS OVER STUDENTS:
 * 1. View All Students: GET /admin/students
 * 2. Search Students: GET /admin/students/search?email=...&name=...\n * 3. Verify Student: PATCH /admin/students/:id/verify (sets isVerified = true)
 * 4. Block Student: PATCH /admin/students/:id/block (sets isBlocked = true)
 *    - Blocked students cannot login
 *    - Blocked students cannot claim offers
 *    - Blocked status is checked by authMiddleware on every request
 * 5. Unblock Student: PATCH /admin/students/:id/unblock (sets isBlocked = false)
 * 6. Delete Student: DELETE /admin/students/:id
 * 
 * STUDENT RESTRICTIONS (Enforced at Controller Level):
 * - Only verified students can claim offers
 * - Blocked students cannot access protected routes (authMiddleware blocks)
 * - Students can only access /student/* endpoints
 */

const userSchema = new mongoose.Schema({
  // ===== Basic Information =====
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Password is hashed using bcrypt (10 rounds)
  
  // ===== Role & Access Control =====
  role: { type: String, enum: ['student', 'vendor', 'admin'], required: true },
  
  // ===== Role-Specific Fields =====
  collegeName: { type: String }, // Only populated for students
  businessName: { type: String }, // Only populated for vendors
  businessCategory: { type: String }, // Vendor business category (e.g., Restaurant, Gym)
  businessAddress: { type: String }, // Vendor business address
  website: { type: String }, // Optional vendor website
  description: { type: String }, // Vendor business description
  phone: { type: String }, // Contact phone number
  
  // ===== Profile Image =====
  // Stores profile image uploaded to Cloudinary
  profileImage: {
    url: { type: String },          // Cloudinary secure_url
    public_id: { type: String }     // Cloudinary public_id (for deletion)
  },
  
  // Legacy logo field used in older versions of the app
  logo: {
    url: { type: String },
    public_id: { type: String }
  },
  
  // ===== Verification / Approval & Blocking =====
  /**
   * status: Vendor/Student approval status.
   * - "Pending": Newly registered users waiting for admin approval.
   * - "Approved": Admin has approved the account.
   * - "Rejected": Admin has rejected the account.
   *
   * For backward compatibility, we also support isVerified for login gating.
   */
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },

  /**
   * isVerified: Controls whether user can login
   * - false: Account pending admin approval (prevents login)
   * - true: Admin has approved account (allows login and protected actions)
   * For students: Admin must explicitly verify using PATCH /admin/students/:id/verify
   */
  isVerified: { type: Boolean, default: false },
  
  /**
   * isBlocked: Controls whether user can perform any actions
   * - false: Account active and usable
   * - true: Account suspended by admin (prevents login, claiming offers, etc.)
   * When true, authMiddleware will reject with 403: \"Account is blocked\"
   */
  isBlocked: { type: Boolean, default: false },
  
  // ===== Document Storage =====
  // Stores ID/License image uploaded to Cloudinary
  // null until user uploads via POST /student/upload-id or during registration
  idImage: {
    url: { type: String },          // Cloudinary secure_url
    public_id: { type: String }     // Cloudinary public_id (for deletion)
  },

  // ===== Location (Geospatial) =====
  // Vendors store their business location here. Students store their current location.
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    timestamp: { type: Date }
  },

  // ===== Tracking =====
  createdAt: { type: Date, default: Date.now }
});

// Create geospatial indexes for location-based searches
userSchema.index({ location: '2dsphere' });
userSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
