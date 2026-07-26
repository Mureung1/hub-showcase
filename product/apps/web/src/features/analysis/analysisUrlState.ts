import type { AnalysisScope, AnalysisTopic, Category, LayerMode, MarketKey } from "../market/types";
import { findReadyOverlayRegion } from "../map/supportedRegions";
import type { AnalysisRadius } from "./types";

const LAYERS: readonly LayerMode[] = ["density", "demand"];
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
  period: string;
  center: [number, number];
};

export type AnalysisUrlPolicy = {
  marketKeys: readonly MarketKey[];
  categories: readonly Category[];
  radii: readonly AnalysisRadius[];
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

export function readAnalysisUrlState(
  defaults: AnalysisUrlState,
  policy: AnalysisUrlPolicy,
): AnalysisUrlState {
  const parameters = new URLSearchParams(window.location.search);
  const marketValue = parameters.get("market");
  const categoryValue = parameters.get("category");
  const radiusValue = Number(parameters.get("radius"));
  const layerValue = parameters.get("layer");
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
    marketKey: includes(policy.marketKeys, marketValue) ? marketValue : defaults.marketKey,
    category: includes(policy.categories, categoryValue) ? categoryValue : defaults.category,
    selectedCategoryName: stringParameter(
      parameters.get("selectedCategory"),
      defaults.selectedCategoryName,
      60,
    ),
    selectedCategoryCode: parameters.has("categoryCode")
      ? stringParameter(parameters.get("categoryCode"), "", 30) || null
      : defaults.selectedCategoryCode,
    radius: includes(policy.radii, radiusValue) ? radiusValue : defaults.radius,
    layer: includes(LAYERS, layerValue) ? layerValue : defaults.layer,
    scope: "market",
    topic: includes(TOPICS, topicValue) ? topicValue : defaults.topic,
    boundaryVisible: booleanParameter(parameters.get("boundary"), defaults.boundaryVisible),
    storesVisible: booleanParameter(parameters.get("stores"), defaults.storesVisible),
    period: /^\d{5}$/.test(parameters.get("period") ?? "")
      ? (parameters.get("period") as string)
      : defaults.period,
    center: hasSupportedCenter ? parsedCenter : defaults.center,
  };
}
