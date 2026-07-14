const express = require('express');
const router = express.Router();

const adminRoutes = require('./adminRoutes');
const dropRoutes = require('./dropRoutes');
const voteRoutes = require('./voteRoutes');

// Connect sub-routers with prefixes
router.use('/admin', adminRoutes);
router.use('/drops', dropRoutes);
router.use('/votes', voteRoutes);

module.exports = router;
