import type { AnalysisScope, AnalysisTopic, Category, LayerMode, MarketKey } from "../market/types";
import { findReadyOverlayRegion } from "../map/supportedRegions";
import type { AnalysisRadius } from "./types";

const MARKET_KEYS: readonly MarketKey[] = ["연남", "홍대", "합정"];
const CATEGORIES: readonly Category[] = ["카페", "음식점", "베이커리", "편의점"];
const RADII: readonly AnalysisRadius[] = [100, 300, 500];
const LAYERS: readonly LayerMode[] = ["density", "demand"];
const SCOPES: readonly AnalysisScope[] = ["market", "radius", "admin-area"];
const TOPICS: readonly AnalysisTopic[] = [
  "overview",
  "stores",
  "sales",
  "competition",
  "flow",
  "population",
  "amenities",
];

export type AnalysisUrlState = {
  marketKey: MarketKey;
  category: Category;
  selectedCategoryName: string;
  selectedCategoryCode: string | null;
  radius: AnalysisRadius;
  layer: LayerMode;
  scope: AnalysisScope;
  topic: AnalysisTopic;
  boundaryVisible: boolean;
  storesVisible: boolean;
  center: [number, number];
};

function booleanParameter(value: string | null, fallback: boolean) {
  if (value === "1") return true;
  if (value === "0") return false;
  return fallback;
}

function stringParameter(value: string | null, fallback: string, maxLength: number) {
  const normalized = value?.trim();
  return normalized && normalized.length <= maxLength ? normalized : fallback;
}

function includes<T extends string | number>(values: readonly T[], value: unknown): value is T {
  return values.includes(value as T);
}

export function readAnalysisUrlState(defaults: AnalysisUrlState): AnalysisUrlState {
  const parameters = new URLSearchParams(window.location.search);
  const marketValue = parameters.get("market");
  const categoryValue = parameters.get("category");
  const radiusValue = Number(parameters.get("radius"));
  const layerValue = parameters.get("layer");
  const scopeValue = parameters.get("scope");
  const topicValue = parameters.get("topic");
  const longitude = Number(parameters.get("lng"));
  const latitude = Number(parameters.get("lat"));
  const parsedCenter: [number, number] = [longitude, latitude];
  const hasSupportedCenter =
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    parameters.has("lng") &&
    parameters.has("lat") &&
    findReadyOverlayRegion(parsedCenter) !== undefined;

  return {
    marketKey: includes(MARKET_KEYS, marketValue) ? marketValue : defaults.marketKey,
    category: includes(CATEGORIES, categoryValue) ? categoryValue : defaults.category,
    selectedCategoryName: stringParameter(
      parameters.get("selectedCategory"),
      defaults.selectedCategoryName,
      60,
    ),
    selectedCategoryCode: parameters.has("categoryCode")
      ? stringParameter(parameters.get("categoryCode"), "", 30) || null
      : defaults.selectedCategoryCode,
    radius: includes(RADII, radiusValue) ? radiusValue : defaults.radius,
    layer: includes(LAYERS, layerValue) ? layerValue : defaults.layer,
    scope: includes(SCOPES, scopeValue) ? scopeValue : defaults.scope,
    topic: includes(TOPICS, topicValue) ? topicValue : defaults.topic,
    boundaryVisible: booleanParameter(parameters.get("boundary"), defaults.boundaryVisible),
    storesVisible: booleanParameter(parameters.get("stores"), defaults.storesVisible),
    center: hasSupportedCenter ? parsedCenter : defaults.center,
  };
}

export function writeAnalysisUrlState(state: AnalysisUrlState) {
  const parameters = new URLSearchParams(window.location.search);
  parameters.set("market", state.marketKey);
  parameters.set("category", state.category);
  parameters.set("selectedCategory", state.selectedCategoryName);
  if (state.selectedCategoryCode) parameters.set("categoryCode", state.selectedCategoryCode);
  else parameters.delete("categoryCode");
  parameters.set("radius", String(state.radius));
  parameters.set("layer", state.layer);
  parameters.set("scope", state.scope);
  parameters.set("topic", state.topic);
  parameters.set("boundary", state.boundaryVisible ? "1" : "0");
  parameters.set("stores", state.storesVisible ? "1" : "0");
  parameters.set("lng", state.center[0].toFixed(6));
  parameters.set("lat", state.center[1].toFixed(6));
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}?${parameters}`,
  );
}
