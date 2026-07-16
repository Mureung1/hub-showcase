import assert from "node:assert/strict";
import test from "node:test";

import { noticeDiscoveryQuerySchema } from "../server/schemas/discoverySchemas.js";

test("공지 탐색 쿼리는 출처와 제한값을 검증한다", () => {
  const parsed = noticeDiscoveryQuerySchema.parse({ sourceId: "knu-main-notices", limit: "12" });
  assert.equal(parsed.keyword, "");
  assert.equal(parsed.limit, 12);
  assert.equal(noticeDiscoveryQuerySchema.safeParse({ sourceId: "", limit: "80" }).success, false);
});
