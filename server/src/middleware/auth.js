import jwt from 'jsonwebtoken';

// Authorization: Bearer <token> 헤더를 검증해서 req.user = {id, username}을 채운다.
// 로그인이 꼭 필요한 라우트에만 붙인다 — 지도/리스트 등 비로그인도 되는 화면의 API에는 안 쓴다.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    const err = new Error('로그인이 필요해요.');
    err.status = 401;
    err.code = 'AUTH_REQUIRED';
    return next(err);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch {
    const err = new Error('로그인이 만료됐어요. 다시 로그인해주세요.');
    err.status = 401;
    err.code = 'AUTH_REQUIRED';
    next(err);
  }
}
