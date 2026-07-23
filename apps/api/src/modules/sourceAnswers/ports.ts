import type { AiProvider, ErrorCode, StructuredContent } from "@decision-log/shared";

/**
 * AI 파이프라인 포트 (ADR-005, SPEC-AI-001 2.3).
 * "프레임워크가 아니라 이음새" — 이음새당 인터페이스 하나·초기 구현 하나만 둔다.
 * AgendaClassifier·ConflictComparator 포트는 SPEC-AI-002에서 구현하므로 여기서
 * 빈 구현을 만들지 않는다.
 */

/** Provider 호출에 필요한 재료. apiKey는 호출 시점에만 쓰고 로그·에러에 남기지 않는다. */
export interface ProviderRequest {
  model: string;
  prompt: string;
  apiKey: string;
}

/** Provider 원문 응답 + 관측 메타 원재료 (8.2·8.3). */
export interface RawResult {
  /** 원문 그대로. 정규화 실패해도 raw_content에 남긴다(8.2). */
  rawContent: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

/** Provider별 어댑터. 호출만 담당하고 저장·상태 전이는 모른다. */
export interface ProviderClient {
  readonly provider: AiProvider;
  generate(request: ProviderRequest): Promise<RawResult>;
}

/** 답변 프롬프트 템플릿 (10장). 사용 version을 prompt_version에 스탬프한다. */
export interface AnswerPromptTemplate {
  readonly version: string;
  render(
    provider: AiProvider,
    variables: { question: string; context: string | null },
  ): Promise<string>;
}

/** 원문 → StructuredContent 변환 (8.1). Provider 호출과 분리해 파싱 규칙만 교체 가능. */
export interface AnswerNormalizer {
  readonly version: string;
  normalize(rawContent: string): StructuredContent;
}

/**
 * Provider 호출·정규화 실패를 errorCode 5종(5장)으로 표현하는 오류.
 * retryable = 일시적 오류 + 스키마 검증 실패(재시도 1회 대상).
 * message에는 비밀값·토큰·내부 스택을 넣지 않는다.
 */
export class ProviderCallError extends Error {
  constructor(
    readonly errorCode: ErrorCode,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = "ProviderCallError";
  }
}
