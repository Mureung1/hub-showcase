import assert from "node:assert/strict";
import test from "node:test";

import { canChangeTargetPeople } from "./group-buy-policy.js";

test("a closed group buy cannot change its target people", () => {
  assert.equal(
    canChangeTargetPeople({ status: "closed", currentPeople: 2 }, 3),
    false,
  );
});

test("an open group buy with participants cannot change its target people", () => {
  assert.equal(
    canChangeTargetPeople({ status: "open", currentPeople: 2 }, 4),
    false,
  );
});

test("an open group buy without additional participants can change its target people", () => {
  assert.equal(
    canChangeTargetPeople({ status: "open", currentPeople: 1 }, 4),
    true,
  );
});
