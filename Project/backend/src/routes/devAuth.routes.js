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

    let user = await User.findByPk(userId);

    if (!user) {
      if (Number(userId) === 1) {
        user = await User.create({
          id: 1,
          email: 'host@test.com',
          nickname: '호스트 (공구장)',
          oauthProvider: 'KAKAO',
          oauthId: 'host-oauth-1',
          mannerTemperature: 36.5,
          noShowCount: 0,
        });
      } else if (Number(userId) === 2) {
        user = await User.create({
          id: 2,
          email: 'neighbor@test.com',
          nickname: '참여자 (이웃)',
          oauthProvider: 'NAVER',
          oauthId: 'part-oauth-1',
          mannerTemperature: 36.5,
          noShowCount: 0,
        });
      } else {
        throw new AppError(404, '해당 유저가 없습니다.', 'USER_NOT_FOUND');
      }
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

