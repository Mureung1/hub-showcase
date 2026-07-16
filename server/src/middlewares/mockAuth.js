const { profiles } = require('../data/mockData');

const mockAuth = (req, res, next) => {
  const mockUserId = req.get('x-mock-user-id');
  const profile = profiles.find((item) => item.id === mockUserId);

  if (!mockUserId || !profile) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '로그인이 필요합니다.',
        details: {},
      },
    });
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
