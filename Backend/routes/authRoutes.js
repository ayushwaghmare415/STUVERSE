const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  registerValidators,
  register,
  loginValidators,
  login,
  uploadLicense,
} = require('../controllers/authController');

const router = express.Router();

// limit brute-force attempts on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts, please try again later.',
});

router.post('/register', registerValidators, register);
router.post('/login', loginLimiter, loginValidators, login);

// anonymous upload endpoint used during vendor registration
const upload = require('../middleware/uploadMiddleware');
router.post('/upload-license', upload.single('license'), uploadLicense);

module.exports = router;
