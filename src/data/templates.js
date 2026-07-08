/* 과제 유형·역할 정의 + (2단계에서 추가될) 목 계획 템플릿 */

export const PROJECT_TYPES = [
  {
    id: 'presentation',
    label: '발표 과제',
    emoji: '🎤',
    description: '자료 조사부터 PPT 제작, 발표까지',
  },
  {
    id: 'development',
    label: '개발 과제',
    emoji: '💻',
    description: '기획, 개발, 테스트, 시연까지',
  },
  {
    id: 'report',
    label: '보고서 과제',
    emoji: '📄',
    description: '조사, 집필, 편집, 제출까지',
  },
];

/* 역할별 최소/최대 인원 규칙 — 인원 ≠ 역할 수일 때 1인 다역·다인 1역 처리의 근거 */
export const ROLES_BY_TYPE = {
  presentation: [
    { id: 'leader', name: '조장', emoji: '🧭', min: 1, max: 1, description: '일정 조율과 의사결정 진행' },
    { id: 'research', name: '자료 조사', emoji: '🔍', min: 1, max: 3, description: '주제 자료 수집·정리' },
    { id: 'slides', name: 'PPT 제작', emoji: '🎨', min: 1, max: 2, description: '발표 자료 디자인·제작' },
    { id: 'presenter', name: '발표', emoji: '🎤', min: 1, max: 2, description: '발표 진행과 질의응답' },
    { id: 'script', name: '스크립트 작성', emoji: '✍️', min: 1, max: 2, description: '발표 대본·흐름 구성' },
  ],
  development: [
    { id: 'leader', name: '조장', emoji: '🧭', min: 1, max: 1, description: '일정 조율과 의사결정 진행' },
    { id: 'planning', name: '기획·문서', emoji: '📋', min: 1, max: 2, description: '요구사항 정리·문서화' },
    { id: 'frontend', name: '프론트엔드', emoji: '🖥️', min: 1, max: 3, description: '화면 UI 구현' },
    { id: 'backend', name: '백엔드', emoji: '⚙️', min: 1, max: 3, description: '서버·데이터 처리 구현' },
    { id: 'demo', name: '시연·발표', emoji: '🎤', min: 1, max: 2, description: '데모 준비와 발표' },
  ],
  report: [
    { id: 'leader', name: '조장', emoji: '🧭', min: 1, max: 1, description: '일정 조율과 의사결정 진행' },
    { id: 'research', name: '자료 조사', emoji: '🔍', min: 1, max: 3, description: '문헌·데이터 수집' },
    { id: 'writing', name: '본문 집필', emoji: '✍️', min: 1, max: 3, description: '장별 본문 작성' },
    { id: 'editing', name: '편집·교정', emoji: '📐', min: 1, max: 2, description: '문체 통일·형식 점검' },
  ],
};

export function getTypeById(typeId) {
  return PROJECT_TYPES.find((t) => t.id === typeId) ?? null;
}

export function getRolesForType(typeId) {
  return ROLES_BY_TYPE[typeId] ?? [];
}

/* TODO(2단계): 유형별 목 계획 템플릿(마일스톤/태스크, 시험 주간 회피 문구 포함) 추가 */
export const PLAN_TEMPLATES = {};
