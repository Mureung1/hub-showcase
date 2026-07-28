export type MapPresentationMode = "flat" | "analysis" | "storefront3d";

export type MapCameraProfile = {
  pitch: number;
  bearing: number;
};

export type MapPresentationProfile = {
  camera: MapCameraProfile;
  localTwinOverlayVisible: boolean;
  coloredBuildingsVisible: boolean;
  fallbackBuildingsVisible: boolean;
  storefrontsVisible: boolean;
};

const MAP_PRESENTATION_PROFILES: Record<MapPresentationMode, MapPresentationProfile> = {
  flat: {
    camera: { pitch: 0, bearing: 0 },
    localTwinOverlayVisible: false,
    coloredBuildingsVisible: false,
    fallbackBuildingsVisible: false,
    storefrontsVisible: false,
  },
  analysis: {
    camera: { pitch: 38, bearing: -18 },
    localTwinOverlayVisible: true,
    coloredBuildingsVisible: true,
    fallbackBuildingsVisible: true,
    storefrontsVisible: false,
  },
  storefront3d: {
    camera: { pitch: 56, bearing: -24 },
    localTwinOverlayVisible: true,
    coloredBuildingsVisible: false,
    fallbackBuildingsVisible: true,
    storefrontsVisible: true,
  },
};

export function getMapPresentationProfile(mode: MapPresentationMode) {
  return MAP_PRESENTATION_PROFILES[mode];
}
