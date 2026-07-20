import { listPosts } from "./postsRepo.js";

// LLM 연동 전(Day18) 임시 규칙 기반 — 방문자 수/계절 콘텐츠/월별 계획 달성률은
// 실 블로그·통계 연동 전이라 고정값(briefingService.js의 blogHealth와 같은 이유)이고,
// 게시 주기·콘텐츠 다양성·SEO 활용은 Supabase의 실제 게시글 데이터로 계산한다.
const DAY_MS = 24 * 60 * 60 * 1000;

function levelFor(score) {
  if (score >= 80) return "good";
  if (score >= 50) return "normal";
  return "warning";
}

function daysSinceLastPublished(posts) {
  const lastPublishedAt = posts
    .filter((p) => p.status === "published")
    .map((p) => p.publishedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  if (!lastPublishedAt) return null;
  return Math.floor((Date.now() - new Date(lastPublishedAt).getTime()) / DAY_MS);
}

function scorePostingCycle(daysSince) {
  if (daysSince === null) return 20;
  if (daysSince <= 3) return 90;
  if (daysSince <= 7) return 75;
  if (daysSince <= 14) return 55;
  return 30;
}

function scoreContentDiversity(posts) {
  const topics = new Set(posts.map((p) => p.purpose ?? p.noticeType).filter(Boolean));
  return Math.min(100, topics.size * 25 + 20);
}

function scoreSeoUsage(posts) {
  if (posts.length === 0) return 0;
  const avgKeywords = posts.reduce((sum, p) => sum + p.seoKeywords.length, 0) / posts.length;
  return Math.min(100, Math.round(avgKeywords * 20));
}

export async function getHealthScore() {
  const posts = await listPosts();
  const daysSince = daysSinceLastPublished(posts);

  const breakdown = {
    postingCycle: scorePostingCycle(daysSince),
    contentDiversity: scoreContentDiversity(posts),
    seasonalContent: 70,
    seoUsage: scoreSeoUsage(posts),
    monthlyPlanCompletion: 60,
  };
  const total = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0) / 5);

  return { total, level: levelFor(total), visitorCount: 0, breakdown };
}

export async function getOpportunities() {
  const posts = await listPosts();
  const daysSince = daysSinceLastPublished(posts);
  const opportunities = [];

  if (daysSince === null || daysSince > 7) {
    opportunities.push({
      id: "posting-gap",
      message:
        daysSince === null ? "최근 게시글 작성이 없습니다." : `최근 게시글 작성이 ${daysSince}일째 없습니다.`,
      reason: ["게시 주기가 길어지면 블로그 건강도 점수가 낮아집니다."],
      expectedEffect: ["꾸준한 게시글 발행 시 검색 노출과 방문자 유입이 늘어납니다."],
    });
  }

  if (!posts.some((p) => p.purpose === "event")) {
    opportunities.push({
      id: "no-event-content",
      message: "이벤트/할인 콘텐츠가 부족합니다.",
      reason: ["최근 이벤트·할인 홍보글이 없습니다."],
      expectedEffect: ["이벤트 콘텐츠는 방문 전환율을 높이는 데 효과적입니다."],
    });
  }

  return opportunities;
}
