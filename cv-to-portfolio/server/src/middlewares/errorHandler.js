// 404 — 매칭되는 라우트가 없을 때.
export function notFound(_req, res) {
  res.status(404).json({ error: "Not Found" });
}

// 공통 에러 핸들러 — ServiceError 의 status 를 존중하고, 그 외는 500.
// eslint-disable-next-line no-unused-vars -- Express 는 4-인자 시그니처로 에러 핸들러를 인식
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Internal Server Error" });
}
