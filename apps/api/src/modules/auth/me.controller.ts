import type { Request, Response } from "express";
import { AuthMeResponseSchema } from "@decision-log/shared";

import type { AuthenticatedRequest } from "./auth.types.js";

/**
 * GET /api/auth/me (SPEC-AUTH-003 2.4).
 * requireAuth 뒤에 놓이므로 req.auth는 검증된 JWT에서 채워져 있다.
 * 반환 userId는 클라이언트가 보낸 body·query·header의 어떤 값도 아니라 req.auth뿐이다(AC4).
 */
export function getMe(request: Request, response: Response): void {
  const { auth } = request as AuthenticatedRequest;
  const body = AuthMeResponseSchema.parse({
    userId: auth.userId,
    email: auth.email,
  });
  response.status(200).json(body);
}
