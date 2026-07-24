const express = require('express');

const {
  acceptApplication,
  completeApplication,
  createApplication,
  getApplications,
  rejectApplication,
} = require('../controllers/applications.controller');
const authenticate = require('../middlewares/auth');
const messagesRouter = require('./messages.routes');

const router = express.Router();

router.use(authenticate);

router.post('/', createApplication);
router.get('/', getApplications);
router.patch('/:applicationId/accept', acceptApplication);
router.patch('/:applicationId/reject', rejectApplication);
router.patch('/:applicationId/complete', completeApplication);
router.use('/:applicationId/messages', messagesRouter);

module.exports = router;
