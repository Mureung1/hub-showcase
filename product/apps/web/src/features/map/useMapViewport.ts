import { useMemo, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { AnalysisMoveMode } from "../analysis/types";
import type { MapMode } from "../market/types";
import { getMapPresentationProfile, type MapPresentationMode } from "./mapPresentation";
import { findReadyOverlayRegion, type MapBounds } from "./supportedRegions";

export function useMapViewport(
  initialCenter: [number, number],
  _preventOverlayCollisions = true,
) {
  const [presentationMode, setPresentationModeState] = useState<MapPresentationMode>("analysis");
  const [storefront3dUnavailable, setStorefront3dUnavailable] = useState(false);
  const [committedCenter, setCommittedCenter] = useState<[number, number]>(initialCenter);
  const [draftCenter, setDraftCenter] = useState<[number, number] | null>(null);
  const [analysisMoveMode, setAnalysisMoveMode] = useState<AnalysisMoveMode>("idle");
  const [visibleMapCenter, setVisibleMapCenter] = useState<[number, number]>(initialCenter);
  const [visibleMapBounds, setVisibleMapBounds] = useState<MapBounds | null>(null);
  const mapRef = useRef<MapRef>(null);
  const profile = getMapPresentationProfile(presentationMode);
  const mapMode: MapMode = presentationMode === "flat" ? "original" : "localtwin";
  const prefabMode = presentationMode === "storefront3d";
  const visibleSupportedRegion = useMemo(
    () => findReadyOverlayRegion(visibleMapCenter),
    [visibleMapCenter],
  );
  const draftSupportedRegion = useMemo(
    () => (draftCenter ? findReadyOverlayRegion(draftCenter) : undefined),
    [draftCenter],
  );

  function moveCamera(mode: MapPresentationMode, duration = 500) {
    const camera = getMapPresentationProfile(mode).camera;
    mapRef.current?.easeTo({ ...camera, duration, essential: true });
  }

  function setPresentationMode(mode: MapPresentationMode) {
    setPresentationModeState(mode);
    moveCamera(mode);
  }

  function setMapMode(mode: MapMode) {
    setPresentationMode(mode === "original" ? "flat" : "analysis");
  }

  function setPrefabMode(next: boolean | ((current: boolean) => boolean)) {
    const enabled = typeof next === "function" ? next(prefabMode) : next;
    setPresentationMode(enabled ? "storefront3d" : "analysis");
  }

  function commitDraftCenter() {
    if (!draftCenter || !draftSupportedRegion) return false;
    setCommittedCenter(draftCenter);
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
    return true;
  }

  return {
    mapRef,
    presentationMode,
    presentationProfile: profile,
    setPresentationMode,
    mapMode,
    setMapMode,
    prefabMode,
    setPrefabMode,
    storefront3dUnavailable,
    setStorefront3dUnavailable,
    baseBuildingsVisible: profile.selectedMarketBuildingsVisible,
    setBaseBuildingsVisible: () => undefined,
    baseBuildingsRendered: profile.fallbackBuildingsVisible,
    committedCenter,
    focusCenter: (center: [number, number], store: boolean) => {
      setCommittedCenter(center);
      mapRef.current?.flyTo({
        center,
        zoom: store ? 16.8 : 15.4,
        ...profile.camera,
        duration: 900,
        essential: true,
      });
    },
    analysisCenter: draftCenter ?? committedCenter,
    visibleMapBounds,
    analysisMoveMode,
    updateVisibleCenter: (center: [number, number]) => {
      setVisibleMapCenter(center);
      if (analysisMoveMode === "moving") setDraftCenter(center);
    },
    updateVisibleBounds: (bounds: MapBounds) => setVisibleMapBounds(bounds),
    visibleSupportedRegion,
    draftSupportedRegion,
    startMove: () => {
      setDraftCenter(visibleMapCenter);
      setAnalysisMoveMode("moving");
    },
    cancelMove: () => {
      setDraftCenter(null);
      setAnalysisMoveMode("idle");
      mapRef.current?.easeTo({ center: committedCenter, duration: 450, essential: true });
    },
    commitDraftCenter,
    resetViewport: (center: [number, number]) => {
      const mode: MapPresentationMode = "analysis";
      setPresentationModeState(mode);
      setCommittedCenter(center);
      setDraftCenter(null);
      setAnalysisMoveMode("idle");
      mapRef.current?.easeTo({
        center,
        zoom: 15.4,
        ...getMapPresentationProfile(mode).camera,
        duration: 650,
        essential: true,
      });
    },
  };
}
