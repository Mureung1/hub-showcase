const express = require('express');
const router = express.Router();
const { dumpKreamPrices, triggerKreamCrawler } = require('../controllers/adminController');

// Routes prefixed with /api/admin
router.post('/kream-dump', dumpKreamPrices);
router.post('/kream-trigger', triggerKreamCrawler);

module.exports = router;
