const express = require('express');

const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth');

const router = express.Router();

router.post('/signup/mentee', authController.signupMentee);
router.post('/signup/mentor', authController.signupMentor);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
