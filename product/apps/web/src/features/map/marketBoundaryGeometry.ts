import type { FilterSpecification } from "maplibre-gl";
import { useEffect, useState } from "react";

export type MarketBoundaryGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: unknown;
};

type MarketBoundaryFeature = {
  properties?: {
    market_id?: string;
  };
  geometry?: MarketBoundaryGeometry | null;
};

type MarketBoundaryCollection = {
  features?: MarketBoundaryFeature[];
};

const MARKET_BOUNDARY_URL = "/data/market-boundaries.geojson";
const MARKET_BOUNDARY_DISTANCE_TOLERANCE_METERS = 0.75;
let boundaryCollectionRequest: Promise<MarketBoundaryCollection> | null = null;

function loadMarketBoundaryCollection() {
  if (!boundaryCollectionRequest) {
    boundaryCollectionRequest = fetch(MARKET_BOUNDARY_URL).then(async (response) => {
      if (!response.ok) throw new Error(`Market boundary ${response.status}`);
      return (await response.json()) as MarketBoundaryCollection;
    });
  }
  return boundaryCollectionRequest;
}

export function findMarketBoundaryGeometry(
  collection: MarketBoundaryCollection,
  marketId: string,
): MarketBoundaryGeometry | null {
  const feature = collection.features?.find(
    (candidate) => candidate.properties?.market_id === marketId,
  );
  return feature?.geometry ?? null;
}

export function useMarketBoundaryGeometry(marketId: string) {
  const [geometry, setGeometry] = useState<MarketBoundaryGeometry | null>(null);

  useEffect(() => {
    let active = true;
    setGeometry(null);
    loadMarketBoundaryCollection()
      .then((collection) => {
        if (active) setGeometry(findMarketBoundaryGeometry(collection, marketId));
      })
      .catch(() => {
        if (active) setGeometry(null);
      });
    return () => {
      active = false;
    };
  }, [marketId]);

  return geometry;
}

export function outsideSelectedMarketFilter(
  geometry: MarketBoundaryGeometry | null,
): FilterSpecification {
  if (!geometry) return ["all"] as FilterSpecification;
  return [
    ">",
    ["distance", geometry],
    MARKET_BOUNDARY_DISTANCE_TOLERANCE_METERS,
  ] as unknown as FilterSpecification;
}

export function selectedMarketBuildingFilter(
  geometry: MarketBoundaryGeometry | null,
  hiddenBuildingIds: string[] = [],
): FilterSpecification {
  const conditions: unknown[] = [["==", ["get", "layer"], "building"]];
  if (geometry) {
    conditions.push([
      "<=",
      ["distance", geometry],
      MARKET_BOUNDARY_DISTANCE_TOLERANCE_METERS,
    ]);
  }
  if (hiddenBuildingIds.length > 0) {
    conditions.push(["!", ["in", ["get", "osm_id"], ["literal", hiddenBuildingIds]]]);
  }
  return ["all", ...conditions] as unknown as FilterSpecification;
}
