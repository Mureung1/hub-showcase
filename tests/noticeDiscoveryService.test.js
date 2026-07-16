import assert from "node:assert/strict";
import test from "node:test";

import {
  createNoticeDiscoveryService,
  deduplicateNoticeCandidates,
} from "../server/services/noticeDiscoveryService.js";
import { NoticeDiscoveryError } from "../server/sources/sourceFetch.js";

test("공지 탐색 서비스는 URL 기준으로 후보를 중복 제거하고 결과를 캐시한다", async () => {
  let callCount = 0;
  let now = 0;
  const service = createNoticeDiscoveryService({
    cacheTtlMs: 300000,
    now: () => now,
    registry: {
      getSource: () => ({
        id: "fixture-source",
        name: "테스트 공지",
        enabled: true,
        supportsDetailExtraction: false,
        discover: async () => {
          callCount += 1;
          return [
            { id: "a", title: "첫 공지", url: "https://example.com/a?utm_source=test" },
            { id: "a-copy", title: "첫 공지", url: "https://example.com/a" },
            { id: "b", title: "둘째 공지", url: "https://example.com/b" },
          ];
        },
      }),
    },
  });

  const first = await service.discover({ sourceId: "fixture-source", limit: 20 });
  const second = await service.discover({ sourceId: "fixture-source", limit: 20 });

  assert.equal(first.items.length, 2);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(callCount, 1);
  now += 300001;
  await service.discover({ sourceId: "fixture-source", limit: 20 });
  assert.equal(callCount, 2);
});

test("공지 탐색 서비스는 요청한 최대 결과 수만 반환한다", async () => {
  const service = createNoticeDiscoveryService({
    registry: {
      getSource: () => ({
        id: "limited-source",
        name: "테스트 공지",
        enabled: true,
        supportsDetailExtraction: false,
        discover: async () => [
          { id: "a", title: "첫 공지", url: "https://example.com/a" },
          { id: "b", title: "둘째 공지", url: "https://example.com/b" },
        ],
      }),
    },
  });

  const result = await service.discover({ sourceId: "limited-source", limit: 1 });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "a");
});

test("공지 탐색 서비스는 등록되지 않은 출처를 거부한다", async () => {
  const service = createNoticeDiscoveryService({ registry: { getSource: () => null } });

  await assert.rejects(
    () => service.discover({ sourceId: "unknown" }),
    (error) => error instanceof NoticeDiscoveryError && error.statusCode === 404,
  );
});

test("공지 후보 URL 정규화는 추적 파라미터 중복을 제거한다", () => {
  const items = deduplicateNoticeCandidates([
    { url: "https://example.com/a?utm_source=test" },
    { url: "https://example.com/a" },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://example.com/a");
});
