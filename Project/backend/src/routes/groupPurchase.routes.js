const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { list, get, mine, create, join, cancelJoin } = require('../controllers/groupPurchase.controller');

const router = express.Router();
router.get('/', list);
router.get('/mine', requireAuth, mine);
router.get('/:id', get);
router.post('/', requireAuth, create);
router.post('/:id/join', requireAuth, join);
router.delete('/:id/join', requireAuth, cancelJoin);

module.exports = router;
