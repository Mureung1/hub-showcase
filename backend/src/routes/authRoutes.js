const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getUserProfile,
  claimDailyBonus
} = require('../controllers/authController');

// Routes prefixed with /api/auth
router.post('/register', register);
router.post('/login', login);
router.get('/me/:userId', getUserProfile);
router.post('/daily-bonus', claimDailyBonus);

module.exports = router;
