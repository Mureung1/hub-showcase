import { getProfile } from "./brandProfileRepo.js";
import { listPosts } from "./postsRepo.js";

// LLM 연동 전(Day18) 임시 규칙 기반 — blogHealth는 블로그 실 연동 전(Day9는 스텁)이라
// mock 값을 쓰고, 나머지는 계절 + 브랜드 업종 + 실제 게시글 현황(Supabase)을 조합한다.
const SEASONS = [
  { months: [12, 1, 2], name: "겨울", keyword: "연말연시" },
  { months: [3, 4, 5], name: "봄", keyword: "봄나들이" },
  { months: [6, 7, 8], name: "여름", keyword: "여름" },
  { months: [9, 10, 11], name: "가을", keyword: "가을 나들이" },
];

function currentSeason(date) {
  const month = date.getMonth() + 1;
  return SEASONS.find((s) => s.months.includes(month)) ?? SEASONS[2];
}

function daysBetween(from, to) {
  return Math.floor((to.getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000));
}

export async function getTodayBriefing() {
  const now = new Date();
  const profile = await getProfile();
  const businessType = profile?.businessType ?? "매장";
  const season = currentSeason(now);

  const publishedPosts = await listPosts({ status: "published" });
  const lastPublishedAt = publishedPosts
    .map((post) => post.publishedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const daysSinceLastPost = lastPublishedAt ? daysBetween(lastPublishedAt, now) : null;

  return {
    date: now.toISOString().slice(0, 10),
    blogHealth: { score: 80, level: "good" },
    daysSinceLastPost: daysSinceLastPost ?? 0,
    seasonalTrend: `${season.keyword} 키워드 검색량 증가`,
    industryTrend: `${businessType} 업종에서 ${season.name} 콘텐츠 게시가 늘고 있습니다.`,
    recommendedTopic: `이번 주에는 ${season.name} 신메뉴 또는 인기 메뉴 홍보를 추천합니다.`,
    reason: [
      daysSinceLastPost === null
        ? "아직 발행된 게시글이 없습니다."
        : `최근 게시글 작성이 ${daysSinceLastPost}일째 없습니다.`,
      `${season.keyword} 키워드 검색량이 증가했습니다.`,
      `${businessType} 업종에서 ${season.name} 콘텐츠가 증가하고 있습니다.`,
    ],
    expectedEffect: [
      {
        icon: "visibility",
        color: "secondary",
        title: "검색 노출 증가",
        description: `${season.keyword} 키워드 매칭으로 노출 상승 예상`,
      },
      {
        icon: "groups",
        color: "tertiary",
        title: "방문자 증가",
        description: "홍보 콘텐츠 발행 시 방문 문의 증가 기대",
      },
    ],
  };
}
