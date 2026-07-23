const fallbackSelector = "a[href]";
const broadFallbackSelector = "a[href], a[onclick], a[data-href], a[data-url], a[data-link], a[data-contest_pk], a[data-inner_link]";

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

const genericDetailPathPatterns = [
  /\/(?:article|board|bbs|notice|post|recruit|volunteer)\b[^?]*(?:view|detail|read|show|content)/i,
  /\/(?:view|detail|read|show|content)[^/]*(?:\.action|\.do|\.php|\.jsp|\/|$|\?)/i,
  /\/\d{3,}(?:\/|$)/,
];

const genericDetailParamPattern = /^(?:progrmRegistNo|programRegistNo|activityNo|volunteerNo)$|(?:^|[._-])(?:article|board|bbs|data|doc|notice|ntt|post|program|progrm|recruit)?(?:id|idx|key|no|num|seq|sn)$/i;
const ignoredContainerSelector =
  "header, footer, nav, [role='navigation'], .breadcrumb, .gnb, .lnb, .menu, .pagination";
const likelyPostContainerSelector =
  "main, article, tbody tr, .board-list, .bbs-list, .notice-list, .post-list, .recruit-list, [class*='board'], [class*='bbs'], [class*='notice'], [class*='recruit']";

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

const nonIdentitySearchParams = new Set([
  "btin.appl_no",
  "btin.note_div",
  "btin.page",
  "btin.search_text",
  "btin.search_type",
  "currentpage",
  "fbclid",
  "gclid",
  "keyword",
  "menu_idx",
  "offset",
  "page",
  "pageindex",
  "pageno",
  "popupdeco",
  "rows",
  "search_text",
  "search_type",
  "searchcondition",
  "searchkeyword",
]);

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

function isTrackingSearchParam(name) {
  const normalizedName = name.toLowerCase();
  return normalizedName === "fbclid" ||
    normalizedName === "gclid" ||
    normalizedName.startsWith("utm_");
}

function hasStableNoticeIdentity(parsedUrl) {
  const urlParts = `${parsedUrl.pathname}${parsedUrl.search}`;
  const hasIdentityParameter = Array.from(parsedUrl.searchParams.entries()).some(
    ([name, value]) => (
      !nonIdentitySearchParams.has(name.toLowerCase()) &&
      genericDetailParamPattern.test(name) &&
      normalizeWhitespace(value)
    ),
  );

  return hasIdentityParameter ||
    detailUrlPatterns.some((pattern) => pattern.test(urlParts)) ||
    genericDetailPathPatterns.some((pattern) => pattern.test(parsedUrl.pathname));
}

function isNonIdentitySearchParam(name, canIgnoreContextParams) {
  if (isTrackingSearchParam(name)) {
    return true;
  }

  return canIgnoreContextParams && nonIdentitySearchParams.has(name.toLowerCase());
}

function createKnuBtinLinkKey(parsedUrl) {
  if (
    !parsedUrl.hostname.endsWith("knu.ac.kr") ||
    !/\/btin\/viewBtin\.action$/i.test(parsedUrl.pathname)
  ) {
    return null;
  }

  const documentNumber = parsedUrl.searchParams.get("btin.doc_no") ||
    parsedUrl.searchParams.get("doc_no");

  if (!documentNumber) {
    return null;
  }

  const boardCode = parsedUrl.searchParams.get("btin.bbs_cde") ||
    parsedUrl.searchParams.get("bbs_cde") ||
    "";
  const keyUrl = new URL(parsedUrl.pathname, parsedUrl.origin);

  keyUrl.searchParams.set("bbs_cde", boardCode);
  keyUrl.searchParams.set("doc_no", documentNumber);
  return keyUrl.toString();
}

export function createNoticeLinkKey(value, baseUrl) {
  const normalizedUrl = normalizeUrl(value, baseUrl);

  if (!normalizedUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    parsedUrl.hash = "";

    const knuBtinKey = createKnuBtinLinkKey(parsedUrl);

    if (knuBtinKey) {
      return knuBtinKey;
    }

    const canIgnoreContextParams = hasStableNoticeIdentity(parsedUrl);
    const sortedSearchParams = Array.from(parsedUrl.searchParams.entries())
      .filter(([name]) => !isNonIdentitySearchParam(name, canIgnoreContextParams))
      .sort(([leftName, leftValue], [rightName, rightValue]) => (
        leftName.localeCompare(rightName) || leftValue.localeCompare(rightValue)
      ));

    parsedUrl.search = "";
    sortedSearchParams.forEach(([name, value]) => parsedUrl.searchParams.append(name, value));

    if (parsedUrl.pathname.length > 1) {
      parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "");
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
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

function isKnuBtinListUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.hostname.endsWith("knu.ac.kr") && /\/btin\/list\.action$/i.test(parsedUrl.pathname);
  } catch {
    return false;
  }
}

function isKnuVolunteerPageUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.hostname === "home.knu.ac.kr" &&
      /^\/HOME\/volunteer\/(?:index|sub)\.htm$/i.test(parsedUrl.pathname);
  } catch {
    return false;
  }
}

function isThinkContestUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "thinkcontest.com" || hostname.endsWith(".thinkcontest.com");
  } catch {
    return false;
  }
}

function buildThinkContestUrl(anchor, baseUrl) {
  if (!isThinkContestUrl(baseUrl)) {
    return null;
  }

  const innerLink = normalizeWhitespace(anchor.getAttribute("data-inner_link"));

  if (innerLink && !innerLink.includes("[[")) {
    return normalizeUrl(innerLink, baseUrl);
  }

  const contestId = normalizeWhitespace(anchor.getAttribute("data-contest_pk"));
  const registerType = normalizeWhitespace(anchor.getAttribute("data-reg_type"));

  if (!/^\d+$/.test(contestId) || (registerType && registerType !== "contest")) {
    return null;
  }

  try {
    const targetUrl = new URL("/thinkgood/user/contest/view.do", new URL(baseUrl).origin);
    targetUrl.searchParams.set("contest_pk", contestId);
    return targetUrl.toString();
  } catch {
    return null;
  }
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

function is1365VolunteerListUrl(value) {
  try {
    const parsedUrl = new URL(value);
    const is1365Host = parsedUrl.hostname === "1365.go.kr" || parsedUrl.hostname.endsWith(".1365.go.kr");
    return is1365Host && /\/timeCptn\.do$/i.test(parsedUrl.pathname);
  } catch {
    return false;
  }
}

function build1365VolunteerUrl(anchor, baseUrl) {
  try {
    const parsedBaseUrl = new URL(baseUrl);

    if (!is1365VolunteerListUrl(parsedBaseUrl)) {
      return null;
    }

    const rawAction = `${anchor.getAttribute("href") || ""} ${anchor.getAttribute("onclick") || ""}`;
    const programNumber = rawAction.match(/(?:javascript:)?show\(\s*['"]?(\d+)['"]?\s*\)/i)?.[1];

    if (!programNumber) {
      return null;
    }

    const targetUrl = new URL(parsedBaseUrl.pathname, parsedBaseUrl.origin);
    targetUrl.searchParams.set("type", "show");
    targetUrl.searchParams.set("progrmRegistNo", programNumber);
    return targetUrl.toString();
  } catch {
    return null;
  }
}

function isYouthVolunteerPageUrl(value) {
  try {
    const parsedUrl = new URL(value);
    const isYouthHost = parsedUrl.hostname === "youth.go.kr" || parsedUrl.hostname.endsWith(".youth.go.kr");
    return isYouthHost && (
      /\/dvl\/ey\/vlntwkAct\//i.test(parsedUrl.pathname) ||
      /\/youth\/?$/i.test(parsedUrl.pathname)
    );
  } catch {
    return false;
  }
}

function buildYouthVolunteerUrl(anchor, baseUrl) {
  try {
    if (!isYouthVolunteerPageUrl(baseUrl)) {
      return null;
    }

    const rawAction = `${anchor.getAttribute("href") || ""} ${anchor.getAttribute("onclick") || ""}`;
    const programNumber = rawAction.match(/(?:fnDtl|fnVlntwKActDtl)\(\s*['"]?(\d+)['"]?\s*\)/i)?.[1];

    if (!programNumber) {
      return null;
    }

    const parsedBaseUrl = new URL(baseUrl);
    const targetUrl = new URL("/youth/dvl/ey/vlntwkAct/vlntwkActRcritDtl.yt", parsedBaseUrl.origin);
    targetUrl.searchParams.set("kProgrmSn", programNumber);
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

function getPreferredLinkTitle(anchor) {
  try {
    const titleElement = anchor.querySelector(
      ".tit_board_list, .title-wrap .title, .board-title, .notice-title, .post-title, .subject, [data-title]",
    );
    const dataTitle = titleElement?.getAttribute?.("data-title");
    const badgeText = normalizeWhitespace(titleElement?.querySelector?.(".badge-b")?.textContent);
    let title = cleanLinkTitle(dataTitle || titleElement?.textContent || anchor.textContent);

    if (badgeText && title.endsWith(` ${badgeText}`)) {
      title = title.slice(0, -(badgeText.length + 1)).trim();
    }

    return anchor.hasAttribute?.("data-contest_pk") ? title.replace(/^\d+\.\s*/, "") : title;
  } catch {
    return cleanLinkTitle(anchor.textContent);
  }
}

export function parseNoticePublishedAt(value) {
  const text = normalizeWhitespace(value);
  const match = text.match(
    /(20\d{2})\s*(?:[./-]|년)\s*(\d{1,2})\s*(?:[./-]|월)\s*(\d{1,2})(?:\s*일)?/,
  );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function getNoticePublishedAt(anchor) {
  try {
    const container = anchor.closest(
      "tr, li, article, .board-item, .notice-item, .post-item, [class*='list-item'], [class*='list_row']",
    ) || anchor.parentElement;

    return parseNoticePublishedAt(container?.textContent || "");
  } catch {
    return null;
  }
}

function getDocumentFromHtml(html) {
  if (typeof DOMParser === "undefined") {
    throw new Error("현재 실행 환경에서 HTML 파서를 사용할 수 없습니다.");
  }

  return new DOMParser().parseFromString(sanitizeNoticeHtml(html), "text/html");
}

function queryAnchors(document, selector) {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function getAnchors(document, selector) {
  const normalizedSelector = normalizeWhitespace(selector);
  const isCustomSelector = normalizedSelector && normalizedSelector !== fallbackSelector;

  if (isCustomSelector) {
    const requestedAnchors = queryAnchors(document, normalizedSelector);

    if (requestedAnchors.length) {
      return {
        anchors: requestedAnchors,
        selectorKind: "requested",
        usedSelector: normalizedSelector,
      };
    }
  }

  return {
    anchors: queryAnchors(document, broadFallbackSelector),
    selectorKind: "broad",
    usedSelector: broadFallbackSelector,
  };
}

function isIgnoredHref(href) {
  const lowerHref = normalizeWhitespace(href).toLowerCase();
  return ignoredHrefPrefixes.some((prefix) => lowerHref.startsWith(prefix));
}

function findInlineUrl(value) {
  const quotedValues = Array.from(String(value ?? "").matchAll(/['"]([^'"]+)['"]/g))
    .map((match) => normalizeWhitespace(match[1]));

  return quotedValues.find((candidate) => (
    /^https?:\/\//i.test(candidate) ||
    /^(?:\/|\.\.?\/)/.test(candidate) ||
    /\.(?:action|do|php|jsp)(?:$|\?)/i.test(candidate)
  )) || null;
}

function getAnchorUrlValue(anchor) {
  const href = anchor.getAttribute("href") || "";

  if (href && !isIgnoredHref(href)) {
    return href;
  }

  const dataUrl = ["data-href", "data-url", "data-link"]
    .map((attributeName) => anchor.getAttribute(attributeName))
    .find((value) => normalizeWhitespace(value));

  return dataUrl || findInlineUrl(anchor.getAttribute("onclick"));
}

function hasDetailSignal(link) {
  const urlParts = `${link.pathname}${link.search}`;
  return detailUrlPatterns.some((pattern) => pattern.test(urlParts));
}

function hasGenericDetailSignal(link) {
  try {
    const parsedUrl = new URL(link.url);
    const hasDetailParameter = Array.from(parsedUrl.searchParams.entries()).some(
      ([key, value]) => genericDetailParamPattern.test(key) && normalizeWhitespace(value),
    );

    return hasDetailParameter || genericDetailPathPatterns.some((pattern) => pattern.test(parsedUrl.pathname));
  } catch {
    return false;
  }
}

function isSameOrigin(url, baseUrl) {
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function isInsideContainer(anchor, selector) {
  try {
    return Boolean(anchor.closest(selector));
  } catch {
    return false;
  }
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

function isLikelyPostLink(link, baseUrl, selectorKind, anchor) {
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

  if (isKnuVolunteerPageUrl(baseUrl)) {
    const parsedLinkUrl = new URL(link.url);
    return parsedLinkUrl.hostname === "home.knu.ac.kr" &&
      /\/HOME\/volunteer\/sub\.htm$/i.test(parsedLinkUrl.pathname) &&
      parsedLinkUrl.searchParams.get("mode") === "view" &&
      parsedLinkUrl.searchParams.has("mv_data");
  }

  if (is1365VolunteerListUrl(baseUrl)) {
    return new URL(link.url).searchParams.has("progrmRegistNo");
  }

  if (isYouthVolunteerPageUrl(baseUrl)) {
    const parsedLinkUrl = new URL(link.url);
    return /\/vlntwkActRcritDtl\.yt$/i.test(parsedLinkUrl.pathname) &&
      parsedLinkUrl.searchParams.has("kProgrmSn");
  }

  if (isThinkContestUrl(baseUrl)) {
    const parsedLinkUrl = new URL(link.url);
    return /\/thinkgood\/user\/contest\/view\.do$/i.test(parsedLinkUrl.pathname) &&
      parsedLinkUrl.searchParams.has("contest_pk");
  }

  if (isKnuBtinListUrl(baseUrl)) {
    const parsedLinkUrl = new URL(link.url);
    return /\/btin\/viewBtin\.action$/i.test(parsedLinkUrl.pathname) &&
      parsedLinkUrl.searchParams.has("btin.doc_no");
  }

  if (isInsideContainer(anchor, ignoredContainerSelector)) {
    return false;
  }

  if (selectorKind === "broad" && !isSameOrigin(link.url, baseUrl)) {
    return false;
  }

  const hasDetail = hasDetailSignal(link);

  if (hasDetail) {
    return true;
  }

  if (selectorKind === "requested") {
    return true;
  }

  if (selectorKind !== "broad") {
    return !isListPageLink(link);
  }

  const isInPostContainer = isInsideContainer(anchor, likelyPostContainerSelector);

  if (hasGenericDetailSignal(link)) {
    return isInPostContainer || !isListPageLink(link);
  }

  return isInPostContainer && !isListPageLink(link);
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
  const { anchors, selectorKind } = getAnchors(document, options.linkSelector);
  const seenLinkKeys = new Set();
  const links = [];

  anchors.forEach((anchor, index) => {
    const href = getAnchorUrlValue(anchor);
    const stableUrl =
      buildKnuBtinUrl(anchor, baseUrl) ||
      build1365VolunteerUrl(anchor, baseUrl) ||
      buildYouthVolunteerUrl(anchor, baseUrl) ||
      buildThinkContestUrl(anchor, baseUrl);

    if (!stableUrl && !href) {
      return;
    }

    const url = stableUrl || normalizeUrl(href, baseUrl);

    const linkKey = createNoticeLinkKey(url, baseUrl);

    if (!url || !linkKey || seenLinkKeys.has(linkKey)) {
      return;
    }

    const parsedUrl = new URL(url);
    const extractedTitle = getPreferredLinkTitle(anchor);
    const link = {
      id: url,
      index,
      publishedAt: getNoticePublishedAt(anchor),
      title: extractedTitle || (selectorKind === "requested" ? parsedUrl.pathname : ""),
      url,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
    };

    if (!isLikelyPostLink(link, baseUrl, selectorKind, anchor)) {
      return;
    }

    seenLinkKeys.add(linkKey);
    links.push(link);
  });

  return links;
}

export function findNewPostLinks(links, knownUrls = [], baseUrl) {
  const knownLinkKeySet = new Set(
    knownUrls.map((url) => createNoticeLinkKey(url, baseUrl)).filter(Boolean),
  );
  const seenLinkKeys = new Set();

  return links.filter((link) => {
    const linkKey = createNoticeLinkKey(link.url, baseUrl);

    if (!linkKey || knownLinkKeySet.has(linkKey) || seenLinkKeys.has(linkKey)) {
      return false;
    }

    seenLinkKeys.add(linkKey);
    return true;
  });
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

  return {
    finalUrl: resolveTargetUrl(response.headers.get("X-Opportunity-Agent-Final-Url")),
    html: await response.text(),
  };
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

  const websiteDocument = sourceMode === "live"
    ? await loadWebsiteHtml(resolvedTargetUrl, fetchImpl)
    : { finalUrl: resolvedTargetUrl, html: String(html ?? "") };
  const contentBaseUrl = websiteDocument.finalUrl || resolvedTargetUrl;
  const allLinks = extractPostLinksFromHtml(websiteDocument.html, {
    baseUrl: contentBaseUrl,
    linkSelector,
  });
  const newLinks = findNewPostLinks(allLinks, knownUrls, contentBaseUrl);

  return {
    allLinks,
    contentBaseUrl,
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
