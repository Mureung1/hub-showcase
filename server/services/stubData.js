/**
 * Day 1 Walking Skeleton: 고정(fake) 데이터.
 * candidate 파일 선정은 candidateSelector.js로 대체됐고, context(README/tech_stack 파싱)와
 * question(정규식 청킹) 로직만 아직 이 스텁을 쓴다. 스키마 모양은
 * 05_CODE_SCANNER_SCORER.md 8장과 동일하게 맞춰서, 나중에 이 파일만 지워도 되게 해둔다.
 */

export function buildFixedContext() {
  return {
    project_overview: {
      service_description: '(스텁) README에서 추출된 서비스 설명이 여기 표시됩니다.',
      problem_to_solve: '',
      duration: '',
      team_and_role: '',
      key_features: ['(스텁) 핵심 기능 목록'],
    },
    tech_stack: {
      language: ['JavaScript'],
      framework: ['Express'],
      database: [],
      infra: [],
    },
    sources: ['README.md (스텁)'],
  };
}

export function buildFixedQuestion(chunk) {
  return {
    question: `${chunk.pattern === 'try-catch'
      ? 'PaymentService의 결제 승인 로직에서 try-catch로 감싼 이유를 설명해 주세요.'
      : '이 코드에서 어떤 역할을 하는 함수인지 설명해 주세요.'}`,
    cited_code: chunk.code_snippet,
  };
}
