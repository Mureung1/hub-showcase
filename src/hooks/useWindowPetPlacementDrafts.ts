import { useMemo } from "react";
import { readWindowPetPlacementDrafts } from "../data/windowPetPlacements";

export function useWindowPetPlacementDrafts() {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return readWindowPetPlacementDrafts(() => null);
    }

    return readWindowPetPlacementDrafts((key) => window.localStorage.getItem(key));
  }, []);
}
