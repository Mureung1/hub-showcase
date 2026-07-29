import * as THREE from "three";

import { createReviewedStorefront } from "./createReviewedStorefront";
import { getStorefrontDesignForVariant, type StorefrontVariant } from "./storefrontRegistry";

const prefabTemplates = new Map<string, THREE.Group>();

function markSharedResources(template: THREE.Group) {
  template.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.userData.sharedGeometry = true;
    object.geometry.userData.localTwinPrefabShared = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      material.userData.localTwinPrefabShared = true;
    }
  });
}

function prefabKey(variant: StorefrontVariant) {
  return getStorefrontDesignForVariant(variant)?.id ?? variant.attachment;
}

function templateFor(variant: StorefrontVariant) {
  const key = prefabKey(variant);
  const cached = prefabTemplates.get(key);
  if (cached) return cached;
  const template = createReviewedStorefront(variant);
  if (!template) return null;
  template.name = `storefront-prefab-${key}`;
  markSharedResources(template);
  prefabTemplates.set(key, template);
  return template;
}

export function instantiateStorefrontPrefab(variant: StorefrontVariant) {
  const template = templateFor(variant);
  if (!template) return null;
  const instance = template.clone(true);
  instance.name = `storefront-prefab-instance-${prefabKey(variant)}`;
  instance.userData = {
    ...instance.userData,
    categoryCode: variant.categoryCode,
    label: variant.label,
    assetStrategy: "shared-reviewed-prefab",
  };
  return instance;
}

export function storefrontPrefabCount() {
  return prefabTemplates.size;
}
