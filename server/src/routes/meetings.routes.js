const express = require('express');

const { updateMeeting } = require('../controllers/meetings.controller');
const authenticate = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate);

router.patch('/:meetingId', updateMeeting);

module.exports = router;
