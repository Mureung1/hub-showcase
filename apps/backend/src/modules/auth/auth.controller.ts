import { Request, Response } from "express";
import { z } from "zod";
import { sendValidationError } from "../../common/validation/requestValidation";
import { ensureProfile, getCurrentUser } from "./auth.service";

const createProfileSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.")
});

export async function createProfileController(req: Request, res: Response) {
  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const result = createProfileSchema.safeParse(req.body);

  if (!result.success) {
    sendValidationError(res, result.error, "입력값을 확인해주세요.");
    return;
  }

  const profile = await ensureProfile(req.authUser, result.data.name);

  res.status(201).json({
    profile
  });
}

export async function getCurrentUserController(req: Request, res: Response) {
  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const currentUser = await getCurrentUser(req.authUser);

  if (!currentUser) {
    res.status(404).json({
      code: "PROFILE_NOT_FOUND",
      message: "프로필을 먼저 생성해주세요."
    });
    return;
  }

  res.status(200).json(currentUser);
}
