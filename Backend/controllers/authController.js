const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * STUDENT REGISTRATION FLOW
 * ========================
 * 
 * 1. Student submits registration with: name, email, password, college
 * 2. Password is hashed using bcrypt (10 salt rounds)
 * 3. Account created with: isVerified = false, isBlocked = false
 * 4. JWT is NOT issued (student must wait for admin verification)
 * 5. Admin must explicitly verify student account from admin panel
 * 6. Only after verification can student login and claim offers
 * 
 * ADMIN VERIFICATION PROCESS:
 * After student registration, admin:
 * 1. Views pending students: GET /admin/students/pending
 * 2. Reviews student info and uploaded documents
 * 3. Approves student: PATCH /admin/students/:id/verify
 *    - This sets isVerified = true
 *    - Student can now login
 * OR
 * 4. Rejects student: DELETE /admin/students/:id
 */

// Validation rules for user registration
exports.registerValidators = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter'),
  body('role').isIn(['student', 'vendor', 'admin']).withMessage('Role must be valid'),
  body('college')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('College is required for students'),
  body('businessName')
    .if(body('role').equals('vendor'))
    .notEmpty()
    .withMessage('Business name is required for vendors'),
];

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, email, password, role, college, businessName, idImage } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Hash password with bcrypt (10 salt rounds for security)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Build user object with role-specific fields
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      college: role === 'student' ? college : undefined,
      businessName: role === 'vendor' ? businessName : undefined,
      // IMPORTANT: All new students/vendors require admin verification before login
      // Admins are auto-verified for programmatic creation
      status: role === 'admin' ? 'Approved' : 'Pending',
      isVerified: role === 'admin' ? true : false,
      isBlocked: false // New accounts start unblocked
    };
    
    // Store ID/license image if provided
    if (idImage && idImage.url) {
      userData.idImage = {
        url: idImage.url,
        public_id: idImage.public_id
      };
    }
    
    // Save new user to database
    const user = new User(userData);
    await user.save();

    // Real-time notification: let admins know when a student or vendor signs up
    if (req.app.get('io')) {
      const io = req.app.get('io');

      if (user.role === 'student') {
        io.to('admin_room').emit('studentRegistered', {
          student: {
            id: user._id,
            name: user.name,
            email: user.email
          },
          message: `New student registered: ${user.name}`
        });
        // Legacy event name for backwards compatibility
        io.to('admin_room').emit('newStudentRegistered', {
          student: {
            id: user._id,
            name: user.name,
            email: user.email
          },
          message: `New student registered: ${user.name}`
        });

        // also fire a generic stats update if any listeners want to refresh
        io.to('admin_room').emit('stats_update', {
          event: 'newStudent',
          studentId: user._id
        });
      }

      if (user.role === 'vendor') {
        io.to('admin_room').emit('vendorRegistered', {
          vendor: {
            id: user._id,
            name: user.name,
            email: user.email,
            businessName: user.businessName
          },
          message: `New vendor joined: ${user.businessName || user.name}`
        });
        // Legacy event name for backwards compatibility
        io.to('admin_room').emit('newVendorRegistered', {
          vendor: {
            id: user._id,
            name: user.name,
            email: user.email,
            businessName: user.businessName
          },
          message: `New vendor joined: ${user.businessName || user.name}`
        });

        io.to('admin_room').emit('stats_update', {
          event: 'newVendor',
          vendorId: user._id
        });
      }
    }

    // IMPORTANT JWT ISSUANCE LOGIC:
    // For SECURITY, we only issue a token if the account is already verified.
    // For students/vendors: They must wait for admin approval, then login via /auth/login
    // For admins: Auto-verified, so token is issued immediately
    if (user.isVerified) {
      // Only verified users can get JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.status(201).json({
        message: 'Account created successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    }
    
    // Unverified student/vendor account - no JWT issued
    // Student must wait for admin to verify account before login
    res.status(201).json({
      message: 'Account created. Pending verification by administrator.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login
exports.loginValidators = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

// upload license during registration (no auth required)
exports.uploadLicense = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file provided' });
    }
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'vendor_licenses', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('License upload failed', err);
    res.status(500).json({ message: 'Upload failed' });
  }
};
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // send back a short human‑readable message instead of the full array
    const msg = errors.array().map((e) => e.msg).join(', ');
    return res.status(400).json({ message: msg });
  }
  try {
    const { email, password } = req.body;
    // Check if email exists
    const user = await User.findOne({ email });
    if (!user) {
      // use 401 for authentication failures
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // deny login if account still waiting for approval
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Account not verified yet' });
    }
    // deny login if admin has blocked the account
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account has been blocked' });
    }
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Generate JWT with role
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
