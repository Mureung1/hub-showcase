import assert from "node:assert/strict";
import test from "node:test";
import {
  LAST_SCAN_RESULT_STORAGE_KEY,
  readLastScanResult,
  writeLastScanResult,
} from "../src/storage/noticeHistoryStore.js";

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const notice = {
  id: "notice-1",
  index: 0,
  publishedAt: "2026-07-20",
  sourceId: "source-1",
  sourceName: "테스트 출처",
  sourceUrl: "https://example.com/notices",
  title: "AI 공모전 참가자 모집",
  url: "https://example.com/notices/1",
};

test("last scan result persists links but excludes source HTML", () => {
  const storage = createMemoryStorage();
  const scan = {
    allLinks: [notice, { ...notice, id: "notice-duplicate" }],
    failedSources: [],
    fetchedAt: "2026-07-20T09:00:00.000Z",
    isBatch: true,
    knownCount: 4,
    latestLinks: [notice],
    newLinks: [notice],
    previousScanCount: 3,
    sourceCount: 1,
    sourceMode: "batch",
    sourceResults: [
      {
        allLinks: [notice],
        knownCount: 4,
        latestLinks: [notice],
        newLinks: [notice],
        previousScanCount: 3,
        source: {
          id: "source-1",
          name: "테스트 출처",
          targetUrl: "https://example.com/notices",
          html: "<html>large source document</html>",
        },
        targetUrl: "https://example.com/notices",
      },
    ],
    targetUrl: "https://example.com/notices",
  };

  writeLastScanResult(scan, storage);

  const persisted = JSON.parse(storage.getItem(LAST_SCAN_RESULT_STORAGE_KEY));
  const restored = readLastScanResult(storage);

  assert.equal(persisted.allLinks.length, 1);
  assert.equal("html" in persisted.sourceResults[0].source, false);
  assert.equal(restored.latestLinks[0].url, notice.url);
  assert.equal(restored.latestLinks[0].publishedAt, "2026-07-20");
  assert.equal(restored.latestLinks[0].index, 0);
  assert.equal(restored.sourceResults[0].source.name, "테스트 출처");
  assert.equal(restored.isBatch, true);
});

test("last scan result ignores malformed storage safely", () => {
  const storage = createMemoryStorage();
  storage.setItem(LAST_SCAN_RESULT_STORAGE_KEY, "not-json");

  assert.equal(readLastScanResult(storage), null);
});
