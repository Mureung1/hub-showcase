import type { CustomLayerInterface } from "maplibre-gl";
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

export function createStorefrontMapLayer(input: StorefrontMapLayerInput): CustomLayerInterface {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.Camera | null = null;
  let storefront: THREE.Group | null = null;

  const origin = MercatorCoordinate.fromLngLat([input.longitude, input.latitude], 7);
  const scale = origin.meterInMercatorCoordinateUnits() * 1.35;
  const rotationX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const modelMatrix = new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(scale, -scale, scale))
    .multiply(rotationX);

  return {
    id: input.id,
    type: "custom",
    renderingMode: "3d",

    onAdd(mapInstance, gl) {
      camera = new THREE.Camera();
      scene = new THREE.Scene();
      storefront = createStorefront(getStorefrontVariant(input.categoryCode));
      storefront.userData.locationSource = input.source;
      storefront.userData.locationSourceId = input.sourceId;
      scene.add(storefront);

      scene.add(new THREE.HemisphereLight(0xfff4df, 0x587066, 2.5));
      const sun = new THREE.DirectionalLight(0xffeed1, 3.2);
      sun.position.set(4, 8, 5);
      scene.add(sun);

      renderer = new THREE.WebGLRenderer({
        canvas: mapInstance.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
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
      if (storefront) disposeStorefront(storefront);
      renderer?.dispose();
      storefront = null;
      renderer = null;
      scene = null;
      camera = null;
    },
  };
}
