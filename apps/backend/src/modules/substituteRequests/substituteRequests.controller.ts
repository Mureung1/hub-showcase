import { Request, Response } from "express";
import { z } from "zod";
import {
  applyToSubstituteRequest,
  createStoreSubstituteRequest,
  listStoreSubstituteRequests
} from "./substituteRequests.service";

const createSubstituteRequestSchema = z.object({
  scheduleId: z.string().uuid("근무 일정을 선택해주세요."),
  reason: z
    .string()
    .trim()
    .min(1, "대타 요청 사유를 입력해주세요.")
    .max(200, "대타 요청 사유는 200자 이하로 입력해주세요.")
});
const requestIdSchema = z.string().uuid("대타 요청 ID를 확인해주세요.");

function getStringParam(value: string | string[] | undefined) {
  if (!value || Array.isArray(value)) {
    return null;
  }

  return value;
}

export async function createSubstituteRequestController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    res.status(400).json({
      message: "매장 ID가 필요합니다."
    });
    return;
  }

  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const result = createSubstituteRequestSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: result.error.issues[0]?.message ?? "입력값을 확인해주세요."
    });
    return;
  }

  const response = await createStoreSubstituteRequest({
    storeId,
    scheduleId: result.data.scheduleId,
    requesterId: req.authUser.id,
    reason: result.data.reason
  });

  res.status(201).json(response);
}

export async function listSubstituteRequestsController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    res.status(400).json({
      message: "매장 ID가 필요합니다."
    });
    return;
  }

  if (!req.authUser || !req.storeMembership) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const response = await listStoreSubstituteRequests({
    storeId,
    actorUserId: req.authUser.id,
    actorRole: req.storeMembership.role
  });

  res.status(200).json(response);
}

export async function applySubstituteRequestController(req: Request, res: Response) {
  const requestId = getStringParam(req.params.requestId);

  if (!requestId) {
    res.status(400).json({
      message: "대타 요청 ID가 필요합니다."
    });
    return;
  }

  const requestIdResult = requestIdSchema.safeParse(requestId);

  if (!requestIdResult.success) {
    res.status(400).json({
      message: requestIdResult.error.issues[0]?.message ?? "대타 요청 ID를 확인해주세요."
    });
    return;
  }

  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const response = await applyToSubstituteRequest({
    requestId: requestIdResult.data,
    actorUserId: req.authUser.id
  });

  res.status(200).json(response);
}
