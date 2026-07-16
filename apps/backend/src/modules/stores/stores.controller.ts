import { Request, Response } from "express";
import { z } from "zod";
import { createStore } from "./stores.service";

const createStoreSchema = z.object({
  name: z.string().trim().min(1, "매장명을 입력해주세요."),
  address: z.string().trim().optional()
});

export async function createStoreController(req: Request, res: Response) {
  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const result = createStoreSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: result.error.issues[0]?.message ?? "입력값을 확인해주세요."
    });
    return;
  }

  try {
    const response = await createStore({
      ownerId: req.authUser.id,
      name: result.data.name,
      address: result.data.address
    });

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "매장 생성에 실패했습니다.";

    if (message.includes("Profile not found")) {
      res.status(404).json({
        code: "PROFILE_NOT_FOUND",
        message: "프로필을 먼저 생성해주세요."
      });
      return;
    }

    throw error;
  }
}
