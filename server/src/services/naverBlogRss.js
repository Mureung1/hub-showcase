const RSS_URL = (blogId) => `https://rss.blog.naver.com/${encodeURIComponent(blogId)}.xml`;
const MATCH_WINDOW_MS = 30 * 60 * 1000; // 30분 이내 올라온 글만 "방금 게시한 글"로 간주
const DAY_MS = 24 * 60 * 60 * 1000;

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

// pubDate 간격의 평균으로 "주 N회" 같은 대략적인 게시 주기 문구를 만든다.
// 항목이 2개 미만이면 간격을 계산할 수 없다.
function describePostingCycle(sortedDates) {
  if (sortedDates.length < 2) return null;

  const gaps = [];
  for (let i = 0; i < sortedDates.length - 1; i++) {
    gaps.push((sortedDates[i] - sortedDates[i + 1]) / DAY_MS);
  }
  const avgDays = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;

  if (avgDays <= 1.5) return "거의 매일";
  if (avgDays <= 4.5) return "주 2~3회";
  if (avgDays <= 9) return "주 1회";
  if (avgDays <= 20) return "2주에 1회";
  if (avgDays <= 45) return "월 1회";
  return "비정기적";
}

// blogId의 RSS 피드에서 게시물 개수(피드에 실린 최근 항목 기준)/최근 게시일/게시
// 주기를 계산한다. 네이버 RSS는 최근 항목 일부만 제공해서(전체 게시물 수가 아님)
// postCount는 "RSS 기준 최근 게시물 수"로 해석해야 한다. 비공개 블로그이거나
// blogId가 잘못됐으면 fetch가 실패하고, 그 경우 null을 반환한다.
export async function getBlogStats(blogId) {
  const res = await fetch(RSS_URL(blogId));
  if (!res.ok) return null;

  const xml = await res.text();
  const items = parseItems(xml);
  const sortedDates = items
    .map((item) => (item.pubDate ? new Date(item.pubDate) : null))
    .filter((d) => d && !Number.isNaN(d.getTime()))
    .sort((a, b) => b - a);

  return {
    postCount: items.length,
    latestPostDate: sortedDates[0]?.toISOString() ?? null,
    postingCycle: describePostingCycle(sortedDates),
  };
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

// 네이버 블로그 글 자체(RSS 아님)에 "존재하지 않는" 계열 문구가 뜨는 경우를
// 보고 있는 휴리스틱 문구 목록 — 네이버가 삭제된 글도 200을 주는 경우가 많아서
// 상태 코드만으로는 판별이 안 된다. 실제 네이버 페이지로 검증해본 게 아니라
// 추정이라, 호출부가 결과를 최종 신뢰 소스로 쓰지 않고 항상 사용자 확인을
// 거치게 한다.
const DELETED_PAGE_HINTS = ["존재하지 않는", "삭제되었거나", "삭제된 게시물", "요청하신 페이지를 찾을 수 없습니다"];

// publishedUrl이 아직 살아있는지 서버에서 직접 확인한다. RSS는 최근 항목
// 몇 개만 보여줘서 "글이 안 보임"이 "삭제됨"인지 "그냥 오래돼서 밀려남"인지
// 구분할 수 없어서, 저장해둔 게시물 URL을 직접 요청해보는 방식을 쓴다.
// 반환값: true(존재 확인) / false(삭제된 것으로 보임) / null(확인 불가 — 네트워크
// 오류 등).
export async function checkPostStillPublished(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (res.status === 404 || res.status === 410) return false;
    if (!res.ok) return null;

    const html = await res.text();
    if (DELETED_PAGE_HINTS.some((hint) => html.includes(hint))) return false;
    return true;
  } catch {
    return null;
  }
}
