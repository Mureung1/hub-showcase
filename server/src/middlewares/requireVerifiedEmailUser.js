const { supabase } = require('../db/supabase');
const { sendError } = require('../utils/apiError');
const { SCHOOL_EMAIL_PATTERN } = require('../utils/validators');

const unauthorized = (res, message) => sendError(res, 401, 'UNAUTHORIZED', message);

const requireVerifiedEmailUser = async (req, res, next) => {
  const authHeader = req.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return unauthorized(res, '이메일 인증이 필요합니다.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return unauthorized(res, '유효하지 않거나 만료된 토큰입니다.');
  }

  const { user } = userData;

  if (!user.email_confirmed_at) {
    return unauthorized(res, '이메일 인증이 완료되지 않았습니다.');
  }

  if (!user.email || !SCHOOL_EMAIL_PATTERN.test(user.email)) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      '대학교 이메일(.ac.kr)로만 가입할 수 있습니다.',
      { field: 'email' },
    );
  }

  req.verifiedUser = { id: user.id, email: user.email };
  req.token = token;

  return next();
};

module.exports = requireVerifiedEmailUser;
