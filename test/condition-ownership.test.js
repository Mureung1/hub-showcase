import assert from "node:assert/strict";
import test from "node:test";
import { conditionActionAccess } from "../supabase/functions/_shared/condition-ownership.js";

test("조건 소유자는 Discord 버튼을 실행할 수 있다", () => {
  assert.equal(
    conditionActionAccess({ actingUserId: "user-a", conditionUserId: "user-a" }),
    "allowed",
  );
});

test("다른 연동 사용자는 다른 사용자의 조건 버튼을 실행할 수 없다", () => {
  assert.equal(
    conditionActionAccess({ actingUserId: "user-b", conditionUserId: "user-a" }),
    "forbidden",
  );
});

test("미연동 Discord 사용자는 조건 버튼을 실행할 수 없다", () => {
  assert.equal(
    conditionActionAccess({ actingUserId: null, conditionUserId: "user-a" }),
    "not_linked",
  );
});
