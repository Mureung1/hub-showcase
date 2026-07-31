import { z } from "zod";
import { AiProviderSchema, SourceAnswerStatusSchema } from "./enums.js";
import { ErrorCodeSchema } from "./errorCodes.js";
import { SourceAnswerSchema } from "./sourceAnswer.js";
import { AgendaSchema } from "./agenda.js";
import { FinalAnswerSchema } from "./finalAnswer.js";
import { DecisionNoteSchema } from "./decisionNote.js";

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

/**
 * SPEC-AI-002 §12.2 — Manager 단계 1~6 진행 알림 (T-019.4 신설).
 *
 * ⚠️ **이것이 없으면 `source_answer.done` 이후 `agenda.created`까지 70초간 화면이 비어
 * 있다.** heartbeat만 흐르고 사용자는 멈춘 것으로 본다. §2.3이 조기 표시를 필수로
 * 격상했는데, 완화가 시작되는 지점 자체가 70초 뒤였다.
 *
 * 결과가 아니라 **경과**를 싣는다 — 저장하지 않고 화면 표시에만 쓴다.
 */
export const AgendaProgressEventSchema = z.object({
  type: z.literal("agenda.progress"),
  /** 어느 구간인가. web은 이 값으로 문구를 고른다. */
  stage: z.enum(["classify", "leftover", "finalize", "judge"]),
  /** 진행 카운터 — `judge`에서 "판정 N/M"을 만든다. 카운터가 없는 구간은 null. */
  done: z.number().int().nonnegative().nullable(),
  total: z.number().int().nonnegative().nullable(),
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

/**
 * SPEC-AI-003 §8 — FinalAnswer 생성 시작.
 *
 * **충돌 0건 경로에서만 의미가 있다**(§8.1). 그 경로는 사용자 판단이 없어 3사→Manager→
 * FinalAnswer가 연속 대기가 되므로 진행 표시가 필수다. 충돌이 있는 경로는 사용자 판단
 * 중에 스트림이 닫혀 있어 web이 고정 문구로 표시하고 GET으로 폴링한다.
 */
export const FinalAnswerProgressEventSchema = z.object({
  type: z.literal("final_answer.progress"),
});

/**
 * SPEC-AI-003 §8 — FinalAnswer·DecisionNote 저장 완료, Question `completed`.
 *
 * web의 종료 판정은 §12.2 규칙 그대로다 — 특정 이벤트 이름을 하드코딩하지 않고
 * "스트림 닫힘 + 마지막 `*.done` 스냅샷"으로 판단하므로 **web 로직은 바뀌지 않는다.**
 */
export const FinalAnswerDoneEventSchema = z.object({
  type: z.literal("final_answer.done"),
  finalAnswer: FinalAnswerSchema,
  decisionNote: DecisionNoteSchema,
});

export const QuestionStreamEventSchema = z.discriminatedUnion("type", [
  SourceAnswerUpdatedEventSchema,
  SourceAnswerDoneEventSchema,
  AgendaProgressEventSchema,
  AgendaCreatedEventSchema,
  AgendaJudgedEventSchema,
  AgendaDoneEventSchema,
  FinalAnswerProgressEventSchema,
  FinalAnswerDoneEventSchema,
]);
export type QuestionStreamEvent = z.infer<typeof QuestionStreamEventSchema>;
