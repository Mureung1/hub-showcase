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

test("a group buy can keep the same target while other fields are edited", () => {
  assert.equal(
    canChangeTargetPeople({ status: "closed", currentPeople: 5, targetPeople: 5 }, 5),
    true,
  );
  assert.equal(
    canChangeTargetPeople({ status: "open", currentPeople: 2, targetPeople: 5 }, 5),
    true,
  );
});
