const fallbackSelector = "a[href]";

const detailFallbackSelectors = [
  'a[href*="wr_id="]',
  'a[href*="doc_no="]',
  'a[href*="viewBtin.action"]',
  'a[onclick*="doRead"]',
  'a[href*="nttId="]',
  'a[href*="ntt_id="]',
  'a[href*="articleId="]',
  'a[href*="article_id="]',
  'a[href*="boardSeq="]',
  'a[href*="board_seq="]',
  'a[href*="seq="]',
  'a[href*="view"]',
  'a[href*="View"]',
  'a[href*="read"]',
  'a[href*="detail"]',
];

const detailUrlPatterns = [
  /(?:^|[?&])wr_id=/i,
  /(?:^|[?&])(?:btin\.)?doc_no=/i,
  /\/viewBtin\.action(?:$|\?)/i,
  /(?:^|[?&])ntt_?id=/i,
  /(?:^|[?&])article_?(?:id|no)=/i,
  /(?:^|[?&])board_?(?:seq|no)=/i,
  /(?:^|[?&])seq=/i,
  /(?:^|[?&])no=/i,
  /\/(?:view|read|detail)[a-z]*(?:\.action|\.do|\.php|\.jsp|\/|$|\?)/i,
];

const listUrlPatterns = [
  /\/(?:list|stdlist)(?:\.action|\.do|\.php|\.jsp|\/|$|\?)/i,
  /\/board\.php(?:$|\?)/i,
];

const ignoredTitlePatterns = [
  /^로그인$/,
  /^회원가입$/,
  /^공지$/,
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


function sanitizeNoticeHtml(html) {
  return String(html ?? "")
    .replace(/(btin\.page=)\/?>(?=&btin\.)/gi, "$1")
    .replace(/(btin\.page=)\/&gt;(?=&btin\.)/gi, "$1");
}

function getDoReadArguments(value) {
  const match = String(value ?? "").match(/doRead\(([^)]*)\)/i);

  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ""));
}

function getUrlSearchParam(url, key) {
  try {
    return new URL(url).searchParams.get(key);
  } catch {
    return null;
  }
}

function getFirstValue(...values) {
  return values.find((value) => normalizeWhitespace(value));
}

function buildKnuBtinUrl(anchor, baseUrl) {
  const rawHref = anchor.getAttribute("href") || "";
  const onclick = anchor.getAttribute("onclick") || "";
  const hasBtinSignal = /viewBtin\.action|doRead/i.test(`${rawHref} ${onclick}`);

  if (!hasBtinSignal) {
    return null;
  }

  const normalizedHref = rawHref.replace(/(btin\.page=)\/?>(?=&btin\.)/gi, "$1");
  const hrefUrl = normalizeUrl(normalizedHref, baseUrl);
  const doReadArgs = getDoReadArguments(onclick);

  try {
    const parsedBaseUrl = new URL(baseUrl);
    const docNo = getFirstValue(
      getUrlSearchParam(hrefUrl, "btin.doc_no"),
      getUrlSearchParam(hrefUrl, "doc_no"),
      doReadArgs[0],
    );

    if (!docNo) {
      return null;
    }

    const bbsCode = getFirstValue(
      getUrlSearchParam(hrefUrl, "btin.bbs_cde"),
      getUrlSearchParam(hrefUrl, "bbs_cde"),
      doReadArgs[2],
      parsedBaseUrl.searchParams.get("bbs_cde"),
    );
    const applNo = getFirstValue(getUrlSearchParam(hrefUrl, "btin.appl_no"), doReadArgs[1], "000000");
    const noteDiv = getFirstValue(getUrlSearchParam(hrefUrl, "btin.note_div"), doReadArgs[3], "row");
    const menuIndex = getFirstValue(
      getUrlSearchParam(hrefUrl, "menu_idx"),
      parsedBaseUrl.searchParams.get("menu_idx"),
    );
    const targetUrl = new URL("/wbbs/wbbs/bbs/btin/viewBtin.action", parsedBaseUrl.origin);

    targetUrl.searchParams.set("bbs_cde", bbsCode || "");
    targetUrl.searchParams.set("btin.bbs_cde", bbsCode || "");
    targetUrl.searchParams.set("btin.doc_no", docNo);
    targetUrl.searchParams.set("btin.appl_no", applNo || "000000");
    targetUrl.searchParams.set("btin.page", "1");
    targetUrl.searchParams.set("btin.search_type", "");
    targetUrl.searchParams.set("btin.search_text", "");
    targetUrl.searchParams.set("popupDeco", "");
    targetUrl.searchParams.set("btin.note_div", noteDiv || "row");

    if (menuIndex) {
      targetUrl.searchParams.set("menu_idx", menuIndex);
    }

    return targetUrl.toString();
  } catch {
    return null;
  }
}

