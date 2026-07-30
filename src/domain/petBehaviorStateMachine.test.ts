import { describe, expect, it } from "vitest";
import {
  chooseWeightedBehavior,
  getBehaviorCandidates,
  getNextBehaviorState,
  mapBehaviorToAnimation,
  type BehaviorCandidate,
  type BehaviorContext,
} from "./petBehaviorStateMachine";

const baseContext: BehaviorContext = {
  pet: { x: 100, y: 100, width: 32, height: 32 },
  objects: [],
  mood: "waiting",
  recentEvent: null,
  reducedMotion: false,
};

describe("pet behavior state machine", () => {
  it("keeps a baseline wander candidate when no interaction objects are nearby", () => {
    const candidates = getBehaviorCandidates(baseContext);

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ state: "idle", reason: "default" }),
        expect.objectContaining({ state: "wander", reason: "baseline_roam" }),
      ]),
    );
    expect(candidates.find((candidate) => candidate.state === "wander" && candidate.reason === "baseline_roam")?.weight).toBeGreaterThan(
      (candidates.find((candidate) => candidate.state === "idle" && candidate.reason === "default")?.weight ?? 0) * 3,
    );
  });

  it("adds approach_ladder candidate when a ladder is nearby", () => {
    const candidates = getBehaviorCandidates({
      ...baseContext,
      objects: [
        {
          id: "ladder-1",
          type: "ladder",
          resizeAxis: "vertical",
          rect: { x: 120, y: 80, width: 32, height: 120 },
        },
      ],
    });

    expect(candidates).toContainEqual(
      expect.objectContaining({
        state: "approach_ladder",
        reason: "near_ladder",
      }),
    );
  });

  it("adds jump_to_platform candidate when a platform is reachable", () => {
    const candidates = getBehaviorCandidates({
      ...baseContext,
      objects: [
        {
          id: "platform-1",
          type: "platform",
          resizeAxis: "horizontal",
          rect: { x: 88, y: 132, width: 120, height: 20 },
        },
      ],
    });

    expect(candidates).toContainEqual(expect.objectContaining({ state: "jump_to_platform" }));
  });

  it("raises rest and hiding behavior after a failed quest", () => {
    const candidates = getBehaviorCandidates({
      ...baseContext,
      mood: "recovering",
      recentEvent: "quest_failed",
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ state: "rest", reason: "recovering_mood" }),
        expect.objectContaining({ state: "hide_behind_window", reason: "recent_failure" }),
      ]),
    );
  });

  it("raises happy motion behaviors after quest completion", () => {
    const candidates = getBehaviorCandidates({
      ...baseContext,
      mood: "happy",
      recentEvent: "quest_completed",
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ state: "wander", reason: "happy_mood" }),
        expect.objectContaining({ state: "jump_to_platform", reason: "recent_success" }),
      ]),
    );
  });

  it("raises movement weights for an adventurous persona", () => {
    const candidates = getBehaviorCandidates({
      ...baseContext,
      behaviorStyle: "adventurous",
      mood: "happy",
      recentEvent: "quest_completed",
      objects: [
        {
          id: "platform-1",
          type: "platform",
          resizeAxis: "horizontal",
          rect: { x: 88, y: 132, width: 120, height: 20 },
        },
      ],
    });

    const jumpWeight = candidates.find((candidate) => candidate.state === "jump_to_platform" && candidate.reason === "near_platform")?.weight;
    const wanderWeight = candidates.find((candidate) => candidate.state === "wander" && candidate.reason === "happy_mood")?.weight;

    expect(jumpWeight).toBe(5);
    expect(wanderWeight).toBe(3);
  });

  it("raises hiding and rest weights for a shy persona", () => {
    const candidates = getBehaviorCandidates({
      ...baseContext,
      behaviorStyle: "shy",
      mood: "recovering",
      recentEvent: "quest_failed",
    });

    const hideWeight = candidates.find((candidate) => candidate.state === "hide_behind_window")?.weight;
    const restWeight = candidates.find((candidate) => candidate.state === "rest")?.weight;

    expect(hideWeight).toBe(5);
    expect(restWeight).toBe(4);
  });

  it("applies normalized manager behavior intent bias to matching behavior candidates", () => {
    const candidates = getBehaviorCandidates({
      ...baseContext,
      behaviorBias: [{ state: "jump_to_platform", weightDelta: 2, reason: "llm encouraged movement" }],
      objects: [
        {
          id: "platform-1",
          type: "platform",
          resizeAxis: "horizontal",
          rect: { x: 88, y: 132, width: 120, height: 20 },
        },
      ],
    });

    expect(candidates.find((candidate) => candidate.state === "jump_to_platform")?.weight).toBe(5);
  });

  it("selects weighted behavior deterministically from a random value", () => {
    const candidates: BehaviorCandidate[] = [
      { state: "idle", weight: 1, reason: "default" },
      { state: "approach_ladder", weight: 3, reason: "near_ladder" },
    ];

    expect(chooseWeightedBehavior(candidates, 0)).toBe("idle");
    expect(chooseWeightedBehavior(candidates, 0.5)).toBe("approach_ladder");
  });

  it("moves from approach_ladder to climb_ladder when already near a ladder", () => {
    expect(
      getNextBehaviorState("approach_ladder", {
        ...baseContext,
        objects: [
          {
            id: "ladder-1",
            type: "ladder",
            resizeAxis: "vertical",
            rect: { x: 112, y: 90, width: 32, height: 140 },
          },
        ],
      }),
    ).toBe("climb_ladder");
  });

  it("maps behavior states to runtime animation states", () => {
    expect(mapBehaviorToAnimation("approach_ladder", false)).toBe("walk");
    expect(mapBehaviorToAnimation("climb_ladder", false)).toBe("climbing");
    expect(mapBehaviorToAnimation("jump_to_platform", false)).toBe("jump");
    expect(mapBehaviorToAnimation("hide_behind_window", false)).toBe("hiding");
    expect(mapBehaviorToAnimation("hang_on_window", false)).toBe("hanging");
  });

  it("uses stable pose animations for large movements when reduced motion is enabled", () => {
    expect(mapBehaviorToAnimation("climb_ladder", true)).toBe("focused");
    expect(mapBehaviorToAnimation("jump_to_platform", true)).toBe("happy");
  });
});
