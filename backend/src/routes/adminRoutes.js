const express = require('express');
const router = express.Router();
const { dumpKreamPrices, triggerKreamCrawler, updateProductImages } = require('../controllers/adminController');

// Routes prefixed with /api/admin
router.post('/kream-dump', dumpKreamPrices);
router.post('/kream-trigger', triggerKreamCrawler);
router.post('/update-images', updateProductImages);

module.exports = router;
