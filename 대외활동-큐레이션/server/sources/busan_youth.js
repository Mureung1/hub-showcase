// 부산청년플랫폼 수집기(지자체 청년사업). 통합공지 게시판을 크롤링한다.
// 목록은 표(제목·부서명·등록일)로 구조화돼 있고, 상세 본문은 자유 텍스트라 raw_text 로 저장(자격은 LLM/텍스트로 추출).
// 부서명에 '금정구' 등 기초지자체가 들어와서, 부산/금정구 사업을 여기서 확보한다. (docs/데이터-수집.md, 사용자 우선순위)
import { load } from "cheerio";
import { fileURLToPath } from "url";

const BASE = "https://young.busan.go.kr";
const UA = "Mozilla/5.0 (compatible; ActivityCurationBot/0.1; personal project, links to source)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`부산청년 ${res.status}: ${url}`);
  return res.text();
}

// 통합공지 목록. 각 항목은 원본(부산시 부서/구 사이트)으로 바로 링크된다(통합 게시판).
// 목록에서 제목 + 부서(과/구) + 원문 외부링크 + 등록일을 얻는다. source_url = 원문 링크(유일 키).
// 반환: [{ title, dept, postedAt, sourceUrl }]
export async function fetchList(page = 1) {
  const url = `${BASE}/itgnotice/list.nm?menuCd=228&pageIndex=${page}`;
  const $ = load(await getHtml(url));
  const items = [];
  $("tr").each((_, tr) => {
    const a = $(tr).find('a[target="_blank"]').first();
    const href = a.attr("href");
    if (!href) return;
    const tds = $(tr).find("td");
    if (!tds.length) return;
    items.push({
      title: a.text().replace(/\s+/g, " ").trim(),
      dept: $(tds[tds.length - 2]).text().replace(/\s+/g, " ").trim(),
      postedAt: $(tds[tds.length - 1]).text().replace(/\s+/g, " ").trim(),
      sourceUrl: href.trim(),
    });
  });
  return items;
}

// 원문이 부서·구마다 다른 사이트라 상세 파싱은 소스별로 다르다.
// 지금은 제목·부서로 조건을 잡고 원문 링크로 연결한다(자격 자유문장은 이후 LLM/원문 크롤로).
export function toRaw(item) {
  return {
    source_url: item.sourceUrl,
    raw_title: item.title,
    dept: item.dept,
    posted_at: item.postedAt,
    raw_text: `${item.title} (담당: ${item.dept})`,
    scraped_at: new Date().toISOString(),
  };
}

// 직접 실행: 목록을 찍어 부산 지자체 청년사업이 나오는지 확인.
//   node sources/busan_youth.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = await fetchList(1);
  console.log(`부산청년플랫폼 통합공지 ${list.length}건`);
  for (const it of list.slice(0, 12)) {
    console.log(`  [${it.dept}] ${it.title.slice(0, 42)}  (${it.postedAt})`);
  }
  const mojib = list.filter((x) => /모집|공모|참가|신청|지원|양성|채용/.test(x.title));
  console.log(`\n모집·공모·지원 성격: ${mojib.length}건 (지자체 청년사업 후보)`);
  await sleep(100);
}
