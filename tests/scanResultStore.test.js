import assert from "node:assert/strict";
import test from "node:test";
import {
  LAST_SCAN_RESULT_STORAGE_KEY,
  createScopedNoticeHistoryStore,
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
test("scoped scan history keeps each account's records separate", () => {
  const storage = createMemoryStorage();
  const accountA = createScopedNoticeHistoryStore("account-a");
  const accountB = createScopedNoticeHistoryStore("account-b");
  const targetUrl = "https://example.com/notices";

  accountA.writeLastScanResult({
    allLinks: [{ title: "A 계정 공지", url: "https://example.com/notices/a" }],
    fetchedAt: "2026-07-27T09:00:00.000Z",
  }, storage);
  accountA.writeNoticeHistory(targetUrl, ["https://example.com/notices/a"], storage);

  assert.equal(accountB.readLastScanResult(storage), null);
  assert.deepEqual(accountB.readNoticeHistory(targetUrl, [], storage), []);

  accountB.writeLastScanResult({
    allLinks: [{ title: "B 계정 공지", url: "https://example.com/notices/b" }],
    fetchedAt: "2026-07-27T10:00:00.000Z",
  }, storage);
  accountB.writeNoticeHistory(targetUrl, ["https://example.com/notices/b"], storage);

  assert.equal(accountA.readLastScanResult(storage).allLinks[0].title, "A 계정 공지");
  assert.equal(accountB.readLastScanResult(storage).allLinks[0].title, "B 계정 공지");
  assert.deepEqual(accountA.readNoticeHistory(targetUrl, [], storage), ["https://example.com/notices/a"]);
  assert.deepEqual(accountB.readNoticeHistory(targetUrl, [], storage), ["https://example.com/notices/b"]);
});
