import type { Request, Response } from "express";

export function notFound(request: Request, response: Response): void {
  response.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `${request.method} ${request.path} 경로를 찾을 수 없습니다.`,
    },
  });
}
