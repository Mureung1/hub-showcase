import assert from "node:assert/strict";
import test from "node:test";
import { setKeyboardCaptureEnabled } from "./keyboardInput";

test("disables Phaser keyboard capture while a repository input modal is open", () => {
  let resetCount = 0;
  let globalCaptureEnabled = true;
  const keyboard = {
    enabled: true,
    disableGlobalCapture: () => {
      globalCaptureEnabled = false;
    },
    enableGlobalCapture: () => {
      globalCaptureEnabled = true;
    },
    resetKeys: () => {
      resetCount += 1;
    },
  };

  setKeyboardCaptureEnabled(keyboard, false);

  assert.equal(keyboard.enabled, false);
  assert.equal(globalCaptureEnabled, false);
  assert.equal(resetCount, 1);

  setKeyboardCaptureEnabled(keyboard, true);

  assert.equal(keyboard.enabled, true);
  assert.equal(globalCaptureEnabled, true);
});
