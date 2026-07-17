/**
 * features/chat 도메인 타입.
 *
 * SPEC-SCHEMA-001로 확정: 평면 엔티티 타입은 `@decision-log/shared`의 z.infer
 * 계약을 그대로 사용하고, web에서 재정의하지 않는다. 중첩 집합체(Chat→questions→
 * sourceAnswers 등)는 UI 전용 파생 구조로만 이 파일에 유지하며, shared 엔티티를
 * 교차 타입으로 조합해 만든다 (Spec 9장 245·246행).
 */
import type {
  AiProvider,
  Chat as ChatEntity,
  Question as QuestionEntity,
  SourceAnswer as SourceAnswerEntity,
  Agenda as AgendaEntity,
  FinalAnswer,
  DecisionNote as DecisionNoteEntity,
  Section,
} from "@decision-log/shared";

// 계약 그대로 재노출 (별칭 포함) — 컴포넌트는 이 이름들로 계속 import한다.
export type {
  AiProvider,
  QuestionStatus,
  SourceAnswerStatus,
  AgendaStatus,
  AgendaResolutionReason,
  FinalAnswerGenerationMode,
  FinalAnswer,
  Section,
} from "@decision-log/shared";

/** 내부 provider 식별자. 표시 라벨(Claude·ChatGPT·Gemini)은 mockData의 providerMeta에 둔다. */
export type Provider = AiProvider;

/** SourceAnswer 구조화 응답의 Section 별칭 (Mock Section 데이터에서 사용). */
export type AnswerSection = Section;

/**
 * Agenda 근거가 된 SourceAnswer·Section 참조 (UI 전용 파생).
 * SPEC-AI-002(Manager)에서 정식 계약(source_refs)으로 승격 예정.
 */
export interface AgendaSourceRef {
  sourceAnswerId: string;
  sectionId: string;
}

/**
 * 충돌 입장(stance) — AI별 입장과 그 근거 (UI 전용 파생).
 * SPEC-AI-002에서 정식 계약으로 승격 예정이므로 shared로 옮기지 않는다.
 */
export interface AgendaStance {
  provider: Provider;
  text: string;
  sourceRefs: AgendaSourceRef[];
}

/** SourceAnswer 뷰 — 현재는 계약 엔티티 그대로 (UI 추가 필드 없음). */
export type SourceAnswer = SourceAnswerEntity;

/** Agenda 뷰 = 계약 엔티티 + UI 전용 stances. */
export type Agenda = AgendaEntity & {
  stances: AgendaStance[];
};

/** Question 뷰 = 계약 엔티티 + 중첩 집합체(UI 전용 파생). */
export type Question = QuestionEntity & {
  sourceAnswers: SourceAnswer[];
  agendas: Agenda[];
  finalAnswer: FinalAnswer | null;
};

/** Chat 뷰 = 계약 엔티티 + 중첩 questions(UI 전용 파생). */
export type Chat = ChatEntity & {
  questions: Question[];
};

/**
 * DecisionNote 뷰 = 계약 엔티티 + UI 전용 파생 표시 필드.
 * chatId·title·bullets는 계약(shared)에 없으며 화면 표시용으로만 둔다.
 * (chatId는 Question→Chat join으로, title은 Chat.title로, bullets는 content로부터
 * 파생 가능한 값이다. seq·sources는 결정 2-1에 따라 존재하지 않는다.)
 */
export type DecisionNote = DecisionNoteEntity & {
  chatId: string;
  title: string;
  bullets: string[];
};

/**
 * 자유형(unknown) recheckResult를 표시·채택용 문자열로 좁힌다.
 * 정식 모양은 SPEC-AI-002에서 확정된다 (결정 2-2). Mock은 문자열을 저장한다.
 */
export function agendaRecheckText(agenda: Agenda): string | null {
  return typeof agenda.recheckResult === "string" ? agenda.recheckResult : null;
}

/** 아직 사용자 판단이 남은 Agenda (conflicted·recheck_requested·reanswered) */
export function isAgendaUnresolved(agenda: Agenda): boolean {
  return agenda.status !== "passed" && agenda.status !== "rejected";
}

/**
 * SourceAnswer가 최종 상태에 도달했는지 여부.
 * succeeded, 또는 재시도(1회)까지 실패해 비교에서 제외된 경우만 최종이다.
 * 첫 실패(retryCount 0의 failed)는 자동 재시도가 남아 있어 최종이 아니다.
 */
export function isSourceAnswerSettled(answer: SourceAnswer): boolean {
  return (
    answer.status === "succeeded" ||
    (answer.status === "failed" && answer.excludedFromComparison)
  );
}

/** 미완료 Question(processing / review_required) 존재 여부 — Chat 목록 ● 표시와 새 질문 차단 기준 */
export function hasIncompleteQuestion(chat: Chat): boolean {
  return chat.questions.some(
    (q) => q.status === "processing" || q.status === "review_required",
  );
}
