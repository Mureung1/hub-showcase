import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
  res.status(500).json({ error: message });
}
