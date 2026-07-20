import { useMemo, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { AnalysisMoveMode } from "../analysis/types";
import type { MapMode } from "../market/types";
import { shouldShowBaseBuildings } from "./baseMap";
import { findReadyOverlayRegion } from "./supportedRegions";

export function useMapViewport(initialCenter: [number, number]) {
  const [mapMode, setMapMode] = useState<MapMode>("localtwin");
  const [prefabMode, setPrefabMode] = useState(true);
  const [storefront3dUnavailable, setStorefront3dUnavailable] = useState(false);
  const [baseBuildingsVisible, setBaseBuildingsVisible] = useState(true);
  const [committedCenter, setCommittedCenter] = useState<[number, number]>(initialCenter);
  const [draftCenter, setDraftCenter] = useState<[number, number] | null>(null);
  const [analysisMoveMode, setAnalysisMoveMode] = useState<AnalysisMoveMode>("idle");
  const [visibleMapCenter, setVisibleMapCenter] = useState<[number, number]>(initialCenter);
  const mapRef = useRef<MapRef>(null);
  const visibleSupportedRegion = useMemo(
    () => findReadyOverlayRegion(visibleMapCenter),
    [visibleMapCenter],
  );
  const draftSupportedRegion = useMemo(
    () => (draftCenter ? findReadyOverlayRegion(draftCenter) : undefined),
    [draftCenter],
  );

  function commitDraftCenter() {
    if (!draftCenter || !draftSupportedRegion) return false;
    setCommittedCenter(draftCenter);
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
    return true;
  }

  return {
    mapRef,
    mapMode,
    setMapMode,
    prefabMode,
    setPrefabMode,
    storefront3dUnavailable,
    setStorefront3dUnavailable,
    baseBuildingsVisible,
    setBaseBuildingsVisible,
    baseBuildingsRendered: shouldShowBaseBuildings(
      baseBuildingsVisible,
      mapMode,
      visibleSupportedRegion !== undefined,
    ),
    committedCenter,
    focusCenter: (center: [number, number], store: boolean) => {
      setCommittedCenter(center);
      mapRef.current?.flyTo({
        center,
        zoom: store ? 16.8 : 15.4,
        pitch: 52,
        bearing: -24,
        duration: 900,
        essential: true,
      });
    },
    analysisCenter: draftCenter ?? committedCenter,
    analysisMoveMode,
    updateVisibleCenter: (center: [number, number]) => {
      setVisibleMapCenter(center);
      if (analysisMoveMode === "moving") setDraftCenter(center);
    },
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
      setMapMode("localtwin");
      setPrefabMode(true);
      setBaseBuildingsVisible(true);
      setCommittedCenter(center);
      setDraftCenter(null);
      setAnalysisMoveMode("idle");
      mapRef.current?.easeTo({
        center,
        zoom: 15.4,
        pitch: 52,
        bearing: -24,
        duration: 650,
        essential: true,
      });
    },
  };
}
