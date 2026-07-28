import { Request, Response } from "express";
import { z } from "zod";
import {
  dateTextSchema,
  getStringParam,
  getStringQuery,
  sendBadRequest,
  sendValidationError,
  timeTextSchema,
  uuidSchema
} from "../../common/validation/requestValidation";
import {
  createStoreRecurringSchedules,
  createStoreSchedule,
  editStoreSchedule,
  listStoreSchedules,
  listStoreSchedulesByDate,
  removeStoreSchedule
} from "./schedules.service";

const dateSchema = dateTextSchema;
const scheduleIdSchema = uuidSchema("근무 일정 ID를 확인해주세요.");

const scheduleQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema
  })
  .refine((value) => value.from <= value.to, {
    message: "종료 날짜는 시작 날짜보다 빠를 수 없습니다.",
    path: ["to"]
  });

const timeSchema = timeTextSchema;

const optionalTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `${maxLength}자 이하로 입력해주세요.`)
    .nullish()
    .transform((value) => (value ? value : null));

const createScheduleSchema = z
  .object({
    workerId: z.string().uuid("알바생을 선택해주세요."),
    workDate: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    position: optionalTextSchema(40),
    memo: optionalTextSchema(200)
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "종료 시간은 시작 시간보다 늦어야 합니다.",
    path: ["endTime"]
  });

const createRecurringSchedulesSchema = z
  .object({
    workerId: z.string().uuid("알바생을 선택해주세요."),
    weekday: z.number().int().min(0, "요일을 선택해주세요.").max(6, "요일을 선택해주세요."),
    startDate: dateSchema,
    endDate: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    position: optionalTextSchema(40),
    memo: optionalTextSchema(200)
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "종료일은 시작일보다 빠를 수 없습니다.",
    path: ["endDate"]
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "종료 시간은 시작 시간보다 늦어야 합니다.",
    path: ["endTime"]
  });

const updateOptionalTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `${maxLength}자 이하로 입력해주세요.`)
    .nullable()
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      return value ? value : null;
    });

const updateScheduleSchema = z
  .object({
    workerId: z.string().uuid("알바생을 선택해주세요.").optional(),
    workDate: dateSchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    position: updateOptionalTextSchema(40),
    memo: updateOptionalTextSchema(200)
  })
  .refine(
    (value) =>
      value.workerId !== undefined ||
      value.workDate !== undefined ||
      value.startTime !== undefined ||
      value.endTime !== undefined ||
      value.position !== undefined ||
      value.memo !== undefined,
    {
      message: "수정할 값을 입력해주세요."
    }
  )
  .refine((value) => !value.startTime || !value.endTime || value.endTime > value.startTime, {
    message: "종료 시간은 시작 시간보다 늦어야 합니다.",
    path: ["endTime"]
  });

export async function listSchedulesController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    sendBadRequest(res, "매장 ID가 필요합니다.", "STORE_ID_REQUIRED");
    return;
  }

  const result = scheduleQuerySchema.safeParse({
    from: getStringQuery(req.query.from),
    to: getStringQuery(req.query.to)
  });

  if (!result.success) {
    sendValidationError(res, result.error, "조회 기간을 확인해주세요.");
    return;
  }

  const response = await listStoreSchedules(storeId, result.data.from, result.data.to);

  res.status(200).json(response);
}

export async function listSchedulesByDateController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);
  const date = getStringParam(req.params.date);

  if (!storeId || !date) {
    sendBadRequest(res, "매장 ID와 날짜가 필요합니다.", "SCHEDULE_DATE_PARAMS_REQUIRED");
    return;
  }

  const result = dateSchema.safeParse(date);

  if (!result.success) {
    sendValidationError(res, result.error, "날짜를 확인해주세요.");
    return;
  }

  const response = await listStoreSchedulesByDate(storeId, result.data);

  res.status(200).json(response);
}

export async function createScheduleController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    sendBadRequest(res, "매장 ID가 필요합니다.", "STORE_ID_REQUIRED");
    return;
  }

  const result = createScheduleSchema.safeParse(req.body);

  if (!result.success) {
    sendValidationError(res, result.error, "입력값을 확인해주세요.");
    return;
  }

  const response = await createStoreSchedule({
    storeId,
    workerId: result.data.workerId,
    workDate: result.data.workDate,
    startTime: result.data.startTime,
    endTime: result.data.endTime,
    position: result.data.position,
    memo: result.data.memo
  });

  res.status(201).json(response);
}

export async function createRecurringSchedulesController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    sendBadRequest(res, "매장 ID가 필요합니다.", "STORE_ID_REQUIRED");
    return;
  }

  const result = createRecurringSchedulesSchema.safeParse(req.body);

  if (!result.success) {
    sendValidationError(res, result.error, "입력값을 확인해주세요.");
    return;
  }

  const response = await createStoreRecurringSchedules({
    storeId,
    workerId: result.data.workerId,
    weekday: result.data.weekday,
    startDate: result.data.startDate,
    endDate: result.data.endDate,
    startTime: result.data.startTime,
    endTime: result.data.endTime,
    position: result.data.position,
    memo: result.data.memo
  });

  res.status(201).json(response);
}

export async function updateScheduleController(req: Request, res: Response) {
  const scheduleId = getStringParam(req.params.scheduleId);

  if (!scheduleId) {
    sendBadRequest(res, "근무 일정 ID가 필요합니다.", "SCHEDULE_ID_REQUIRED");
    return;
  }

  const scheduleIdResult = scheduleIdSchema.safeParse(scheduleId);

  if (!scheduleIdResult.success) {
    sendValidationError(res, scheduleIdResult.error, "근무 일정 ID를 확인해주세요.");
    return;
  }

  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const result = updateScheduleSchema.safeParse(req.body);

  if (!result.success) {
    sendValidationError(res, result.error, "입력값을 확인해주세요.");
    return;
  }

  const response = await editStoreSchedule({
    scheduleId: scheduleIdResult.data,
    actorUserId: req.authUser.id,
    workerId: result.data.workerId,
    workDate: result.data.workDate,
    startTime: result.data.startTime,
    endTime: result.data.endTime,
    position: result.data.position,
    memo: result.data.memo
  });

  res.status(200).json(response);
}

export async function deleteScheduleController(req: Request, res: Response) {
  const scheduleId = getStringParam(req.params.scheduleId);

  if (!scheduleId) {
    sendBadRequest(res, "근무 일정 ID가 필요합니다.", "SCHEDULE_ID_REQUIRED");
    return;
  }

  const scheduleIdResult = scheduleIdSchema.safeParse(scheduleId);

  if (!scheduleIdResult.success) {
    sendValidationError(res, scheduleIdResult.error, "근무 일정 ID를 확인해주세요.");
    return;
  }

  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  await removeStoreSchedule({
    scheduleId: scheduleIdResult.data,
    actorUserId: req.authUser.id
  });

  res.status(204).send();
}
