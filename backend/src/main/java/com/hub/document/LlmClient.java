package com.hub.document;

/**
 * LLM 호출 추상화. 지금은 StubLlmClient 가 붙어 있고,
 * 3주차에 실제 API 호출 구현으로 교체한다.
 */
public interface LlmClient {

    /**
     * @param prompt 이력 + 공고 요구조건 + 방향 제시가 합쳐진 프롬프트
     * @return 생성된 문서 본문
     */
    String generate(String prompt);
}
