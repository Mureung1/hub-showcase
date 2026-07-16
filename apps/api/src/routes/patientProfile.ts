import { accountTypeSchema, e164PhoneNumberSchema } from "@baro-jinryo/shared";
import { Router, type Request } from "express";
import { z } from "zod";
import type { AuthVerifier } from "../auth/authVerifier.js";
import { ApiError } from "../errors/apiError.js";
import type { PatientProfileService } from "../services/patientProfileService.js";

export function createPatientProfileRouter(
  authVerifier: AuthVerifier,
  service: PatientProfileService,
): Router {
  const router = Router();
  async function getAccountId(request: Request) {
    const match = request.header("authorization")?.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
    const user = await authVerifier.verify(match[1]);
    if (!user) throw new ApiError(401, "AUTH_INVALID", "로그인 정보가 유효하지 않습니다.");
    if (user.emailConfirmed === false) {
      throw new ApiError(403, "EMAIL_NOT_CONFIRMED", "이메일 확인을 먼저 완료해 주세요.");
    }
    return user.id;
  }

  router.get("/auth/me", async (request, response) => {
    const accountId = await getAccountId(request);
    response.json({ profile: await service.getProfile(accountId) });
  });

  router.post("/profiles", async (request, response) => {
    const accountId = await getAccountId(request);
    const { phoneNumber, accountType } = z.object({
      phoneNumber: e164PhoneNumberSchema,
      accountType: accountTypeSchema.extract(["patient", "hospital_admin"]),
    }).parse(request.body);
    response.status(201).json(await service.ensureProfile(accountId, phoneNumber, accountType));
  });
  return router;
}
