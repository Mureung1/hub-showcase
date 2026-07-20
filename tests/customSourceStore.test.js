import assert from "node:assert/strict";
import test from "node:test";

import {
  readCustomSources,
  removeCustomSource,
  upsertCustomSource,
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

test("custom source deletion removes only the selected saved source", () => {
  const storage = createMemoryStorage();
  const { source } = upsertCustomSource(
    {
      name: "대구시 청년 지원",
      targetUrl: "https://youth.daegu.go.kr/notices",
    },
    storage,
  );

  const removed = removeCustomSource(source.id, storage);
  assert.equal(removed.source.id, source.id);
  assert.deepEqual(readCustomSources(storage), []);
});