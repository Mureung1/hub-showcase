import type { PetId } from "../data/assetManifest";

export function applyManagerSpriteSelection<T extends { petId: PetId }>(manager: T, petId: PetId): T {
  return {
    ...manager,
    petId,
  };
}
