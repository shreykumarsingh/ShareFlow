const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  registerValidation,
  loginValidation
} = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes (require authentication)
router.use(authenticateToken); // Apply authentication middleware to all routes below

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/logout', logout);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;