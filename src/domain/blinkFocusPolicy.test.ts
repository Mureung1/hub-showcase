import { describe, expect, it } from "vitest";
import { resolveBlinkFocusEffect } from "./blinkFocusPolicy";

describe("blink focus policy", () => {
  it("does not play blink focus when entering from a stored profile refresh", () => {
    expect(resolveBlinkFocusEffect("stored_profile_refresh")).toBeNull();
  });

  it("plays start_day blink focus after onboarding completes", () => {
    expect(resolveBlinkFocusEffect("onboarding_completed")).toEqual({ mode: "start_day", reducedMotion: "full" });
  });

  it("plays end_day blink focus before service exit", () => {
    expect(resolveBlinkFocusEffect("service_exit")).toEqual({ mode: "end_day", reducedMotion: "full" });
  });

  it("uses fade only when reduced motion is enabled", () => {
    expect(resolveBlinkFocusEffect("service_exit", true)).toEqual({ mode: "end_day", reducedMotion: "fade" });
  });
});
