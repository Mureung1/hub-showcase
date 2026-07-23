import type { PetStageId } from "../data/assetManifest";
import { getUnlockedStagesFromLevel } from "./rewardProgression";

export interface AppearanceState {
  level: number;
  unlockedStages: PetStageId[];
  selectedStage: PetStageId;
}

export function createAppearanceState(level: number): AppearanceState {
  const unlockedStages = getUnlockedStagesFromLevel(level);

  return {
    level,
    unlockedStages,
    selectedStage: unlockedStages[unlockedStages.length - 1] ?? "stage-1",
  };
}

export function selectAppearanceStage(state: AppearanceState, stage: PetStageId): AppearanceState {
  if (!state.unlockedStages.includes(stage)) return state;
  return { ...state, selectedStage: stage };
}
