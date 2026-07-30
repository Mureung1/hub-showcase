import { getUnlockedPetStages } from "../data/assetManifest";
import type { ManagerState } from "./appState";

export const managerExpPerLevel = 30;

export function applyManagerExpGain(manager: ManagerState, exp: number, line: string): ManagerState {
  const total = manager.exp + exp;
  const levelUps = Math.floor(total / managerExpPerLevel);
  const nextLevel = manager.level + levelUps;

  return {
    ...manager,
    level: nextLevel,
    exp: total % managerExpPerLevel,
    mood: "happy",
    line,
    unlockedStages: getUnlockedPetStages(nextLevel),
  };
}

export function getManagerExpProgressPercent(exp: number): number {
  return Math.max(0, Math.min(100, (exp / managerExpPerLevel) * 100));
}
