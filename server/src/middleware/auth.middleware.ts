import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { HttpError } from './error.middleware.js';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new HttpError(401, '인증이 필요합니다.'));
    return;
  }

  try {
    const payload = verifyToken(header.slice('Bearer '.length));
    req.user = { id: payload.userId };
    next();
  } catch {
    next(new HttpError(401, '유효하지 않은 토큰입니다.'));
  }
}
