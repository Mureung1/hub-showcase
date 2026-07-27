// middleware/requireUser.js
// Authorization: Bearer <access_token> 헤더를 검증해서 req.user에 로그인 사용자 정보를 채운다.
// supabase 클라이언트를 인자로 받는 팩토리 — 각 라우터가 주입받은(실제/mock) 클라이언트를
// 그대로 넘겨 쓸 수 있도록 한다 (routes/timetables.js, routes/lectures.js의 DI 방식과 동일).
module.exports = function createRequireUser(supabase) {
  return async function requireUser(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: '유효하지 않은 세션입니다. 다시 로그인해주세요.' });
    }
    req.user = data.user;
    next();
  };
};
