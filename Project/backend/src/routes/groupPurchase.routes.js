const express = require('express');
const { requireAuth, optionalAuth } = require('../middlewares/auth');
const { list, get, mine, create, join, cancelJoin, updateStatus, receive } = require('../controllers/groupPurchase.controller');

const router = express.Router();
router.get('/', list);
router.get('/mine', requireAuth, mine);
router.get('/:id', optionalAuth, get);
router.post('/', requireAuth, create);
router.post('/:id/join', requireAuth, join);
router.delete('/:id/join', requireAuth, cancelJoin);
router.patch('/:id/status', requireAuth, updateStatus);
router.patch('/:id/receipt', requireAuth, receive);

module.exports = router;
