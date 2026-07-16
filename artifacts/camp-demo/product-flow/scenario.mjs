export const PRODUCT_DEMO_STEP = Object.freeze({
  SCATTERED: 1,
  SELECTED: 2,
  DELEGATED: 3,
  ACTIVITY: 4,
  EVIDENCE: 5,
  REVIEW: 6,
  CONFIRMED: 7,
})

const steps = [
  {
    eyebrow: 'BEFORE',
    title: '자료는 쌓이는데, 할 일은 흩어져 있습니다',
    description: '마감은 LMS 공지에, 제출 방식은 강의계획서에 있습니다. 학생이 직접 열고 비교해 다시 옮겨 적어야 합니다.',
    label: '흩어진 자료',
    agentStatus: '대기',
  },
  {
    eyebrow: 'SELECT',
    title: '이번 일에 필요한 자료만 고릅니다',
    description: 'LMS 공지와 강의계획서를 선택했습니다. AY가 읽고 행동할 범위를 사용자가 먼저 정합니다.',
    label: '자료 선택',
    agentStatus: '준비됨',
  },
  {
    eyebrow: 'DELEGATE',
    title: '요약을 요청하는 대신, 일을 맡깁니다',
    description: 'AY는 한 번의 답변을 만드는 데서 멈추지 않고, 자료를 읽고 연결해 앱의 변경 제안까지 준비합니다.',
    label: '일 맡기기',
    agentStatus: '작업 시작',
  },
  {
    eyebrow: 'ACT',
    title: 'AY가 필요한 도구를 쓰며 여러 단계를 이어갑니다',
    description: 'AY가 어떤 자료를 열었고, 무엇을 찾고 연결했는지 사용자가 확인할 수 있는 작업 기록입니다.',
    label: 'AY의 작업',
    agentStatus: '작업 완료',
  },
  {
    eyebrow: 'GROUND',
    title: '결론보다 먼저, 원본 근거를 확인합니다',
    description: 'AY가 찾은 값마다 출처가 연결됩니다. 사용자는 AI의 말을 믿는 대신 실제 문장을 바로 대조할 수 있습니다.',
    label: '원본 근거',
    agentStatus: '근거 확인',
  },
  {
    eyebrow: 'REVIEW',
    title: 'AI의 제안은 사용자가 결정합니다',
    description: '수락하거나, 내용을 고치거나, 거절할 수 있습니다. 확인하기 전에는 내 학기 정보가 바뀌지 않습니다.',
    label: '사용자 결정',
    agentStatus: '검토 대기',
  },
  {
    eyebrow: 'CONFIRMED',
    title: '확인한 내용만 내 학기 정보가 됩니다',
    description: '수락한 과제는 일정, 할 일, 이후의 Agent 작업이 함께 사용하는 확인된 정보가 됩니다.',
    label: '확인된 정보',
    agentStatus: '반영 완료',
  },
]

export const productDemoScenario = Object.freeze({
  steps: Object.freeze(steps.map((step) => Object.freeze(step))),
  targetSources: Object.freeze(['notice', 'syllabus']),
  initialProposal: Object.freeze({
    title: '개요 작성하기',
    deadline: '7월 12일 23:59',
    method: 'LMS 업로드',
  }),
  workRequest: '선택한 자료 2개에서 챙겨야 할 과제를 정리하기',
  revision: Object.freeze({
    request: '과제 이름을 ‘문제해결글쓰기 개요 작성’으로 바꿔줘.',
    response: '과제 이름만 바꿨어요. 마감, 제출 방식과 원본 근거는 그대로 유지했습니다.',
    title: '문제해결글쓰기 개요 작성',
    completionDelayMs: 700,
  }),
  initialDocument: 'notice',
  initialDocumentMode: 'preview',
  documentFindings: Object.freeze({
    notice: '마감 후보 · 7월 12일 23:59',
    syllabus: '제출 방식 · LMS 과제함 업로드',
  }),
  sourceHints: Object.freeze({
    working: 'AY가 선택한 두 자료를 기준으로 작업 중입니다.',
    ready: '준비됐어요. 이 두 자료를 AY에게 맡길 수 있습니다.',
    empty: '관련 있는 자료 2개를 선택해 보세요.',
    partial: 'LMS 과제 공지와 강의계획서를 함께 선택해 보세요.',
  }),
  workspaceStatuses: Object.freeze({
    selected: Object.freeze({
      context: '자료 선택 완료 · AY에게 맡길 준비됨',
      message: '선택한 두 자료를 같은 워크스페이스에서 검토합니다.',
    }),
    delegated: Object.freeze({
      context: 'AY에게 작업을 맡김 · 원본 읽기 시작',
      message: 'AY가 선택한 두 자료 안에서 필요한 정보를 찾고 있습니다.',
    }),
    activity: Object.freeze({
      context: 'AY 작업 완료 · 과제 후보 검토 대기',
      message: '오른쪽 AY 채팅에서 사용한 도구와 찾은 결과를 확인할 수 있습니다.',
    }),
    evidence: Object.freeze({
      context: 'AY가 찾은 값 · 원본 근거 검토 중',
      message: '표시한 원문과 AY의 변경 제안을 함께 확인하세요.',
    }),
    confirmed: Object.freeze({
      context: '학생 확인 완료 · 학기 정보에 반영됨',
      message: '수락한 값과 원본 위치를 함께 보관합니다.',
    }),
  }),
  proposalMessages: Object.freeze({
    idle: '수락하기 전에는 학기 일정에 아무것도 추가되지 않습니다.',
    prompting: '바꾸고 싶은 내용을 AY에게 요청하세요.',
    pending: 'AY가 수정 요청을 반영해 제안을 다시 정리하고 있습니다.',
    completed: 'AY가 수정 요청을 반영했습니다. 제안을 다시 확인해 주세요.',
    rejected: '거절한 제안은 내 학기 정보에 반영되지 않습니다.',
    accepted: '학생이 확인한 과제로 반영했습니다.',
  }),
  notices: Object.freeze({
    acceptRequired: '오른쪽 AY의 변경 제안에서 ‘수락하고 반영’을 눌러 주세요.',
    rejected: '거절한 제안은 반영되지 않습니다. 제안을 다시 보거나 이전 단계로 이동하세요.',
    reviewPending: '확인된 정보로 만들려면 AY의 변경 제안을 직접 수락해 주세요.',
    revisionUnavailable: '변경 제안을 검토하는 단계에서 AY에게 수정 요청을 보내 주세요.',
    revisionPending: '수정 요청을 보내거나 AY의 응답을 기다린 뒤 결정해 주세요.',
    revisionFixtureOnly: '이 시제품에서는 준비된 과제 이름 수정 요청만 보낼 수 있습니다.',
    reset: '데모를 처음 상태로 되돌렸습니다.',
  }),
})
