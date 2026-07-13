const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

router.post('/records', recordController.createRecord);
router.get('/records/:userId', recordController.getRecordByUserId);

module.exports = router;