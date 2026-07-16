import type { RequestHandler } from "express";
import type { AuthVerifier } from "../auth/authVerifier.js";
import type { TransactionManager } from "../db/transactionManager.js";
import { ApiError } from "../errors/apiError.js";
import type { ProfileRepository } from "../repositories/profileRepository.js";

export interface PatientContext {
  accountId: string;
}

export function createRequirePatientContext(
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
      if (user.emailConfirmed === false) {
        throw new ApiError(403, "EMAIL_NOT_CONFIRMED", "이메일 확인을 먼저 완료해 주세요.");
      }

      const profile = await transactionManager.run((executor) =>
        profileRepository.findById(executor, user.id),
      );
      if (!profile) throw new ApiError(403, "PATIENT_PROFILE_REQUIRED", "환자 프로필을 먼저 등록해 주세요.");
      if (profile.accountType !== "patient" || profile.status !== "active") {
        throw new ApiError(403, "PATIENT_ACCESS_DENIED", "활성 환자 계정만 이용할 수 있습니다.");
      }

      response.locals.patientContext = { accountId: user.id } satisfies PatientContext;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getPatientContext(locals: Record<string, unknown>): PatientContext {
  const context = locals.patientContext as PatientContext | undefined;
  if (!context) throw new ApiError(500, "PATIENT_CONTEXT_MISSING", "환자 접근 정보를 찾을 수 없습니다.");
  return context;
}
