const express = require('express');

const {
  getMentorById,
  getMentors,
  getMyMentorProfile,
  updateMyMentorProfile,
} = require('../controllers/mentors.controller');
const authenticate = require('../middlewares/auth');
const mockAuth = require('../middlewares/mockAuth');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.get('/', mockAuth, requireRole('mentee'), getMentors);
router.get('/me', authenticate, requireRole('mentor'), getMyMentorProfile);
router.patch('/me', authenticate, requireRole('mentor'), updateMyMentorProfile);
router.get('/:mentorId', mockAuth, requireRole('mentee'), getMentorById);

module.exports = router;
