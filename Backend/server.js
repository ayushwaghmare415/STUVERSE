require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const connectDB = require('./config/db');
const path = require('path');

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
const rawOrigins =
process.env.CORS_ORIGIN ||
process.env.FRONTEND_URL ||
'http://localhost:3000';

const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

app.use(
cors({
origin: function (origin, callback) {
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

const loginLimiter = rateLimit({
windowMs: 15 * 60 * 1000,
max: 10,
message: 'Too many login attempts, please try again later.',
});

app.use('/api/auth/login', loginLimiter);

// ==================
// API Routes
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

// API test route
app.get('/api', (req, res) => {
res.json({ message: 'STUVERSE Backend Running 🚀' });
});

app.use(errorMiddleware);

async function start() {
try {
await connectDB();
console.log('MongoDB Connected Successfully ✅');

const server = http.createServer(app);

// ==================
// Socket.io Setup
// ==================
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
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

// ==================================
// SERVE REACT FRONTEND (VITE BUILD)
// ==================================
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../Frontend/dist');

  // Serve static React files
  app.use(express.static(frontendPath));

  // React Router support
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});


} catch (err) {
console.error('Failed to start server:', err);
process.exit(1);
}
}

start();
