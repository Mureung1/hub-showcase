import type { CustomLayerInterface, Map as MapLibreMap } from "maplibre-gl";
import { MercatorCoordinate } from "maplibre-gl";
import * as THREE from "three";

import {
  createStorefront,
  createStorefrontCategoryMarker,
  disposeStorefront,
} from "./createStorefront";
import { storefrontAssetCache } from "./storefrontAssets";
import { getStorefrontVariant } from "./storefrontRegistry";
import type { StorefrontPlacementMode } from "./SelectedStorefrontLayer";

export type StorefrontMapLayerInput = {
  id: string;
  longitude: number;
  latitude: number;
  categoryCode: string;
  placementMode?: StorefrontPlacementMode;
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

function placementMode(input: StorefrontMapLayerInput): StorefrontPlacementMode {
  return input.placementMode ?? "replace-building";
}

function emphasizeCategoryAttachment(storefront: THREE.Group) {
  const attachment = storefront.getObjectByName("category-attachment");
  if (attachment) {
    attachment.position.y += 0.24;
    attachment.scale.setScalar(1.35);
    attachment.traverse((object) => {
      object.renderOrder = 3;
    });
  }
  return storefront;
}

function modelDimensions(model: THREE.Group) {
  const bounds = new THREE.Box3().setFromObject(model);
  model.position.y -= bounds.min.y;
  return bounds.setFromObject(model).getSize(new THREE.Vector3());
}

function replacementModelMatrix(input: StorefrontMapLayerInput, storefront: THREE.Group) {
  const [longitude, latitude] = input.building?.center ?? [input.longitude, input.latitude];
  const origin = MercatorCoordinate.fromLngLat([longitude, latitude], 0);
  const unitScale = origin.meterInMercatorCoordinateUnits();
  const dimensions = modelDimensions(storefront);
  const localFootprint = Math.max(dimensions.x, dimensions.z, 0.001);
  const localHeight = Math.max(dimensions.y, 0.001);
  const plotSizeMeters = input.building?.plotSizeMeters ?? 8;
  const heightMeters = input.building ? Math.max(3.4, Math.min(24, input.building.heightMeters)) : 8;
  const horizontalScale = plotSizeMeters / localFootprint;
  const verticalScale = heightMeters / localHeight;

  // MapLibre receives Three.js local Y as map Z after rotationX. The second
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

function rooftopMarkerMatrix(input: StorefrontMapLayerInput, marker: THREE.Group) {
  const [longitude, latitude] = input.building?.center ?? [input.longitude, input.latitude];
  const buildingHeightMeters = Math.max(3.4, Math.min(80, input.building?.heightMeters ?? 8));
  const origin = MercatorCoordinate.fromLngLat(
    [longitude, latitude],
    buildingHeightMeters + 0.7,
  );
  const unitScale = origin.meterInMercatorCoordinateUnits();
  const dimensions = modelDimensions(marker);
  const localFootprint = Math.max(dimensions.x, dimensions.z, 0.001);
  const localHeight = Math.max(dimensions.y, 0.001);
  const targetHeightMeters = Math.max(5.5, Math.min(9, buildingHeightMeters * 0.3));
  const targetFootprintMeters = Math.max(
    4.5,
    Math.min(7.5, (input.building?.plotSizeMeters ?? 5) * 0.95),
  );
  const uniformScale = Math.min(
    targetHeightMeters / localHeight,
    targetFootprintMeters / localFootprint,
  );

  return new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(
      new THREE.Vector3(
        unitScale * uniformScale,
        -unitScale * uniformScale,
        unitScale * uniformScale,
      ),
    )
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
}

function storefrontModelMatrix(input: StorefrontMapLayerInput, storefront: THREE.Group) {
  return placementMode(input) === "rooftop-marker"
    ? rooftopMarkerMatrix(input, storefront)
    : replacementModelMatrix(input, storefront);
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
    storefront =
      placementMode(currentInput) === "rooftop-marker"
        ? nextStorefront
        : emphasizeCategoryAttachment(nextStorefront);
    storefront.traverse((object) => {
      object.renderOrder = placementMode(currentInput) === "rooftop-marker" ? 4 : object.renderOrder;
    });
    modelMatrix = storefrontModelMatrix(currentInput, storefront);
    storefront.userData.locationSource = currentInput.source;
    storefront.userData.locationSourceId = currentInput.sourceId;
    storefront.userData.placementMode = placementMode(currentInput);
    scene.add(storefront);
    mapInstance?.triggerRepaint();
  }

  function replaceStorefront(nextInput: StorefrontMapLayerInput) {
    const version = ++replacementVersion;
    currentInput = nextInput;
    if (!scene) return;
    const variant = getStorefrontVariant(nextInput.categoryCode);

    if (placementMode(nextInput) === "rooftop-marker") {
      installStorefront(createStorefrontCategoryMarker(variant));
      return;
    }

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
