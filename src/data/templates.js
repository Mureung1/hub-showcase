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

/* 목 학사일정 — 실제 서비스에서는 학교 학사일정 API로 대체(v2) */
export const EXAM_WEEKS = [
  { name: '1학기 중간고사', start: '2026-04-20', end: '2026-04-24' },
  { name: '1학기 기말고사', start: '2026-06-15', end: '2026-06-19' },
  { name: '2학기 중간고사', start: '2026-10-19', end: '2026-10-23' },
  { name: '2학기 기말고사', start: '2026-12-14', end: '2026-12-18' },
  { name: '1학기 중간고사', start: '2027-04-19', end: '2027-04-23' },
  { name: '1학기 기말고사', start: '2027-06-14', end: '2027-06-18' },
];

/* 유형별 목 계획 템플릿 — pos는 프로젝트 기간(시작→마감) 중 마일스톤 마감의 상대 위치(0~1).
   variants[0]이 기본안, "다시 제안받기" 시 다음 변형안으로 순환한다. */
export const PLAN_TEMPLATES = {
  presentation: {
    variants: [
      [
        {
          title: '주제 확정·자료 조사', pos: 0.25,
          tasks: [
            { title: '주제 브레인스토밍 및 확정', roleId: 'leader' },
            { title: '선행 자료·문헌 조사', roleId: 'research' },
            { title: '조사 내용 요약 정리', roleId: 'research' },
          ],
        },
        {
          title: '발표 구성·스크립트', pos: 0.5,
          tasks: [
            { title: '목차·스토리라인 구성', roleId: 'script' },
            { title: '발표 스크립트 초안 작성', roleId: 'script' },
            { title: '팀 피드백 반영 수정', roleId: 'leader' },
          ],
        },
        {
          title: 'PPT 제작', pos: 0.75,
          tasks: [
            { title: '슬라이드 템플릿·디자인 선정', roleId: 'slides' },
            { title: '본문 슬라이드 제작', roleId: 'slides' },
            { title: '시각 자료·도표 제작', roleId: 'slides' },
          ],
        },
        {
          title: '리허설·최종 점검', pos: 1,
          tasks: [
            { title: '발표 리허설 1차', roleId: 'presenter' },
            { title: '예상 질문·답변 준비', roleId: 'presenter' },
            { title: '최종 검토 및 제출', roleId: 'leader' },
          ],
        },
      ],
      [
        {
          title: '기획·조사', pos: 0.3,
          tasks: [
            { title: '주제 선정 회의', roleId: 'leader' },
            { title: '핵심 자료 조사', roleId: 'research' },
            { title: '유사 발표 사례 분석', roleId: 'research' },
          ],
        },
        {
          title: '스크립트·슬라이드 제작', pos: 0.7,
          tasks: [
            { title: '발표 스크립트 작성', roleId: 'script' },
            { title: '슬라이드 제작', roleId: 'slides' },
            { title: '스크립트-슬라이드 싱크 맞추기', roleId: 'script' },
          ],
        },
        {
          title: '발표 준비', pos: 1,
          tasks: [
            { title: '리허설 2회 진행', roleId: 'presenter' },
            { title: 'Q&A 대비 자료 준비', roleId: 'presenter' },
            { title: '최종 점검 및 제출', roleId: 'leader' },
          ],
        },
      ],
    ],
  },
  development: {
    variants: [
      [
        {
          title: '기획·요구사항 정의', pos: 0.2,
          tasks: [
            { title: '아이디어 확정 및 범위 정의', roleId: 'planning' },
            { title: '요구사항 문서 작성', roleId: 'planning' },
            { title: '화면 설계 초안', roleId: 'planning' },
          ],
        },
        {
          title: '핵심 기능 개발', pos: 0.55,
          tasks: [
            { title: '프로젝트 세팅·공통 구조 구축', roleId: 'backend' },
            { title: '핵심 화면 UI 구현', roleId: 'frontend' },
            { title: '핵심 API·데이터 처리 구현', roleId: 'backend' },
          ],
        },
        {
          title: '통합·마무리 개발', pos: 0.8,
          tasks: [
            { title: '프론트-백엔드 연동', roleId: 'frontend' },
            { title: '버그 수정·예외 처리', roleId: 'backend' },
            { title: '부가 기능 구현', roleId: 'frontend' },
          ],
        },
        {
          title: '시연 준비', pos: 1,
          tasks: [
            { title: '시연 시나리오 작성', roleId: 'demo' },
            { title: '발표 자료 제작', roleId: 'demo' },
            { title: '최종 점검·제출', roleId: 'leader' },
          ],
        },
      ],
      [
        {
          title: '설계', pos: 0.25,
          tasks: [
            { title: '기능 목록 우선순위 정리', roleId: 'planning' },
            { title: '데이터 구조 설계', roleId: 'backend' },
            { title: '와이어프레임 제작', roleId: 'planning' },
          ],
        },
        {
          title: '구현 스프린트', pos: 0.7,
          tasks: [
            { title: 'UI 컴포넌트 구현', roleId: 'frontend' },
            { title: '서버 로직 구현', roleId: 'backend' },
            { title: '중간 데모·피드백 반영', roleId: 'leader' },
          ],
        },
        {
          title: '품질·시연', pos: 1,
          tasks: [
            { title: '테스트 및 버그 수정', roleId: 'frontend' },
            { title: '시연 리허설', roleId: 'demo' },
            { title: '문서 정리·제출', roleId: 'planning' },
          ],
        },
      ],
    ],
  },
  report: {
    variants: [
      [
        {
          title: '주제·개요 확정', pos: 0.25,
          tasks: [
            { title: '주제 확정 및 문제 정의', roleId: 'leader' },
            { title: '참고 문헌 조사', roleId: 'research' },
            { title: '목차 개요 작성', roleId: 'writing' },
          ],
        },
        {
          title: '본문 집필', pos: 0.6,
          tasks: [
            { title: '장별 초안 작성', roleId: 'writing' },
            { title: '데이터·근거 보강', roleId: 'research' },
            { title: '중간 검토 회의', roleId: 'leader' },
          ],
        },
        {
          title: '퇴고·제출', pos: 1,
          tasks: [
            { title: '전체 퇴고 및 문체 통일', roleId: 'editing' },
            { title: '인용·형식 점검', roleId: 'editing' },
            { title: '최종 제출', roleId: 'leader' },
          ],
        },
      ],
      [
        {
          title: '자료 조사', pos: 0.3,
          tasks: [
            { title: '자료 수집 및 분류', roleId: 'research' },
            { title: '핵심 논점 정리', roleId: 'research' },
          ],
        },
        {
          title: '집필', pos: 0.75,
          tasks: [
            { title: '서론·본론 작성', roleId: 'writing' },
            { title: '결론·요약 작성', roleId: 'writing' },
            { title: '팀원 상호 리뷰', roleId: 'leader' },
          ],
        },
        {
          title: '마무리', pos: 1,
          tasks: [
            { title: '교정·편집', roleId: 'editing' },
            { title: '표지·형식 정리', roleId: 'editing' },
            { title: '최종 제출', roleId: 'leader' },
          ],
        },
      ],
    ],
  },
};
