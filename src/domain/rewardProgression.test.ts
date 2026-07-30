import { describe, expect, it } from "vitest";
import { getRecoveryRewardCandidates, getUnlockedStagesFromLevel } from "./rewardProgression";

describe("reward progression", () => {
  it("unlocks stage-2 at level 2", () => {
    expect(getUnlockedStagesFromLevel(2)).toEqual(["stage-1", "stage-2"]);
  });

  it("unlocks stage-3 at level 6 and stage-4 at level 10", () => {
    expect(getUnlockedStagesFromLevel(6)).toEqual(["stage-1", "stage-2", "stage-3"]);
    expect(getUnlockedStagesFromLevel(10)).toEqual(["stage-1", "stage-2", "stage-3", "stage-4"]);
  });

  it("suggests a memory fragment reward for recovery completion", () => {
    expect(getRecoveryRewardCandidates("recovery_completed")).toContain("memory_fragment");
  });

  it("does not unlock rewards for failed events", () => {
    expect(getRecoveryRewardCandidates("quest_failed")).toEqual([]);
  });
});
