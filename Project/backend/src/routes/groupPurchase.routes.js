const express = require('express');
const { requireAuth, optionalAuth } = require('../middlewares/auth');
const { list, get, mine, create, join, cancelJoin, updateStatus, payment, confirmPayment, receive, favorites, addFavorite, removeFavorite } = require('../controllers/groupPurchase.controller');

const router = express.Router();
router.get('/', optionalAuth, list);
router.get('/mine', requireAuth, mine);
router.get('/favorites', requireAuth, favorites);
router.get('/:id', optionalAuth, get);
router.post('/:id/favorite', requireAuth, addFavorite);
router.delete('/:id/favorite', requireAuth, removeFavorite);
router.post('/', requireAuth, create);
router.post('/:id/join', requireAuth, join);
router.delete('/:id/join', requireAuth, cancelJoin);
router.patch('/:id/status', requireAuth, updateStatus);
router.patch('/:id/payment', requireAuth, payment);
router.patch('/:id/payments/:applicationId/confirm', requireAuth, confirmPayment);
router.patch('/:id/receipt', requireAuth, receive);

module.exports = router;
