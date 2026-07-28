import dns from "node:dns/promises";
import { isIP } from "node:net";
import { load } from "cheerio";

const FETCH_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 5;
const MAX_FRAME_DEPTH = 2;
const MIN_EXTRACTED_TEXT_LENGTH = 80;
const MAX_EXTRACTED_TEXT_LENGTH = 30000;
const MAX_HTML_BYTES = 12 * 1024 * 1024;
const TRUNCATED_HTML_SUFFIX = "\n</script></style></body></html>";
const KNOWN_HTTP_FALLBACK_HOSTS = new Set([
  "computer.knu.ac.kr",
  "cse.knu.ac.kr",
]);

const entityMap = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export class OpportunityTextFetchError extends Error {
  constructor(message, { statusCode = 502, cause } = {}) {
    super(message, { cause });
    this.name = "OpportunityTextFetchError";
    this.statusCode = statusCode;
  }
}

export function validateHttpUrl(value) {
  if (!value || typeof value !== "string") {
    throw new OpportunityTextFetchError("분석할 공고 URL을 입력해주세요.", { statusCode: 400 });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new OpportunityTextFetchError("URL 형식이 올바르지 않습니다.", { statusCode: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new OpportunityTextFetchError("http 또는 https URL만 분석할 수 있습니다.", { statusCode: 400 });
  }

  return parsedUrl;
}

function normalizeKnownPublicUrl(parsedUrl) {
  const hostname = normalizeHostname(parsedUrl.hostname);
  const isThinkContest = hostname === "thinkcontest.com" || hostname.endsWith(".thinkcontest.com");

  if (isThinkContest && /\/Contest\/CateField\.html$/i.test(parsedUrl.pathname)) {
    return new URL("/thinkgood/index.do", parsedUrl.origin);
  }

  return parsedUrl;
}

function createAbortSignal() {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

  return { abortController, timeoutId };
}

function getRequestHeaders(parsedTargetUrl, cookieHeader) {
  return {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Referer: parsedTargetUrl.origin,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 UniRadar/0.1",
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  };
}

function normalizeHostname(hostname) {
  return String(hostname ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

export function getKnownHttpFallbackUrl(parsedTargetUrl) {
  if (
    parsedTargetUrl.protocol !== "https:" ||
    !KNOWN_HTTP_FALLBACK_HOSTS.has(normalizeHostname(parsedTargetUrl.hostname))
  ) {
    return null;
  }

  const fallbackUrl = new URL(parsedTargetUrl);
  fallbackUrl.protocol = "http:";
  return fallbackUrl;
}

function parseIPv4(address) {
  const parts = String(address).split(".");

  if (parts.length !== 4) {
    return null;
  }

  const numbers = parts.map((part) => Number(part));

  if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return numbers;
}

function isBlockedIPv4(address) {
  const parts = parseIPv4(address);

  if (!parts) {
    return true;
  }

  const [first, second, third, fourth] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    (first === 255 && second === 255 && third === 255 && fourth === 255)
  );
}

function getIPv4MappedAddress(address) {
  return String(address).toLowerCase().match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1] || null;
}

function getFirstIPv6Hextet(address) {
  const firstHextet = String(address).split(":")[0];
  return Number.parseInt(firstHextet || "0", 16);
}

function isBlockedIPv6(address) {
  const normalized = String(address).toLowerCase();
  const mappedIPv4 = getIPv4MappedAddress(normalized);

  if (mappedIPv4) {
    return isBlockedIPv4(mappedIPv4);
  }

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  const firstHextet = getFirstIPv6Hextet(normalized);

  return (
    !Number.isFinite(firstHextet) ||
    (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) ||
    (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) ||
    (firstHextet >= 0xff00 && firstHextet <= 0xffff) ||
    normalized.startsWith("2001:db8:") ||
    normalized === "2001:db8::"
  );
}

function isBlockedIpAddress(address) {
  const version = isIP(address);

  if (version === 4) {
    return isBlockedIPv4(address);
  }

  if (version === 6) {
    return isBlockedIPv6(address);
  }

  return true;
}

function isBlockedHostname(hostname) {
  const normalized = normalizeHostname(hostname);

  return (
    !normalized ||
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    /^[0-9]+$/.test(normalized) ||
    /^0x[0-9a-f]+$/i.test(normalized)
  );
}

async function resolveHostnameAddresses(hostname) {
  try {
    return await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    throw new OpportunityTextFetchError("URL의 호스트를 확인할 수 없습니다.", {
      cause: error,
      statusCode: 400,
    });
  }
}

async function assertPublicFetchTarget(parsedTargetUrl) {
  const hostname = normalizeHostname(parsedTargetUrl.hostname);

  if (isBlockedHostname(hostname)) {
    throw new OpportunityTextFetchError("내부망 또는 로컬 주소는 보안상 가져올 수 없습니다.", { statusCode: 400 });
  }

  if (isIP(hostname)) {
    if (isBlockedIpAddress(hostname)) {
      throw new OpportunityTextFetchError("내부망 또는 로컬 주소는 보안상 가져올 수 없습니다.", { statusCode: 400 });
    }
    return;
  }

  const addresses = await resolveHostnameAddresses(hostname);

  if (!addresses.length || addresses.some(({ address }) => isBlockedIpAddress(address))) {
    throw new OpportunityTextFetchError("내부망 또는 로컬 주소로 해석되는 URL은 보안상 가져올 수 없습니다.", { statusCode: 400 });
  }
}

function decodeResponseChunks(chunks, totalLength) {
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  });

  return new TextDecoder("utf-8").decode(combined);
}

