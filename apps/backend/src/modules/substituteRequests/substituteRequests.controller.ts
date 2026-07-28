import { Request, Response } from "express";
import { z } from "zod";
import {
  getStringParam,
  sendBadRequest,
  sendValidationError,
  uuidSchema
} from "../../common/validation/requestValidation";
import {
  applyToSubstituteRequest,
  approveSubstituteRequest,
  createStoreSubstituteRequest,
  listStoreSubstituteRequests,
  rejectSubstituteRequest
} from "./substituteRequests.service";

const createSubstituteRequestSchema = z.object({
  scheduleId: uuidSchema("근무 일정을 선택해주세요."),
  reason: z
    .string()
    .trim()
    .min(1, "대타 요청 사유를 입력해주세요.")
    .max(200, "대타 요청 사유는 200자 이하로 입력해주세요.")
});
const requestIdSchema = uuidSchema("대타 요청 ID를 확인해주세요.");
const rejectSubstituteRequestSchema = z.object({
  rejectReason: z
    .string()
    .trim()
    .min(1, "거절 사유를 입력해주세요.")
    .max(200, "거절 사유는 200자 이하로 입력해주세요.")
});

export async function createSubstituteRequestController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    sendBadRequest(res, "매장 ID가 필요합니다.", "STORE_ID_REQUIRED");
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
    sendValidationError(res, result.error, "입력값을 확인해주세요.");
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
    sendBadRequest(res, "매장 ID가 필요합니다.", "STORE_ID_REQUIRED");
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
    sendBadRequest(res, "대타 요청 ID가 필요합니다.", "SUBSTITUTE_REQUEST_ID_REQUIRED");
    return;
  }

  const requestIdResult = requestIdSchema.safeParse(requestId);

  if (!requestIdResult.success) {
    sendValidationError(res, requestIdResult.error, "대타 요청 ID를 확인해주세요.");
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

export async function approveSubstituteRequestController(req: Request, res: Response) {
  const requestId = getStringParam(req.params.requestId);

  if (!requestId) {
    sendBadRequest(res, "대타 요청 ID가 필요합니다.", "SUBSTITUTE_REQUEST_ID_REQUIRED");
    return;
  }

  const requestIdResult = requestIdSchema.safeParse(requestId);

  if (!requestIdResult.success) {
    sendValidationError(res, requestIdResult.error, "대타 요청 ID를 확인해주세요.");
    return;
  }

  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const response = await approveSubstituteRequest({
    requestId: requestIdResult.data,
    actorUserId: req.authUser.id
  });

  res.status(200).json(response);
}

export async function rejectSubstituteRequestController(req: Request, res: Response) {
  const requestId = getStringParam(req.params.requestId);

  if (!requestId) {
    sendBadRequest(res, "대타 요청 ID가 필요합니다.", "SUBSTITUTE_REQUEST_ID_REQUIRED");
    return;
  }

  const requestIdResult = requestIdSchema.safeParse(requestId);

  if (!requestIdResult.success) {
    sendValidationError(res, requestIdResult.error, "대타 요청 ID를 확인해주세요.");
    return;
  }

  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const result = rejectSubstituteRequestSchema.safeParse(req.body);

  if (!result.success) {
    sendValidationError(res, result.error, "거절 사유를 확인해주세요.");
    return;
  }

  const response = await rejectSubstituteRequest({
    requestId: requestIdResult.data,
    actorUserId: req.authUser.id,
    rejectReason: result.data.rejectReason
  });

  res.status(200).json(response);
}
