import type { AiProvider, FinalAnswerGenerationMode } from "@decision-log/shared";
import type { ComposeOutput } from "../finalAnswers.types.js";

/**
 * FinalAnswerComposer 포트 (SPEC-AI-003 §3 · ADR-005 7번째 포트).
 *
 * **기존 포트와 겹치지 않는다** — `AgendaRechecker`를 6번째로 등재할 때 쓴 기준 그대로다.
 *
 * | | ConflictComparator | FinalAnswerComposer |
 * |---|---|---|
 * | 입력 | 쟁점 1개의 섹션 원문 | 확정된 Agenda 전체 + 모드 |
 * | 출력 | stances·disagreementType | finalAnswer·decisionNote |
 * | 성격 | 판정(비교) | 종합(생성) |
 *
 * `reasoning` 설정도 독립적으로 움직인다 — §3.4가 단계 6과 달리 **무설정으로 시작**하라고
 * 명시했다(인용 복사가 아니라 종합·요약이라 특성이 다르다).
 */

/** §3.1 입력에 담을 확정 쟁점. `stances`·`quotes`는 넣지 않는다 — 판정 근거이지 답변 재료가 아니다. */
export interface PassedAgendaInput {
  title: string;
  summary: string;
  /** 사용자가 확정한 내용. `user_composed`면 **사용자가 직접 쓴 글**이다(§12 신규 위협). */
  selectedContent: string;
  /** 근거 요약 — 어느 SourceAnswer·Section에서 왔는지. 없으면 빈 배열. */
  sourceRefSummary: string[];
}

export interface RejectedAgendaInput {
  title: string;
}

export interface ComposeInput {
  /** 원 질문. **비신뢰 입력**이므로 구분 블록에 넣는다(§16.2). */
  question: string;
  passed: PassedAgendaInput[];
  rejected: RejectedAgendaInput[];
  mode: FinalAnswerGenerationMode;
  /** `single_source_fallback`일 때 제외된 provider. 문구 제약에 쓴다(§3.3). */
  excludedProviders: AiProvider[];
}

export interface ComposeCallResult {
  output: ComposeOutput;
  /** §11 지표 — `reasoning` 설정 판단 재료다. */
  completionTokens: number | null;
  reasoningTokens: number | null;
}

export interface FinalAnswerComposer {
  readonly version: string;
  /**
   * FinalAnswer와 DecisionNote를 **한 번의 호출로** 받는다(결정 2).
   * 두 번 부르지 않는다 — `finalAnswer`가 스키마 앞에 있어 그것을 근거로 요약이 만들어진다.
   */
  compose(input: ComposeInput): Promise<ComposeCallResult>;
  /**
   * §5.2 — DecisionNote만 재생성한다. FinalAnswer는 이미 있으므로 요약만 다시 요청한다.
   * 이것도 실패하면 호출부가 코드 대체 노트로 넘어간다.
   */
  composeNoteOnly(input: ComposeInput & { finalAnswer: string }): Promise<{
    decisionNote: string;
    completionTokens: number | null;
  }>;
}
