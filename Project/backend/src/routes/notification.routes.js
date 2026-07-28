const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { listMine, removeMine } = require('../controllers/notification.controller');

const router = express.Router();
router.get('/', requireAuth, listMine);
router.delete('/:id', requireAuth, removeMine);

module.exports = router;
