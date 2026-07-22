const express = require('express');
const router = express.Router();
const {
  loginOrRegister,
  getUserProfile,
  claimDailyBonus
} = require('../controllers/authController');

// Routes prefixed with /api/auth
router.post('/login', loginOrRegister);
router.get('/me/:userId', getUserProfile);
router.post('/daily-bonus', claimDailyBonus);

module.exports = router;
