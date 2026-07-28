import { Request, Response } from "express";
import { z } from "zod";
import {
  dateTextSchema,
  getStringParam,
  getStringQuery,
  sendBadRequest,
  sendValidationError
} from "../../common/validation/requestValidation";
import { getPayrollSummary } from "./payroll.service";

const dateSchema = dateTextSchema;

const payrollSummaryQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema
  })
  .refine((value) => value.from <= value.to, {
    message: "종료 날짜는 시작 날짜보다 빠를 수 없습니다.",
    path: ["to"]
  });

export async function getPayrollSummaryController(req: Request, res: Response) {
  const storeId = getStringParam(req.params.storeId);

  if (!storeId) {
    sendBadRequest(res, "매장 ID가 필요합니다.", "STORE_ID_REQUIRED");
    return;
  }

  if (!req.storeMembership) {
    res.status(403).json({
      message: "매장 접근 권한이 없습니다."
    });
    return;
  }

  const result = payrollSummaryQuerySchema.safeParse({
    from: getStringQuery(req.query.from),
    to: getStringQuery(req.query.to)
  });

  if (!result.success) {
    sendValidationError(res, result.error, "조회 기간을 확인해주세요.");
    return;
  }

  const response = await getPayrollSummary({
    storeId,
    fromDate: result.data.from,
    toDate: result.data.to,
    membership: req.storeMembership
  });

  res.status(200).json(response);
}
