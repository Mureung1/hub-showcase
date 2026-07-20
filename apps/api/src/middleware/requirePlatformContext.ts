import type { RequestHandler } from "express";
import type { AuthVerifier } from "../auth/authVerifier.js";
import type { TransactionManager } from "../db/transactionManager.js";
import { ApiError } from "../errors/apiError.js";
import type { ProfileRepository } from "../repositories/profileRepository.js";

export interface PlatformContext {
  accountId: string;
}

export function createRequirePlatformContext(
  authVerifier: AuthVerifier,
  transactionManager: TransactionManager,
  profileRepository: ProfileRepository,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const match = request.header("authorization")?.match(/^Bearer\s+(.+)$/i);
      if (!match?.[1]) throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
      const user = await authVerifier.verify(match[1]);
      if (!user) throw new ApiError(401, "AUTH_INVALID", "로그인 정보가 유효하지 않습니다.");
      const profile = await transactionManager.run((executor) =>
        profileRepository.findById(executor, user.id),
      );
      if (profile?.accountType !== "platform_admin" || profile.status !== "active") {
        throw new ApiError(403, "PLATFORM_ACCESS_DENIED", "플랫폼 관리자만 이용할 수 있습니다.");
      }
      response.locals.platformContext = { accountId: user.id } satisfies PlatformContext;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getPlatformContext(locals: Record<string, unknown>): PlatformContext {
  const context = locals.platformContext as PlatformContext | undefined;
  if (!context) throw new ApiError(500, "PLATFORM_CONTEXT_MISSING", "관리자 정보를 찾을 수 없습니다.");
  return context;
}
