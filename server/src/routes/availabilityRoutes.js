const express = require('express');
const availabilityController = require('../controllers/availabilityController');

const router = express.Router();

router.get('/', availabilityController.listAvailability);
router.post('/', availabilityController.saveAvailability);

module.exports = router;
