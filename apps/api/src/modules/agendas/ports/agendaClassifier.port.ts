import type { AiProvider } from "@decision-log/shared";
import type { ClassifyOutput, LeftoverOutput } from "../agendas.types.js";

/**
 * AgendaClassifier 포트 (ADR-005 · SPEC-AI-002 §15.4).
 * 단계 3(섹션 정렬)과 단계 4(leftover + 제목 중립화)를 노출한다.
 * "이음새당 인터페이스 하나, 초기 구현 하나" — 범용 플러그인 로더는 만들지 않는다(§15.4).
 * 사용 프롬프트 버전은 manager_meta.classifierVersion에 스탬프된다.
 */

/** LLM에 앵커로 제시하는 쟁점(라벨 + 제목). */
export interface AgendaRef {
  id: string;
  title: string;
}

/** 비-pivot / leftover 섹션 (LLM 입력용). content는 §16.2 구분 블록으로 감싸 전달된다. */
export interface ClassifiableSection {
  id: string;
  provider: AiProvider;
  title: string;
  content: string;
}

/** 단계 3 입력 (§5). 섹션·쟁점 순서는 호출 전에 셔플되어 들어온다(§4.3). */
export interface ClassifyInput {
  agendas: AgendaRef[];
  sections: ClassifiableSection[];
}

/** 단계 4 입력 (§6). */
export interface LeftoverInput {
  /** 재배정 대상이 될 수 있는 기존 쟁점 전체. */
  existingAgendas: AgendaRef[];
  /** 새 쟁점 생성·재배정 대상 섹션. leftover=0이면 빈 배열(축소 스키마 사용). */
  leftoverSections: ClassifiableSection[];
  /** 제목 중립화 대상(의심 제목) 쟁점. */
  suspiciousAgendas: AgendaRef[];
}

export interface ClassifierCallResult<T> {
  output: T;
  /** 실측 출력 토큰 — 없으면 null. stage3OutputTokens 지표에 쓴다(§5.5). */
  outputTokens: number | null;
}

export interface AgendaClassifier {
  readonly version: string;
  /** 단계 3 · 섹션 정렬 (Manager 호출 1). */
  classifySections(
    input: ClassifyInput,
  ): Promise<ClassifierCallResult<ClassifyOutput>>;
  /** 단계 4 · leftover + 제목 중립화 (Manager 호출 2, 조건부). */
  resolveLeftover(
    input: LeftoverInput,
  ): Promise<ClassifierCallResult<LeftoverOutput>>;
}
