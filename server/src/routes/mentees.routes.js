const express = require('express');

const {
  completeMyOnboarding,
  getMyMenteeProfile,
  updateMyMenteeProfile,
} = require('../controllers/mentees.controller');
const authenticate = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(authenticate, requireRole('mentee'));

router.get('/me', getMyMenteeProfile);
router.patch('/me', updateMyMenteeProfile);
router.patch('/me/onboarding', completeMyOnboarding);

module.exports = router;
