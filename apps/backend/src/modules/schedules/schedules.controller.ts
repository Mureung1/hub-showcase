import { Request, Response } from "express";
import { z } from "zod";
import { createStoreSchedule, listStoreSchedules, listStoreSchedulesByDate } from "./schedules.service";

function isValidDateText(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(year, monthIndex, day);

  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다.")
  .refine(isValidDateText, "존재하는 날짜를 입력해주세요.");

const scheduleQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema
  })
  .refine((value) => value.from <= value.to, {
    message: "종료 날짜는 시작 날짜보다 빠를 수 없습니다.",
    path: ["to"]
  });

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시간은 HH:mm 형식이어야 합니다.");

const optionalTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `${maxLength}자 이하로 입력해주세요.`)
    .optional()
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

function getStringParam(value: string | string[] | undefined) {
  if (!value || Array.isArray(value)) {
    return null;
  }

  return value;
}

function getStringQuery(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export async function listSchedulesController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    res.status(400).json({
      message: "매장 ID가 필요합니다."
    });
    return;
  }

  const result = scheduleQuerySchema.safeParse({
    from: getStringQuery(req.query.from),
    to: getStringQuery(req.query.to)
  });

  if (!result.success) {
    res.status(400).json({
      message: result.error.issues[0]?.message ?? "조회 기간을 확인해주세요."
    });
    return;
  }

  const response = await listStoreSchedules(storeId, result.data.from, result.data.to);

  res.status(200).json(response);
}

export async function listSchedulesByDateController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);
  const date = getStringParam(req.params.date);

  if (!storeId || !date) {
    res.status(400).json({
      message: "매장 ID와 날짜가 필요합니다."
    });
    return;
  }

  const result = dateSchema.safeParse(date);

  if (!result.success) {
    res.status(400).json({
      message: result.error.issues[0]?.message ?? "날짜를 확인해주세요."
    });
    return;
  }

  const response = await listStoreSchedulesByDate(storeId, result.data);

  res.status(200).json(response);
}

export async function createScheduleController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    res.status(400).json({
      message: "매장 ID가 필요합니다."
    });
    return;
  }

  const result = createScheduleSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: result.error.issues[0]?.message ?? "입력값을 확인해주세요."
    });
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