function cleanLinkTitle(value) {
  return normalizeWhitespace(value)
    .replace(/^&?btin\.[^가-힣A-Za-z0-9]+/i, "")
    .replace(/^첨부파일\s*/i, "")
    .trim();
}
function getDocumentFromHtml(html) {
  if (typeof DOMParser === "undefined") {
    throw new Error("현재 실행 환경에서 HTML 파서를 사용할 수 없습니다.");
  }

  return new DOMParser().parseFromString(sanitizeNoticeHtml(html), "text/html");
}

function escapeAttributeSelectorValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function addSelectorCandidate(candidates, seenSelectors, selector, kind) {
  const normalizedSelector = normalizeWhitespace(selector);

  if (!normalizedSelector || seenSelectors.has(normalizedSelector)) {
    return;
  }

  seenSelectors.add(normalizedSelector);
  candidates.push({ kind, selector: normalizedSelector });
}

function getContextFallbackSelectors(baseUrl) {
  try {
    const parsedUrl = new URL(baseUrl);
    const selectors = [];
    const boardTable = parsedUrl.searchParams.get("bo_table");
    const boardCode = parsedUrl.searchParams.get("bbs_cde");
    const pathSignals = parsedUrl.pathname
      .split("/")
      .filter((segment) => /bbs|board|notice|btin/i.test(segment));

    if (boardTable) {
      selectors.push(`a[href*="bo_table=${escapeAttributeSelectorValue(boardTable)}"]`);
    }

    if (boardCode) {
      selectors.push(`a[href*="bbs_cde=${escapeAttributeSelectorValue(boardCode)}"]`);
    }

    pathSignals.forEach((segment) => {
      selectors.push(`a[href*="${escapeAttributeSelectorValue(segment)}"]`);
    });

    return selectors;
  } catch {
    return [];
  }
}

function getSelectorCandidates(selector, baseUrl) {
  const normalizedSelector = normalizeWhitespace(selector);
  const candidates = [];
  const seenSelectors = new Set();
  const isBroadRequestedSelector = !normalizedSelector || normalizedSelector === fallbackSelector;

  if (!isBroadRequestedSelector) {
    addSelectorCandidate(candidates, seenSelectors, normalizedSelector, "requested");
  }

  detailFallbackSelectors.forEach((fallback) => {
    addSelectorCandidate(candidates, seenSelectors, fallback, "detail");
  });
  getContextFallbackSelectors(baseUrl).forEach((fallback) => {
    addSelectorCandidate(candidates, seenSelectors, fallback, "context");
  });
  addSelectorCandidate(candidates, seenSelectors, fallbackSelector, "broad");

  return candidates;
}

