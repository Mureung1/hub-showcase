/**
 * 04_AI_AGENT_SPEC.md 6장 / 10_PROMPT_SPEC.md 6장 "Question Generator Prompt".
 *
 * chunk.pattern은 chunker.js가 정규식으로 이미 감지해둔 값이므로, LLM에게 패턴 존재
 * 여부를 다시 판단시키지 않고 힌트로 제공한다(재판단 비용 절감). cited_code는 LLM에게
 * 맡기지 않는다 — questionGenerator.js가 chunk.code_snippet을 그대로 사용해 모델이
 * 코드를 옮겨 적다 생기는 오탈자/누락 위험을 없앤다.
 */

const PATTERN_HINTS = {
  'try-catch': '예외 처리(try-catch) — 왜 이렇게 예외를 처리했는지에 초점을 맞춰 질문할 것.',
  'async-await': '비동기 처리(async/await) — 비동기 처리가 필요했던 이유와 처리 흐름에 초점을 맞춰 질문할 것.',
  'state-management': '상태 관리 — 상태를 이렇게 관리한 이유에 초점을 맞춰 질문할 것.',
  performance: '성능 최적화 — 적용한 최적화 방식과 그 이유에 초점을 맞춰 질문할 것.',
  none: '특정 패턴 없음 — 이 함수/모듈이 어떤 역할을 하는지 묻는 일반 질문을 생성할 것.',
};

export function buildCodeQuestionPrompt({ file_path, score_reason, chunk }) {
  const patternHint = PATTERN_HINTS[chunk.pattern] ?? PATTERN_HINTS.none;

  return `[Role]
코드 기반 핀포인트 질문 생성 전문가

[Goal]
아래 코드를 인용하여 구체적인 기술 질문 1개를 생성한다.

[Context]
파일: ${file_path}
이 파일이 인터뷰 후보로 선정된 이유: ${score_reason}

[Input]
코드:
\`\`\`
${chunk.code_snippet}
\`\`\`

[Thinking Rule]
이 코드에서 감지된 패턴: ${chunk.pattern}
${patternHint}

[Output Rule]
반드시 아래 JSON 스키마를 따르는 JSON만 출력한다.
{"question": "질문 문장"}
마크다운 코드블록으로 감싸지 말고, JSON 앞뒤에 설명 문장을 추가하지 않는다.

[Forbidden]
- 위 코드에 없는 내용에 대한 질문 생성 금지
- "이 프로젝트에 대해 설명해주세요" 같은 지나치게 일반적인 질문 금지
- question 필드 외에 코드 자체를 옮겨 적지 말 것`;
}

export const CODE_QUESTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
  },
  required: ['question'],
  additionalProperties: false,
};
