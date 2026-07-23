import assert from "node:assert/strict";
import test from "node:test";
import { matchesGroupBuyFilter } from "./groupBuyFilters.js";

test("내 참여 필터는 서버에서 참여했다고 알려준 공동구매만 보여준다", () => {
  assert.equal(matchesGroupBuyFilter({ id: "joined", userJoined: true }, "mine"), true);
  assert.equal(matchesGroupBuyFilter({ id: "not-joined", userJoined: false }, "mine"), false);
});
