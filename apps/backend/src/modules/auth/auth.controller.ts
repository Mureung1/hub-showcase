import { Request, Response } from "express";
import { z } from "zod";
import { ensureProfile } from "./auth.service";

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
    res.status(400).json({
      message: result.error.issues[0]?.message ?? "입력값을 확인해주세요."
    });
    return;
  }

  const profile = await ensureProfile(req.authUser, result.data.name);

  res.status(201).json({
    profile
  });
}
