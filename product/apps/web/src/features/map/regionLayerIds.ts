const REGION_LAYER_NAMES = [
  "landcover",
  "water-fill",
  "water-line",
  "road-casing",
  "road",
  "building-3d",
  "road-label",
  "poi-label",
] as const;

type RegionLayerName = (typeof REGION_LAYER_NAMES)[number];

export function regionSourceId(regionId: string) {
  return `${regionId}-localtwin-map`;
}

export function regionLayerId(regionId: string, layerName: RegionLayerName) {
  return `${regionId}-localtwin-${layerName}`;
}

export function regionLayerIds(regionId: string) {
  return REGION_LAYER_NAMES.map((layerName) => regionLayerId(regionId, layerName));
}
