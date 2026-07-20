// 링커리어 수집기(대외활동 핵심). 내부 GraphQL API 를 직접 부른다(키 불필요, POST). (docs/데이터-수집.md)
// activityTypeID 로 유형을 거른다: 1=대외활동, 2=동아리/서포터즈, 3=공모전. 채용(5)은 우리 대상이 아니라 제외.
// 목록에서 id·제목·기관·마감(recruitCloseAt)을 받고, 상세 자격 자유문장은 이후 LLM 으로.
import { fileURLToPath } from "url";

const API = "https://api.linkareer.com/graphql";
const UA = "Mozilla/5.0 (compatible; ActivityCurationBot/0.1; personal project, links to source)";

// 우리가 쓰는 유형(채용 제외). 화면 카테고리로 매핑도 같이 둔다.
export const TYPES = [
  { id: 1, category: "대외활동" },
  { id: 2, category: "대외활동" }, // 동아리/서포터즈도 대외활동으로
  { id: 3, category: "공모전" },
];

async function gql(query) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("링커리어 GraphQL: " + json.errors[0].message);
  return json.data;
}

// targets 이름 조합으로 대학생 대상 여부 판별. '청소년'만 있으면 대학생 대상 아님(제외 대상).
// '대상 제한 없음'·'대학생'·'직장인/일반인' 중 하나라도 있으면 대학생도 지원 가능.
function isForUniv(targets) {
  const names = (targets || []).map((t) => t.name);
  return names.some((n) => n === "대상 제한 없음" || n === "대학생" || n === "직장인/일반인");
}

// 노이즈(친목·스포츠레저 캐주얼 동아리) 판별용 카테고리. 이력에 별 도움 안 되는 소모임 성격.
const NOISE_CATEGORIES = ["친목", "스포츠/레저"];
function isNoise(categories) {
  const names = (categories || []).map((c) => c.name);
  return names.some((n) => NOISE_CATEGORIES.includes(n));
}

// 한 유형의 한 페이지. 반환: { totalCount, items:[{ id, title, org, deadline, forUniv, isNoise, sourceUrl }] }
export async function fetchList(activityTypeID, page = 1, pageSize = 20) {
  const q = `{ activities(filterBy:{activityTypeID:${activityTypeID}}, pagination:{page:${page},pageSize:${pageSize}}) { totalCount nodes { id title recruitCloseAt organizationName targets { name } categories { name } } } }`;
  const { activities } = await gql(q);
  const items = activities.nodes.map((n) => ({
    id: n.id,
    title: (n.title || "").replace(/\s+/g, " ").trim(),
    org: n.organizationName || "",
    deadline: n.recruitCloseAt ? new Date(Number(n.recruitCloseAt)).toISOString().slice(0, 10) : null,
    forUniv: isForUniv(n.targets),
    isNoise: isNoise(n.categories),
    sourceUrl: `https://linkareer.com/activity/${n.id}`,
  }));
  return { totalCount: activities.totalCount, items };
}

export function toRaw(item, category) {
  return {
    source_url: item.sourceUrl,
    raw_title: item.title,
    org: item.org,
    category,
    deadline: item.deadline,
    raw_text: item.title,
    scraped_at: new Date().toISOString(),
  };
}

// 직접 실행: 유형별로 총 건수 + 샘플을 찍어 링커리어 수집이 되는지 확인.
//   node sources/linkareer.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const t of TYPES) {
    const { totalCount, items } = await fetchList(t.id, 1, 3);
    console.log(`\n[${t.category}] activityTypeID=${t.id} 총 ${totalCount}건`);
    for (const it of items) console.log(`  - ${it.title.slice(0, 40)} | ${it.org} | 마감 ${it.deadline}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}
