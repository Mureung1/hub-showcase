import { z } from "zod";

/**
 * Enum 계약 6종 — 값의 원본은 docs/data-model.md 4장.
 * SPEC-SCHEMA-001 4장을 그대로 옮긴 것이며, 이 파일에서 새로 정의하지 않는다.
 */

export const QuestionStatusSchema = z.enum([
  "draft",
  "processing",
  "review_required",
  "completed",
]);
export type QuestionStatus = z.infer<typeof QuestionStatusSchema>;

export const SourceAnswerStatusSchema = z.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
]);
export type SourceAnswerStatus = z.infer<typeof SourceAnswerStatusSchema>;

export const AgendaStatusSchema = z.enum([
  "draft",
  "conflicted",
  "recheck_requested",
  "reanswered",
  "passed",
  "rejected",
]);
export type AgendaStatus = z.infer<typeof AgendaStatusSchema>;

export const AgendaResolutionReasonSchema = z.enum([
  "auto_consensus",
  "user_accepted",
  "user_accepted_after_recheck",
  "user_composed",
  "user_composed_after_recheck",
  "user_rejected",
  "user_rejected_after_recheck",
  // SPEC-AI-002: 단일 소스 Agenda 자동 통과 (§3.4·§9.2). 다중 AI 합의(auto_consensus)와 구분한다.
  "auto_single_source",
]);
export type AgendaResolutionReason = z.infer<
  typeof AgendaResolutionReasonSchema
>;

/**
 * SPEC-AI-002 — Agenda 분류.
 * consensus: 다중 AI 합의 / conflict: 충돌 / single_source: 단일 소스 자동 통과.
 * 단일 소스를 다중 AI 합의로 표현하지 않는다(domain-policy 5.3·SPEC-AI-001 §6.1).
 */
export const AgendaKindSchema = z.enum([
  "consensus",
  "conflict",
  "single_source",
]);
export type AgendaKind = z.infer<typeof AgendaKindSchema>;

/**
 * SPEC-AI-002 §8.4 — 충돌 5유형 분류.
 * Manager 판정 결과(disagreementType)와 재검토 후 재분류(revisedType)에 함께 쓴다.
 */
export const AgendaDisagreementTypeSchema = z.enum([
  "paraphrasing",
  "detail_expansion",
  "detail_volume",
  "detail_content",
  "main_answer",
]);
export type AgendaDisagreementType = z.infer<
  typeof AgendaDisagreementTypeSchema
>;

export const FinalAnswerGenerationModeSchema = z.enum([
  "multi_source",
  "single_source_fallback",
  "all_agendas_rejected",
]);
export type FinalAnswerGenerationMode = z.infer<
  typeof FinalAnswerGenerationModeSchema
>;

export const AiProviderSchema = z.enum(["claude", "openai", "gemini"]);
export type AiProvider = z.infer<typeof AiProviderSchema>;
