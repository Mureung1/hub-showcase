// 위비티(wevity) 공모전 수집기. 정적 HTML 크롤링. (docs/데이터-수집.md)
// 목록에서 제목·고유키(ix)·마감(D-day)·분야를 따고, 상세는 원문 링크로 연결한다.
// 자격 자유문장은 여기서 해석하지 않는다(이후 LLM).
import { load } from "cheerio";
import { fileURLToPath } from "url";

const BASE = "https://www.wevity.com";
const UA = "Mozilla/5.0 (compatible; ActivityCurationBot/0.1; personal project, links to source)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`위비티 ${res.status}: ${url}`);
  return res.text();
}

// Date -> "YYYY-MM-DD" (로컬 기준). toISOString은 UTC라 한국시간 자정 근처에 하루 밀릴 수 있어 안 쓴다.
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "D-13" -> today+13일의 YYYY-MM-DD. "D-DAY"/마감임박 -> today. 못 읽으면 null.
// today를 인자로 받아 결정적으로 테스트 가능(기본값은 실제 오늘이라 기존 호출부는 그대로 동작).
export function ddayToDate(s, today = new Date()) {
  const t = (s || "").replace(/\s+/g, "");
  if (/D-?DAY/i.test(t)) return fmtDate(today);
  const m = t.match(/D-(\d+)/i);
  if (!m) return null;
  const d = new Date(today);           // today를 복사(원본 안 건드림)
  d.setDate(d.getDate() + parseInt(m[1]));
  return fmtDate(d);
}

// 목록 한 페이지. 반환: [{ ix, title, deadline, cats, sourceUrl }]
export async function fetchList(page = 1) {
  const url = `${BASE}/?c=find&s=1&gub=1&pg=${page}`;
  const $ = load(await getHtml(url));
  const seen = new Map();
  $(".hide-info").each((_, el) => {
    const a = $(el).find(".hide-tit a").first();
    const href = a.attr("href") || "";
    const m = href.match(/ix=(\d+)/);
    if (!m) return;
    const ix = m[1];
    const title = a.text().replace(/\s+/g, " ").trim();
    if (!title || seen.has(ix)) return;
    seen.set(ix, {
      ix,
      title,
      deadline: ddayToDate($(el).find(".hide-dday").text()),
      cats: $(el).find(".hide-cat").text().replace(/\s+/g, " ").trim(),
      sourceUrl: `${BASE}/?c=find&s=1&gub=1&gbn=view&ix=${ix}`,
    });
  });
  return [...seen.values()];
}

export function toRaw(item) {
  return {
    source_url: item.sourceUrl,
    raw_title: item.title,
    deadline: item.deadline,
    raw_text: `${item.title}\n분야: ${item.cats}`,
    scraped_at: new Date().toISOString(),
  };
}

// 직접 실행: 목록을 찍어 위비티 공모전이 나오는지 확인.
//   node sources/wevity.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = await fetchList(1);
  console.log(`위비티 공모전 ${list.length}건`);
  for (const it of list.slice(0, 12)) {
    console.log(`  - ${it.title.slice(0, 40)} | 마감 ${it.deadline} | ${it.cats.slice(0, 30)}`);
  }
  await sleep(100);
}
