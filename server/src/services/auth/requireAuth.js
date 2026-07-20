import { AppError } from '../../utils/errors.js';

export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return next(new AppError(401, 'not_authenticated', '로그인이 필요합니다.'));
  }
  next();
}
