import { createLogger } from '../utils/logger.js';

const logger = createLogger('errorHandler');

// 존재하지 않는 경로 → openapi.yaml 공통 에러 형식으로 404 응답
export function notFound(req, res) {
    res.status(404).json({
        error: { code: 'NOT_FOUND', message: '요청한 경로를 찾을 수 없습니다.' },
    });
}

// 전역 에러 핸들러: err.status/err.code가 지정된 에러는 그대로, 그 외는 500 INTERNAL_ERROR
// (Express 에러 핸들러는 인자 4개 시그니처가 필수)
export function errorHandler(err, req, res, _next) {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = status === 500
        ? '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        : err.message;

    logger.error('요청 처리 중 오류:', { error: err.message, stack: err.stack, path: req.path, code });
    res.status(status).json({ error: { code, message } });
}
