export type ManagerWindowInteractionState = "none" | "quest_hanging" | "recovery_hiding" | "pixel_tv_watching";

export interface ManagerWindowInteractionInput {
  showPixelTvWatching: boolean;
  showQuestHangingPet: boolean;
  showRecoveryHidingPet: boolean;
  supportsQuestHangingPet?: boolean;
  supportsRecoveryHidingPet?: boolean;
}

export interface ManagerWindowInteractionChanceInput {
  visible: boolean;
  randomValue: number;
  streakMatches: boolean;
  streakCount: number;
}

export function resolveManagerWindowInteraction(input: ManagerWindowInteractionInput): ManagerWindowInteractionState {
  if (input.showPixelTvWatching) return "pixel_tv_watching";
  if (input.showQuestHangingPet && input.supportsQuestHangingPet !== false) return "quest_hanging";
  if (input.showRecoveryHidingPet && input.supportsRecoveryHidingPet !== false) return "recovery_hiding";
  return "none";
}

export function shouldShowManagerWindowInteraction(input: ManagerWindowInteractionChanceInput): boolean {
  if (!input.visible) return false;
  const streakBonus = input.streakMatches ? Math.min(input.streakCount, 2) * 0.08 : 0;
  const chance = Math.min(0.34, 0.18 + streakBonus);
  return input.randomValue < chance;
}
