export type SupportedRegionId = "yeonnam" | "hongdae" | "hapjeong" | "gwanpyeong";
export type OverlayAvailability = "ready" | "planned";
export type RegionCapability = "market-analysis" | "localtwin-overlay" | "scene";

export type SupportedRegion = {
  id: SupportedRegionId;
  label: string;
  center?: [number, number];
  overlayRadiusMeters?: number;
  overlayDataUrl?: string;
  availability: OverlayAvailability;
  capabilities: RegionCapability[];
};

export const SUPPORTED_REGIONS: readonly SupportedRegion[] = [
  {
    id: "yeonnam",
    label: "연남",
    center: [126.9257, 37.5661],
    overlayRadiusMeters: 720,
    overlayDataUrl: "/map/yeonnam.geojson",
    availability: "ready",
    capabilities: ["market-analysis", "localtwin-overlay"],
  },
  {
    id: "hongdae",
    label: "홍대",
    center: [126.9238, 37.5562],
    overlayRadiusMeters: 720,
    overlayDataUrl: "/map/hongdae.geojson",
    availability: "ready",
    capabilities: ["market-analysis", "localtwin-overlay"],
  },
  {
    id: "hapjeong",
    label: "합정",
    center: [126.914, 37.5505],
    overlayRadiusMeters: 720,
    overlayDataUrl: "/map/hapjeong.geojson",
    availability: "ready",
    capabilities: ["market-analysis", "localtwin-overlay"],
  },
  {
    id: "gwanpyeong",
    label: "관평동",
    availability: "planned",
    capabilities: ["scene"],
  },
];

export type ReadyOverlayRegion = SupportedRegion & {
  center: [number, number];
  overlayRadiusMeters: number;
  overlayDataUrl: string;
  availability: "ready";
};

function isReadyOverlayRegion(region: SupportedRegion): region is ReadyOverlayRegion {
  return (
    region.availability === "ready" &&
    region.capabilities.includes("localtwin-overlay") &&
    region.center !== undefined &&
    region.overlayRadiusMeters !== undefined &&
    region.overlayDataUrl !== undefined
  );
}

export const READY_OVERLAY_REGIONS = SUPPORTED_REGIONS.filter(isReadyOverlayRegion);

const EARTH_RADIUS_METERS = 6_371_000;

export function distanceMeters(
  [fromLongitude, fromLatitude]: [number, number],
  [toLongitude, toLatitude]: [number, number],
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRadians) * Math.cos(toLatitudeRadians) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function findReadyOverlayRegion(center: [number, number]) {
  return READY_OVERLAY_REGIONS.find(
    (region) => distanceMeters(center, region.center) <= region.overlayRadiusMeters,
  );
}
