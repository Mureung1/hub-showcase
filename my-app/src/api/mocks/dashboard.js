export const mockBrandProfile = {
  id: "brand-1",
  businessType: "카페",
  storeName: "OO카페",
  mainProduct: "디저트",
  targetCustomer: "동네 주민",
  brandMood: "친근함",
  strength: "가성비",
  tone: "친근한 말투",
  goal: "신규 고객 유치",
  summary: "동네 주민들이 자주 찾는 디저트 카페",
  keywords: ["친근한", "디저트", "가성비"],
  createdAt: "2026-06-01T09:00:00+09:00",
  updatedAt: "2026-06-01T09:00:00+09:00",
};

export const mockBriefing = {
  date: "2026-07-09",
  blogHealth: { score: 86, level: "good" },
  daysSinceLastPost: 18,
  seasonalTrend: "여름 키워드 검색량 증가",
  industryTrend: "경쟁 매장 여름 콘텐츠 증가",
  recommendedTopic: "여름 신메뉴 또는 인기 메뉴 홍보를 추천합니다.",
  reason: [
    "최근 게시글 작성이 없습니다.",
    "여름 키워드 검색량이 증가했습니다.",
    "경쟁 매장에서 여름 콘텐츠가 증가하고 있습니다.",
  ],
  expectedEffect: [
    {
      icon: "visibility",
      color: "secondary",
      title: "검색 노출 증가",
      description: "지역 키워드 매칭율 45% 상승 예상",
    },
    {
      icon: "groups",
      color: "tertiary",
      title: "방문자 증가",
      description: "주말 예약 문의 20% 증가 기대",
    },
  ],
};

export const mockInsight = {
  healthScore: {
    total: 86,
    level: "good",
    visitorCount: 1240,
    breakdown: {
      postingCycle: 70,
      contentDiversity: 80,
      seasonalContent: 90,
      seoUsage: 85,
      monthlyPlanCompletion: 75,
    },
  },
  opportunities: [],
};

export const mockPosts = [
  {
    id: "post-1",
    title: "무더운 여름을 날려줄 시원한 아이스 아메리카노 출시!",
    thumbnailUrl: null,
    publishedAt: "2026-06-18T10:00:00+09:00",
    viewCount: 1245,
  },
  {
    id: "post-2",
    title: "이번 주말 한정 디저트: 블루베리 요거트 타르트",
    thumbnailUrl: null,
    publishedAt: "2026-06-15T10:00:00+09:00",
    viewCount: 890,
  },
  {
    id: "post-3",
    title: "OO카페 평일 오후, 카공하기 좋은 이유",
    thumbnailUrl: null,
    publishedAt: "2026-06-10T10:00:00+09:00",
    viewCount: 2130,
  },
];
