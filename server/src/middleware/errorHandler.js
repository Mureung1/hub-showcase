import { ApiError } from "../utils/ApiError.js";

// api-spec.md 공통 에러 포맷: { error: { code, message } }
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `${req.method} ${req.originalUrl} 경로를 찾을 수 없습니다.` },
  });
}

// eslint 같은 도구가 없어도 Express가 에러 미들웨어로 인식하려면 인자 4개가 필요하다.
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } });
}
