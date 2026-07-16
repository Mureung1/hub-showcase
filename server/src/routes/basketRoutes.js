const express = require('express');
const router = express.Router();
const basketController = require('../controllers/basketController');

router.post('/basket', basketController.createBasketItem);
router.get('/basket', basketController.getBasketItems);

module.exports = router;