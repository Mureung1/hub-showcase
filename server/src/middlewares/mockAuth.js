const { profiles } = require('../data/mockData');
const { sendError } = require('../utils/apiError');

const mockAuth = (req, res, next) => {
  const mockUserId = req.get('x-mock-user-id');
  const profile = profiles.find((item) => item.id === mockUserId);

  if (!mockUserId || !profile) {
    return sendError(res, 401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  }

  req.user = {
    id: profile.id,
    role: profile.role,
    name: profile.name,
    nickname: profile.nickname,
  };

  return next();
};

module.exports = mockAuth;
