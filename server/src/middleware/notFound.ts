import type { NextFunction, Request, Response } from "express";

export function notFound(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({ error: `요청한 경로를 찾을 수 없습니다: ${req.originalUrl}` });
}
