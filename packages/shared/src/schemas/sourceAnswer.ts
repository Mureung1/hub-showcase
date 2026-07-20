import { z } from "zod";
import { AiProviderSchema, SourceAnswerStatusSchema } from "./enums.js";
import { ErrorCodeSchema } from "./errorCodes.js";

/**
 * SPEC-SCHEMA-001 5.3.1 — StructuredContent 최소 골격.
 * 필드 확장은 SPEC-AI-001에서. sectionId는 Agenda 근거 추적을 위한 필수 안정 식별자.
 */
export const SectionSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string(),
  content: z.string(),
});
export type Section = z.infer<typeof SectionSchema>;

export const StructuredContentSchema = z.object({
  sections: z.array(SectionSchema).min(1),
});
export type StructuredContent = z.infer<typeof StructuredContentSchema>;

/** SPEC-SCHEMA-001 5.3 — SourceAnswer */
export const SourceAnswerSchema = z
  .object({
    id: z.uuid(),
    questionId: z.uuid(),
    provider: AiProviderSchema,
    model: z.string().min(1),
    status: SourceAnswerStatusSchema,
    structuredContent: StructuredContentSchema.nullable(),
    errorCode: ErrorCodeSchema.nullable(),
    errorMessage: z.string().nullable(),
    retryCount: z.number().int().min(0).max(1),
    excludedFromComparison: z.boolean().default(false),
    excludedAt: z.iso.datetime({ offset: true }).nullable(),
    startedAt: z.iso.datetime({ offset: true }).nullable(),
    completedAt: z.iso.datetime({ offset: true }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine((value, ctx) => {
    // 6장: status = failed 면 errorCode 필수
    if (value.status === "failed" && value.errorCode === null) {
      ctx.addIssue({
        code: "custom",
        path: ["errorCode"],
        message: "status가 failed면 errorCode는 필수다.",
      });
    }
    // 6장: status = succeeded 면 structuredContent 필수
    if (value.status === "succeeded" && value.structuredContent === null) {
      ctx.addIssue({
        code: "custom",
        path: ["structuredContent"],
        message: "status가 succeeded면 structuredContent는 필수다.",
      });
    }
    // 6장: excludedFromComparison = true 면 excludedAt 필수
    if (value.excludedFromComparison && value.excludedAt === null) {
      ctx.addIssue({
        code: "custom",
        path: ["excludedAt"],
        message: "excludedFromComparison이 true면 excludedAt은 필수다.",
      });
    }
  });
export type SourceAnswer = z.infer<typeof SourceAnswerSchema>;
