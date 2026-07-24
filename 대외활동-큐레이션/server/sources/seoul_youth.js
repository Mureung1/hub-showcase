// 서울 청년몽땅정보통(youth.seoul.go.kr) 공지사항 수집기. 부산청년플랫폼의 서울 대응.
// 목록이 표에 goView('게시글번호') 클릭 핸들러로 렌더돼 있어, 그 번호와 제목을 뽑아 상세 링크로 연결한다.
// 자격 자유문장은 여기서 해석하지 않는다(이후 LLM/원문). (docs/데이터-수집.md)
import { fileURLToPath } from "url";

const BASE = "https://youth.seoul.go.kr";
const BBS_KEY = "2303300002"; // 청년정책 공지사항 게시판
const UA = "Mozilla/5.0 (compatible; ActivityCurationBot/0.1; personal project, links to source)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`서울청년 ${res.status}: ${url}`);
  return res.text();
}

// 목록 한 페이지. goView('번호') 앵커에서 번호+제목을 뽑는다. 반환: [{ pstSn, title, sourceUrl }]
export async function fetchList(page = 1) {
  const html = await getHtml(`${BASE}/bbs/list.do?key=${BBS_KEY}&pageIndex=${page}`);
  const seen = new Map();
  // <a ... goView('2607220008') ...>제목</a> 형태에서 번호와 안쪽 텍스트를 잡는다.
  for (const m of html.matchAll(/<a[^>]*goView\(\s*'(\d+)'\s*\)[^>]*>([\s\S]*?)<\/a>/g)) {
    const pstSn = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (title && !seen.has(pstSn)) {
      seen.set(pstSn, { pstSn, title, sourceUrl: `${BASE}/bbs/view.do?key=${BBS_KEY}&pstSn=${pstSn}` });
    }
  }
  return [...seen.values()];
}

export function toRaw(item) {
  return {
    source_url: item.sourceUrl,
    raw_title: item.title,
    raw_text: item.title,
    scraped_at: new Date().toISOString(),
  };
}

// 직접 실행: 목록을 찍어 서울 청년 공지가 나오는지 확인.
//   node sources/seoul_youth.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = await fetchList(1);
  console.log(`서울 청년몽땅정보통 공지 ${list.length}건\n`);
  for (const it of list.slice(0, 10)) console.log(`  [${it.pstSn}] ${it.title.slice(0, 48)}`);
  const mojib = list.filter((x) => /모집|공모|참가|신청|지원|양성|챌린지|공고/.test(x.title));
  console.log(`\n모집·공모·지원 성격: ${mojib.length}건`);
  await sleep(100);
}
