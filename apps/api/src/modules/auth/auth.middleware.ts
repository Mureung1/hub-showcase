import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AUTH_ERROR_CODES } from "@decision-log/shared";

import { getSupabaseClient } from "../../shared/supabase/supabaseClient.js";
import { sendError } from "../../shared/http/errorEnvelope.js";
import "./auth.types.js";

/**
 * Auth Middleware (SPEC-AUTH-003 2.3).
 * - `Authorization: Bearer <token>`을 읽는다. 없거나 형식이 어긋나면 401 UNAUTHENTICATED.
 * - 토큰을 supabase.auth.getUser(token)로 검증한다. 실패면 401 TOKEN_INVALID(message에 원문).
 * - 성공하면 검증된 사용자에서만 req.auth = { userId, email }을 채운다.
 *
 * 미들웨어는 인프라 계층이므로 req를 받는다. Service는 이후 Spec에서 userId를 인자로 받는다.
 */

/** Supabase가 돌려준 user 객체는 unknown으로 받아 필요한 필드만 좁힌다 (CLAUDE.md 5장). */
const supabaseUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().nullish(),
});

/** `Authorization` 헤더에서 Bearer 토큰만 추출한다. 형식이 아니면 null. */
function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer (.+)$/.exec(header.trim());
  if (!match) return null;
  const token = match[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(request.header("authorization"));
  if (!token) {
    sendError(
      response,
      401,
      AUTH_ERROR_CODES.UNAUTHENTICATED,
      "인증 토큰이 없습니다. Authorization: Bearer <token> 헤더가 필요합니다.",
    );
    return;
  }

  let userData: unknown;
  try {
    const { data, error } = await getSupabaseClient().auth.getUser(token);
    if (error) {
      // Supabase 원문을 message에 담아 디버깅 가시성을 준다(비밀값·토큰·스택은 담지 않음).
      sendError(response, 401, AUTH_ERROR_CODES.TOKEN_INVALID, error.message);
      return;
    }
    userData = data.user;
  } catch {
    // 검증 호출 자체가 실패(네트워크 등)해도 토큰의 유효성을 판정할 수 없으므로 401로 처리한다.
    sendError(
      response,
      401,
      AUTH_ERROR_CODES.TOKEN_INVALID,
      "토큰을 검증하지 못했습니다.",
    );
    return;
  }

  const parsed = supabaseUserSchema.safeParse(userData);
  if (!parsed.success) {
    sendError(
      response,
      401,
      AUTH_ERROR_CODES.TOKEN_INVALID,
      "검증된 사용자 정보를 확인하지 못했습니다.",
    );
    return;
  }

  request.auth = {
    userId: parsed.data.id,
    email: parsed.data.email ?? "",
  };
  next();
}
