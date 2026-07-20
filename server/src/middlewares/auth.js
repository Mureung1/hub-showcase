const { supabase } = require('../db/supabase');

const unauthorized = (res, message) =>
  res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message,
      details: {},
    },
  });

const authenticate = async (req, res, next) => {
  const authHeader = req.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return unauthorized(res, '로그인이 필요합니다.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return unauthorized(res, '유효하지 않거나 만료된 토큰입니다.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, name, nickname')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    return unauthorized(res, '사용자 프로필을 찾을 수 없습니다.');
  }

  req.user = {
    id: profile.id,
    role: profile.role,
    name: profile.name,
    nickname: profile.nickname,
  };
  req.token = token;

  return next();
};

module.exports = authenticate;
