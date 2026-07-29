import { getProfile } from "./brandProfileRepo.js";
import { listPosts } from "./postsRepo.js";
import { generateJson } from "./llmClient.js";

// blogHealth는 블로그 실 연동 전(Day9는 스텁)이라 여전히 mock 값을 쓴다.
// recommendedTopic/reason은 계절 + 브랜드 업종 + 실제 게시글 현황(Supabase)을
// 컨텍스트로 LLM이 생성하고, seasonalTrend/industryTrend/expectedEffect는
// 계절 규칙 기반 문구로 남겨둔다(Day18 범위: 추천 문구만 LLM화).
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

const SYSTEM_PROMPT = `당신은 소상공인에게 오늘의 블로그 홍보 브리핑을 제안하는 한국어 마케팅 어시스턴트입니다.
- 제공된 사실(계절, 업종, 최근 게시 현황)만 근거로 쓰고 새로운 통계나 사실을 지어내지 않습니다.
- recommendedTopic은 오늘 홍보글로 다루면 좋을 주제를 한 문장으로 구체적으로 제안합니다.
- reason은 그 추천의 근거가 되는 짧은 문장 2~3개 배열입니다. 제공된 사실을 자연스러운 문장으로 풀어 씁니다.`;

const BRIEFING_SCHEMA = {
  type: "object",
  properties: {
    recommendedTopic: { type: "string" },
    reason: { type: "array", items: { type: "string" } },
  },
  required: ["recommendedTopic", "reason"],
  additionalProperties: false,
};

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

  const { recommendedTopic, reason } = await generateJson({
    system: SYSTEM_PROMPT,
    schema: BRIEFING_SCHEMA,
    user: `다음 사실을 근거로 오늘의 추천 주제와 이유를 만들어주세요.
- 업종: ${businessType}
- 현재 계절: ${season.name} (트렌드 키워드: ${season.keyword})
- 최근 게시글 작성: ${daysSinceLastPost === null ? "아직 발행된 게시글이 없음" : `${daysSinceLastPost}일째 없음`}`,
  });

  return {
    date: now.toISOString().slice(0, 10),
    blogHealth: { score: 80, level: "good" },
    daysSinceLastPost: daysSinceLastPost ?? 0,
    seasonalTrend: `${season.keyword} 키워드 검색량 증가`,
    industryTrend: `${businessType} 업종에서 ${season.name} 콘텐츠 게시가 늘고 있습니다.`,
    recommendedTopic,
    reason,
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
