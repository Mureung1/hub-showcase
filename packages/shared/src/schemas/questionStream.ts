import { z } from "zod";
import { AiProviderSchema, SourceAnswerStatusSchema } from "./enums.js";
import { ErrorCodeSchema } from "./errorCodes.js";
import { SourceAnswerSchema } from "./sourceAnswer.js";
import { AgendaSchema } from "./agenda.js";

/**
 * SPEC-AI-001 4장 + SPEC-AI-002 §12.2 — Question 처리 진행 SSE 이벤트.
 *
 * POST .../source-answers 응답 자체를 스트림으로 열고 web은 fetch ReadableStream으로
 * 소비한다(EventSource는 커스텀 헤더 불가·GET 전용이라 토큰을 URL에 실어야 하므로 쓰지 않는다).
 * SourceAnswer 스트림과 Manager(Agenda) 스트림을 하나의 스트림으로 이어 쓴다(§12.2).
 * api가 생성하고 web이 같은 스키마로 파싱하는 공유 계약이다.
 */

/** provider 상태가 바뀔 때마다 (SPEC-AI-001 4장). */
export const SourceAnswerUpdatedEventSchema = z.object({
  type: z.literal("source_answer.updated"),
  provider: AiProviderSchema,
  status: SourceAnswerStatusSchema,
  errorCode: ErrorCodeSchema.nullable(),
});

/** SourceAnswer 구간 종료. 최종 스냅샷을 함께 실어 web이 별도 GET 없이 카드를 렌더한다. */
export const SourceAnswerDoneEventSchema = z.object({
  type: z.literal("source_answer.done"),
  sourceAnswers: z.array(SourceAnswerSchema),
});

/** SPEC-AI-002 §12.2 — 단계 5: 쟁점 목록을 draft로 일괄 생성했을 때. */
export const AgendaCreatedEventSchema = z.object({
  type: z.literal("agenda.created"),
  agendas: z.array(AgendaSchema),
});

/** SPEC-AI-002 §12.2 — 단계 6: 쟁점 하나의 판정이 끝날 때마다. */
export const AgendaJudgedEventSchema = z.object({
  type: z.literal("agenda.judged"),
  agenda: AgendaSchema,
});

/** SPEC-AI-002 §12.2 — Manager 구간 종료. 최종 Agenda 스냅샷을 함께 싣는다. */
export const AgendaDoneEventSchema = z.object({
  type: z.literal("agenda.done"),
  agendas: z.array(AgendaSchema),
});

export const QuestionStreamEventSchema = z.discriminatedUnion("type", [
  SourceAnswerUpdatedEventSchema,
  SourceAnswerDoneEventSchema,
  AgendaCreatedEventSchema,
  AgendaJudgedEventSchema,
  AgendaDoneEventSchema,
]);
export type QuestionStreamEvent = z.infer<typeof QuestionStreamEventSchema>;
