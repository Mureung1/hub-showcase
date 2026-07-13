export const mockMissions = [
  {
    id: "frontend-weather-dashboard",
    roles: ["프론트엔드 개발자", "웹 개발자", "React 개발자"],
    title: "공공 API 날씨 대시보드 만들기",
    difficulty: "중간",
    duration: "3~5일",
    skills: ["React", "API 연동", "상태 관리", "반응형 UI"],
    deliverable: "GitHub 저장소, 배포 URL, 구현 과정 요약",
    summary:
      "외부 API 데이터를 가져와 현재 날씨와 주간 예보를 카드형 대시보드로 구성합니다.",
    guide: [
      "사용할 날씨 API와 화면에 보여줄 데이터를 정리합니다.",
      "검색 또는 지역 선택 UI를 만들고 API 요청 흐름을 연결합니다.",
      "로딩, 오류, 빈 상태를 분리해 사용자 흐름을 안정화합니다.",
      "모바일에서도 카드가 깨지지 않도록 반응형 레이아웃을 점검합니다.",
    ],
    checklist: [
      "API 요청 성공/실패 상태 처리",
      "날씨 카드와 예보 리스트 구현",
      "모바일 레이아웃 확인",
      "README에 실행 방법과 배운 점 작성",
    ],
    references: ["OpenWeather API 문서", "React fetch/useEffect 패턴", "Vite 배포 가이드"],
  },
  {
    id: "frontend-auth-flow",
    roles: ["프론트엔드 개발자", "웹 개발자", "React 개발자"],
    title: "회원가입 / 로그인 플로우 구현하기",
    difficulty: "쉬움",
    duration: "2~3일",
    skills: ["폼 검증", "localStorage", "라우팅", "인증 상태 UI"],
    deliverable: "회원가입, 로그인, 마이페이지가 연결된 데모",
    summary:
      "서비스에서 자주 쓰이는 인증 화면 흐름을 프론트엔드 MVP 형태로 구현합니다.",
    guide: [
      "회원가입, 로그인, 로그아웃, 마이페이지 화면 흐름을 정의합니다.",
      "입력 검증과 오류 메시지를 명확하게 분리합니다.",
      "로그인 상태에 따라 헤더 버튼이 바뀌도록 구현합니다.",
      "보호 페이지 접근 시 로그인 화면으로 이동하게 만듭니다.",
    ],
    checklist: [
      "회원가입 입력 검증",
      "로그인 성공/실패 처리",
      "로그아웃 상태 초기화",
      "마이페이지에 저장 데이터 표시",
    ],
    references: ["React form handling", "localStorage 사용법", "프론트엔드 인증 UX 사례"],
  },
  {
    id: "planner-competitor-report",
    roles: ["서비스 기획자", "PM", "프로덕트 매니저"],
    title: "경쟁 서비스 3개 분석 리포트 작성하기",
    difficulty: "중간",
    duration: "2~4일",
    skills: ["서비스 분석", "문제 정의", "사용자 흐름", "개선안 도출"],
    deliverable: "Notion 또는 PDF 분석 리포트",
    summary:
      "목표 서비스와 유사한 경쟁 서비스를 비교하고 차별화 기회를 정리합니다.",
    guide: [
      "분석할 경쟁 서비스 3개와 비교 기준을 정합니다.",
      "온보딩, 핵심 기능, 가격 또는 수익 모델, 사용자 흐름을 비교합니다.",
      "공통 강점과 불편 지점을 표로 정리합니다.",
      "내 서비스에 적용할 개선 아이디어를 우선순위로 제안합니다.",
    ],
    checklist: [
      "비교 기준 5개 이상 정의",
      "서비스별 장단점 정리",
      "사용자 흐름 캡처 또는 도식화",
      "개선안 3개 이상 제안",
    ],
    references: ["서비스 벤치마킹 템플릿", "사용자 여정 지도", "PRD 작성 예시"],
  },
  {
    id: "planner-feature-prd",
    roles: ["서비스 기획자", "PM", "프로덕트 매니저"],
    title: "신규 기능 PRD 작성하기",
    difficulty: "중간",
    duration: "3~5일",
    skills: ["PRD", "요구사항 정의", "우선순위", "성공 지표"],
    deliverable: "기능 기획서, 와이어프레임, 성공 지표 정의",
    summary:
      "사용자 문제를 기준으로 신규 기능을 정의하고 개발 가능한 문서로 정리합니다.",
    guide: [
      "해결할 사용자 문제와 대상 사용자를 명확히 적습니다.",
      "기능 범위와 제외 범위를 분리합니다.",
      "화면 흐름과 주요 예외 케이스를 정리합니다.",
      "성공 지표와 릴리즈 후 확인 방법을 정의합니다.",
    ],
    checklist: [
      "문제 정의 작성",
      "사용자 스토리 3개 이상 작성",
      "기능 요구사항과 제외 범위 작성",
      "성과 지표 2개 이상 정의",
    ],
    references: ["PRD 템플릿", "User Story 작성법", "MVP 범위 정의 사례"],
  },
  {
    id: "data-job-posting-analysis",
    roles: ["데이터 분석가", "데이터 사이언티스트", "BI 분석가"],
    title: "채용 공고 데이터 분석하기",
    difficulty: "중간",
    duration: "4~6일",
    skills: ["Python", "데이터 전처리", "시각화", "인사이트 도출"],
    deliverable: "분석 노트북, 시각화 이미지, 인사이트 리포트",
    summary:
      "관심 직무의 채용 공고를 수집해 요구 역량과 학습 우선순위를 분석합니다.",
    guide: [
      "분석할 직무와 채용 공고 수집 기준을 정합니다.",
      "기술 스택, 경력 요건, 우대사항을 구조화합니다.",
      "빈도 분석과 시각화를 통해 핵심 역량을 도출합니다.",
      "분석 결과를 기반으로 학습 우선순위를 제안합니다.",
    ],
    checklist: [
      "공고 30개 이상 정리",
      "기술/역량 키워드 전처리",
      "상위 키워드 시각화",
      "직무 준비 인사이트 작성",
    ],
    references: ["pandas 기초", "matplotlib/seaborn 시각화", "채용 공고 분석 사례"],
  },
  {
    id: "data-public-dashboard",
    roles: ["데이터 분석가", "데이터 사이언티스트", "BI 분석가"],
    title: "공개 데이터 시각화 리포트 작성하기",
    difficulty: "쉬움",
    duration: "3~4일",
    skills: ["공개 데이터", "EDA", "차트 설계", "스토리텔링"],
    deliverable: "시각화 리포트, 데이터 출처, 분석 요약",
    summary:
      "공공 데이터를 사용해 하나의 문제를 설명하는 시각화 리포트를 만듭니다.",
    guide: [
      "분석 주제와 사용할 공개 데이터를 선택합니다.",
      "결측치와 이상치를 확인하고 필요한 컬럼을 정리합니다.",
      "비교, 추세, 분포 중심의 차트를 구성합니다.",
      "차트마다 알 수 있는 인사이트를 작성합니다.",
    ],
    checklist: [
      "데이터 출처 명시",
      "기초 통계와 결측치 확인",
      "차트 3개 이상 작성",
      "인사이트와 한계점 작성",
    ],
    references: ["공공데이터포털", "EDA 체크리스트", "데이터 시각화 원칙"],
  },
];

const defaultRoleAliases = ["프론트엔드 개발자", "웹 개발자", "React 개발자"];

const normalizeText = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");

export const getRecommendedMissions = (targetRole) => {
  const normalizedRole = normalizeText(targetRole);

  if (!normalizedRole) {
    return mockMissions.filter((mission) =>
      mission.roles.some((role) => defaultRoleAliases.includes(role))
    );
  }

  const matchedMissions = mockMissions.filter((mission) =>
    mission.roles.some((role) => {
      const normalizedMissionRole = normalizeText(role);
      return (
        normalizedRole.includes(normalizedMissionRole) ||
        normalizedMissionRole.includes(normalizedRole)
      );
    })
  );

  if (matchedMissions.length > 0) {
    return matchedMissions;
  }

  return mockMissions.filter((mission) =>
    mission.roles.some((role) => defaultRoleAliases.includes(role))
  );
};

export const getMissionById = (missionId) =>
  mockMissions.find((mission) => mission.id === missionId) || null;
