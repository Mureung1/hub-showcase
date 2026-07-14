const express = require('express');
const router = express.Router();
const { getAllDrops, getDropById } = require('../controllers/dropController');

// Routes prefixed with /api/drops
router.get('/', getAllDrops);
router.get('/:id', getDropById);

module.exports = router;
