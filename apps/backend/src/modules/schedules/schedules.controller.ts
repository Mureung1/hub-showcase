import { Request, Response } from "express";
import { z } from "zod";
import { listStoreSchedules } from "./schedules.service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다.");

const scheduleQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema
  })
  .refine((value) => value.from <= value.to, {
    message: "종료 날짜는 시작 날짜보다 빠를 수 없습니다.",
    path: ["to"]
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
