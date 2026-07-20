import { z } from "zod";
import { QuestionStatusSchema } from "./enums.js";
import { ErrorCodeSchema } from "./errorCodes.js";

/** SPEC-SCHEMA-001 5.2 — Question. `?`는 nullable(값이 null일 수 있음). */
export const QuestionSchema = z.object({
  id: z.uuid(),
  chatId: z.uuid(),
  sequenceNumber: z.number().int().min(1),
  message: z.string().min(1).max(1000),
  status: QuestionStatusSchema,
  lastErrorCode: ErrorCodeSchema.nullable(),
  lastErrorMessage: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type Question = z.infer<typeof QuestionSchema>;
