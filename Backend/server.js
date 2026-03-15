require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const path = require('path'); // ✅ ADD THIS

async function start() {
  try {
    await connectDB();
    console.log('MongoDB Connected Successfully ✅');

    const server = http.createServer(app);

    // ==================
    // Socket.io Setup
    // ==================
    const { Server } = require('socket.io');

    const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const allowedOrigins = rawOrigins.split(",").map((o) => o.trim());

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
      console.log('Socket connected', socket.id, 'user=', socket.user?.email);
      socket.on('disconnect', () => {
        console.log('Socket disconnected', socket.id);
      });
    });

    // ==================================
    // ✅ SERVE REACT BUILD IN PRODUCTION
    // ==================================
    if (process.env.NODE_ENV === 'production') {

      app.use(
        require('express').static(
          path.join(__dirname, '../frontend/build')
        )
      );

      app.get('*', (req, res) => {
        res.sendFile(
          path.resolve(__dirname, '../frontend', 'build', 'index.html')
        );
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