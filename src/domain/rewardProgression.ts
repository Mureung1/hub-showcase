import type { PetStageId } from "../data/assetManifest";
import { getUnlockedPetStages } from "../data/assetManifest";

export function getUnlockedStagesFromLevel(level: number): PetStageId[] {
  return getUnlockedPetStages(level);
}

export function getRecoveryRewardCandidates(eventType: "quest_completed" | "quest_failed" | "recovery_completed"): string[] {
  if (eventType === "recovery_completed") return ["memory_fragment"];
  return [];
}
