/**
 * 성공 여부 , 데이터 , 에러 Api 응답 포맷
 * 07_API_SPEC.md 2.4장의 공통 응답 포맷.
 */

export function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data, error: null });
}

export function fail(res, status, code, message) {
  res.status(status).json({ success: false, data: null, error: { code, message } });
}
