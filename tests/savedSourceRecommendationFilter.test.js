import assert from "node:assert/strict";
import test from "node:test";

import { findSavedRegistrySiteIds } from "../src/storage/noticeHistoryStore.js";

test("실제 저장 출처 URL과 같은 등록 사이트를 식별한다", () => {
  const sites = [
    { id: "work24", url: "https://www.work24.go.kr/" },
    { id: "nrf", url: "https://www.nrf.re.kr/" },
  ];
  const savedSources = [
    { targetUrl: "https://www.work24.go.kr/?utm_source=uniradar" },
    { targetUrl: "https://example.com/custom" },
  ];

  assert.deepEqual(findSavedRegistrySiteIds(sites, savedSources), ["work24"]);
});
