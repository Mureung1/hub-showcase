export const mockMissions = [
  {
    id: "marketing-campaign-report",
    tracks: ["business", "media", "humanities"],
    roles: ["마케팅", "브랜드 마케터", "콘텐츠 마케터", "홍보"],
    title: "전공 관심사를 활용한 캠페인 분석 리포트",
    difficulty: "중간",
    duration: "3~5일",
    skills: ["시장 조사", "타깃 분석", "콘텐츠 기획", "성과 지표"],
    deliverable: "Notion 또는 PDF 리포트, 참고 자료 링크",
    summary: "관심 산업의 캠페인 3개를 비교하고 타깃, 메시지, 채널, 성과 지표를 정리합니다.",
    guide: [
      "전공과 연결되는 산업 또는 브랜드를 하나 고릅니다.",
      "최근 캠페인 3개를 수집하고 타깃과 핵심 메시지를 비교합니다.",
      "좋았던 점과 개선할 점을 각각 3개 이상 정리합니다.",
      "내가 실행한다면 어떤 콘텐츠를 만들지 제안합니다.",
    ],
    checklist: ["캠페인 3개 선정", "비교 기준 작성", "개선안 3개 작성", "포트폴리오용 요약 작성"],
    references: ["브랜드 캠페인 사례", "SNS 콘텐츠 분석", "마케팅 퍼널 기초"],
  },
  {
    id: "business-process-improvement",
    tracks: ["business", "social"],
    roles: ["기획", "경영지원", "PM", "서비스 기획"],
    title: "업무 프로세스 개선 제안서 작성",
    difficulty: "중간",
    duration: "3~5일",
    skills: ["문제 정의", "프로세스 분석", "우선순위", "문서화"],
    deliverable: "개선 제안서, 화면 흐름 또는 업무 흐름도",
    summary: "학교, 동아리, 아르바이트 경험에서 불편했던 과정을 찾아 개선안으로 정리합니다.",
    guide: [
      "반복적으로 불편했던 업무나 서비스 흐름을 하나 고릅니다.",
      "현재 흐름을 단계별로 적고 병목 지점을 표시합니다.",
      "개선안을 2~3개 제안하고 기대 효과를 수치나 근거로 설명합니다.",
      "실행 난이도와 효과를 기준으로 우선순위를 정합니다.",
    ],
    checklist: ["현재 흐름 정리", "문제 정의 작성", "개선안 2개 이상", "우선순위 표 작성"],
    references: ["서비스 블루프린트", "업무 프로세스 개선 사례", "PRD 기초"],
  },
  {
    id: "education-learning-plan",
    tracks: ["education", "humanities"],
    roles: ["교육", "교사", "교육 기획", "HRD"],
    title: "학습자 맞춤형 교육 프로그램 설계",
    difficulty: "중간",
    duration: "4~6일",
    skills: ["학습 목표", "커리큘럼", "평가 설계", "피드백"],
    deliverable: "교육 프로그램 기획서, 1회차 수업안",
    summary: "특정 학습자를 가정하고 목표, 활동, 평가 기준이 있는 교육 프로그램을 설계합니다.",
    guide: [
      "대상 학습자와 해결할 학습 문제를 정합니다.",
      "학습 목표를 3개 이하로 구체화합니다.",
      "수업 활동과 평가 방식을 연결합니다.",
      "학습자가 받을 피드백 예시를 작성합니다.",
    ],
    checklist: ["학습자 정의", "학습 목표 작성", "수업 활동 설계", "평가 기준 작성"],
    references: ["수업 설계안", "ADDIE 모델", "루브릭 예시"],
  },
  {
    id: "design-user-research",
    tracks: ["design", "media", "humanities"],
    roles: ["UX", "UI", "디자인", "서비스 기획"],
    title: "사용자 인터뷰 기반 UX 개선안 만들기",
    difficulty: "중간",
    duration: "4~6일",
    skills: ["사용자 조사", "페르소나", "와이어프레임", "개선안"],
    deliverable: "인터뷰 요약, 페르소나, 개선 화면 초안",
    summary: "주변 사용자 3명의 불편을 조사해 서비스 개선 방향과 화면 초안을 만듭니다.",
    guide: [
      "분석할 앱이나 서비스를 하나 고릅니다.",
      "사용자 3명에게 불편 지점과 사용 맥락을 질문합니다.",
      "공통 문제를 정리하고 대표 페르소나를 작성합니다.",
      "개선 화면을 간단한 와이어프레임으로 표현합니다.",
    ],
    checklist: ["인터뷰 질문 작성", "사용자 3명 조사", "문제 패턴 정리", "개선 화면 초안"],
    references: ["UX 인터뷰 질문", "페르소나 템플릿", "와이어프레임 예시"],
  },
  {
    id: "data-public-insight",
    tracks: ["data", "engineering", "science", "business"],
    roles: ["데이터", "분석", "BI", "리서치"],
    title: "공공데이터로 전공 관련 인사이트 도출",
    difficulty: "중간",
    duration: "4~7일",
    skills: ["데이터 정리", "EDA", "시각화", "인사이트"],
    deliverable: "분석 노트북 또는 시각화 리포트",
    summary: "전공과 관련된 공개 데이터를 찾아 정리하고 차트와 인사이트를 만듭니다.",
    guide: [
      "전공과 연결되는 공공데이터 주제를 하나 고릅니다.",
      "필요한 컬럼과 결측치를 정리합니다.",
      "비교, 추세, 분포 중 2가지 이상을 시각화합니다.",
      "차트마다 해석과 다음 질문을 작성합니다.",
    ],
    checklist: ["데이터 출처 명시", "기초 통계 확인", "차트 2개 이상", "인사이트 3개 작성"],
    references: ["공공데이터포털", "Kaggle Dataset", "EDA 체크리스트"],
  },
  {
    id: "engineering-prototype-test",
    tracks: ["engineering", "science"],
    roles: ["엔지니어", "연구개발", "품질", "제조"],
    title: "전공 실험 또는 제품 아이디어 검증 계획",
    difficulty: "중간",
    duration: "3~5일",
    skills: ["가설 설정", "실험 설계", "검증 지표", "리스크"],
    deliverable: "검증 계획서, 테스트 체크리스트",
    summary: "전공 지식을 활용한 아이디어를 가설, 실험 방법, 성공 기준으로 구체화합니다.",
    guide: [
      "검증하고 싶은 제품 또는 실험 아이디어를 정합니다.",
      "성공과 실패를 판단할 수 있는 가설을 작성합니다.",
      "필요 장비, 데이터, 절차, 위험 요소를 정리합니다.",
      "검증 결과를 포트폴리오에 어떻게 설명할지 요약합니다.",
    ],
    checklist: ["가설 1개 작성", "실험 절차 정리", "성공 기준 작성", "리스크 대응 작성"],
    references: ["실험 계획서", "품질 테스트 체크리스트", "프로토타입 검증 사례"],
  },
  {
    id: "health-case-education",
    tracks: ["health", "science", "education"],
    roles: ["보건", "간호", "임상", "상담", "교육"],
    title: "대상자 맞춤 건강 교육 자료 만들기",
    difficulty: "쉬움",
    duration: "2~4일",
    skills: ["대상자 분석", "정보 구조화", "교육 자료", "근거 기반"],
    deliverable: "교육 카드뉴스 또는 안내문, 근거 자료 목록",
    summary: "특정 대상자의 건강 문제를 정하고 이해하기 쉬운 교육 자료로 정리합니다.",
    guide: [
      "대상자와 건강 주제를 정합니다.",
      "신뢰할 수 있는 자료 3개 이상을 찾습니다.",
      "핵심 내용을 쉬운 문장과 시각 구조로 정리합니다.",
      "주의할 표현과 상담 연결 문구를 점검합니다.",
    ],
    checklist: ["대상자 정의", "근거 자료 3개", "교육 자료 초안", "주의 문구 점검"],
    references: ["질병관리청 자료", "환자 교육 자료", "건강 문해력 가이드"],
  },
  {
    id: "it-service-mvp",
    tracks: ["it", "engineering", "data"],
    roles: ["개발", "프론트엔드", "백엔드", "AI", "데이터"],
    title: "작은 문제를 해결하는 서비스 MVP 구현",
    difficulty: "중간",
    duration: "5~7일",
    skills: ["React", "API 연동", "DB 저장", "배포"],
    deliverable: "GitHub 저장소, 실행 화면, 구현 과정 README",
    summary: "사용자 입력이 저장되고 다시 조회되는 작은 웹 기능을 끝까지 구현합니다.",
    guide: [
      "해결할 사용자 문제를 한 문장으로 정의합니다.",
      "입력, 저장, 조회 화면을 최소 범위로 설계합니다.",
      "API와 DB 저장 흐름을 연결합니다.",
      "README에 구조와 데이터 흐름을 정리합니다.",
    ],
    checklist: ["문제 정의", "입력 폼", "DB 저장", "새로고침 후 조회", "README 작성"],
    references: ["React form", "Express API", "Prisma + PostgreSQL"],
  },
  {
    id: "certificate-roadmap",
    tracks: ["business", "it", "data", "engineering", "health", "education", "design", "social", "humanities", "media", "science"],
    roles: ["취업 준비", "자격증", "직무 탐색"],
    title: "전공 맞춤 자격증 로드맵 만들기",
    difficulty: "쉬움",
    duration: "1~2일",
    skills: ["직무 조사", "자격증 비교", "학습 계획", "우선순위"],
    deliverable: "자격증 비교표, 4주 학습 계획",
    summary: "전공과 목표 직무에 맞는 자격증 후보를 비교하고 준비 순서를 정합니다.",
    guide: [
      "목표 직무 채용공고 5개에서 우대 자격을 모읍니다.",
      "자격증 3개를 난이도, 비용, 활용도로 비교합니다.",
      "가장 먼저 준비할 자격증 1개를 고릅니다.",
      "4주 단위 학습 계획을 작성합니다.",
    ],
    checklist: ["채용공고 5개 확인", "자격증 3개 비교", "우선순위 선정", "4주 계획 작성"],
    references: ["큐넷", "직무별 채용공고", "자격증 학습 계획표"],
  },
];

