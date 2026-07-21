const express = require('express');

const { getMentorById, getMentors } = require('../controllers/mentors.controller');
const mockAuth = require('../middlewares/mockAuth');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.use(mockAuth);
router.use(requireRole('mentee'));

router.get('/', getMentors);
router.get('/:mentorId', getMentorById);

module.exports = router;
