import type { AiProvider } from "@decision-log/shared";
import type { CompareOutput } from "../agendas.types.js";

/**
 * ConflictComparator 포트 (ADR-005 · SPEC-AI-002 §15.4).
 * 단계 6(합의/충돌 판정)만 노출한다. 쟁점 하나가 호출 하나다(§8.1).
 * 사용 프롬프트 버전은 `agendas.prompt_version` + `manager_meta.comparatorVersion`에 스탬프된다.
 */

/** 비교 대상 섹션 (LLM 입력용). content는 §16.2 구분 블록으로 감싸 전달된다. */
export interface ComparableSection {
  provider: AiProvider;
  sectionId: string;
  title: string;
  content: string;
}

/**
 * 단계 6 입력 (§8.3).
 *
 * ⚠️ **pivot이 누구인지 넣지 않는다.** 알려주면 판정이 그쪽으로 기운다(§8.3).
 * 다른 쟁점의 정보와 이전 Question의 Context도 넣지 않는다.
 */
export interface CompareInput {
  /** 원 질문. 판정의 맥락이자 **비신뢰 입력**이므로 구분 블록에 넣는다(§16.1). */
  question: string;
  /** 단계 4에서 중립화된 최종 쟁점 제목. */
  agendaTitle: string;
  /** 이 쟁점에 배정된 섹션 전문. 순서는 호출 전에 셔플되어 들어온다(§8.3). */
  sections: ComparableSection[];
  /** 이 쟁점의 참여 provider. 출력 스키마의 `provider` enum을 런타임 생성하는 데 쓴다(§8.6). */
  participants: AiProvider[];
}

export interface ComparatorCallResult {
  output: CompareOutput;
  /** 실측 출력 토큰 — 없으면 null. §5.5의 430토큰 추정과 대조한다(§I 실측). */
  outputTokens: number | null;
}

export interface ConflictComparator {
  readonly version: string;
  /** 단계 6 · 합의/충돌 판정 (Manager 호출 3). 쟁점 하나당 1회. */
  compare(input: CompareInput): Promise<ComparatorCallResult>;
}