const trackKeywords = {
  it: ["컴퓨터", "소프트웨어", "정보", "인공지능", "ai", "데이터", "보안", "게임", "it"],
  data: ["통계", "데이터", "산업공학", "수학", "경영정보"],
  business: ["경영", "경제", "회계", "무역", "금융", "마케팅", "광고"],
  media: ["미디어", "언론", "신문", "방송", "콘텐츠", "영상", "광고홍보"],
  design: ["디자인", "시각", "산업디자인", "패션", "공예", "ux"],
  education: ["교육", "유아", "초등", "특수교육", "교직"],
  health: ["간호", "보건", "물리치료", "작업치료", "임상", "약학", "의학"],
  engineering: ["기계", "전자", "전기", "화학공학", "건축", "토목", "신소재", "로봇"],
  science: ["생명", "화학", "물리", "환경", "식품", "바이오"],
  social: ["사회", "심리", "복지", "행정", "정치", "법"],
  humanities: ["국문", "영문", "어문", "사학", "철학", "문화", "문헌"],
};

const normalizeText = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");

export const inferCareerTrack = ({ major, targetRole, skills } = {}) => {
  const source = normalizeText(`${major || ""} ${targetRole || ""} ${skills || ""}`);
  const scores = Object.entries(trackKeywords).map(([track, keywords]) => ({
    track,
    score: keywords.reduce((sum, keyword) => (source.includes(normalizeText(keyword)) ? sum + 1 : sum), 0),
  }));
  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best?.score > 0 ? best.track : "business";
};

