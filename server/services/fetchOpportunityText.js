const FETCH_TIMEOUT_MS = 15000;
const MIN_EXTRACTED_TEXT_LENGTH = 80;
const MAX_EXTRACTED_TEXT_LENGTH = 30000;

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

function createAbortSignal() {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

  return { abortController, timeoutId };
}

function getRequestHeaders(parsedTargetUrl) {
  return {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Referer: parsedTargetUrl.origin,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 UniRadar/0.1",
  };
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

export function extractOpportunityTextFromHtml(html) {
  const sourceHtml = String(html ?? "");
  const title = extractTitle(sourceHtml);
  const bodyText = stripHtmlToText(sourceHtml);
  const combinedText = [title, bodyText].filter(Boolean).join("\n\n").trim();

  return combinedText.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

export async function fetchUrlHtml(url) {
  const parsedTargetUrl = validateHttpUrl(url);
  const { abortController, timeoutId } = createAbortSignal();

  try {
    const upstreamResponse = await fetch(parsedTargetUrl, {
      redirect: "follow",
      signal: abortController.signal,
      headers: getRequestHeaders(parsedTargetUrl),
    });
    const html = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      throw new OpportunityTextFetchError(
        `대상 웹사이트 요청이 실패했습니다. 상태 코드: ${upstreamResponse.status}`,
        { statusCode: 502 },
      );
    }

    return {
      finalUrl: upstreamResponse.url || parsedTargetUrl.toString(),
      html,
      status: upstreamResponse.status,
    };
  } catch (error) {
    if (error instanceof OpportunityTextFetchError) {
      throw error;
    }

    throw new OpportunityTextFetchError(
      error?.name === "AbortError"
        ? "대상 웹사이트 응답 시간이 길어 본문을 가져오지 못했습니다."
        : "대상 웹사이트 본문을 가져오지 못했습니다.",
      { cause: error, statusCode: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
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