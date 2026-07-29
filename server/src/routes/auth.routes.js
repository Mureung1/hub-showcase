const express = require('express');

const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth');
const requireVerifiedEmailUser = require('../middlewares/requireVerifiedEmailUser');

const router = express.Router();

router.post('/signup/mentee', requireVerifiedEmailUser, authController.signupMentee);
router.post('/signup/mentor', requireVerifiedEmailUser, authController.signupMentor);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
