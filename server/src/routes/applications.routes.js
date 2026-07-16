const express = require('express');

const {
  acceptApplication,
  createApplication,
  getApplications,
} = require('../controllers/applications.controller');
const mockAuth = require('../middlewares/mockAuth');

const router = express.Router();

router.use(mockAuth);

router.post('/', createApplication);
router.get('/', getApplications);
router.patch('/:applicationId/accept', acceptApplication);

module.exports = router;
