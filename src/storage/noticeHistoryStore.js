import { resolveTargetUrl } from "../agents/noticeLinkAgent.js";

const historyNamespace = "opportunity-agent:known-links";
const scanSnapshotNamespace = "opportunity-agent:last-scan-links";
const customSourcesKey = "opportunity-agent:custom-sources";

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

export function buildNoticeHistoryKey(targetUrl) {
  return `${historyNamespace}:${resolveTargetUrl(targetUrl) || "unknown"}`;
}

export function buildScanSnapshotKey(targetUrl) {
  return `${scanSnapshotNamespace}:${resolveTargetUrl(targetUrl) || "unknown"}`;
}

export function readNoticeHistory(targetUrl, fallbackUrls = []) {
  const storage = getStorage();

  if (!storage) {
    return fallbackUrls;
  }

  try {
    const rawValue = storage.getItem(buildNoticeHistoryKey(targetUrl));

    if (!rawValue) {
      return fallbackUrls;
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : fallbackUrls;
  } catch {
    return fallbackUrls;
  }
}

export function writeNoticeHistory(targetUrl, urls) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(buildNoticeHistoryKey(targetUrl), JSON.stringify(uniqueUrls(urls)));
}

export function mergeNoticeHistory(targetUrl, previousUrls, nextUrls) {
  const mergedUrls = uniqueUrls([...previousUrls, ...nextUrls]);
  writeNoticeHistory(targetUrl, mergedUrls);
  return mergedUrls;
}

export function readScanSnapshot(targetUrl) {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const rawValue = storage.getItem(buildScanSnapshotKey(targetUrl));

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

export function writeScanSnapshot(targetUrl, urls) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(buildScanSnapshotKey(targetUrl), JSON.stringify(uniqueUrls(urls)));
}

export function readCustomSources() {
  const storage = getStorage();

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

export function writeCustomSources(sources) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(customSourcesKey, JSON.stringify(sources.map(normalizeCustomSource)));
}

export function upsertCustomSource(source) {
  const nextSource = normalizeCustomSource(source);
  const sources = readCustomSources();
  const existingIndex = sources.findIndex(
    (item) => item.id === nextSource.id || item.targetUrl === nextSource.targetUrl,
  );

  const nextSources =
    existingIndex >= 0
      ? sources.map((item, index) => (index === existingIndex ? { ...item, ...nextSource } : item))
      : [...sources, nextSource];

  writeCustomSources(nextSources);

  return {
    source: nextSource,
    sources: nextSources,
  };
}
