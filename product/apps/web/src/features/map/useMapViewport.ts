import { useEffect, useMemo, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { AnalysisMoveMode } from "../analysis/types";
import type { MapMode } from "../market/types";
import { getMapPresentationProfile, type MapPresentationMode } from "./mapPresentation";
import { findReadyOverlayRegion, type MapBounds } from "./supportedRegions";

const PRESENTATION_MODES: readonly MapPresentationMode[] = ["flat", "analysis", "storefront3d"];

function initialPresentationMode(): MapPresentationMode {
  const value = new URLSearchParams(window.location.search).get("view");
  return PRESENTATION_MODES.includes(value as MapPresentationMode)
    ? (value as MapPresentationMode)
    : "analysis";
}

export function useMapViewport(
  initialCenter: [number, number],
  _preventOverlayCollisions = true,
) {
  const [presentationMode, setPresentationModeState] = useState<MapPresentationMode>(
    initialPresentationMode,
  );
  const [storefront3dUnavailable, setStorefront3dUnavailable] = useState(false);
  const [marketTransitionActive, setMarketTransitionActive] = useState(false);
  const [committedCenter, setCommittedCenter] = useState<[number, number]>(initialCenter);
  const [draftCenter, setDraftCenter] = useState<[number, number] | null>(null);
  const [analysisMoveMode, setAnalysisMoveMode] = useState<AnalysisMoveMode>("idle");
  const [visibleMapCenter, setVisibleMapCenter] = useState<[number, number]>(initialCenter);
  const [visibleMapBounds, setVisibleMapBounds] = useState<MapBounds | null>(null);
  const mapRef = useRef<MapRef>(null);
  const marketTransitionFrameRef = useRef<number | null>(null);
  const marketTransitionCleanupRef = useRef<(() => void) | null>(null);
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

  useEffect(
    () => () => {
      if (marketTransitionFrameRef.current !== null) {
        cancelAnimationFrame(marketTransitionFrameRef.current);
      }
      marketTransitionCleanupRef.current?.();
    },
    [],
  );

  function queueMarketTransition(center: [number, number], commitMarket: () => void) {
    if (marketTransitionFrameRef.current !== null) {
      cancelAnimationFrame(marketTransitionFrameRef.current);
    }
    marketTransitionCleanupRef.current?.();
    setMarketTransitionActive(true);

    marketTransitionFrameRef.current = requestAnimationFrame(() => {
      marketTransitionFrameRef.current = null;
      const map = mapRef.current?.getMap();
      if (!map) {
        commitMarket();
        setCommittedCenter(center);
        setMarketTransitionActive(false);
        return;
      }

      let active = true;
      const finish = () => {
        if (!active) return;
        marketTransitionCleanupRef.current = null;
        setMarketTransitionActive(false);
      };
      const restoreCamera = () => {
        if (!active) return;
        if (profile.camera.pitch === 0 && profile.camera.bearing === 0) {
          finish();
          return;
        }
        map.once("moveend", finish);
        map.easeTo({
          ...profile.camera,
          duration: 260,
          essential: true,
        });
      };

      marketTransitionCleanupRef.current = () => {
        active = false;
        map.off("moveend", restoreCamera);
        map.off("moveend", finish);
        map.stop();
      };

      map.stop();
      commitMarket();
      setCommittedCenter(center);
      map.once("moveend", restoreCamera);
      map.easeTo({
        center,
        zoom: 15.4,
        pitch: 0,
        bearing: 0,
        duration: 720,
        essential: true,
      });
    });
  }

  function moveCamera(mode: MapPresentationMode, duration = 500) {
    const camera = getMapPresentationProfile(mode).camera;
    mapRef.current?.easeTo({ ...camera, duration, essential: true });
  }

  function setPresentationMode(mode: MapPresentationMode) {
    if (mode === "storefront3d") setStorefront3dUnavailable(false);
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
    marketTransitionActive,
    storefront3dUnavailable,
    setStorefront3dUnavailable,
    baseBuildingsVisible: profile.selectedMarketBuildingsVisible,
    setBaseBuildingsVisible: () => undefined,
    baseBuildingsRendered: profile.fallbackBuildingsVisible,
    committedCenter,
    transitionToMarket: (center: [number, number], commitMarket: () => void) => {
      queueMarketTransition(center, commitMarket);
    },
    focusCenter: (center: [number, number], store: boolean) => {
      if (store) setStorefront3dUnavailable(false);

      if (!store) {
        queueMarketTransition(center, () => undefined);
        return;
      }

      setCommittedCenter(center);
      mapRef.current?.flyTo({
        center,
        zoom: 16.8,
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
      setStorefront3dUnavailable(false);
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