function queryAnchors(document, selector) {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function getAnchors(document, selector, baseUrl) {
  const candidates = getSelectorCandidates(selector, baseUrl);

  for (const candidate of candidates) {
    const anchors = queryAnchors(document, candidate.selector);

    if (anchors.length) {
      return {
        anchors,
        selectorKind: candidate.kind,
        usedSelector: candidate.selector,
      };
    }
  }

  return {
    anchors: [],
    selectorKind: "broad",
    usedSelector: fallbackSelector,
  };
}

function isIgnoredHref(href) {
  const lowerHref = normalizeWhitespace(href).toLowerCase();
  return ignoredHrefPrefixes.some((prefix) => lowerHref.startsWith(prefix));
}

function hasDetailSignal(link) {
  const urlParts = `${link.pathname}${link.search}`;
  return detailUrlPatterns.some((pattern) => pattern.test(urlParts));
}

function isListPageLink(link) {
  const urlParts = `${link.pathname}${link.search}`;
  return listUrlPatterns.some((pattern) => pattern.test(urlParts));
}

function isSameDocumentUrl(url, baseUrl) {
  try {
    const parsedUrl = new URL(url);
    const parsedBaseUrl = new URL(baseUrl);
    parsedUrl.hash = "";
    parsedBaseUrl.hash = "";
    return parsedUrl.toString() === parsedBaseUrl.toString();
  } catch {
    return false;
  }
}

function isLikelyPostLink(link, baseUrl, selectorKind) {
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

  if (isSameDocumentUrl(link.url, baseUrl)) {
    return false;
  }

  const hasDetail = hasDetailSignal(link);

  if (hasDetail) {
    return true;
  }

  if (selectorKind === "requested") {
    return true;
  }

  return selectorKind !== "broad" && !isListPageLink(link);
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
  const { anchors, selectorKind } = getAnchors(document, options.linkSelector, baseUrl);
  const seenUrls = new Set();
  const links = [];

  anchors.forEach((anchor, index) => {
    const href = anchor.getAttribute("href") || "";
    const stableUrl = buildKnuBtinUrl(anchor, baseUrl);

    if (!stableUrl && (!href || isIgnoredHref(href))) {
      return;
    }

    const url = stableUrl || normalizeUrl(href, baseUrl);

    if (!url || seenUrls.has(url)) {
      return;
    }

    const parsedUrl = new URL(url);
    const link = {
      id: url,
      index,
      title: cleanLinkTitle(anchor.textContent) || parsedUrl.pathname,
      url,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
    };

    if (!isLikelyPostLink(link, baseUrl, selectorKind)) {
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

function formatProxyConnectionError(error) {
  const message = error instanceof Error ? error.message : "";

  if (/failed to fetch|networkerror|load failed|원격 서버에 연결/i.test(message)) {
    return "HTML 프록시 API에 연결하지 못했습니다. 실행 창에 API server running on http://127.0.0.1:3001 문구가 보이는지 확인한 뒤 다시 스캔해주세요.";
  }

  return message
    ? `웹사이트 HTML을 가져오지 못했습니다. (${message})`
    : "웹사이트 HTML을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.";
}
async function readHtmlResponse(response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message || payload?.error || `웹페이지 요청이 실패했습니다. 상태 코드: ${response.status}`;

    throw new Error(message);
  }

  return response.text();
}

function createProxyRequestUrls(targetUrl) {
  const encodedTargetUrl = encodeURIComponent(targetUrl);
  return [
    `/api/fetch-html?url=${encodedTargetUrl}`,
    `http://localhost:3001/api/fetch-html?url=${encodedTargetUrl}`,
    `http://127.0.0.1:3001/api/fetch-html?url=${encodedTargetUrl}`,
  ];
}

async function loadWebsiteHtmlThroughProxy(targetUrl, fetchImpl) {
  let lastError = null;

  for (const requestUrl of createProxyRequestUrls(targetUrl)) {
    try {
      const proxyResponse = await fetchImpl(requestUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
        },
      });
      const isLocalProxy = proxyResponse.headers.get("X-Opportunity-Agent-Proxy") === "html-fetch-proxy";

      if (!isLocalProxy) {
        throw new Error("로컬 HTML 프록시가 응답하지 않았습니다.");
      }

      return await readHtmlResponse(proxyResponse);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("로컬 HTML 프록시가 응답하지 않았습니다.");
}

export async function loadWebsiteHtml(url, fetchImpl = globalThis.fetch) {
  const targetUrl = resolveTargetUrl(url);

  if (!targetUrl) {
    throw new Error("대상 웹사이트 URL을 확인할 수 없습니다.");
  }

  if (!fetchImpl) {
    throw new Error("웹페이지를 가져올 fetch 함수가 준비되지 않았습니다.");
  }

  try {
    return await loadWebsiteHtmlThroughProxy(targetUrl, fetchImpl);
  } catch (error) {
    throw new Error(formatProxyConnectionError(error));
  }
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
