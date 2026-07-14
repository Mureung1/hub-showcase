const express = require('express');
const ApiError = require('../utils/apiError');
const { exchangeGoogleCode, exchangeKakaoCode } = require('../services/oauthClients');
const { findOrCreateUserByProvider } = require('../services/userService');

const router = express.Router();

function toAuthResponse(user, isNewUser) {
  return {
    user: {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      birthDateRequired: user.birthDate === null,
    },
    isNewUser,
  };
}

router.post('/google', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      throw new ApiError('VALIDATION_ERROR', 'code가 필요합니다');
    }

    const profile = await exchangeGoogleCode(code);
    const { user, isNewUser } = await findOrCreateUserByProvider({
      provider: 'google',
      providerId: profile.providerId,
      email: profile.email,
      nickname: profile.nickname,
    });

    req.session.userId = user.id;
    res.json({ data: toAuthResponse(user, isNewUser) });
  } catch (err) {
    next(err);
  }
});

router.post('/kakao', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      throw new ApiError('VALIDATION_ERROR', 'code가 필요합니다');
    }

    const profile = await exchangeKakaoCode(code);
    const { user, isNewUser } = await findOrCreateUserByProvider({
      provider: 'kakao',
      providerId: profile.providerId,
      email: profile.email,
      nickname: profile.nickname,
    });

    req.session.userId = user.id;
    res.json({ data: toAuthResponse(user, isNewUser) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ data: { status: 'logged_out' } });
  });
});

module.exports = router;
