const profiles = [
  {
    id: 'mentee-1',
    role: 'mentee',
    name: '백승주',
    nickname: '진로탐색중',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  },
  {
    id: 'mentor-1',
    role: 'mentor',
    name: '김OO',
    nickname: '나노소재 멘토',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  },
  {
    id: 'mentor-2',
    role: 'mentor',
    name: '이OO',
    nickname: 'AI 연구 멘토',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  },
  {
    id: 'mentor-3',
    role: 'mentor',
    name: '박OO',
    nickname: '계산생물학 멘토',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  },
  {
    id: 'mentor-4',
    role: 'mentor',
    name: '최OO',
    nickname: '산업공학 멘토',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  },
];

const menteeProfiles = [
  {
    userId: 'mentee-1',
    school: '서울대학교',
    major: '컴퓨터공학',
    grade: '4',
    enrollmentStatus: 'enrolled',
  },
];

const mentorProfiles = [
  {
    userId: 'mentor-1',
    school: 'KAIST',
    major: '재료공학',
    academicStatus: '박사과정',
    program: '재료공학부 박사과정',
    lab: '나노소자 연구실',
    introduction: '전고체 배터리와 나노소재 기반 에너지 저장을 연구합니다.',
    detailedIntroduction:
      '차세대 에너지 저장 장치 연구와 대학원 진학 경험을 바탕으로 현실적인 방향을 함께 찾습니다.',
    researchFields: ['GAA', 'FinFET', '차세대반도체'],
    counselingFields: ['대학원 진학 준비', '연구 활동 관련'],
    careerHighlights: [
      'KAIST 재료공학과 졸업',
      '차세대 반도체 소재 공동연구 참여',
    ],
    internationalActivities: ['MRS 국제학회 포스터 발표'],
    availableTime: '화요일 19:00, 금요일 15:00',
  },
  {
    userId: 'mentor-2',
    school: 'KAIST',
    major: '전산학',
    academicStatus: '석사과정',
    program: '전산학부 석사과정',
    lab: '비전지능 연구실',
    introduction: '딥러닝 기반 영상 분석과 의료 AI 서비스 개발을 다룹니다.',
    detailedIntroduction:
      'AI 연구 분야 선택부터 연구계획서 작성, 대학원 면접 준비까지 단계별 경험을 나눕니다.',
    researchFields: ['인공지능', '머신러닝', '컴퓨터 비전'],
    counselingFields: ['대학원 진학', '연구계획서', '진로 상담'],
    careerHighlights: [
      '컴퓨터 비전 국제학회 논문 게재',
      '산학 협력 AI 프로젝트 참여',
    ],
    internationalActivities: ['해외 대학 공동 연구 프로그램 참여'],
    availableTime: '월요일 20:00, 목요일 18:30',
  },
  {
    userId: 'mentor-3',
    school: 'POSTECH',
    major: '생명과학',
    academicStatus: '석박통합과정',
    program: '생명과학과 석박통합',
    lab: '계산생물학 연구실',
    introduction: '단백질 구조 예측과 바이오 데이터 분석 진로를 도와드립니다.',
    detailedIntroduction:
      '생명과학 전공자가 데이터 분석 연구로 진입하는 방법과 융합 연구실 선택 경험을 공유합니다.',
    researchFields: ['BioAI', '단백질', '데이터분석'],
    counselingFields: ['연구 활동 관련', '대학원 생활', '해외 진학'],
    careerHighlights: [
      'POSTECH 생명과학과 졸업',
      '단백질 구조 예측 프로젝트 참여',
    ],
    internationalActivities: ['ISMB 국제학회 포스터 발표'],
    availableTime: '수요일 17:00, 토요일 11:00',
  },
  {
    userId: 'mentor-4',
    school: '서울대학교',
    major: '산업공학',
    academicStatus: '석사과정',
    program: '산업공학과 석사과정',
    lab: '인간중심시스템 연구실',
    introduction: '최적화, UX 리서치, 기술 창업 프로젝트 경험을 공유합니다.',
    detailedIntroduction:
      '산업공학 대학원 준비와 기술 창업 프로젝트 경험을 바탕으로 진로 고민을 함께 정리합니다.',
    researchFields: ['HCI', '최적화', '기술창업'],
    counselingFields: ['대학원 생활', '취업'],
    careerHighlights: [
      '서울대학교 산업공학과 졸업',
      '사용자 행동 분석 프로젝트 참여',
    ],
    internationalActivities: ['CHI 2025 Student Volunteer'],
    availableTime: '목요일 13:00, 금요일 18:00',
  },
];

// 신청 생성 시 사전 질문지 4문항을 각 application 객체에 직접 저장한다.
const applications = [];

// 신청 대상 멘토별 응답 상태를 별도로 저장한다.
const applicationMentors = [];

module.exports = {
  applicationMentors,
  applications,
  menteeProfiles,
  mentorProfiles,
  profiles,
};
