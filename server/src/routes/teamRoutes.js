const express = require('express');
const teamController = require('../controllers/teamController');

const router = express.Router();

router.get('/current', teamController.getCurrentTeam);

module.exports = router;
