// 콘테스트코리아 수집기. API 가 없어 정적 HTML 을 크롤링한다. (docs/데이터-수집.md)
// 목록에서 제목·고유키(str_no)·상세주소를 따고, 상세에서 주최·분야·참가대상·접수기간·본문을 뽑는다.
// 자격요건 자유 문장(raw_text)은 여기서 해석하지 않고 그대로 저장한다. 해석은 parser/extract.js(LLM).
import { load } from "cheerio";
import { fileURLToPath } from "url";

const BASE = "https://www.contestkorea.com";
// 헤더는 ASCII만 가능해 영문으로. 정체를 밝히고 원문 링크로 연결한다는 뜻.
const UA = "Mozilla/5.0 (compatible; ActivityCurationBot/0.1; personal project, links to source)";

// 예의: 요청 사이 간격을 둔다. (robots 는 목록·상세 Allow, 원문 재게시 안 함)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`콘코 ${res.status}: ${url}`);
  return res.text();
}

// 목록 한 페이지. int_gbn=1 은 대회·공모전. page 는 1부터.
// 반환: [{ strNo, title, sourceUrl }]. 중복 str_no 는 한 번만.
export async function fetchList(page = 1, intGbn = 1) {
  const url = `${BASE}/sub/list.php?displayrow=60&int_gbn=${intGbn}&page=${page}`;
  const $ = load(await getHtml(url));
  const seen = new Map();
  $('a[href*="view.php"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/str_no=(\d+)/);
    if (!m) return;
    const strNo = m[1];
    // 목록 항목 제목 앞에 "12. " 같은 순번이 붙어 오니 떼어낸다.
    const title = $(el).text().replace(/\s+/g, " ").replace(/^\d+\.\s*/, "").trim();
    if (title && !seen.has(strNo)) {
      seen.set(strNo, { strNo, title, sourceUrl: `${BASE}/sub/view.php?int_gbn=${intGbn}&str_no=${strNo}` });
    }
  });
  return [...seen.values()];
}

// 상세 한 건. 상단 요약 테이블(주최·대표분야·참가대상·접수기간)과 본문을 뽑는다.
export async function fetchDetail(sourceUrl) {
  const $ = load(await getHtml(sourceUrl));
  // th(라벨) -> td(값) 매핑
  const info = {};
  $(".view_top_area th").each((_, th) => {
    const label = $(th).text().replace(/\s+/g, " ").trim();
    const val = $(th).next("td").text().replace(/\s+/g, " ").trim();
    if (label) info[label] = val;
  });
  const title = $(".view_top_area h1").first().text().replace(/\s+/g, " ").trim();
  // 접수기간 문자열에서 끝 날짜를 마감으로. 못 읽으면 null(확인 필요).
  const period = info["접수기간"] || "";
  const deadline = parseEndDate(period);
  // 본문 자유 문장(자격요건 등). LLM 파싱 입력용 raw_text.
  const rawText = $(".view_detail_area").text().replace(/\s+/g, " ").trim().slice(0, 8000);
  return {
    title,
    host: info["주최 . 주관"] || info["주최.주관"] || "",
    field: info["대표분야"] || "",
    target: info["참가대상"] || "",
    period,
    deadline,
    rawText,
  };
}

// "2026. 7. 13.(월) ~ 2026. 7. 31.(목)" 같은 문자열에서 마지막 날짜를 YYYY-MM-DD 로.
function parseEndDate(s) {
  const dates = [...s.matchAll(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/g)];
  if (!dates.length) return null;
  const [, y, mo, d] = dates[dates.length - 1];
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// 목록 항목 + 상세를 우리 raw 포맷으로. (youthcenter.toRaw 와 같은 모양)
export function toRaw(item, detail) {
  return {
    source_url: item.sourceUrl,
    raw_title: detail.title || item.title,
    deadline: detail.deadline, // null 이면 확인 필요
    raw_text: [detail.target, detail.rawText].filter(Boolean).join("\n"),
    host: detail.host,
    field: detail.field,
    scraped_at: new Date().toISOString(),
  };
}

// 직접 실행하면 목록 몇 건 + 상세 2건을 찍어 크롤링이 되는지 눈으로 확인한다.
//   node sources/contestkorea.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = await fetchList(1);
  console.log(`목록 ${list.length}건`);
  for (const it of list.slice(0, 3)) {
    const d = await fetchDetail(it.sourceUrl);
    console.log("\n-", d.title);
    console.log("  주최:", d.host, "| 분야:", d.field);
    console.log("  참가대상:", d.target.slice(0, 50));
    console.log("  접수:", d.period, "-> 마감:", d.deadline);
    console.log("  본문 앞부분:", d.rawText.slice(0, 80));
    await sleep(800);
  }
}
