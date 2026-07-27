/**
 * Question Generator 스텁: 정규식 청킹으로 감지된 pattern에 맞는 고정 질문 문구.
 * 실제 LLM 기반 질문 생성으로 교체되기 전까지 사용한다.
 */

const QUESTION_TEMPLATES = {
  'try-catch': '이 코드에서 예외 처리(try-catch)를 이렇게 구성한 이유를 설명해 주세요.',
  'async-await': '이 코드에서 비동기 처리(async/await)가 필요했던 이유와 처리 흐름을 설명해 주세요.',
  'state-management': '이 코드에서 상태(state)를 이렇게 관리한 이유를 설명해 주세요.',
  performance: '이 코드에서 적용한 성능 최적화 방식과 그 이유를 설명해 주세요.',
  none: '이 코드에서 어떤 역할을 하는 함수인지 설명해 주세요.',
};

export function buildFixedQuestion(chunk) {
  return {
    question: QUESTION_TEMPLATES[chunk.pattern] ?? QUESTION_TEMPLATES.none,
    cited_code: chunk.code_snippet,
  };
}
