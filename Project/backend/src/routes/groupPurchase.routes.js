const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { list, get, create, join } = require('../controllers/groupPurchase.controller');

const router = express.Router();
router.get('/', list);
router.get('/:id', get);
router.post('/', requireAuth, create);
router.post('/:id/join', requireAuth, join);

module.exports = router;
