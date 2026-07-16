import { createNoticeSourceRegistry } from "../sources/sourceRegistry.js";
import { NoticeDiscoveryError } from "../sources/sourceFetch.js";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

function getConfiguredCacheTtlMs() {
  const configured = Number.parseInt(process.env.DISCOVERY_CACHE_TTL_MS ?? "", 10);
  return Number.isSafeInteger(configured) && configured >= 60_000 && configured <= 600_000
    ? configured
    : DEFAULT_CACHE_TTL_MS;
}

function normalizeKeyword(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeCandidateUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    [...url.searchParams.keys()].forEach((key) => {
      if (/^(utm_|gclid$|fbclid$)/i.test(key)) url.searchParams.delete(key);
    });
    url.searchParams.sort();
    return url.toString();
  } catch {
    return String(value ?? "").trim();
  }
}

export function deduplicateNoticeCandidates(items) {
  const unique = new Map();

  items.forEach((item) => {
    const canonicalUrl = normalizeCandidateUrl(item?.url);
    if (!canonicalUrl || unique.has(canonicalUrl)) return;
    unique.set(canonicalUrl, { ...item, url: canonicalUrl });
  });

  return Array.from(unique.values());
}

export function createNoticeDiscoveryService({
  cacheTtlMs = getConfiguredCacheTtlMs(),
  now = () => Date.now(),
  registry = createNoticeSourceRegistry(),
} = {}) {
  const cache = new Map();

  async function discover({ sourceId, keyword = "", limit = 20 }) {
    const source = registry.getSource(sourceId);

    if (!source || !source.enabled) {
      throw new NoticeDiscoveryError("선택한 공지 출처는 사용할 수 없습니다.", {
        code: "source_not_found",
        statusCode: 404,
      });
    }

    const normalizedKeyword = normalizeKeyword(keyword);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const cacheKey = `${source.id}:${normalizedKeyword.toLocaleLowerCase("ko-KR")}:${safeLimit}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > now()) {
      return { ...cached.value, cached: true, items: cached.value.items.map((item) => ({ ...item })) };
    }

    const discovered = await source.discover({ keyword: normalizedKeyword });
    const items = deduplicateNoticeCandidates(Array.isArray(discovered) ? discovered : []).slice(0, safeLimit);
    const value = {
      source: {
        id: source.id,
        name: source.name,
        supportsDetailExtraction: Boolean(source.supportsDetailExtraction),
      },
      items,
      cached: false,
    };

    cache.set(cacheKey, { expiresAt: now() + cacheTtlMs, value });
    return { ...value, items: items.map((item) => ({ ...item })) };
  }

  return { discover };
}

export const noticeDiscoveryService = createNoticeDiscoveryService();
