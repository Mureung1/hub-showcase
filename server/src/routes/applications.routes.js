const express = require('express');

const {
  acceptApplication,
  createApplication,
  getApplications,
} = require('../controllers/applications.controller');

const router = express.Router();

router.post('/', createApplication);
router.get('/', getApplications);
router.patch('/:applicationId/accept', acceptApplication);

module.exports = router;
