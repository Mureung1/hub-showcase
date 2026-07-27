export type KeyboardCaptureController = {
  enabled: boolean;
  disableGlobalCapture?: () => unknown;
  enableGlobalCapture?: () => unknown;
  resetKeys?: () => unknown;
};

export function setKeyboardCaptureEnabled(
  keyboard: KeyboardCaptureController,
  isEnabled: boolean,
) {
  keyboard.enabled = isEnabled;
  if (isEnabled) {
    keyboard.enableGlobalCapture?.();
  } else {
    keyboard.disableGlobalCapture?.();
  }
  keyboard.resetKeys?.();
}
