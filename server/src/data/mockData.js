const profiles = [
  {
    id: 'mentee-1',
    role: 'mentee',
    name: '김멘티',
    nickname: '진로탐색중',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  },
  {
    id: 'mentor-1',
    role: 'mentor',
    name: '박민호',
    nickname: '생명과학 멘토',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  },
  {
    id: 'mentor-2',
    role: 'mentor',
    name: '이서연',
    nickname: 'AI 연구 멘토',
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
    school: 'POSTECH',
    major: '생명과학',
    academicStatus: '석박통합과정',
    program: '생명과학과 석박통합과정',
    lab: '분자생명과학 연구실',
    introduction: '생명과학 연구와 대학원 진학 경험을 나눕니다.',
    detailedIntroduction:
      '연구실 선택, 대학원 지원 준비, 연구 주제 탐색에 관한 현실적인 경험을 공유합니다.',
    researchFields: ['분자생물학', '유전체학', '바이오인포매틱스'],
    counselingFields: ['대학원 진학', '연구실 선택', '연구 주제 탐색'],
    careerHighlights: [
      '국내 생명과학 학술대회 우수 포스터상',
      '유전체 분석 공동 연구 참여',
    ],
    internationalActivities: ['국제 생명과학 학회 포스터 발표'],
    availableTime: '화요일 19:00, 목요일 18:30',
  },
  {
    userId: 'mentor-2',
    school: 'KAIST',
    major: '전산학',
    academicStatus: '박사과정',
    program: '전산학부 박사과정',
    lab: '머신러닝 연구실',
    introduction: '인공지능 연구와 대학원 생활에 대해 상담합니다.',
    detailedIntroduction:
      'AI 연구 분야 선택부터 연구계획서 작성, 대학원 면접 준비까지 단계별 경험을 나눕니다.',
    researchFields: ['인공지능', '머신러닝', '컴퓨터 비전'],
    counselingFields: ['대학원 진학', '연구계획서', '진로 상담'],
    careerHighlights: [
      '컴퓨터 비전 국제학회 논문 게재',
      '산학 협력 AI 프로젝트 참여',
    ],
    internationalActivities: ['해외 대학 공동 연구 프로그램 참여'],
    availableTime: '수요일 20:00, 금요일 17:00',
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
