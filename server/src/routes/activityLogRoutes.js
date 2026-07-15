const express = require('express');
const activityLogController = require('../controllers/activityLogController');

const router = express.Router();

router.get('/', activityLogController.listLogs);

module.exports = router;
