import type { RequestHandler } from "express";
import type { AuthVerifier } from "../auth/authVerifier.js";
import type { TransactionManager } from "../db/transactionManager.js";
import { ApiError } from "../errors/apiError.js";
import type { HospitalAccessRepository } from "../repositories/hospitalAccessRepository.js";

export interface StaffContext {
  accountId: string | null;
  hospitalId: string;
  developmentBypass: boolean;
}

interface StaffContextOptions {
  allowDevelopmentBypass: boolean;
  developmentHospitalId: string;
}

export function createRequireStaffContext(
  authVerifier: AuthVerifier,
  transactionManager: TransactionManager,
  accessRepository: HospitalAccessRepository,
  options: StaffContextOptions,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const authorization = request.header("authorization");
      if (!authorization && options.allowDevelopmentBypass) {
        response.locals.staffContext = {
          accountId: null,
          hospitalId: options.developmentHospitalId,
          developmentBypass: true,
        } satisfies StaffContext;
        next();
        return;
      }

      const match = authorization?.match(/^Bearer\s+(.+)$/i);
      if (!match?.[1]) throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
      const user = await authVerifier.verify(match[1]);
      if (!user) throw new ApiError(401, "AUTH_INVALID", "로그인 정보가 유효하지 않습니다.");
      if (user.emailConfirmed === false) {
        throw new ApiError(403, "EMAIL_NOT_CONFIRMED", "이메일 확인을 먼저 완료해 주세요.");
      }

      const access = await transactionManager.run((executor) =>
        accessRepository.findActiveByAccountId(executor, user.id),
      );
      if (!access) {
        throw new ApiError(403, "HOSPITAL_ACCESS_DENIED", "승인된 병원 소속을 확인할 수 없습니다.");
      }
      response.locals.staffContext = {
        accountId: user.id,
        hospitalId: access.hospitalId,
        developmentBypass: false,
      } satisfies StaffContext;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getStaffContext(locals: Record<string, unknown>): StaffContext {
  const context = locals.staffContext as StaffContext | undefined;
  if (!context) throw new ApiError(500, "STAFF_CONTEXT_MISSING", "직원 접근 정보를 찾을 수 없습니다.");
  return context;
}
