import { Response } from "express";
import { z } from "zod";

type ValidationIssueResponse = {
  path: string;
  message: string;
};

function toIssuePath(path: PropertyKey[]) {
  return path.map(String).join(".");
}

export function getStringParam(value: string | string[] | undefined) {
  if (!value || Array.isArray(value)) {
    return null;
  }

  return value;
}

export function getStringQuery(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function sendBadRequest(res: Response, message: string, code = "BAD_REQUEST") {
  res.status(400).json({
    code,
    message
  });
}

export function sendValidationError(res: Response, error: z.ZodError, fallbackMessage: string) {
  const issues: ValidationIssueResponse[] = error.issues.map((issue) => ({
    path: toIssuePath(issue.path),
    message: issue.message
  }));

  res.status(400).json({
    code: "VALIDATION_ERROR",
    message: error.issues[0]?.message ?? fallbackMessage,
    issues
  });
}

export function isValidDateText(value: string) {
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

export const dateTextSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다.")
  .refine(isValidDateText, "존재하는 날짜를 입력해주세요.");

export const timeTextSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시간은 HH:mm 형식으로 입력해주세요.");

export function uuidSchema(message: string) {
  return z.string().uuid(message);
}
