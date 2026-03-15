// app.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const errorMiddleware = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const couponRoutes = require('./routes/couponRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const offersRoutes = require('./routes/offersRoutes');
const redemptionRoutes = require('./routes/redemptionRoutes');

const app = express();

// ==================
// Global Middleware
// ==================
// support multiple origins (comma separated in env) and fall back to default
const rawOrigins = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());

// ==================
// Rate Limiter
// ==================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
});

// ==================
// Routes
// ==================

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/vendors', vendorRoutes);
// Alias routes to support /api/vendor/* as requested by the frontend
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/redemptions', redemptionRoutes);

// Health Check Route
app.get('/', (req, res) => {
  res.json({ message: 'STUVERSE Backend Running 🚀' });
});

// ==================
// Error Middleware
// ==================
app.use(errorMiddleware);

module.exports = app;