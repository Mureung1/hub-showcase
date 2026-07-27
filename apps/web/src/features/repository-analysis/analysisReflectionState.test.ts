import assert from "node:assert/strict";
import test from "node:test";
import { canSubmitReflection } from "./analysisReflectionState";

test("locks the reflection send action after a successful save", () => {
  assert.equal(canSubmitReflection("idle"), true);
  assert.equal(canSubmitReflection("saving"), false);
  assert.equal(canSubmitReflection("queued"), false);
  assert.equal(canSubmitReflection("saved"), false);
  assert.equal(canSubmitReflection("error"), true);
});
