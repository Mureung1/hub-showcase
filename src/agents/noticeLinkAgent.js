export const SAMPLE_NOTICE_SITE = {
  name: "샘플 공지사항",
  url: "https://notices.example.edu/notice",
  linkSelector: ".notice-list a[href]",
};

export const SAMPLE_KNOWN_URLS = [
  "https://notices.example.edu/notice/2026-summer-mentoring",
];

export const sampleNoticeHtml = `<!doctype html>
<html lang="ko">
  <head>
    <title>샘플 공지사항</title>
  </head>
  <body>
    <nav>
      <a href="/login">로그인</a>
      <a href="/notice">공지사항 홈</a>
    </nav>
    <main>
      <ul class="notice-list">
        <li><a href="/notice/2026-ai-agent-challenge">2026 AI Agent Challenge 모집 안내</a></li>
        <li><a href="/notice/2026-data-scholarship">데이터 인재 장학 프로그램 신규 선발</a></li>
        <li><a href="/notice/2026-summer-mentoring">여름방학 멘토링 프로그램 안내</a></li>
        <li><a href="/notice/2026-campus-hackathon">캠퍼스 해커톤 참가팀 모집</a></li>
      </ul>
    </main>
  </body>
</html>`;

const fallbackSelector = "a[href]";

const ignoredTitlePatterns = [
  /^로그인$/,
  /^회원가입$/,
  /^공지사항$/,
  /^공지사항 홈$/,
  /^홈$/,
  /^이전$/,
  /^다음$/,
  /^목록$/,
  /^검색$/,
  /^전체$/,
  /^더보기$/,
  /^menu$/i,
  /^home$/i,
  /^login$/i,
  /^sign in$/i,
];

const ignoredHrefPrefixes = ["#", "javascript:", "mailto:", "tel:"];

const ignoredFileExtensions = [
  ".avi",
  ".css",
  ".gif",
  ".ico",
  ".jpg",
  ".jpeg",
  ".js",
  ".mp4",
  ".png",
  ".svg",
  ".webp",
  ".zip",
];

export function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeUrl(value, baseUrl) {
  const trimmed = normalizeWhitespace(value);

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

export function resolveTargetUrl(value) {
  const trimmed = normalizeWhitespace(value);

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeUrl(trimmed);
  }

  return normalizeUrl(`https://${trimmed}`);
}

function getDocumentFromHtml(html) {
  if (typeof DOMParser === "undefined") {
    throw new Error("현재 실행 환경에서 HTML 파서를 사용할 수 없습니다.");
  }

  return new DOMParser().parseFromString(html, "text/html");
}

function getAnchors(document, selector) {
  try {
    return Array.from(document.querySelectorAll(selector || fallbackSelector));
  } catch {
    return Array.from(document.querySelectorAll(fallbackSelector));
  }
}

function isIgnoredHref(href) {
  const lowerHref = normalizeWhitespace(href).toLowerCase();
  return ignoredHrefPrefixes.some((prefix) => lowerHref.startsWith(prefix));
}

function isLikelyPostLink(link) {
  if (!link.title || link.title.length < 2) {
    return false;
  }

  if (ignoredTitlePatterns.some((pattern) => pattern.test(link.title))) {
    return false;
  }

  const pathname = link.pathname.toLowerCase();
  if (ignoredFileExtensions.some((extension) => pathname.endsWith(extension))) {
    return false;
  }

  return true;
}

export function extractPostLinksFromHtml(html, options = {}) {
  const baseUrl = resolveTargetUrl(options.baseUrl);
  const sourceHtml = String(html ?? "");

  if (!baseUrl) {
    throw new Error("대상 웹사이트 URL을 확인할 수 없습니다.");
  }

  if (!sourceHtml.trim()) {
    return [];
  }

  const document = getDocumentFromHtml(sourceHtml);
  const anchors = getAnchors(document, options.linkSelector);
  const seenUrls = new Set();
  const links = [];

  anchors.forEach((anchor, index) => {
    const href = anchor.getAttribute("href");

    if (!href || isIgnoredHref(href)) {
      return;
    }

    const url = normalizeUrl(href, baseUrl);

    if (!url || seenUrls.has(url)) {
      return;
    }

    const parsedUrl = new URL(url);
    const link = {
      id: url,
      index,
      title: normalizeWhitespace(anchor.textContent) || parsedUrl.pathname,
      url,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
    };

    if (!isLikelyPostLink(link)) {
      return;
    }

    seenUrls.add(url);
    links.push(link);
  });

  return links;
}

export function findNewPostLinks(links, knownUrls = [], baseUrl) {
  const knownUrlSet = new Set(
    knownUrls.map((url) => normalizeUrl(url, baseUrl) || url).filter(Boolean),
  );

  return links.filter((link) => !knownUrlSet.has(link.url));
}

export async function loadWebsiteHtml(url, fetchImpl = globalThis.fetch) {
  const targetUrl = resolveTargetUrl(url);

  if (!targetUrl) {
    throw new Error("대상 웹사이트 URL을 확인할 수 없습니다.");
  }

  if (!fetchImpl) {
    throw new Error("웹페이지를 가져올 fetch 함수가 준비되지 않았습니다.");
  }

  const response = await fetchImpl(targetUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`웹페이지 요청이 실패했습니다. 상태 코드: ${response.status}`);
  }

  return response.text();
}

export async function runNoticeLinkScan({
  fetchImpl,
  html,
  knownUrls = [],
  linkSelector = fallbackSelector,
  sourceMode = "sample",
  targetUrl,
} = {}) {
  const resolvedTargetUrl = resolveTargetUrl(targetUrl);

  if (!resolvedTargetUrl) {
    throw new Error("대상 웹사이트 URL을 입력해주세요.");
  }

  const sourceHtml =
    sourceMode === "live"
      ? await loadWebsiteHtml(resolvedTargetUrl, fetchImpl)
      : String(html ?? "");
  const allLinks = extractPostLinksFromHtml(sourceHtml, {
    baseUrl: resolvedTargetUrl,
    linkSelector,
  });
  const newLinks = findNewPostLinks(allLinks, knownUrls, resolvedTargetUrl);

  return {
    allLinks,
    fetchedAt: new Date().toISOString(),
    knownCount: knownUrls.length,
    linkSelector,
    newLinks,
    sourceMode,
    targetUrl: resolvedTargetUrl,
  };
}

export function buildKnownLinkKey(targetUrl) {
  return `opportunity-agent:known-links:${resolveTargetUrl(targetUrl) || "unknown"}`;
}
