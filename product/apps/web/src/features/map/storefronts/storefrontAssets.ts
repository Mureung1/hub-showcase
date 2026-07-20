import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { StorefrontVariant } from "./storefrontRegistry";

export type StorefrontAssetInstance = {
  body: THREE.Group;
  categoryDecal: THREE.Texture;
};

type StorefrontAssetLoaders = {
  loadBody: () => Promise<THREE.Group>;
  loadAtlas: () => Promise<THREE.Texture>;
};

const atlasCellByAttachment: Record<StorefrontVariant["attachment"], number> = {
  none: 0,
  flower: 0,
  coffee: 1,
  meal: 2,
  bakery: 3,
  convenience: 4,
};

export function createStorefrontAssetCache(loaders: StorefrontAssetLoaders) {
  let sharedAssetsPromise: Promise<{ body: THREE.Group; atlas: THREE.Texture }> | null = null;

  function sharedAssets() {
    sharedAssetsPromise ??= Promise.all([loaders.loadBody(), loaders.loadAtlas()])
      .then(([body, atlas]) => ({ body, atlas }))
      .catch((error: unknown) => {
        sharedAssetsPromise = null;
        throw error;
      });
    return sharedAssetsPromise;
  }

  return {
    async load(variant: StorefrontVariant): Promise<StorefrontAssetInstance> {
      const { body: sharedBody, atlas: sharedAtlas } = await sharedAssets();
      const body = sharedBody.clone(true);
      body.name = "shared-glb-body";
      body.traverse((object) => {
        if (object instanceof THREE.Mesh) object.userData.sharedGeometry = true;
      });

      const categoryDecal = sharedAtlas.clone();
      categoryDecal.colorSpace = THREE.SRGBColorSpace;
      categoryDecal.wrapS = THREE.ClampToEdgeWrapping;
      categoryDecal.wrapT = THREE.ClampToEdgeWrapping;
      categoryDecal.repeat.set(0.2, 1);
      categoryDecal.offset.set(atlasCellByAttachment[variant.attachment] * 0.2, 0);
      categoryDecal.needsUpdate = true;
      return { body, categoryDecal };
    },
  };
}

const assetRoot = `${import.meta.env.BASE_URL}assets/storefront`;
const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

export const storefrontAssetCache = createStorefrontAssetCache({
  loadBody: async () => {
    const gltf = await gltfLoader.loadAsync(`${assetRoot}/storefront-body-v1.glb`);
    return gltf.scene;
  },
  loadAtlas: () => textureLoader.loadAsync(`${assetRoot}/storefront-category-atlas.svg`),
});

export const storefrontAssetManifest = {
  bodyUrl: `${assetRoot}/storefront-body-v1.glb`,
  atlasUrl: `${assetRoot}/storefront-category-atlas.svg`,
  bodyBytes: 26148,
  atlasBytes: 1263,
} as const;
