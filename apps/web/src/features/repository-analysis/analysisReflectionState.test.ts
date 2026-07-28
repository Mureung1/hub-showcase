import assert from "node:assert/strict";
import test from "node:test";
import {
  canSendReflection,
  canSubmitReflection,
} from "./analysisReflectionState";

test("locks the reflection send action after a successful save", () => {
  assert.equal(canSubmitReflection("idle"), true);
  assert.equal(canSubmitReflection("saving"), false);
  assert.equal(canSubmitReflection("saved"), false);
  assert.equal(canSubmitReflection("error"), true);
});

test("allows queueing a reflection before repository analysis completes", () => {
  assert.equal(canSendReflection("idle", false, "어려웠던 문제"), true);
  assert.equal(canSendReflection("idle", true, "어려웠던 문제"), true);
});

test("does not allow sending an empty reflection after analysis completes", () => {
  assert.equal(canSendReflection("idle", true, ""), false);
  assert.equal(canSendReflection("error", true, "   "), false);
});
