import { resolveTargetUrl } from "../agents/noticeLinkAgent.js";
import { normalizeAllNoticesPerSource } from "../services/noticeOrdering.js";

const historyNamespace = "opportunity-agent:known-links";
const scanSnapshotNamespace = "opportunity-agent:last-scan-links";
const customSourcesKey = "opportunity-agent:custom-sources";
export const LAST_SCAN_RESULT_STORAGE_KEY = "opportunity-agent:last-scan-result";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function uniqueUrls(urls) {
  return Array.from(new Set(urls));
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeStorageScope(scope) {
  return normalizeText(scope);
}

function withStorageScope(key, scope) {
  const normalizedScope = normalizeStorageScope(scope);
  return normalizedScope ? `${key}:account:${encodeURIComponent(normalizedScope)}` : key;
}


function createCustomSourceId(targetUrl) {
  return `custom:${targetUrl}`;
}

function normalizeCustomSource(source) {
  const targetUrl = resolveTargetUrl(source.targetUrl);

  if (!targetUrl) {
    throw new Error("저장할 출처 URL을 확인할 수 없습니다.");
  }

  const sourceName = normalizeText(source.name) || new URL(targetUrl).hostname;

  return {
    category: "직접 추가",
    html: source.html ?? "",
    id: source.id?.startsWith("custom:") ? source.id : createCustomSourceId(targetUrl),
    knownUrls: [],
    linkSelector: normalizeText(source.linkSelector) || "a[href]",
    name: sourceName,
    sourceMode: source.sourceMode ?? "live",
    targetUrl,
  };
}

export function buildNoticeHistoryKey(targetUrl, scope = "") {
  return `${withStorageScope(historyNamespace, scope)}:${resolveTargetUrl(targetUrl) || "unknown"}`;
}

export function buildScanSnapshotKey(targetUrl, scope = "") {
  return `${withStorageScope(scanSnapshotNamespace, scope)}:${resolveTargetUrl(targetUrl) || "unknown"}`;
}

export function buildLastScanResultKey(scope = "") {
  return withStorageScope(LAST_SCAN_RESULT_STORAGE_KEY, scope);
}

export function readNoticeHistory(targetUrl, fallbackUrls = [], storage = getStorage(), scope = "") {
  if (!storage) {
    return fallbackUrls;
  }

  try {
    const rawValue = storage.getItem(buildNoticeHistoryKey(targetUrl, scope));

    if (!rawValue) {
      return fallbackUrls;
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : fallbackUrls;
  } catch {
    return fallbackUrls;
  }
}

export function writeNoticeHistory(targetUrl, urls, storage = getStorage(), scope = "") {
  if (!storage) {
    return;
  }

  storage.setItem(buildNoticeHistoryKey(targetUrl, scope), JSON.stringify(uniqueUrls(urls)));
}

export function mergeNoticeHistory(targetUrl, previousUrls, nextUrls, storage = getStorage(), scope = "") {
  const mergedUrls = uniqueUrls([...previousUrls, ...nextUrls]);
  writeNoticeHistory(targetUrl, mergedUrls, storage, scope);
  return mergedUrls;
}

export function readScanSnapshot(targetUrl, storage = getStorage(), scope = "") {
  if (!storage) {
    return [];
  }

  try {
    const rawValue = storage.getItem(buildScanSnapshotKey(targetUrl, scope));

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

export function writeScanSnapshot(targetUrl, urls, storage = getStorage(), scope = "") {
  if (!storage) {
    return;
  }

  storage.setItem(buildScanSnapshotKey(targetUrl, scope), JSON.stringify(uniqueUrls(urls)));
}
function normalizeStoredLink(link) {
  if (!link || typeof link !== "object") {
    return null;
  }

  const url = resolveTargetUrl(link.url);
  if (!url) {
    return null;
  }

  return {
    id: normalizeText(link.id) || url,
    ...(Number.isInteger(link.index) && link.index >= 0 ? { index: link.index } : {}),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(normalizeText(link.publishedAt))
      ? { publishedAt: normalizeText(link.publishedAt) }
      : {}),
    title: normalizeText(link.title) || url,
    url,
    ...(normalizeText(link.hostname) ? { hostname: normalizeText(link.hostname) } : {}),
    ...(normalizeText(link.sourceId) ? { sourceId: normalizeText(link.sourceId) } : {}),
    ...(normalizeText(link.sourceName) ? { sourceName: normalizeText(link.sourceName) } : {}),
    ...(resolveTargetUrl(link.sourceUrl) ? { sourceUrl: resolveTargetUrl(link.sourceUrl) } : {}),
  };
}

function normalizeStoredLinks(links) {
  const seenUrls = new Set();

  return (Array.isArray(links) ? links : []).reduce((result, link) => {
    const normalizedLink = normalizeStoredLink(link);

    if (!normalizedLink || seenUrls.has(normalizedLink.url)) {
      return result;
    }

    seenUrls.add(normalizedLink.url);
    result.push(normalizedLink);
    return result;
  }, []);
}

function normalizeStoredSource(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const targetUrl = resolveTargetUrl(source.targetUrl);
  if (!targetUrl) {
    return null;
  }

  return {
    id: normalizeText(source.id) || createCustomSourceId(targetUrl),
    name: normalizeText(source.name) || new URL(targetUrl).hostname,
    targetUrl,
  };
}

function normalizeStoredSourceResult(sourceResult) {
  if (!sourceResult || typeof sourceResult !== "object") {
    return null;
  }

  const source = normalizeStoredSource(sourceResult.source);
  const targetUrl = resolveTargetUrl(sourceResult.targetUrl) || source?.targetUrl;
  if (!targetUrl) {
    return null;
  }

  return {
    allLinks: normalizeStoredLinks(sourceResult.allLinks),
    knownCount: Number.isFinite(sourceResult.knownCount) ? sourceResult.knownCount : 0,
    latestLinks: normalizeStoredLinks(sourceResult.latestLinks),
    newLinks: normalizeStoredLinks(sourceResult.newLinks),
    previousScanCount: Number.isFinite(sourceResult.previousScanCount)
      ? sourceResult.previousScanCount
      : 0,
    source: source ?? {
      id: createCustomSourceId(targetUrl),
      name: new URL(targetUrl).hostname,
      targetUrl,
    },
    targetUrl,
  };
}

export function normalizeLastScanResult(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const sourceResults = (Array.isArray(value.sourceResults) ? value.sourceResults : [])
    .map(normalizeStoredSourceResult)
    .filter(Boolean);
  const allLinks = normalizeStoredLinks(value.allLinks);
  const allNoticesPerSource = normalizeAllNoticesPerSource(value.allNoticesPerSource);
  const fetchedAt = normalizeText(value.fetchedAt);

  if (!fetchedAt || (!allLinks.length && !sourceResults.length)) {
    return null;
  }

  return {
    allLinks,
    allNoticesPerSource,
    failedSources: (Array.isArray(value.failedSources) ? value.failedSources : [])
      .filter((source) => source && typeof source === "object")
      .map((source) => ({
        id: normalizeText(source.id),
        message: normalizeText(source.message),
        name: normalizeText(source.name),
        targetUrl: resolveTargetUrl(source.targetUrl),
      })),
    fetchedAt,
    isBatch: Boolean(value.isBatch),
    knownCount: Number.isFinite(value.knownCount) ? value.knownCount : 0,
    latestLinks: normalizeStoredLinks(value.latestLinks),
    newLinks: normalizeStoredLinks(value.newLinks),
    previousScanCount: Number.isFinite(value.previousScanCount) ? value.previousScanCount : 0,
    sourceCount: Number.isFinite(value.sourceCount) ? value.sourceCount : sourceResults.length || 1,
    sourceMode: normalizeText(value.sourceMode) || (value.isBatch ? "batch" : "single"),
    sourceResults,
    targetUrl: resolveTargetUrl(value.targetUrl),
  };
}

export function readLastScanResult(storage = getStorage(), scope = "") {
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(buildLastScanResultKey(scope));
    return rawValue ? normalizeLastScanResult(JSON.parse(rawValue)) : null;
  } catch {
    return null;
  }
}

export function writeLastScanResult(scan, storage = getStorage(), scope = "") {
  if (!storage) {
    return;
  }

  const normalizedScan = normalizeLastScanResult(scan);
  if (normalizedScan) {
    storage.setItem(buildLastScanResultKey(scope), JSON.stringify(normalizedScan));
  }
}

export function createScopedNoticeHistoryStore(scope = "") {
  return {
    mergeNoticeHistory: (targetUrl, previousUrls, nextUrls, storage) =>
      mergeNoticeHistory(targetUrl, previousUrls, nextUrls, storage, scope),
    readLastScanResult: (storage) => readLastScanResult(storage, scope),
    readNoticeHistory: (targetUrl, fallbackUrls, storage) =>
      readNoticeHistory(targetUrl, fallbackUrls, storage, scope),
    readScanSnapshot: (targetUrl, storage) => readScanSnapshot(targetUrl, storage, scope),
    writeLastScanResult: (scan, storage) => writeLastScanResult(scan, storage, scope),
    writeNoticeHistory: (targetUrl, urls, storage) => writeNoticeHistory(targetUrl, urls, storage, scope),
    writeScanSnapshot: (targetUrl, urls, storage) => writeScanSnapshot(targetUrl, urls, storage, scope),
  };
}
export function readCustomSources(storage = getStorage()) {

  if (!storage) {
    return [];
  }

  try {
    const rawValue = storage.getItem(customSourcesKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.map(normalizeCustomSource);
  } catch {
    return [];
  }
}

export function writeCustomSources(sources, storage = getStorage()) {

  if (!storage) {
    return;
  }

  storage.setItem(customSourcesKey, JSON.stringify(sources.map(normalizeCustomSource)));
}

export function upsertCustomSource(source, storage = getStorage()) {
  const nextSource = normalizeCustomSource(source);
  const sources = readCustomSources(storage);
  const existingIndex = sources.findIndex(
    (item) => item.id === nextSource.id || item.targetUrl === nextSource.targetUrl,
  );

  const nextSources =
    existingIndex >= 0
      ? sources.map((item, index) => (index === existingIndex ? { ...item, ...nextSource } : item))
      : [...sources, nextSource];

  writeCustomSources(nextSources, storage);

  return {
    source: nextSource,
    sources: nextSources,
  };
}

export function removeCustomSource(sourceId, storage = getStorage()) {
  const sources = readCustomSources(storage);
  const source = sources.find((item) => item.id === sourceId) ?? null;

  if (!source) {
    return { source: null, sources };
  }

  const nextSources = sources.filter((item) => item.id !== sourceId);
  writeCustomSources(nextSources, storage);

  return {
    source,
    sources: nextSources,
  };
}

function toSiteOrigin(value) {
  const targetUrl = resolveTargetUrl(value);
  if (!targetUrl) return null;

  try {
    return new URL(targetUrl).origin.toLowerCase();
  } catch {
    return targetUrl;
  }
}

export function findSavedRegistrySiteIds(sites, savedSources) {
  const sourceOrigins = new Set(
    (Array.isArray(savedSources) ? savedSources : [])
      .map((source) => toSiteOrigin(source?.targetUrl))
      .filter(Boolean),
  );

  return (Array.isArray(sites) ? sites : [])
    .filter((site) => sourceOrigins.has(toSiteOrigin(site?.url)))
    .map((site) => site.id);
}