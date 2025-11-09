const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔒 Verify JWT and attach user
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id || decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Error:', error.message);
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// 👑 Admin only
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// 🧑‍💼 Department head only
exports.isHead = (req, res, next) => {
  if (req.user.role !== 'head') {
    return res.status(403).json({ message: 'Access denied. Department head only.' });
  }
  next();
};

// 👤 Normal user only
exports.isUser = (req, res, next) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ message: 'Access denied. User only.' });
  }
  next();
};