const missionScore = (mission, context) => {
  const normalizedRole = normalizeText(context.targetRole);
  const track = inferCareerTrack(context);
  const roleScore = normalizedRole
    ? mission.roles.some((role) => {
        const normalizedMissionRole = normalizeText(role);
        return normalizedRole.includes(normalizedMissionRole) || normalizedMissionRole.includes(normalizedRole);
      })
      ? 6
      : 0
    : 0;
  const trackScore = mission.tracks.includes(track) ? 5 : 0;
  const broadScore = mission.tracks.length > 5 ? 1 : 0;
  return roleScore + trackScore + broadScore;
};

export const getRecommendedMissions = (context = {}) => {
  const normalizedContext =
    typeof context === "string" ? { targetRole: context } : context || {};
  const completedMissionIdSet = new Set(
    Array.isArray(normalizedContext.completedMissionIds)
      ? normalizedContext.completedMissionIds.map(String)
      : []
  );
  const rankedMissions = [...mockMissions]
    .map((mission) => ({ mission, score: missionScore(mission, normalizedContext) }))
    .sort((a, b) => b.score - a.score);

  const matched = rankedMissions.filter((item) => item.score > 0).map((item) => item.mission);
  const fallback = mockMissions.filter((mission) => mission.id !== "it-service-mvp");
  const rankedPool = matched.length ? matched : fallback;
  const pool = [
    ...rankedPool,
    ...mockMissions.filter(
      (mission) => !rankedPool.some((rankedMission) => rankedMission.id === mission.id)
    ),
  ];
  const availableMissions = pool.filter(
    (mission) => !completedMissionIdSet.has(mission.id)
  );

  return availableMissions.slice(0, 4);
};

export const getMissionById = (missionId) =>
  mockMissions.find((mission) => mission.id === missionId) || null;

export const getMissionCount = () => mockMissions.length;
