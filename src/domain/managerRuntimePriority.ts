export type ManagerWindowInteractionState = "none" | "quest_hanging" | "recovery_hiding" | "pixel_tv_watching";

export interface ManagerWindowInteractionInput {
  showPixelTvWatching: boolean;
  showQuestHangingPet: boolean;
  showRecoveryHidingPet: boolean;
}

export function resolveManagerWindowInteraction(input: ManagerWindowInteractionInput): ManagerWindowInteractionState {
  if (input.showPixelTvWatching) return "pixel_tv_watching";
  if (input.showQuestHangingPet) return "quest_hanging";
  if (input.showRecoveryHidingPet) return "recovery_hiding";
  return "none";
}
