import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createTtlCache } from "./cacheService.js";

describe("TTL cache", () => {
  it("returns cached values until the TTL expires", async () => {
    let currentTime = 1000;
    let loadCount = 0;
    const cache = createTtlCache({
      ttlMs: 100,
      now: () => currentTime,
    });

    const loadValue = () => {
      loadCount += 1;
      return `value-${loadCount}`;
    };

    assert.equal(await cache.getOrSet("search:it", loadValue), "value-1");
    assert.equal(await cache.getOrSet("search:it", loadValue), "value-1");
    assert.equal(loadCount, 1);

    currentTime = 1101;

    assert.equal(await cache.getOrSet("search:it", loadValue), "value-2");
    assert.equal(loadCount, 2);
  });

  it("deduplicates pending loads for the same key", async () => {
    let loadCount = 0;
    const cache = createTtlCache({ ttlMs: 1000 });

    const [firstValue, secondValue] = await Promise.all([
      cache.getOrSet("search:school", async () => {
        loadCount += 1;
        return ["전북대학교"];
      }),
      cache.getOrSet("search:school", async () => {
        loadCount += 1;
        return ["서울대학교"];
      }),
    ]);

    assert.deepEqual(firstValue, ["전북대학교"]);
    assert.deepEqual(secondValue, ["전북대학교"]);
    assert.equal(loadCount, 1);
  });
});
