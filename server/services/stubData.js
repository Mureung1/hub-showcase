/**
 * Day 1 Walking Skeleton: 고정(fake) 데이터.
 * Day 3~10에서 이 값들을 실제 Code Scanner & Scorer / Question Generator 출력으로 교체한다.
 * 스키마 모양(file_path/score/reason/chunks, project_overview/tech_stack)은
 * 05_CODE_SCANNER_SCORER.md 8장과 동일하게 맞춰서, 나중에 이 파일만 지워도 되게 해둔다.
 */

export function buildFixedCandidateFile() {
  return {
    file_path: 'src/service/PaymentService.js',
    score: 1.3,
    reason: '스텁 데이터 (Day 1 walking skeleton, 실제 스코어링 아님)',
    chunks: [
      {
        code_snippet: 'async function approvePayment(order) {\n  try {\n    await paymentGateway.charge(order);\n  } catch (e) {\n    await retryQueue.push(order);\n  }\n}',
        pattern: 'try-catch',
      },
    ],
  };
}

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
