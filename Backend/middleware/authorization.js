const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authenticate requests using Bearer JWT. Attaches `req.user` (without password).
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.isBlocked) return res.status(403).json({ message: 'Account is blocked. Contact administrator.' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Authorize by role(s). Accepts multiple role strings, case-insensitive.
function authorizeRoles(...allowedRoles) {
  const normalized = allowedRoles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    if (!req.user || !req.user.role) return res.status(403).json({ message: 'Access denied' });
    const role = String(req.user.role).toLowerCase();
    if (!normalized.includes(role)) {
      return res.status(403).json({ message: 'Access denied: insufficient role' });
    }
    next();
  };
}

module.exports = { authenticateUser, authorizeRoles };
