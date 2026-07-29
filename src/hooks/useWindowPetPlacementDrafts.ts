import { useMemo } from "react";
import type { PetId, PetStageId } from "../data/assetManifest";
import {
  getRuntimeWindowPetPlacementProfileId,
  readWindowPetPlacementDrafts,
  readWindowPetPlacementProfile,
} from "../data/windowPetPlacements";

export function useWindowPetPlacementDrafts(petId: PetId, stage: PetStageId) {
  return useMemo(() => {
    const profileId = getRuntimeWindowPetPlacementProfileId(petId, stage);

    if (typeof window === "undefined") {
      return readWindowPetPlacementDrafts(() => null, profileId);
    }

    return readWindowPetPlacementDrafts((key) => window.localStorage.getItem(key), profileId);
  }, [petId, stage]);
}

export function useWindowPetPlacementProfile(petId: PetId, stage: PetStageId) {
  return useMemo(() => {
    const profileId = getRuntimeWindowPetPlacementProfileId(petId, stage);

    if (typeof window === "undefined") {
      return readWindowPetPlacementProfile(() => null, profileId);
    }

    return readWindowPetPlacementProfile((key) => window.localStorage.getItem(key), profileId);
  }, [petId, stage]);
}
