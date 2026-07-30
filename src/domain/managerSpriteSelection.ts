import { getRenderablePetStage, resolvePetStageFromLevel, type PetId, type PetStageId } from "../data/assetManifest";

export function applyManagerSpriteSelection<T extends {
  petId: PetId;
  level: number;
  unlockedStages: readonly PetStageId[];
  selectedStage: PetStageId | null;
}>(manager: T, petId: PetId): T {
  const currentStage = manager.selectedStage ?? resolvePetStageFromLevel(manager.level);
  const renderableStage = getRenderablePetStage(petId, currentStage);
  const unlockedStages = manager.unlockedStages.includes(renderableStage)
    ? manager.unlockedStages
    : [...manager.unlockedStages, renderableStage];

  return {
    ...manager,
    petId,
    unlockedStages,
    selectedStage: renderableStage === currentStage ? manager.selectedStage : renderableStage,
  };
}
