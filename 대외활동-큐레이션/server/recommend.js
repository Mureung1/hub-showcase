// 자연어 추천. 사용자가 자기소개+원하는 것을 자유롭게 쓰면, 프로필을 뽑아 규칙으로 지원 가능한 것만
// 추린 뒤(match.js), 의도에 맞게 LLM이 순위·이유를 달아 돌려준다. 규칙(자격 판정)과 LLM(말투 이해·추천)을
// 강점대로 나눠 쓴다. Gemini 무료 등급, 질문당 2콜(파싱+랭킹).
import { GoogleGenAI, Type } from "@google/genai";
import { fileURLToPath } from "url";
import { matchActivity } from "../src/match.js";
import { isPast } from "../src/deadline.js";

// 클라이언트는 지연 생성한다. 모듈 로드 시점엔 아직 .env가 안 올라와 있을 수 있어서다.
let _client;
const getClient = () => (_client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
const MODEL = "gemini-3.5-flash-lite";
const RANK_POOL = 400; // 랭킹에 넣을 후보 최대 수. 대부분(부산 대외활동 ~285건)은 다 담기고, 넘칠 때만 최신 등록순으로 자른다.

// 1) 프롬프트 -> 프로필 + 의도. 지역·전공은 우리 canonical 값으로 강제한다.
// 없는 값은 필드를 생략하게 둔다(Gemini enum엔 빈 문자열을 못 넣는다). 그래서 지역·재학·카테고리는
// required에서 빼고, grade/income/gpa는 숫자라 없으면 0으로 받는다.
const PROFILE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    region: { type: Type.STRING, enum: ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "강원", "충청", "전라", "경상", "제주"] },
    grade: { type: Type.INTEGER },        // 1~4, 없으면 0
    enrollment: { type: Type.STRING, enum: ["재학", "휴학", "졸업예정"] },
    majors: { type: Type.ARRAY, items: { type: Type.STRING, enum: ["인문", "경영", "경제", "교육", "과학", "IT", "의학", "예술"] } },
    category: { type: Type.STRING, enum: ["대외활동", "공모전", "장학", "지자체"] },
    income: { type: Type.INTEGER },       // 소득분위 1~10, 없으면 0
    gpa: { type: Type.NUMBER },           // 학점, 없으면 0
    intent: { type: Type.STRING },        // 무엇을 원하는지 한두 문장 요약(경쟁률·스펙·전공무관 등 뉘앙스 포함)
  },
  required: ["grade", "majors", "income", "gpa", "intent"],
};

async function parsePrompt(prompt) {
  const res = await getClient().models.generateContent({
    model: MODEL,
    contents: `사용자가 자기소개와 찾고 싶은 것을 자유롭게 적었다. 프로필과 의도를 뽑아라.
- region: 사는 지역을 위 enum 중 하나로(부산대·부산 거주 -> 부산). 물리학과 같은 전공은 majors로(과학).
- grade: 학년 정수(3학년 -> 3), 없으면 0. income/gpa도 없으면 0.
- category: 대외활동/공모전/장학/지자체 중 원하는 것, 안 정해졌으면 "".
- intent: "경쟁률 높은", "스펙에 도움", "전공 무관 좋은 경험" 같은 뉘앙스를 다 담아 한두 문장으로.
사용자 글: """${prompt}"""`,
    config: { responseMimeType: "application/json", responseSchema: PROFILE_SCHEMA, maxOutputTokens: 400 },
  });
  const p = JSON.parse(res.text);
  return {
    region: p.region || null,
    grade: p.grade || null,
    enrollment: p.enrollment || null,
    majors: p.majors || [],
    category: p.category || null,
    income: p.income || null,
    gpa: p.gpa || null,
    intent: p.intent || prompt,
  };
}

// 2) DB에서 후보를 읽어 규칙으로 지원 가능(eligible/near)한 것만 추린다.
async function eligibleCandidates(supabase, profile) {
  let all = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from("postings").select("id,title,org,category,source,url,deadline,posted_at,parse_status,eligibility").range(from, from + 999);
    if (profile.category) q = q.eq("category", profile.category);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  // match.js 프로필 모양. 전공은 사용자 전공을 넣어 무관·해당전공 공고를 통과시킨다(타 전공제한만 제외).
  const mp = { grade: profile.grade, major: profile.majors[0] || null, region: profile.region, enrollment: profile.enrollment, income: profile.income, gpa: profile.gpa };
  return all.filter((a) => {
    if (isPast(a.deadline)) return false;
    const r = matchActivity({ ...a, parseStatus: a.parse_status }, mp);
    return r.status === "eligible" || r.status === "near";
  });
}

// 3) 의도에 맞게 LLM이 top N 순위+이유. 후보는 제목·기관·카테고리만 압축해서 넣는다.
const RANK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    picks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { index: { type: Type.INTEGER }, reason: { type: Type.STRING } },
        required: ["index", "reason"],
      },
    },
  },
  required: ["picks"],
};

async function rankByIntent(intent, candidates, topN = 10) {
  // 상한을 넘으면 최신 등록순(posted_at 내림차순)으로 잘라, 오래된 게 먼저 밀려나고 최신 공고가 랭킹에 들어가게 한다.
  const pool = [...candidates]
    .sort((a, b) => (b.posted_at || "").localeCompare(a.posted_at || ""))
    .slice(0, RANK_POOL);
  const list = pool.map((c, i) => `${i}. ${c.title} | ${c.org || ""} | ${c.category}`).join("\n");
  const res = await getClient().models.generateContent({
    model: MODEL,
    contents: `사용자가 원하는 것: "${intent}"
아래는 사용자가 '지원 가능한' 활동 목록이다(번호. 제목 | 기관 | 카테고리). 사용자의 의도에 가장 잘 맞는 것 ${topN}개를
골라 index와 한 줄 이유를 달아라. '경쟁률 높은/유명한/스펙에 도움'은 기관 규모(대기업·정부·유명 재단)와 활동 성격으로 판단한다.
없는 걸 지어내지 말고 목록 번호 안에서만 고른다.
목록:
${list}`,
    config: { responseMimeType: "application/json", responseSchema: RANK_SCHEMA, maxOutputTokens: 1200 },
  });
  const picks = JSON.parse(res.text).picks || [];
  return picks.map((p) => ({ ...pool[p.index], reason: p.reason })).filter((x) => x.id != null);
}

// 전체: 프롬프트 -> 프로필 -> 규칙필터 -> 랭킹. 반환: { profile, total, results:[{...posting, reason}] }
export async function recommend(prompt, supabase, topN = 10) {
  const profile = await parsePrompt(prompt);
  const candidates = await eligibleCandidates(supabase, profile);
  const results = candidates.length ? await rankByIntent(profile.intent, candidates, topN) : [];
  return { profile, candidateCount: candidates.length, results };
}

// 직접 실행: 프롬프트를 넣어 추천이 유의미하게 나오는지 확인.
//   node recommend.js "나는 부산에 사는 3학년 물리학과 학생이야. 스펙에 도움될 대외활동 찾아줘"
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await import("dotenv/config");
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const prompt = process.argv.slice(2).join(" ") || "부산 사는 3학년, 스펙에 도움될 대외활동";
  const { profile, candidateCount, results } = await recommend(prompt, supabase);
  console.log("프로필:", JSON.stringify(profile, null, 0));
  console.log(`지원 가능 후보 ${candidateCount}건 -> 추천 ${results.length}건`);
  for (const r of results) console.log(`  · ${r.title.slice(0, 45)} | ${r.org || ""}\n    -> ${r.reason}`);
}
