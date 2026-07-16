import type { Category, LayerMode, MarketKey } from "../market/types";
import { findReadyOverlayRegion } from "../map/supportedRegions";
import type { AnalysisRadius } from "./types";

const MARKET_KEYS: readonly MarketKey[] = ["연남", "홍대", "합정"];
const CATEGORIES: readonly Category[] = ["카페", "음식점", "베이커리", "편의점"];
const RADII: readonly AnalysisRadius[] = [100, 300, 500, 1000];
const LAYERS: readonly LayerMode[] = ["density", "demand"];

export type AnalysisUrlState = {
  marketKey: MarketKey;
  category: Category;
  radius: AnalysisRadius;
  layer: LayerMode;
  center: [number, number];
};

function includes<T extends string | number>(values: readonly T[], value: unknown): value is T {
  return values.includes(value as T);
}

export function readAnalysisUrlState(defaults: AnalysisUrlState): AnalysisUrlState {
  const parameters = new URLSearchParams(window.location.search);
  const marketValue = parameters.get("market");
  const categoryValue = parameters.get("category");
  const radiusValue = Number(parameters.get("radius"));
  const layerValue = parameters.get("layer");
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
    radius: includes(RADII, radiusValue) ? radiusValue : defaults.radius,
    layer: includes(LAYERS, layerValue) ? layerValue : defaults.layer,
    center: hasSupportedCenter ? parsedCenter : defaults.center,
  };
}

export function writeAnalysisUrlState(state: AnalysisUrlState) {
  const parameters = new URLSearchParams(window.location.search);
  parameters.set("market", state.marketKey);
  parameters.set("category", state.category);
  parameters.set("radius", String(state.radius));
  parameters.set("layer", state.layer);
  parameters.set("lng", state.center[0].toFixed(6));
  parameters.set("lat", state.center[1].toFixed(6));
  window.history.replaceState(window.history.state, "", `${window.location.pathname}?${parameters}`);
}
