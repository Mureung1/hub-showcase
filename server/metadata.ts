import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import * as cheerio from "cheerio";

export type PageMetadata = {
  url: string;
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogSiteName: string | null;
  ogType: string | null;
};

type FetchLike = typeof fetch;
type ResolveAddresses = (hostname: string) => Promise<string[]>;

export type MetadataOptions = {
  fetchImpl?: FetchLike;
  resolveAddresses?: ResolveAddresses;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
};

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_MAX_REDIRECTS = 5;
const YOUTUBE_WATCH_MAX_BYTES = 1_500_000;

function isBlockedIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedIp(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  if (isIP(normalized) === 4) return isBlockedIpv4(normalized);
  if (isIP(normalized) !== 6) return true;

  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isBlockedIpv4(mappedIpv4);

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  );
}

async function defaultResolveAddresses(hostname: string) {
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map(({ address }) => address);
}

export async function assertSafeHttpUrl(
  value: string,
  resolveAddresses: ResolveAddresses = defaultResolveAddresses
) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("HTTP 또는 HTTPS URL만 허용됩니다.");
  }
  if (url.username || url.password) throw new Error("인증 정보가 포함된 URL은 허용되지 않습니다.");

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("로컬 주소에는 접근할 수 없습니다.");
  }

  const addresses = isIP(hostname) ? [hostname] : await resolveAddresses(hostname);
  if (addresses.length === 0 || addresses.some(isBlockedIp)) {
    throw new Error("사설 또는 로컬 네트워크 주소에는 접근할 수 없습니다.");
  }
  return url;
}

async function readLimitedText(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("웹페이지 응답이 허용 크기를 초과했습니다.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("웹페이지 응답이 허용 크기를 초과했습니다.");
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

function clean(value: string | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 2_000) : null;
}

function isYouTubeUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "youtu.be" ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  );
}

function getYouTubeVideoId(url: URL) {
  const hostname = url.hostname.toLowerCase();
  const candidate =
    hostname === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
  return candidate && /^[A-Za-z0-9_-]{6,20}$/.test(candidate) ? candidate : null;
}

function parseYouTubeDescription(html: string) {
  const match = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
  if (!match) return null;
  try {
    return clean(JSON.parse(`"${match[1]}"`) as string);
  } catch {
    return null;
  }
}

async function fetchYouTubeDescription(
  originalUrl: URL,
  fetchImpl: FetchLike,
  resolveAddresses: ResolveAddresses,
  signal: AbortSignal
) {
  const videoId = getYouTubeVideoId(originalUrl);
  if (!videoId) return null;
  const watchUrl = new URL("https://www.youtube.com/watch");
  watchUrl.searchParams.set("v", videoId);
  watchUrl.searchParams.set("hl", "ko");
  await assertSafeHttpUrl(watchUrl.toString(), resolveAddresses);

  const response = await fetchImpl(watchUrl, {
    redirect: "manual",
    signal,
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ko,en;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; LaterMetadataBot/1.0)",
    },
  });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html")) return null;
  return parseYouTubeDescription(
    await readLimitedText(response, YOUTUBE_WATCH_MAX_BYTES)
  );
}

async function extractYouTubeMetadata(
  originalUrl: URL,
  fetchImpl: FetchLike,
  resolveAddresses: ResolveAddresses,
  signal: AbortSignal,
  maxBytes: number
): Promise<PageMetadata> {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", originalUrl.toString());
  endpoint.searchParams.set("format", "json");
  await assertSafeHttpUrl(endpoint.toString(), resolveAddresses);

  const response = await fetchImpl(endpoint, {
    redirect: "manual",
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "LaterMetadataBot/1.0",
    },
  });
  if (!response.ok) throw new Error(`YouTube 메타데이터 요청에 실패했습니다. (${response.status})`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("YouTube 메타데이터 응답 형식이 올바르지 않습니다.");
  }
  const body = JSON.parse(await readLimitedText(response, maxBytes)) as {
    title?: string;
  };
  const title = clean(body.title);
  if (!title) throw new Error("YouTube 영상 제목을 찾지 못했습니다.");
  let description: string | null = null;
  try {
    description = await fetchYouTubeDescription(
      originalUrl,
      fetchImpl,
      resolveAddresses,
      signal
    );
  } catch {
    // YouTube 설명 조회 실패만으로 저장 흐름을 중단하지 않는다.
  }
  return {
    url: originalUrl.toString(),
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogSiteName: "YouTube",
    ogType: "video",
  };
}

export function parsePageMetadata(html: string, url: string): PageMetadata {
  const $ = cheerio.load(html);
  const meta = (selector: string) => clean($(selector).first().attr("content"));
  return {
    url,
    title: clean($("title").first().text()),
    description: meta('meta[name="description" i]'),
    ogTitle: meta('meta[property="og:title" i]'),
    ogDescription: meta('meta[property="og:description" i]'),
    ogSiteName: meta('meta[property="og:site_name" i]'),
    ogType: meta('meta[property="og:type" i]'),
  };
}

export async function extractPageMetadata(
  inputUrl: string,
  options: MetadataOptions = {}
): Promise<PageMetadata> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolveAddresses = options.resolveAddresses ?? defaultResolveAddresses;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = await assertSafeHttpUrl(inputUrl, resolveAddresses);
    if (isYouTubeUrl(currentUrl)) {
      return await extractYouTubeMetadata(
        currentUrl,
        fetchImpl,
        resolveAddresses,
        controller.signal,
        maxBytes
      );
    }
    for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
      const response = await fetchImpl(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "LaterMetadataBot/1.0",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects === maxRedirects) throw new Error("리다이렉트가 너무 많습니다.");
        currentUrl = await assertSafeHttpUrl(new URL(location, currentUrl).toString(), resolveAddresses);
        continue;
      }

      if (!response.ok) throw new Error(`웹페이지 요청에 실패했습니다. (${response.status})`);
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        throw new Error("HTML 웹페이지만 처리할 수 있습니다.");
      }
      return parsePageMetadata(await readLimitedText(response, maxBytes), currentUrl.toString());
    }
    throw new Error("웹페이지를 불러오지 못했습니다.");
  } finally {
    clearTimeout(timer);
  }
}
