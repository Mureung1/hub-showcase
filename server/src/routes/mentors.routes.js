const express = require('express');

const {
  getMentorById,
  getMentors,
  getMyMentorProfile,
  updateMyMentorProfile,
} = require('../controllers/mentors.controller');
const authenticate = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole('mentee'), getMentors);
router.get('/me', requireRole('mentor'), getMyMentorProfile);
router.patch('/me', requireRole('mentor'), updateMyMentorProfile);
router.get('/:mentorId', requireRole('mentee'), getMentorById);

module.exports = router;
