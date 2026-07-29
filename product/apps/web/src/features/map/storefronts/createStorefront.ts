import * as THREE from "three";

import type { StorefrontAssetInstance } from "./storefrontAssets";
import { addStorefrontDesignAttachment } from "./storefrontDesignAttachments";
import { instantiateStorefrontPrefab } from "./storefrontPrefabLibrary";
import { getStorefrontDesignForVariant, type StorefrontVariant } from "./storefrontRegistry";

function standardMaterial(color: number, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function addBox(
  parent: THREE.Object3D,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCategoryAttachment(parent: THREE.Group, variant: StorefrontVariant, roofTop: number) {
  const design = getStorefrontDesignForVariant(variant);
  if (!design) return null;
  const attachment = new THREE.Group();
  attachment.name = "category-attachment";
  addStorefrontDesignAttachment(attachment, design, roofTop);
  parent.add(attachment);
  return attachment;
}

function addLoadedBody(
  storefront: THREE.Group,
  body: THREE.Group,
  materials: {
    wall: THREE.Material;
    roof: THREE.Material;
    accent: THREE.Material;
    glass: THREE.Material;
    trim: THREE.Material;
  },
) {
  body.name = "shared-glb-body";
  body.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object.name === "shop-body") object.material = materials.wall;
    else if (object.name === "roof-cap") object.material = materials.roof;
    else if (object.name.startsWith("awning")) object.material = materials.accent;
    else if (object.name.startsWith("window")) object.material = materials.glass;
    else object.material = materials.trim;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  storefront.add(body);
}

function addCategoryDecals(parent: THREE.Group, texture: THREE.Texture) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const placements: Array<{
    name: string;
    size: [number, number];
    position: [number, number, number];
    rotationY: number;
  }> = [
    { name: "front", size: [1.3, 0.65], position: [0, 2.42, 1.42], rotationY: 0 },
    { name: "back", size: [1.3, 0.65], position: [0, 2.42, -1.42], rotationY: Math.PI },
    { name: "left", size: [1.3, 0.65], position: [-2.17, 2.42, 0], rotationY: -Math.PI / 2 },
    { name: "right", size: [1.3, 0.65], position: [2.17, 2.42, 0], rotationY: Math.PI / 2 },
  ];
  for (const placement of placements) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(...placement.size), material);
    decal.name = `category-decal-${placement.name}`;
    decal.position.set(...placement.position);
    decal.rotation.y = placement.rotationY;
    parent.add(decal);
  }
}

export function createStorefrontCategoryMarker(variant: StorefrontVariant) {
  const marker = new THREE.Group();
  marker.name = `storefront-category-marker-${variant.categoryCode}`;
  const reviewedStorefront = instantiateStorefrontPrefab(variant);
  if (reviewedStorefront) marker.add(reviewedStorefront);

  marker.userData = {
    categoryCode: variant.categoryCode,
    label: variant.label,
    assetStrategy: "reviewed-storefront-model",
  };
  return marker;
}

export function createStorefront(variant: StorefrontVariant, assets?: StorefrontAssetInstance) {
  const storefront = new THREE.Group();
  storefront.name = `storefront-${variant.categoryCode}`;

  const wall = standardMaterial(variant.wall);
  const trim = standardMaterial(variant.trim, 0.72);
  const roof = standardMaterial(variant.roof);
  const accent = standardMaterial(variant.accent, 0.7);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9bcbd1,
    roughness: 0.25,
    metalness: 0.08,
    transparent: true,
    opacity: 0.82,
  });

  if (assets) {
    addLoadedBody(storefront, assets.body, { wall, roof, accent, glass, trim });
    addCategoryDecals(storefront, assets.categoryDecal);
  } else {
    addBox(storefront, "shop-body", [4.2, 2.8, 2.6], [0, 1.45, 0], wall);
    addBox(storefront, "roof-cap", [4.7, 0.34, 3.05], [0, 3.02, 0], roof);
    const signGroup = new THREE.Group();
    signGroup.name = "storefront-sign";
    for (const [name, size, position] of [
      ["north", [2.5, 0.72, 0.18], [0, 2.36, 1.39]],
      ["south", [2.5, 0.72, 0.18], [0, 2.36, -1.39]],
      ["east", [0.18, 0.72, 2.0], [2.18, 2.36, 0]],
      ["west", [0.18, 0.72, 2.0], [-2.18, 2.36, 0]],
    ] as const) {
      addBox(signGroup, `storefront-sign-${name}`, size, position, trim);
    }
    storefront.add(signGroup);
    for (const [name, size, position] of [
      ["north", [2.4, 1.2, 0.12], [0, 1.12, 1.37]],
      ["south", [2.4, 1.2, 0.12], [0, 1.12, -1.37]],
      ["east", [0.12, 1.2, 1.9], [2.12, 1.12, 0]],
      ["west", [0.12, 1.2, 1.9], [-2.12, 1.12, 0]],
    ] as const) {
      addBox(storefront, `facade-window-${name}`, size, position, glass);
    }
  }

  addCategoryAttachment(storefront, variant, 3.25);

  const ground = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.22, 4.7), standardMaterial(0xc8d8c3));
  ground.name = "square-storefront-plot";
  ground.position.y = -0.16;
  ground.receiveShadow = true;
  storefront.add(ground);

  storefront.userData = {
    categoryCode: variant.categoryCode,
    label: variant.label,
    assetStrategy: assets ? "shared-glb-body-category-atlas" : "procedural-fallback",
  };
  return storefront;
}

export function disposeStorefront(storefront: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  storefront.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (
      !object.userData.sharedGeometry &&
      !object.geometry.userData.localTwinPrefabShared
    ) {
      object.geometry.dispose();
    }
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => {
      if (!material.userData.localTwinPrefabShared) materials.add(material);
    });
  });
  materials.forEach((material) => {
    const texture = (material as THREE.Material & { map?: THREE.Texture | null }).map;
    texture?.dispose();
    material.dispose();
  });
}
