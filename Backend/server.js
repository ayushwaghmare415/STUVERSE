// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');

const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');

// Import routes
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
// Middleware
// ==================
const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const prodOrigin = 'https://stuverse-dmw8.onrender.com';
const deployOrigin = process.env.FRONTEND_URL || prodOrigin;

const rawOrigins = [
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : []),
  ...defaultOrigins,
  deployOrigin,
  prodOrigin,
].filter(Boolean);

const allowedOrigins = [...new Set(rawOrigins)];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // mobile apps or Postman
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
});

app.use('/api/auth/login', loginLimiter);

// ==================
// Routes
// ==================
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/redemptions', redemptionRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'STUVERSE Backend Running 🚀' });
});

app.use(errorMiddleware);

// ==================
// Start Server
// ==================
const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);

    // ==================
    // Socket.io
    // ==================
    const { Server } = require('socket.io');
    const io = new Server(server, {
      cors: {
        origin: function(origin, callback) {
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) return callback(null, true);
          callback(new Error(`Socket.io CORS: origin ${origin} not allowed`));
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    app.set('io', io);

    const { setupSocket } = require('./sockets/socket');
    setupSocket(io);

    io.on('connection', (socket) => {
      console.log('Socket connected', socket.id);
      socket.on('disconnect', () => {
        console.log('Socket disconnected', socket.id);
      });
    });

    // ==================
    // Serve Frontend (optional SPA)
    // ==================
    const frontendPath = path.join(__dirname, '../Frontend/dist');
    app.use(express.static(frontendPath));

    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🚀`);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();