function truncateTextToBytes(text, maxBytes) {
  const encoded = new TextEncoder().encode(text);

  if (encoded.byteLength <= maxBytes) {
    return { text, truncated: false };
  }

  return {
    text: new TextDecoder("utf-8").decode(encoded.subarray(0, maxBytes)),
    truncated: true,
  };
}

export async function readResponseTextWithLimit(response, { maxBytes = MAX_HTML_BYTES } = {}) {
  const safeMaxBytes = Number.isSafeInteger(maxBytes) && maxBytes > 0
    ? maxBytes
    : MAX_HTML_BYTES;

  if (!response.body?.getReader) {
    const limited = truncateTextToBytes(await response.text(), safeMaxBytes);
    return limited.text + (limited.truncated ? TRUNCATED_HTML_SUFFIX : "");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalLength = 0;
  let truncated = false;

  while (totalLength < safeMaxBytes) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    const remainingBytes = safeMaxBytes - totalLength;

    if (value.byteLength > remainingBytes) {
      chunks.push(value.subarray(0, remainingBytes));
      totalLength += remainingBytes;
      truncated = true;
      reader.cancel().catch(() => {});
      break;
    }

    chunks.push(value);
    totalLength += value.byteLength;

    if (totalLength === safeMaxBytes) {
      const { done } = await reader.read();

      if (!done) {
        truncated = true;
        reader.cancel().catch(() => {});
      }
      break;
    }
  }

  const text = decodeResponseChunks(chunks, totalLength);
  return text + (truncated ? TRUNCATED_HTML_SUFFIX : "");
}

function decodeHtmlEntities(value) {
  return String(value ?? "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return entityMap[normalized] ?? match;
  });
}

