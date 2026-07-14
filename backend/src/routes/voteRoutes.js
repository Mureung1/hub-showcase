const express = require('express');
const router = express.Router();
const { castVote, getVoteStats } = require('../controllers/voteController');

// Routes prefixed with /api/votes
router.post('/', castVote);
router.get('/stats/:dropId', getVoteStats);

module.exports = router;
