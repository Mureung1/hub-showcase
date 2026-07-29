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

function focusMaterial(
  color: THREE.ColorRepresentation,
  opacity: number,
  side: THREE.Side = THREE.FrontSide,
) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function makeFocusObjectVisible(object: THREE.Object3D) {
  object.renderOrder = 10;
  if (!(object instanceof THREE.Mesh)) return;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) {
    material.depthTest = false;
    material.depthWrite = false;
    material.transparent = true;
    material.needsUpdate = true;
  }
}

function createSelectedStoreFocus(categoryCode: string) {
  const variant = getStorefrontVariant(categoryCode);
  const focus = new THREE.Group();
  focus.name = "selected-store-focus";

  const target = new THREE.Group();
  target.name = "selected-store-target";

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1.12, 56),
    focusMaterial(0xffd83d, 0.92, THREE.DoubleSide),
  );
  outerRing.name = "selected-store-pulse-ring";
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.08;
  target.add(outerRing);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.58, 44),
    focusMaterial(variant.accent, 0.98, THREE.DoubleSide),
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.1;
  target.add(innerRing);
  focus.add(target);

  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(1.25, 5.4, 40, 1, true),
    focusMaterial(0xffe46a, 0.24, THREE.DoubleSide),
  );
  beam.name = "selected-store-spotlight-beam";
  beam.position.y = 2.7;
  focus.add(beam);

  const lightStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 4.4, 14),
    focusMaterial(0xffef8c, 0.82),
  );
  lightStem.name = "selected-store-light-stem";
  lightStem.position.y = 2.2;
  focus.add(lightStem);

  const markerPivot = new THREE.Group();
  markerPivot.name = "selected-store-marker-pivot";
  markerPivot.position.y = 6.05;
  const marker = createStorefrontCategoryMarker(variant);
  marker.name = "selected-store-category-object";
  marker.scale.setScalar(1.24);
  marker.traverse(makeFocusObjectVisible);
  markerPivot.add(marker);
  focus.add(markerPivot);

  focus.traverse(makeFocusObjectVisible);
  focus.userData = {
    categoryCode,
    assetStrategy: "selected-store-spotlight",
  };
  return focus;
}

function selectedFocusMatrix(input: StorefrontMapLayerInput, focus: THREE.Group) {
  const roofHeightMeters = Math.max(2.8, Math.min(60, input.building?.heightMeters ?? 5.5));
  const origin = MercatorCoordinate.fromLngLat(
    [input.longitude, input.latitude],
    roofHeightMeters + 0.35,
  );
  const unitScale = origin.meterInMercatorCoordinateUnits();
  const dimensions = modelDimensions(focus);
  const localFootprint = Math.max(dimensions.x, dimensions.z, 0.001);
  const plotSizeMeters = input.building?.plotSizeMeters ?? 8;
  const targetFootprintMeters = Math.max(7.2, Math.min(10.4, plotSizeMeters * 0.95));
  const uniformScale = targetFootprintMeters / localFootprint;

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
  if (placementMode(input) === "selected-focus") return selectedFocusMatrix(input, storefront);
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
      placementMode(currentInput) === "replace-building"
        ? emphasizeCategoryAttachment(nextStorefront)
        : nextStorefront;
    storefront.traverse((object) => {
      object.renderOrder = placementMode(currentInput) === "selected-focus" ? 10 : object.renderOrder;
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

    if (placementMode(nextInput) === "selected-focus") {
      installStorefront(createSelectedStoreFocus(nextInput.categoryCode));
      return;
    }

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

      if (storefront && placementMode(currentInput) === "selected-focus") {
        const elapsed = performance.now() / 1000;
        const markerPivot = storefront.getObjectByName("selected-store-marker-pivot");
        const pulseRing = storefront.getObjectByName("selected-store-pulse-ring");
        const beam = storefront.getObjectByName("selected-store-spotlight-beam");
        if (markerPivot) markerPivot.rotation.y = elapsed * 0.82;
        if (pulseRing) {
          const pulse = 1 + Math.sin(elapsed * 3.1) * 0.13;
          pulseRing.scale.setScalar(pulse);
          const material = (pulseRing as THREE.Mesh).material;
          if (material instanceof THREE.MeshBasicMaterial) {
            material.opacity = 0.68 + (Math.sin(elapsed * 3.1) + 1) * 0.12;
          }
        }
        if (beam) {
          const material = (beam as THREE.Mesh).material;
          if (material instanceof THREE.MeshBasicMaterial) {
            material.opacity = 0.19 + (Math.sin(elapsed * 1.8) + 1) * 0.035;
          }
        }
        mapInstance?.triggerRepaint();
      }

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