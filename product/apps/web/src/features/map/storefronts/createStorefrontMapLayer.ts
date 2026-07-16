import type { CustomLayerInterface, Map as MapLibreMap } from "maplibre-gl";
import { MercatorCoordinate } from "maplibre-gl";
import * as THREE from "three";

import { createStorefront, disposeStorefront } from "./createStorefront";
import { getStorefrontVariant } from "./storefrontRegistry";

export type StorefrontMapLayerInput = {
  id: string;
  longitude: number;
  latitude: number;
  categoryCode: string;
  source: string;
  sourceId: string;
};

export type StorefrontMapLayer = CustomLayerInterface & {
  setStore: (nextInput: StorefrontMapLayerInput) => void;
};

function storefrontModelMatrix(input: StorefrontMapLayerInput) {
  const origin = MercatorCoordinate.fromLngLat([input.longitude, input.latitude], 7);
  const scale = origin.meterInMercatorCoordinateUnits() * 1.35;
  return new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(scale, -scale, scale))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
}

export function createStorefrontMapLayer(input: StorefrontMapLayerInput): StorefrontMapLayer {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.Camera | null = null;
  let storefront: THREE.Group | null = null;
  let mapInstance: MapLibreMap | null = null;
  let currentInput = input;
  let modelMatrix = storefrontModelMatrix(input);

  function replaceStorefront(nextInput: StorefrontMapLayerInput) {
    currentInput = nextInput;
    modelMatrix = storefrontModelMatrix(nextInput);
    if (!scene) return;
    if (storefront) {
      scene.remove(storefront);
      disposeStorefront(storefront);
    }
    storefront = createStorefront(getStorefrontVariant(nextInput.categoryCode));
    storefront.userData.locationSource = nextInput.source;
    storefront.userData.locationSourceId = nextInput.sourceId;
    scene.add(storefront);
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
