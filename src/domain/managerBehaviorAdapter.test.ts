import { describe, expect, it } from "vitest";
import type { BehaviorContext } from "./petBehaviorStateMachine";
import { resolveManagerBehavior } from "./managerBehaviorAdapter";

const baseContext: BehaviorContext = {
  pet: { x: 100, y: 100, width: 32, height: 32 },
  objects: [],
  mood: "waiting",
  recentEvent: null,
  reducedMotion: false,
};

describe("manager behavior adapter", () => {
  it("normalizes raw manager intent before resolving weighted behavior", () => {
    const result = resolveManagerBehavior({
      rawIntent: {
        behaviorStyle: "adventurous",
        tone: "friendly",
        line: "move a little",
        suggestedBehaviorBias: [{ state: "jump_to_platform", weightDelta: 2, reason: "active suggestion" }],
      },
      context: {
        ...baseContext,
        objects: [
          {
            id: "platform-1",
            type: "platform",
            resizeAxis: "horizontal",
            rect: { x: 88, y: 132, width: 120, height: 20 },
          },
        ],
      },
      randomValue: 0.8,
    });

    expect(result.intent.behaviorStyle).toBe("adventurous");
    expect(result.behavior).toBe("jump_to_platform");
    expect(result.animation).toBe("jump");
    expect(result.line).toBe("move a little");
    expect(result.candidates.find((candidate) => candidate.state === "jump_to_platform")?.weight).toBe(7);
  });
});
