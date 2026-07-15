const express = require('express');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const AppError = require('../utils/appError');

const router = express.Router();

router.post('/dev-login', async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new AppError(400, 'userId가 필요합니다', 'VALIDATION_ERROR');
    }

    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError(404, '해당 유저가 없습니다. 먼저 seed를 실행하세요.', 'USER_NOT_FOUND');
    }

    const accessToken = jwt.sign({ sub: user.id }, env.jwt.accessSecret, {
      expiresIn: env.jwt.accessExpiresIn,
    });

    return res.json({ success: true, data: { accessToken }, error: null });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

