import { describe, expect, it } from "vitest";
import { defaultManagerBehaviorIntent, normalizeManagerBehaviorIntent } from "./managerBehaviorIntent";

describe("manager behavior intent", () => {
  it("accepts allowed LLM intent fields", () => {
    expect(
      normalizeManagerBehaviorIntent({
        behaviorStyle: "shy",
        tone: "calm",
        line: "오늘은 천천히 숨을 고르자.",
        suggestedBehaviorBias: [{ state: "hide_behind_window", weightDelta: 2, reason: "gentle recovery" }],
      }),
    ).toEqual({
      behaviorStyle: "shy",
      tone: "calm",
      line: "오늘은 천천히 숨을 고르자.",
      suggestedBehaviorBias: [{ state: "hide_behind_window", weightDelta: 2, reason: "gentle recovery" }],
    });
  });

  it("falls back when behaviorStyle is not allowed", () => {
    expect(normalizeManagerBehaviorIntent({ behaviorStyle: "chaotic" })).toEqual(defaultManagerBehaviorIntent);
  });

  it("drops behavior bias entries with unknown behavior states", () => {
    const result = normalizeManagerBehaviorIntent({
      behaviorStyle: "adventurous",
      tone: "friendly",
      line: "조금 움직여볼까?",
      suggestedBehaviorBias: [
        { state: "jump_to_platform", weightDelta: 2, reason: "active mood" },
        { state: "teleport", weightDelta: 2, reason: "invalid state" },
      ],
    });

    expect(result.suggestedBehaviorBias).toEqual([{ state: "jump_to_platform", weightDelta: 2, reason: "active mood" }]);
  });

  it("clamps LLM weight deltas to the safe range", () => {
    const result = normalizeManagerBehaviorIntent({
      behaviorStyle: "adventurous",
      tone: "firm",
      line: "작게 뛰어보자.",
      suggestedBehaviorBias: [
        { state: "jump_to_platform", weightDelta: 100, reason: "too high" },
        { state: "rest", weightDelta: -100, reason: "too low" },
      ],
    });

    expect(result.suggestedBehaviorBias).toEqual([
      { state: "jump_to_platform", weightDelta: 2, reason: "too high" },
      { state: "rest", weightDelta: -2, reason: "too low" },
    ]);
  });

  it("uses fallback line and style when input is not an object", () => {
    const fallback = {
      ...defaultManagerBehaviorIntent,
      behaviorStyle: "shy" as const,
      line: "fallback line",
    };

    expect(normalizeManagerBehaviorIntent("bad response", fallback)).toEqual(fallback);
  });

  it("limits behavior intent lines for the manager window", () => {
    const result = normalizeManagerBehaviorIntent({
      behaviorStyle: "balanced",
      tone: "friendly",
      line: "First line is intentionally long and should fit inside the manager window.\nSecond line is enough.\nThird line should be removed.",
      suggestedBehaviorBias: [],
    });

    expect(result.line.split("\n")).toHaveLength(2);
    expect(result.line.length).toBeLessThanOrEqual(96);
  });
});
