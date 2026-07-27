export const JOB_POSTINGS = [
  {
    id: "toss-frontend",
    company: "토스",
    role: "Frontend Developer",
    location: "서울",
    sourceUrl: "https://toss.im/career/job-detail?job_id=4770557003",
    checkedAt: "2026-07-24",
    companySummary:
      "작은 제품 조직이 높은 자율성과 책임을 바탕으로 금융 경험을 빠르게 개선합니다.",
    talentKeywords: ["주도성", "제품 임팩트", "빠른 학습", "협업"],
    responsibilities: [
      "React와 TypeScript 기반 웹 제품 개발",
      "제품 문제를 스스로 발견하고 해결",
      "사용자 경험과 개발 생산성 개선",
    ],
    requiredSkills: ["React", "TypeScript", "Next.js", "SPA", "WebView"],
    portfolioFocus: [
      "문제를 발견한 배경과 의사결정 근거",
      "성능 또는 사용자 경험을 개선한 수치",
      "끝까지 소유하고 출시한 제품 경험",
    ],
  },
  {
    id: "line-pay-frontend",
    company: "LINE Pay",
    role: "Frontend Engineer",
    location: "서울",
    sourceUrl: "https://careers.linecorp.com/ko/jobs/3005/",
    checkedAt: "2026-07-24",
    companySummary:
      "결제·리워드·커머스의 대규모 트래픽을 안정적으로 처리하는 사용자 경험을 만듭니다.",
    talentKeywords: ["대규모 트래픽", "실험", "코드 리뷰", "직군 간 협업"],
    responsibilities: [
      "결제와 커머스 WebView 화면 개발",
      "실험을 통한 제품 지표 개선",
      "동료와 코드 품질 및 개발 방식 개선",
    ],
    requiredSkills: ["React", "Next.js", "TypeScript", "Git", "HTTP", "Database"],
    portfolioFocus: [
      "복잡한 비즈니스 흐름을 단순하게 만든 UI",
      "테스트·리뷰로 품질을 높인 과정",
      "백엔드 및 디자이너와 협업한 사례",
    ],
  },
  {
    id: "coupang-play-frontend",
    company: "Coupang Play",
    role: "Staff Front-end Engineer (CX)",
    location: "서울",
    sourceUrl:
      "https://www.coupang.jobs/en/jobs/7956824/staff-front-end-engineer-cx-coupang-play/?gh_jid=7956824",
    checkedAt: "2026-07-24",
    companySummary:
      "PC·스마트 TV·WebView를 아우르는 스트리밍 고객 경험을 데이터와 실험으로 개선합니다.",
    talentKeywords: ["고객 중심", "멀티 플랫폼", "성능", "실험 문화"],
    responsibilities: [
      "다양한 기기의 스트리밍 웹 경험 개발",
      "Core Web Vitals와 렌더링 성능 개선",
      "재사용 컴포넌트와 실험 기반 UI 구축",
    ],
    requiredSkills: ["TypeScript", "React", "Next.js", "SSR", "A/B Test", "WebView"],
    portfolioFocus: [
      "멀티 디바이스 대응과 접근성",
      "측정 가능한 웹 성능 개선",
      "재사용 가능한 컴포넌트 설계",
    ],
  },
  {
    id: "clo-set-frontend",
    company: "CLO Virtual Fashion",
    role: "Frontend Developer",
    location: "서울",
    sourceUrl:
      "https://jobs.lever.co/clovirtualfashion/57810e0b-dc08-4c8b-bfc5-c2dc4fb5d3ae",
    checkedAt: "2026-07-24",
    companySummary:
      "디지털 패션 자산을 전 세계 팀이 함께 관리하고 협업하는 CLO-SET 플랫폼을 만듭니다.",
    talentKeywords: ["문제 발견", "글로벌 협업", "시스템 설계", "AI 활용"],
    responsibilities: [
      "디지털 자산 협업 웹 서비스 개발",
      "프론트엔드 구조와 빌드 성능 개선",
      "디자인 시스템과 글로벌 협업 경험 구축",
    ],
    requiredSkills: ["React", "TypeScript", "REST API", "Vite", "State Management"],
    portfolioFocus: [
      "복잡한 도메인을 이해하고 구조화한 과정",
      "프론트엔드 시스템 설계와 성능 개선",
      "디자인 시스템 또는 협업 도구 경험",
    ],
  },
  {
    id: "qanda-frontend",
    company: "QANDA",
    role: "Frontend Engineer",
    location: "서울",
    sourceUrl:
      "https://jobs.lever.co/mathpresso/3041f15a-fb50-4b6d-85df-d624b8ac1b20",
    checkedAt: "2026-07-24",
    companySummary:
      "누구나 좋은 교육 기회를 얻도록 대규모 학습 검색과 웹 경험을 개선합니다.",
    talentKeywords: ["교육 임팩트", "문제 정의", "테스트", "지속적 학습"],
    responsibilities: [
      "검색·WebView·디자인 시스템 개발",
      "대규모 트래픽 모니터링과 품질 개선",
      "테스트 기반으로 안정적인 기능 제공",
    ],
    requiredSkills: ["React", "Next.js", "TypeScript", "Vitest", "Playwright", "MSW"],
    portfolioFocus: [
      "사용자 문제를 명확히 정의한 과정",
      "TDD·통합 테스트로 검증한 기능",
      "트래픽·오류를 관찰하고 개선한 경험",
    ],
  },
];

export function getJobPosting(id) {
  return JOB_POSTINGS.find((posting) => posting.id === id) ?? null;
}

export function buildTargetMarkdown(posting) {
  if (!posting) return "";

  return [
    "# 지원 목표",
    `- 기업: ${posting.company}`,
    `- 채용 포지션: ${posting.role}`,
    `- 근무지: ${posting.location}`,
    `- 공고 확인일: ${posting.checkedAt}`,
    `- 원문: ${posting.sourceUrl}`,
    "",
    "## 기업과 제품 맥락",
    posting.companySummary,
    "",
    "## 인재상 키워드",
    posting.talentKeywords.map((keyword) => `- ${keyword}`).join("\n"),
    "",
    "## 주요 업무",
    posting.responsibilities.map((item) => `- ${item}`).join("\n"),
    "",
    "## 요구 기술",
    posting.requiredSkills.map((skill) => `- ${skill}`).join("\n"),
    "",
    "## 포트폴리오 강조점",
    posting.portfolioFocus.map((item) => `- ${item}`).join("\n"),
  ].join("\n");
}
