const express = require('express');

const {
  acceptApplication,
  createApplication,
  getApplications,
  rejectApplication,
} = require('../controllers/applications.controller');
const authenticate = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', createApplication);
router.get('/', getApplications);
router.patch('/:applicationId/accept', acceptApplication);
router.patch('/:applicationId/reject', rejectApplication);

module.exports = router;
