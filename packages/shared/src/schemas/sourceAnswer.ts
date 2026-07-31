import { z } from "zod";
import { AiProviderSchema, SourceAnswerStatusSchema } from "./enums.js";
import { ErrorCodeSchema } from "./errorCodes.js";

/**
 * SPEC-SCHEMA-001 5.3.1 — StructuredContent 골격.
 * sectionId는 Agenda 근거 추적을 위한 필수 안정 식별자.
 *
 * SPEC-AI-001 8.1에서 order·kind 확장. kind는 자유 문자열이며, 어젠다 분류·충돌
 * 판단 기준과 저장 구조는 SPEC-AI-002(Manager)에서 확정한다. AI-001은 provider가
 * 붙인 유형 데이터를 담아두기만 한다.
 * 값 부재(data-model 1.6): provider가 kind를 주지 못하면 null.
 */
export const SectionSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string(),
  content: z.string(),
  /** 표시·정렬 순서 (정수, 0부터) */
  order: z.number().int().min(0),
  /** 유형 라벨 (자유 문자열). provider가 주지 못하면 null */
  kind: z.string().nullable(),
});
export type Section = z.infer<typeof SectionSchema>;

export const StructuredContentSchema = z.object({
  /** 답변 전체 한 줄 요약. provider가 주지 못하면 null (data-model 1.6) */
  summary: z.string().nullable(),
  sections: z.array(SectionSchema).min(1),
});
export type StructuredContent = z.infer<typeof StructuredContentSchema>;

/**
 * SPEC-AI-001 8.3 — 관측 메타(응답 메타용 JSONB 한 칸).
 * 토큰 수는 provider가 주지 않을 수 있으므로 null 허용(data-model 1.6).
 * latencyMs는 started_at~completed_at 기반이라 서버가 항상 채운다.
 * model·promptVersion·startedAt·completedAt은 전용 칸을 쓰므로 여기 넣지 않는다.
 */
export const ResponseMetaSchema = z.object({
  inputTokens: z.number().int().min(0).nullable(),
  outputTokens: z.number().int().min(0).nullable(),
  latencyMs: z.number().int().min(0),
});
export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;

/** SPEC-SCHEMA-001 5.3 — SourceAnswer */
export const SourceAnswerSchema = z
  .object({
    id: z.uuid(),
    questionId: z.uuid(),
    provider: AiProviderSchema,
    model: z.string().min(1),
    status: SourceAnswerStatusSchema,
    structuredContent: StructuredContentSchema.nullable(),
    /** 관측 메타(8.3). 아직 호출 전이거나 메타를 못 얻으면 null */
    responseMeta: ResponseMetaSchema.nullable(),
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

// SSE 이벤트 계약(SourceAnswer 구간 + Manager 구간)은 questionStream.ts로 이동했다.
// (SPEC-AI-002 §12.2: 하나의 스트림으로 이어 쓰므로 Agenda 이벤트와 한 파일에 둔다.)
