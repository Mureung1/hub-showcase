const RSS_URL = (blogId) => `https://rss.blog.naver.com/${encodeURIComponent(blogId)}.xml`;
const MATCH_WINDOW_MS = 30 * 60 * 1000; // 30분 이내 올라온 글만 "방금 게시한 글"로 간주

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return null;
  const raw = match[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return (cdata ? cdata[1] : raw).trim();
}

// 별도 XML 파서 라이브러리 없이 이 용도(title/link/pubDate)에 필요한 만큼만
// 정규식으로 뽑아낸다 — 네이버 블로그 RSS는 표준 RSS 2.0 <item> 구조를 쓴다.
function parseItems(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  return items.map((item) => ({
    title: extractTag(item, "title"),
    link: extractTag(item, "link"),
    pubDate: extractTag(item, "pubDate"),
  }));
}

function normalizeTitle(title) {
  return (title ?? "")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

// blogId의 RSS에서 targetTitle과 제목이 비슷하고(정규화 후 포함 관계) 최근에
// 올라온 글을 찾는다. 네이버가 "이 글이 그 글이다"를 확인해주는 API가 없어서 쓰는
// 휴리스틱이다 — 못 찾거나(RSS 반영 지연) 잘못 찾을 수 있어서, 호출부가 항상
// 사용자 확인("맞나요?")을 거치게 하고 이 결과를 최종 신뢰 소스로 쓰지 않는다.
export async function findRecentMatchingPost(blogId, targetTitle) {
  const res = await fetch(RSS_URL(blogId));
  if (!res.ok) return null;

  const xml = await res.text();
  const items = parseItems(xml);
  const normalizedTarget = normalizeTitle(targetTitle);
  if (!normalizedTarget) return null;

  const now = Date.now();
  for (const item of items) {
    if (!item.title || !item.link || !item.pubDate) continue;
    const publishedAt = new Date(item.pubDate).getTime();
    if (Number.isNaN(publishedAt) || now - publishedAt > MATCH_WINDOW_MS) continue;

    const normalizedItem = normalizeTitle(item.title);
    if (normalizedItem.includes(normalizedTarget) || normalizedTarget.includes(normalizedItem)) {
      return { url: item.link, title: item.title, pubDate: item.pubDate };
    }
  }
  return null;
}
