const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { listMine } = require('../controllers/notification.controller');

const router = express.Router();
router.get('/', requireAuth, listMine);

module.exports = router;
