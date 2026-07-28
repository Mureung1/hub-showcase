import { useEffect } from "react";

import type { AnalysisTopic, Category, LayerMode, MarketKey } from "../market/types";
import type { MapPresentationMode } from "../map/mapPresentation";
import type { AnalysisRadius } from "../analysis/types";
import type { ProductWorkspaceModel } from "./useProductWorkspaceModel";

export type WorkspaceUrlSnapshot = {
  marketKey: MarketKey;
  category: Category;
  selectedCategoryName: string;
  selectedCategoryCode: string | null;
  radius: AnalysisRadius;
  activeHour: number;
  layer: LayerMode;
  topic: AnalysisTopic;
  boundaryVisible: boolean;
  storesVisible: boolean;
  period: string;
  center: [number, number];
  presentationMode: MapPresentationMode;
  selectedStoreId: string | null;
  selectedStoreName: string | null;
};

export function buildWorkspaceUrlSearch(snapshot: WorkspaceUrlSnapshot) {
  const parameters = new URLSearchParams();
  parameters.set("market", snapshot.marketKey);
  parameters.set("category", snapshot.category);
  parameters.set("selectedCategory", snapshot.selectedCategoryName);
  if (snapshot.selectedCategoryCode) parameters.set("categoryCode", snapshot.selectedCategoryCode);
  parameters.set("radius", String(snapshot.radius));
  parameters.set("hour", String(snapshot.activeHour));
  parameters.set("layer", snapshot.layer);
  parameters.set("topic", snapshot.topic);
  parameters.set("boundary", snapshot.boundaryVisible ? "1" : "0");
  parameters.set("stores", snapshot.storesVisible ? "1" : "0");
  if (snapshot.period) parameters.set("period", snapshot.period);
  parameters.set("lng", snapshot.center[0].toFixed(6));
  parameters.set("lat", snapshot.center[1].toFixed(6));
  parameters.set("view", snapshot.presentationMode);
  if (snapshot.selectedStoreId) parameters.set("store", snapshot.selectedStoreId);
  if (snapshot.selectedStoreName) parameters.set("storeName", snapshot.selectedStoreName);
  return parameters.toString();
}

export function useWorkspaceUrlPersistence(model: ProductWorkspaceModel) {
  const { selection, viewport, storefronts } = model;
  const selectedReference = storefronts.storeSelection.selectedReference;

  useEffect(() => {
    const search = buildWorkspaceUrlSearch({
      marketKey: selection.marketKey,
      category: selection.category,
      selectedCategoryName: selection.categorySelection.name,
      selectedCategoryCode: selection.categorySelection.code,
      radius: selection.radius,
      activeHour: selection.activeHour,
      layer: selection.layer,
      topic: selection.analysisTopic,
      boundaryVisible: selection.boundaryVisible,
      storesVisible: selection.storesVisible,
      period: selection.period,
      center: viewport.committedCenter,
      presentationMode: viewport.presentationMode,
      selectedStoreId: selectedReference.id,
      selectedStoreName: selectedReference.name,
    });
    const nextUrl = `${window.location.pathname}?${search}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [
    selectedReference.id,
    selectedReference.name,
    selection.activeHour,
    selection.analysisTopic,
    selection.boundaryVisible,
    selection.category,
    selection.categorySelection.code,
    selection.categorySelection.name,
    selection.layer,
    selection.marketKey,
    selection.period,
    selection.radius,
    selection.storesVisible,
    viewport.committedCenter,
    viewport.presentationMode,
  ]);
}
