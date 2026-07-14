const ApiError = require('../utils/apiError');

async function exchangeGoogleCode(code) {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    throw new ApiError('VALIDATION_ERROR', '구글 인증 코드 교환에 실패했습니다');
  }

  const { access_token: accessToken } = await tokenRes.json();

  const profileRes = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!profileRes.ok) {
    throw new ApiError('VALIDATION_ERROR', '구글 사용자 정보 조회에 실패했습니다');
  }

  const profile = await profileRes.json();

  if (!profile.email) {
    throw new ApiError('VALIDATION_ERROR', '구글 계정에서 이메일 제공에 동의해야 합니다');
  }

  return {
    providerId: profile.sub,
    email: profile.email,
    nickname: profile.name || profile.email,
  };
}

async function exchangeKakaoCode(code) {
  const params = {
    grant_type: 'authorization_code',
    client_id: process.env.KAKAO_CLIENT_ID,
    redirect_uri: process.env.OAUTH_REDIRECT_URI,
    code,
  };
  if (process.env.KAKAO_CLIENT_SECRET) {
    params.client_secret = process.env.KAKAO_CLIENT_SECRET;
  }

  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

  if (!tokenRes.ok) {
    throw new ApiError('VALIDATION_ERROR', '카카오 인증 코드 교환에 실패했습니다');
  }

  const { access_token: accessToken } = await tokenRes.json();

  const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    throw new ApiError('VALIDATION_ERROR', '카카오 사용자 정보 조회에 실패했습니다');
  }

  const profile = await profileRes.json();
  const kakaoAccount = profile.kakao_account || {};

  if (!kakaoAccount.email) {
    throw new ApiError('VALIDATION_ERROR', '카카오 계정에서 이메일 제공에 동의해야 합니다');
  }

  return {
    providerId: String(profile.id),
    email: kakaoAccount.email,
    nickname: (kakaoAccount.profile && kakaoAccount.profile.nickname) || kakaoAccount.email,
  };
}

module.exports = { exchangeGoogleCode, exchangeKakaoCode };
