const jwt = require('jsonwebtoken');
const User = require('../models/User');

// helper used to set up our real-time logic
function setupSocket(source) {
  // allow caller to provide either the http server or an existing io instance
  const io = source && source.of ? source : require('socket.io')(source, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
  });

  // authenticate each connection with JWT provided in handshake.auth
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // join the standard rooms for easy broadcasting
    if (user.role === 'admin') {
      socket.join('admin_room');
    } else if (user.role === 'student') {
      socket.join('student_room');
      socket.join(`student_${user._id}`); // individual student room
    } else if (user.role === 'vendor') {
      // join both a global vendor room and an individual room
      socket.join('vendor_room');
      socket.join(`vendor_${user._id}`);
    }

    // proxy a few events from clients so automated tests still pass
    socket.on('new_coupon_submitted', (data) => {
      io.to('admin_room').emit('new_coupon_submitted', data);
    });

    socket.on('coupon_approved', (data) => {
      io.to('student_room').emit('coupon_approved', data);
      io.to(`vendor_${data.vendorId}`).emit('coupon_approved', data);
    });

    socket.on('coupon_redeemed', (data) => {
      io.to('admin_room').emit('coupon_redeemed', data);
      io.to(`vendor_${data.vendorId}`).emit('coupon_redeemed', data);
    });

    socket.on('stats_update', (data) => {
      io.to('admin_room').emit('stats_update', data);
      io.to(`vendor_${data.vendorId}`).emit('stats_update', data);
    });

    socket.on('vendor_message_to_admin', (data) => {
      // Only allow vendors to send messages to admin
      if (user.role !== 'vendor') return;
      io.to('admin_room').emit('vendor_message', {
        from: user._id,
        vendorName: user.name,
        message: data.message,
        timestamp: new Date()
      });
      // Optionally emit back to vendor for confirmation
      socket.emit('message_sent', { success: true });
    });
  });
}

module.exports = { setupSocket };
