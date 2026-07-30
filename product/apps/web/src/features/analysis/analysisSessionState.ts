import type { ProductCatalog } from "../../services/productCatalog";
import type { AnalysisTopic, LayerMode, MarketKey } from "../market/types";
import type { AnalysisRadius } from "./types";
import type { AnalysisInitialState } from "./useAnalysisSelection";

export const ANALYSIS_SESSION_STORAGE_KEY = "localtwin.analysis-selection.v1";

type AnalysisSessionState = Pick<
  AnalysisInitialState,
  | "marketKey"
  | "selectedCategoryName"
  | "selectedCategoryCode"
  | "radius"
  | "activeHour"
  | "layer"
  | "topic"
  | "boundaryVisible"
  | "storesVisible"
  | "period"
>;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const topics: AnalysisTopic[] = [
  "overview",
  "stores",
  "sales",
  "competition",
  "flow",
  "population",
  "amenities",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function sessionStorageOrNull() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isLayerMode(value: unknown): value is LayerMode {
  return value === "density" || value === "demand";
}

function isTopic(value: unknown): value is AnalysisTopic {
  return typeof value === "string" && topics.includes(value as AnalysisTopic);
}

function isMarketKey(value: unknown, catalog: ProductCatalog): value is MarketKey {
  return typeof value === "string" && catalog.markets.some((market) => market.key === value);
}

function isRadius(value: unknown, catalog: ProductCatalog): value is AnalysisRadius {
  return typeof value === "number" && catalog.radii.includes(value as AnalysisRadius);
}

export function restoreAnalysisSessionState(
  initial: AnalysisInitialState,
  catalog: ProductCatalog,
  storage: StorageLike | null = sessionStorageOrNull(),
): AnalysisInitialState {
  if (!storage) return initial;

  try {
    const raw = storage.getItem(ANALYSIS_SESSION_STORAGE_KEY);
    if (!raw) return initial;
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved)) return initial;

    const market = isMarketKey(saved.marketKey, catalog)
      ? catalog.markets.find((candidate) => candidate.key === saved.marketKey)
      : undefined;
    const selectedCategoryName =
      typeof saved.selectedCategoryName === "string" && saved.selectedCategoryName.trim()
        ? saved.selectedCategoryName.trim()
        : initial.selectedCategoryName;
    const selectedCategoryCode =
      typeof saved.selectedCategoryCode === "string" ? saved.selectedCategoryCode : null;

    return {
      ...initial,
      marketKey: market?.key ?? initial.marketKey,
      center: market?.center ?? initial.center,
      category: selectedCategoryName,
      selectedCategoryName,
      selectedCategoryCode,
      radius: isRadius(saved.radius, catalog) ? saved.radius : initial.radius,
      activeHour:
        typeof saved.activeHour === "number" &&
        Number.isInteger(saved.activeHour) &&
        saved.activeHour >= 0 &&
        saved.activeHour <= 5
          ? saved.activeHour
          : initial.activeHour,
      layer: isLayerMode(saved.layer) ? saved.layer : initial.layer,
      topic: isTopic(saved.topic) ? saved.topic : initial.topic,
      boundaryVisible:
        typeof saved.boundaryVisible === "boolean"
          ? saved.boundaryVisible
          : initial.boundaryVisible,
      storesVisible:
        typeof saved.storesVisible === "boolean" ? saved.storesVisible : initial.storesVisible,
      period: typeof saved.period === "string" ? saved.period : initial.period,
    };
  } catch {
    return initial;
  }
}

export function saveAnalysisSessionState(
  state: AnalysisSessionState,
  storage: StorageLike | null = sessionStorageOrNull(),
) {
  if (!storage) return;
  try {
    storage.setItem(ANALYSIS_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Session persistence is optional. Keep the active analysis usable when storage is unavailable.
  }
}
