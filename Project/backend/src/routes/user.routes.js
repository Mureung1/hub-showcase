const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { updateMyLocation } = require('../controllers/user.controller');

const router = express.Router();

router.patch('/me/location', requireAuth, updateMyLocation);

module.exports = router;
