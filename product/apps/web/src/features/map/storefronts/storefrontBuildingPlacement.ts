type Position = [number, number];

export type StorefrontBuildingFootprint =
  | {
      type: "Polygon";
      coordinates: Position[][];
    }
  | {
      type: "MultiPolygon";
      coordinates: Position[][][];
    };

type OverlayFeature = {
  properties?: {
    layer?: string;
    osm_id?: string;
    height?: number;
  };
  geometry?: {
    type?: "Polygon" | "MultiPolygon";
    coordinates?: unknown;
  };
};

export type OverlayCollection = {
  features?: OverlayFeature[];
};

export type StorefrontBuildingPlacement = {
  buildingId: string;
  center: Position;
  plotSizeMeters: number;
  heightMeters: number;
  storeCountInBuilding: number;
};

export type StorefrontCoordinate = {
  id?: string;
  longitude: number;
  latitude: number;
};

export type StorefrontBuildingCandidate = StorefrontCoordinate & {
  id: string;
};

export type ResolvedStorefrontBuilding = {
  storeId: string;
  building: StorefrontBuildingPlacement;
};

const overlayCache = new Map<string, Promise<OverlayCollection>>();

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function isRing(value: unknown): value is Position[] {
  return Array.isArray(value) && value.every(isPosition);
}

function isPolygonCoordinates(value: unknown): value is Position[][] {
  return Array.isArray(value) && value.length > 0 && value.every(isRing);
}

function isMultiPolygonCoordinates(value: unknown): value is Position[][][] {
  return Array.isArray(value) && value.length > 0 && value.every(isPolygonCoordinates);
}

function buildingFootprint(feature: OverlayFeature): StorefrontBuildingFootprint | null {
  if (
    feature.geometry?.type === "Polygon" &&
    isPolygonCoordinates(feature.geometry.coordinates)
  ) {
    return { type: "Polygon", coordinates: feature.geometry.coordinates };
  }
  if (
    feature.geometry?.type === "MultiPolygon" &&
    isMultiPolygonCoordinates(feature.geometry.coordinates)
  ) {
    return { type: "MultiPolygon", coordinates: feature.geometry.coordinates };
  }
  return null;
}

function polygonOuterRings(feature: OverlayFeature): Position[][] {
  const footprint = buildingFootprint(feature);
  if (!footprint) return [];
  return footprint.type === "Polygon"
    ? footprint.coordinates.slice(0, 1)
    : footprint.coordinates.flatMap((polygon) => polygon.slice(0, 1));
}

function pointInRing([longitude, latitude]: Position, ring: Position[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    const crosses =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;
    if (crosses) inside = !inside;
  }
  return inside;
}

function polygonCenter(ring: Position[], fallback: Position): Position {
  const vertices = ring.slice(0, -1);
  if (vertices.length < 3) return fallback;
  const center: Position = [
    vertices.reduce((total, [longitude]) => total + longitude, 0) / vertices.length,
    vertices.reduce((total, [, latitude]) => total + latitude, 0) / vertices.length,
  ];
  return pointInRing(center, ring) ? center : fallback;
}

function pointToSegmentDistanceMeters(point: Position, start: Position, end: Position) {
  const metersPerLatitude = 111_320;
  const metersPerLongitude = metersPerLatitude * Math.cos((point[1] * Math.PI) / 180);
  const endX = (end[0] - start[0]) * metersPerLongitude;
  const endY = (end[1] - start[1]) * metersPerLatitude;
  const pointX = (point[0] - start[0]) * metersPerLongitude;
  const pointY = (point[1] - start[1]) * metersPerLatitude;
  const segmentLengthSquared = endX * endX + endY * endY;
  const ratio =
    segmentLengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (pointX * endX + pointY * endY) / segmentLengthSquared));
  return Math.hypot(pointX - endX * ratio, pointY - endY * ratio);
}

function metersToPosition(center: Position, xMeters: number, yMeters: number): Position {
  const metersPerLatitude = 111_320;
  const metersPerLongitude = metersPerLatitude * Math.cos((center[1] * Math.PI) / 180);
  return [
    center[0] + xMeters / metersPerLongitude,
    center[1] + yMeters / metersPerLatitude,
  ];
}

function squareCorners(center: Position, sizeMeters: number): Position[] {
  const half = sizeMeters / 2;
  return [
    metersToPosition(center, -half, -half),
    metersToPosition(center, half, -half),
    metersToPosition(center, half, half),
    metersToPosition(center, -half, half),
  ];
}

function squarePlotSizeMeters(center: Position, ring: Position[]) {
  const distances = ring.slice(1).map((end, index) =>
    pointToSegmentDistanceMeters(center, ring[index], end),
  );
  const nearestEdge = Math.min(...distances);
  // 1.25 is below sqrt(2), so it is normally conservative. Check all four corners
  // anyway: concave footprints and imperfect source polygons must never let a custom
  // storefront spill outside the original building.
  let candidate = Math.min(15, nearestEdge * 1.25);
  while (candidate >= 2.8) {
    if (squareCorners(center, candidate).every((corner) => pointInRing(corner, ring))) {
      return candidate;
    }
    candidate *= 0.85;
  }
  return null;
}

export function findBuildingFootprintById(
  overlay: OverlayCollection,
  buildingId: string,
): StorefrontBuildingFootprint | null {
  const feature = (overlay.features ?? []).find(
    (candidate) =>
      candidate.properties?.layer === "building" && candidate.properties.osm_id === buildingId,
  );
  return feature ? buildingFootprint(feature) : null;
}

export function findStorefrontBuilding(
  overlay: OverlayCollection,
  coordinate: Position,
): Omit<StorefrontBuildingPlacement, "storeCountInBuilding"> | null {
  for (const feature of overlay.features ?? []) {
    if (feature.properties?.layer !== "building" || !feature.properties.osm_id) continue;
    const outerRing = polygonOuterRings(feature).find((ring) => pointInRing(coordinate, ring));
    if (!outerRing) continue;
    const center = polygonCenter(outerRing, coordinate);
    const plotSizeMeters = squarePlotSizeMeters(center, outerRing);
    if (plotSizeMeters === null) continue;
    return {
      buildingId: feature.properties.osm_id,
      center,
      plotSizeMeters,
      heightMeters: Number(feature.properties.height) || 6.4,
    };
  }
  return null;
}

export function countStoresInBuilding(
  overlay: OverlayCollection,
  buildingId: string,
  stores: StorefrontCoordinate[],
) {
  return stores.filter((store) => {
    const placement = findStorefrontBuilding(overlay, [store.longitude, store.latitude]);
    return placement?.buildingId === buildingId;
  }).length;
}

export function loadOverlayBuildings(overlayDataUrl: string) {
  const cached = overlayCache.get(overlayDataUrl);
  if (cached) return cached;
  const request = fetch(overlayDataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Overlay ${response.status}`);
    return (await response.json()) as OverlayCollection;
  });
  overlayCache.set(overlayDataUrl, request);
  return request;
}
