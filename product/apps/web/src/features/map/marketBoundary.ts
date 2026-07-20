import type { FilterSpecification } from "maplibre-gl";

export function marketBoundaryFilter(marketId: string): FilterSpecification {
  return ["==", "market_id", marketId];
}
