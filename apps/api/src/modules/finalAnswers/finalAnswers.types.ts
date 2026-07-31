import { z } from "zod";
import type {
  Agenda,
  AiProvider,
  FinalAnswerGenerationMode,
} from "@decision-log/shared";

/**
 * FinalAnswer·DecisionNote 생성 내부 타입 (SPEC-AI-003 §3·§4·§6).
 *
 * **호출은 최대 1회다**(결정 2). FinalAnswer와 DecisionNote를 한 번에 받으며,
 * 전부 `rejected`면 0회다(§4.1).
 */

/** §5.2 — 전부 rejected일 때의 고정 문구. FinalAnswer·DecisionNote에 **동일하게** 저장한다. */
export const ALL_REJECTED_CONTENT =
  "모든 Agenda가 충돌하였습니다. 다시 질문 부탁드립니다.";

/** §5.2 — 대체 노트임을 표시하는 prompt_version 값. */
export const FALLBACK_NOTE_VERSION = "fallback";

/**
 * §3.2 출력 스키마.
 *
 * ⚠️ **`finalAnswer`가 앞에 온다.** §8.6의 "필드 순서가 사고 순서" 원칙 — 모델은 앞에 쓴
 * 글을 보고 뒤의 요약을 만든다. 이것이 §6의 "FinalAnswer를 **근거로**"를 한 번의 호출에서
 * 지키는 방법이다. 순서를 바꾸면 요약이 먼저 나와 근거 관계가 뒤집힌다.
 */
export const ComposeOutputSchema = z.object({
  finalAnswer: z.string(),
  decisionNote: z.string(),
});
export type ComposeOutput = z.infer<typeof ComposeOutputSchema>;

/** §4 모드 판정 입력 — 코드가 계산한다. LLM에 묻지 않는다. */
export interface ModeInput {
  agendas: Agenda[];
  /** 성공한(= `succeeded` 이고 비교에서 제외되지 않은) provider 목록. */
  succeededProviders: AiProvider[];
}

export interface ModeResult {
  mode: FinalAnswerGenerationMode;
  /** `single_source_fallback`일 때 제외된 provider. 그 외에는 빈 배열. */
  excludedProviders: AiProvider[];
  /** 모드 판정의 재료 — `input_snapshot`·지표에 그대로 실린다(§6.4). */
  passedCount: number;
  rejectedCount: number;
}

/** §11 관측 지표. `input_snapshot`에 함께 담는다. */
export interface ComposeMetrics {
  generationMode: FinalAnswerGenerationMode;
  /** 생성 호출 지연(ms). 미호출(`all_agendas_rejected`)이면 null. */
  durationMs: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
  /** DecisionNote가 §5.2 대체 경로로 만들어졌는가. `decisionNoteFallbackRate` 분자. */
  decisionNoteFallback: boolean;
  /** 타임아웃으로 실패한 횟수(§11 — 120초가 적정한지 판단 재료). */
  timeoutCount: number;
}
