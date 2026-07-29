import type { FilterSpecification } from "maplibre-gl";

export function marketBoundaryFilter(
  marketId: string,
  marketKey?: string,
): FilterSpecification {
  if (!marketKey) return ["==", ["get", "market_id"], marketId] as FilterSpecification;
  return [
    "any",
    ["==", ["get", "market_id"], marketId],
    ["==", ["get", "market_key"], marketKey],
  ] as FilterSpecification;
}
