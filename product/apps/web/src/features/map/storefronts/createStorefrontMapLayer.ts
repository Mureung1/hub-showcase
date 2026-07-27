import type { CustomLayerInterface, Map as MapLibreMap } from "maplibre-gl";
import { MercatorCoordinate } from "maplibre-gl";
import * as THREE from "three";

import { createStorefront, disposeStorefront } from "./createStorefront";
import { storefrontAssetCache } from "./storefrontAssets";
import { getStorefrontVariant } from "./storefrontRegistry";

export type StorefrontMapLayerInput = {
  id: string;
  longitude: number;
  latitude: number;
  categoryCode: string;
  source: string;
  sourceId: string;
  building?: {
    id: string;
    center: [number, number];
    plotSizeMeters: number;
    heightMeters: number;
    storeCountInBuilding: number;
  } | null;
};

export type StorefrontMapLayer = CustomLayerInterface & {
  setStore: (nextInput: StorefrontMapLayerInput) => void;
};

function storefrontModelMatrix(input: StorefrontMapLayerInput, storefront: THREE.Group) {
  const [longitude, latitude] = input.building?.center ?? [input.longitude, input.latitude];
  const origin = MercatorCoordinate.fromLngLat([longitude, latitude], 0);
  const unitScale = origin.meterInMercatorCoordinateUnits();
  const bounds = new THREE.Box3().setFromObject(storefront);
  storefront.position.y -= bounds.min.y;
  const dimensions = bounds.setFromObject(storefront).getSize(new THREE.Vector3());
  const localFootprint = Math.max(dimensions.x, dimensions.z, 0.001);
  const localHeight = Math.max(dimensions.y, 0.001);
  const plotSizeMeters = input.building?.plotSizeMeters ?? 8;
  const heightMeters = input.building ? Math.max(3.4, Math.min(24, input.building.heightMeters)) : 8;
  const horizontalScale = plotSizeMeters / localFootprint;
  const verticalScale = heightMeters / localHeight;

  // MapLibre receives Three.js local Y as map Z after rotationX.  The second
  // scale value is therefore depth, while the third is height.
  return new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(
      new THREE.Vector3(
        unitScale * horizontalScale,
        -unitScale * horizontalScale,
        unitScale * verticalScale,
      ),
    )
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
}

export function createStorefrontMapLayer(input: StorefrontMapLayerInput): StorefrontMapLayer {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.Camera | null = null;
  let storefront: THREE.Group | null = null;
  let mapInstance: MapLibreMap | null = null;
  let currentInput = input;
  let modelMatrix = new THREE.Matrix4();
  let replacementVersion = 0;

  function installStorefront(nextStorefront: THREE.Group) {
    if (!scene) {
      disposeStorefront(nextStorefront);
      return;
    }
    if (storefront) {
      scene.remove(storefront);
      disposeStorefront(storefront);
    }
    storefront = nextStorefront;
    modelMatrix = storefrontModelMatrix(currentInput, storefront);
    storefront.userData.locationSource = currentInput.source;
    storefront.userData.locationSourceId = currentInput.sourceId;
    scene.add(storefront);
    mapInstance?.triggerRepaint();
  }

  function replaceStorefront(nextInput: StorefrontMapLayerInput) {
    const version = ++replacementVersion;
    currentInput = nextInput;
    if (!scene) return;
    const variant = getStorefrontVariant(nextInput.categoryCode);
    installStorefront(createStorefront(variant));

    void storefrontAssetCache
      .load(variant)
      .then((assets) => {
        if (version !== replacementVersion || !scene) {
          assets.categoryDecal.dispose();
          return;
        }
        installStorefront(createStorefront(variant, assets));
      })
      .catch(() => {
        // The procedural storefront remains interactive when GLB or atlas loading fails.
      });
  }

  return {
    id: input.id,
    type: "custom",
    renderingMode: "3d",

    onAdd(map, gl) {
      mapInstance = map;
      camera = new THREE.Camera();
      scene = new THREE.Scene();
      replaceStorefront(currentInput);

      scene.add(new THREE.HemisphereLight(0xfff4df, 0x587066, 2.5));
      const sun = new THREE.DirectionalLight(0xffeed1, 3.2);
      sun.position.set(4, 8, 5);
      scene.add(sun);

      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    },

    setStore(nextInput) {
      replaceStorefront(nextInput);
      mapInstance?.triggerRepaint();
    },

    render(_gl, options) {
      if (!camera || !scene || !renderer) return;
      camera.projectionMatrix = new THREE.Matrix4()
        .fromArray(options.defaultProjectionData.mainMatrix)
        .multiply(modelMatrix);
      renderer.resetState();
      renderer.render(scene, camera);
    },

    onRemove() {
      replacementVersion += 1;
      if (storefront) {
        scene?.remove(storefront);
        disposeStorefront(storefront);
      }
      renderer?.resetState();
      renderer?.dispose();
      storefront = null;
      renderer = null;
      scene = null;
      camera = null;
      mapInstance = null;
    },
  };
}
