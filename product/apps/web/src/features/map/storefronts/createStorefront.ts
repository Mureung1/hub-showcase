import * as THREE from "three";

import type { StorefrontAssetInstance } from "./storefrontAssets";
import type { StorefrontVariant } from "./storefrontRegistry";

function standardMaterial(color: number, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function addBox(
  parent: THREE.Object3D,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
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

function addFlower(
  parent: THREE.Object3D,
  position: [number, number, number],
  scale: number,
  petalMaterial: THREE.Material,
  centerMaterial: THREE.Material,
) {
  const flower = new THREE.Group();
  flower.name = "flower-attachment";
  flower.position.set(...position);
  flower.scale.setScalar(scale);

  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), petalMaterial);
    petal.scale.set(1, 0.65, 0.4);
    petal.position.set(Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, 0);
    flower.add(petal);
  }

  const center = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), centerMaterial);
  center.position.z = 0.05;
  flower.add(center);
  parent.add(flower);
}

function addCategoryAttachment(
  parent: THREE.Object3D,
  variant: StorefrontVariant,
  trim: THREE.Material,
  accent: THREE.Material,
  detail: THREE.Material,
  dark: THREE.Material,
) {
  if (variant.attachment === "none" || variant.attachment === "flower") return;

  const attachment = new THREE.Group();
  attachment.name = "category-attachment";
  attachment.position.y = 3.25;

  if (variant.attachment === "coffee") {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.4, 0.62, 18), trim);
    cup.name = "coffee-cup";
    cup.position.y = 0.33;
    attachment.add(cup);

    const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 18), dark);
    coffee.name = "coffee-surface";
    coffee.position.y = 0.65;
    attachment.add(coffee);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 18), accent);
    handle.name = "coffee-handle";
    handle.position.set(0.43, 0.36, 0);
    handle.rotation.y = Math.PI / 2;
    attachment.add(handle);
  }

  if (variant.attachment === "meal") {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.4, 0.38, 18), trim);
    bowl.name = "meal-bowl";
    bowl.position.y = 0.2;
    attachment.add(bowl);
    for (const rotation of [-0.42, 0.42]) {
      const chopstick = addBox(
        attachment,
        "meal-chopstick",
        [0.1, 0.1, 1.65],
        [rotation * 0.35, 0.68, 0],
        accent,
      );
      chopstick.rotation.y = rotation;
      chopstick.rotation.z = rotation * 0.35;
    }
  }

  if (variant.attachment === "bakery") {
    for (const [index, z] of [-0.48, 0, 0.48].entries()) {
      const loaf = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.72, 4, 10), detail);
      loaf.name = "bakery-loaf";
      loaf.position.set((index - 1) * 0.22, 0.32, z);
      loaf.rotation.z = Math.PI / 2;
      loaf.rotation.y = (index - 1) * 0.16;
      attachment.add(loaf);
    }
  }

  if (variant.attachment === "convenience") {
    addBox(attachment, "convenience-sign", [1.15, 0.7, 1.15], [0, 0.38, 0], trim);
    addBox(attachment, "convenience-band-blue", [1.2, 0.16, 1.2], [0, 0.5, 0], accent);
    addBox(attachment, "convenience-band-orange", [1.22, 0.14, 1.22], [0, 0.24, 0], detail);
  }

  parent.add(attachment);
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
  const dark = standardMaterial(0x33443b, 0.65);
  const flower = standardMaterial(variant.flower, 0.75);
  const soil = standardMaterial(0x694c3b);

  if (assets) {
    addLoadedBody(storefront, assets.body, { wall, roof, accent, glass, trim });
    addCategoryDecals(storefront, assets.categoryDecal);
  } else {
    addBox(storefront, "shop-body", [4.2, 2.8, 2.6], [0, 1.45, 0], wall);
    addBox(storefront, "roof-cap", [4.7, 0.34, 3.05], [0, 3.02, 0], roof);
    addBox(storefront, "storefront-sign", [2.5, 0.72, 0.18], [0, 2.36, 1.39], trim);
    addBox(storefront, "front-window-left", [1.22, 1.28, 0.12], [-1.17, 1.1, 1.37], glass);
    addBox(storefront, "front-window-right", [1.22, 1.28, 0.12], [1.17, 1.1, 1.37], glass);
    addBox(storefront, "front-door", [0.78, 1.65, 0.14], [0, 0.92, 1.39], dark);
    addBox(storefront, "door-window", [0.52, 0.74, 0.05], [0, 1.25, 1.48], glass);
    addBox(storefront, "awning", [3.6, 0.18, 0.82], [0, 1.83, 1.63], accent).rotation.x = -0.3;
  }

  if (variant.attachment === "flower") {
    for (let index = -2; index <= 2; index += 1) {
      addFlower(
        storefront,
        [index * 0.42, 2.36 + (Math.abs(index) % 2) * 0.03, 1.51],
        0.72,
        accent,
        flower,
      );
    }

    for (const x of [-1.72, 1.72]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.42, 12), soil);
      pot.name = "flower-pot";
      pot.position.set(x, 0.24, 1.58);
      pot.castShadow = true;
      storefront.add(pot);
      addFlower(storefront, [x, 0.64, 1.58], 1.15, flower, accent);
    }
  }

  addCategoryAttachment(storefront, variant, trim, accent, flower, dark);

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(3.65, 3.65, 0.22, 48),
    standardMaterial(0xc8d8c3),
  );
  ground.name = "miniature-ground";
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
    if (!object.userData.sharedGeometry) object.geometry.dispose();
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => materials.add(material));
  });
  materials.forEach((material) => {
    const texture = (material as THREE.Material & { map?: THREE.Texture | null }).map;
    texture?.dispose();
    material.dispose();
  });
}
