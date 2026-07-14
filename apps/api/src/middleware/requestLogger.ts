import type { NextFunction, Request, Response } from "express";

export function requestLogger(request: Request, response: Response, next: NextFunction): void {
  const startedAt = performance.now();

  response.on("finish", () => {
    const durationMs = Math.round(performance.now() - startedAt);
    console.info(`${request.method} ${request.path} ${response.statusCode} ${durationMs}ms`);
  });

  next();
}
