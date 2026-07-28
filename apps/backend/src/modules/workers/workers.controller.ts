import { Request, Response } from "express";
import { z } from "zod";
import {
  getStringParam,
  sendBadRequest,
  sendValidationError,
  timeTextSchema,
  uuidSchema
} from "../../common/validation/requestValidation";
import { editWorker, listStoreWorkers } from "./workers.service";

const timeSchema = timeTextSchema;
const workerIdSchema = uuidSchema("알바생 ID를 확인해주세요.");

const updateWorkerSchema = z
  .object({
    hourlyWage: z.number().min(0, "시급은 0 이상이어야 합니다.").nullable().optional(),
    defaultWorkStartTime: timeSchema.nullable().optional(),
    defaultWorkEndTime: timeSchema.nullable().optional()
  })
  .refine(
    (value) =>
      value.hourlyWage !== undefined ||
      value.defaultWorkStartTime !== undefined ||
      value.defaultWorkEndTime !== undefined,
    {
      message: "수정할 값을 입력해주세요."
    }
  )
  .refine(
    (value) =>
      !value.defaultWorkStartTime ||
      !value.defaultWorkEndTime ||
      value.defaultWorkEndTime > value.defaultWorkStartTime,
    {
      message: "기본 종료 시간은 시작 시간보다 늦어야 합니다.",
      path: ["defaultWorkEndTime"]
    }
  );

export async function listWorkersController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    sendBadRequest(res, "매장 ID가 필요합니다.", "STORE_ID_REQUIRED");
    return;
  }

  const response = await listStoreWorkers(storeId);

  res.status(200).json(response);
}

export async function updateWorkerController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);
  const workerId = getStringParam(req.params.workerId);

  if (!storeId || !workerId) {
    sendBadRequest(res, "매장 ID와 알바생 ID가 필요합니다.", "WORKER_PARAMS_REQUIRED");
    return;
  }

  const workerIdResult = workerIdSchema.safeParse(workerId);

  if (!workerIdResult.success) {
    sendValidationError(res, workerIdResult.error, "알바생 ID를 확인해주세요.");
    return;
  }

  const result = updateWorkerSchema.safeParse(req.body);

  if (!result.success) {
    sendValidationError(res, result.error, "입력값을 확인해주세요.");
    return;
  }

  const response = await editWorker({
    storeId,
    workerId: workerIdResult.data,
    hourlyWage: result.data.hourlyWage,
    defaultWorkStartTime: result.data.defaultWorkStartTime,
    defaultWorkEndTime: result.data.defaultWorkEndTime
  });

  res.status(200).json(response);
}
