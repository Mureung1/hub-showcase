const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { join } = require('../controllers/groupPurchase.controller');

const router = express.Router();
router.post('/:id/join', requireAuth, join);
module.exports = router;
