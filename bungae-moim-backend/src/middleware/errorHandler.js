const ApiError = require('../utils/apiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  // 예상 못 한 에러의 원문에는 내부 사정이 담긴다 — 실제로 입력이 컬럼 길이를 넘겼을 때
  // Postgres 메시지가 그대로 클라이언트까지 나갔다. 응답에는 일반 문구만 주고 원문은
  // 서버 로그에만 남긴다(조사 단서는 잃지 않으면서 노출은 막는다).
  console.error('[errorHandler] 처리되지 않은 오류:', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버에서 오류가 발생했습니다' } });
}

module.exports = errorHandler;