function stripHtmlToText(html) {
  return decodeHtmlEntities(
    String(html ?? "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
      .replace(/<(br|p|div|li|tr|td|th|h[1-6]|section|article)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findMetaContent(html, propertyPattern) {
  const metaPattern = new RegExp(
    `<meta[^>]+(?:property|name)=["'](?:${propertyPattern})["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reversedPattern = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:${propertyPattern})["'][^>]*>`,
    "i",
  );

  return html.match(metaPattern)?.[1] || html.match(reversedPattern)?.[1] || "";
}

function extractTitle(html) {
  return decodeHtmlEntities(
    findMetaContent(html, "og:title|twitter:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "",
  ).trim();
}

const PRIMARY_CONTENT_SELECTORS = Object.freeze([
  "#viewcontent",
  ".board_cont",
  ".board-view",
  ".view-content",
  ".view_content",
  ".post-content",
  ".entry-content",
  "article",
  "main",
  "[role='main']",
]);

function extractPrimaryContentText(html) {
  try {
    const $ = load(html);

    for (const selector of PRIMARY_CONTENT_SELECTORS) {
      const element = $(selector).first();
      if (!element.length) continue;

      const contentText = stripHtmlToText(element.html() || "");
      if (contentText.length < MIN_EXTRACTED_TEXT_LENGTH) continue;

      const boardHeading = element.closest(".board_view, .board-view").find("h1, h2, h3").first().text().trim();
      const nearbyHeading = element.prevAll("h1, h2, h3").first().text().trim();
      const heading = boardHeading || nearbyHeading;

      return [heading, contentText].filter(Boolean).join("\n\n").trim();
    }
  } catch {
    return "";
  }

  return "";
}

export function extractOpportunityTextFromHtml(html) {
  const sourceHtml = String(html ?? "");
  const primaryContentText = extractPrimaryContentText(sourceHtml);

  if (primaryContentText) {
    return primaryContentText.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
  }

  const title = extractTitle(sourceHtml);
  const bodyText = stripHtmlToText(sourceHtml);
  const combinedText = [title, bodyText].filter(Boolean).join("\n\n").trim();

  return combinedText.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const combinedHeader = response.headers.get("set-cookie");
  return combinedHeader ? [combinedHeader] : [];
}

function storeResponseCookies(cookieJar, origin, response) {
  const originCookies = cookieJar.get(origin) || new Map();

  getSetCookieHeaders(response).forEach((headerValue) => {
    const cookiePair = String(headerValue).split(";", 1)[0];
    const separatorIndex = cookiePair.indexOf("=");

    if (separatorIndex <= 0) {
      return;
    }

    const name = cookiePair.slice(0, separatorIndex).trim();
    const value = cookiePair.slice(separatorIndex + 1).trim();

    if (name) {
      originCookies.set(name, value);
    }
  });

  if (originCookies.size) {
    cookieJar.set(origin, originCookies);
  }
}

function getCookieHeader(cookieJar, origin) {
  const originCookies = cookieJar.get(origin);

  if (!originCookies?.size) {
    return "";
  }

  return Array.from(originCookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function fetchUrlHtmlWithoutRedirects(parsedTargetUrl, cookieHeader) {
  const { abortController, timeoutId } = createAbortSignal();

  try {
    return await fetch(parsedTargetUrl, {
      redirect: "manual",
      signal: abortController.signal,
      headers: getRequestHeaders(parsedTargetUrl, cookieHeader),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getRedirectTargetUrl(response, currentUrl) {
  const location = response.headers.get("location");

  if (!location) {
    throw new OpportunityTextFetchError("대상 웹사이트 리다이렉트 URL을 확인할 수 없습니다.", { statusCode: 502 });
  }

  return validateHttpUrl(new URL(location, currentUrl).toString());
}

function getTagAttribute(tag, attributeName) {
  const pattern = new RegExp(
    `\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = String(tag ?? "").match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function getPrimaryFrameTargetUrl(html, currentUrl) {
  if (!/<frameset\b/i.test(html)) {
    return null;
  }

  const frameTags = String(html).match(/<frame\b[^>]*>/gi) || [];
  const frameSource = frameTags
    .map((tag) => getTagAttribute(tag, "src").trim())
    .find((value) => value && !/^(?:about:blank|javascript:|#)/i.test(value));

  if (!frameSource) {
    return null;
  }

  return validateHttpUrl(new URL(frameSource, currentUrl).toString());
}

export async function fetchUrlHtml(url) {
  let currentUrl = normalizeKnownPublicUrl(validateHttpUrl(url));
  const cookieJar = new Map();
  let frameDepth = 0;
  let usedKnownHttpFallback = false;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicFetchTarget(currentUrl);

    try {
      const upstreamResponse = await fetchUrlHtmlWithoutRedirects(
        currentUrl,
        getCookieHeader(cookieJar, currentUrl.origin),
      );
      storeResponseCookies(cookieJar, currentUrl.origin, upstreamResponse);

      if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
        currentUrl = getRedirectTargetUrl(upstreamResponse, currentUrl);
        continue;
      }

      const html = await readResponseTextWithLimit(upstreamResponse);

      if (!upstreamResponse.ok) {
        throw new OpportunityTextFetchError(
          `대상 웹사이트 요청이 실패했습니다. 상태 코드: ${upstreamResponse.status}`,
          { statusCode: 502 },
        );
      }

      const frameTargetUrl = getPrimaryFrameTargetUrl(html, currentUrl);

      if (frameTargetUrl) {
        if (frameDepth >= MAX_FRAME_DEPTH) {
          throw new OpportunityTextFetchError(
            "대상 웹사이트의 내부 프레임 단계가 너무 많아 중단했습니다.",
            { statusCode: 502 },
          );
        }

        currentUrl = frameTargetUrl;
        frameDepth += 1;
        continue;
      }

      return {
        contentType: upstreamResponse.headers.get("content-type") || "",
        finalUrl: currentUrl.toString(),
        html,
        status: upstreamResponse.status,
      };
    } catch (error) {
      if (error instanceof OpportunityTextFetchError) {
        throw error;
      }

      // Keep TLS validation enabled. These reviewed KNU list hosts currently
      // redirect to HTTP but present an HTTPS certificate for another name.
      const fallbackUrl = usedKnownHttpFallback ? null : getKnownHttpFallbackUrl(currentUrl);
      if (fallbackUrl) {
        currentUrl = fallbackUrl;
        usedKnownHttpFallback = true;
        continue;
      }

      throw new OpportunityTextFetchError(
        error?.name === "AbortError"
          ? "대상 웹사이트 응답 시간이 길어 본문을 가져오지 못했습니다."
          : "대상 웹사이트 본문을 가져오지 못했습니다.",
        { cause: error, statusCode: 502 },
      );
    }
  }

  throw new OpportunityTextFetchError(
    "대상 웹사이트의 리다이렉트 또는 프레임 이동이 너무 많아 중단했습니다.",
    { statusCode: 502 },
  );
}

export async function fetchOpportunityTextFromUrl(url) {
  const { finalUrl, html } = await fetchUrlHtml(url);
  const rawText = extractOpportunityTextFromHtml(html);

  if (rawText.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new OpportunityTextFetchError(
      "링크에서 분석할 본문을 충분히 추출하지 못했습니다. 공고 본문을 직접 붙여넣어 주세요.",
      { statusCode: 422 },
    );
  }

  return {
    finalUrl,
    rawText,
  };
}