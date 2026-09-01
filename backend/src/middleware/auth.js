const jwt = require('jsonwebtoken');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Clerk authentication middleware - required authentication
const authenticateClerk = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify Clerk JWT token
    const clerkUser = await clerkClient.verifyToken(token);
    
    if (!clerkUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach Clerk user to request
    req.clerkUser = clerkUser;
    req.userId = clerkUser.sub; // Clerk user ID
    next();
  } catch (error) {
    console.error('Clerk auth error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Legacy authentication middleware - required authentication
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Optional authentication middleware - doesn't require authentication but adds user if available
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Ignore token errors for optional auth
        console.log('Optional auth token invalid:', error.message);
      }
    }

    next();
  } catch (error) {
    // Don't fail for optional auth
    next();
  }
};

// Check if user is authenticated (for conditional logic)
const isAuthenticated = (req) => {
  return !!req.user;
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  authenticateClerk,
  optionalAuth,
  isAuthenticated
};
