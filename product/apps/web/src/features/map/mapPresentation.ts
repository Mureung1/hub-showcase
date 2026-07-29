export type MapPresentationMode = "flat" | "analysis" | "storefront3d";

export type MapCameraProfile = {
  pitch: number;
  bearing: number;
};

export type MapPresentationProfile = {
  camera: MapCameraProfile;
  localTwinOverlayVisible: boolean;
  selectedMarketBuildingsVisible: boolean;
  fallbackBuildingsVisible: boolean;
  storefrontsVisible: boolean;
};

const MAP_PRESENTATION_PROFILES: Record<MapPresentationMode, MapPresentationProfile> = {
  flat: {
    camera: { pitch: 0, bearing: 0 },
    localTwinOverlayVisible: false,
    selectedMarketBuildingsVisible: false,
    fallbackBuildingsVisible: false,
    storefrontsVisible: false,
  },
  analysis: {
    camera: { pitch: 38, bearing: -18 },
    localTwinOverlayVisible: true,
    selectedMarketBuildingsVisible: true,
    fallbackBuildingsVisible: true,
    storefrontsVisible: false,
  },
  storefront3d: {
    camera: { pitch: 56, bearing: -24 },
    localTwinOverlayVisible: true,
    selectedMarketBuildingsVisible: true,
    fallbackBuildingsVisible: true,
    storefrontsVisible: true,
  },
};

export function getMapPresentationProfile(mode: MapPresentationMode) {
  return MAP_PRESENTATION_PROFILES[mode];
}
