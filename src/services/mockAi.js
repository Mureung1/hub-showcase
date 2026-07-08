/* 목(mock) AI 서비스 — 실제 LLM API 서버 호출과 동일한 시그니처(async, JSON 반환)로 설계.
   나중에 이 파일의 함수 본문만 fetch 호출로 교체하면 된다. */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 플래너 에이전트: 과제 정보 → 마일스톤/태스크 계획 초안.
 * @param {object} project - { type, goal, deadline, members }
 * @param {object} options - { variant: number } "다시 제안받기" 시 변형 버전 번호
 * @returns {Promise<{ milestones: Array, tasks: Array }>}
 */
export async function generatePlan(project, { variant = 0 } = {}) {
  await delay(1500);
  /* TODO(2단계): templates.js의 PLAN_TEMPLATES 기반으로 유형별 계획 생성 */
  void project;
  void variant;
  throw new Error('generatePlan은 2단계에서 구현됩니다');
}

/**
 * 배정 설명 에이전트: 배정 결과 + 팀 통계 → 팀 단위 자연어 설명.
 * 개인 응답은 인용하지 않는다 (비공개 약속 유지).
 * @param {object} assignment - assignRoles() 결과
 * @param {object} teamStats - 팀 단위 통계 (개인 식별 불가 형태)
 * @returns {Promise<{ summary: string, perMember: object, compromise: string|null }>}
 */
export async function explainAssignment(assignment, teamStats) {
  await delay(1200);
  /* TODO(4단계): 팀 단위 서술 설명 + 전원 기피 역할 타협안 생성 */
  void assignment;
  void teamStats;
  throw new Error('explainAssignment는 4단계에서 구현됩니다');
}
