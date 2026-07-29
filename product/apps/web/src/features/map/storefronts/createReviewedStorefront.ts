import * as THREE from "three";

import { addStorefrontDesignAttachment } from "./storefrontDesignAttachments";
import { addDesignBox, addDesignCylinder, designMaterial } from "./storefrontDesignPrimitives";
import { getStorefrontDesignForVariant, type StorefrontVariant } from "./storefrontRegistry";

function addWindows(
  model: THREE.Group,
  spec: NonNullable<ReturnType<typeof getStorefrontDesignForVariant>>,
  glass: THREE.Material,
) {
  const floorHeight = spec.height / spec.levels;
  for (let level = 0; level < spec.levels; level += 1) {
    const y = floorHeight * level + floorHeight * 0.48;
    const windowHeight = Math.min(1.18, floorHeight * 0.55);
    addDesignBox(
      model,
      "design-window",
      [spec.width * 0.58, windowHeight, 0.09],
      [0, y, spec.depth / 2 + 0.04],
      glass,
    );
    addDesignBox(
      model,
      "design-window",
      [spec.width * 0.58, windowHeight, 0.09],
      [0, y, -spec.depth / 2 - 0.04],
      glass,
    );
    addDesignBox(
      model,
      "design-window",
      [0.09, windowHeight, spec.depth * 0.52],
      [spec.width / 2 + 0.04, y, 0],
      glass,
    );
    addDesignBox(
      model,
      "design-window",
      [0.09, windowHeight, spec.depth * 0.52],
      [-spec.width / 2 - 0.04, y, 0],
      glass,
    );
  }
}

export function createReviewedStorefront(variant: StorefrontVariant) {
  const spec = getStorefrontDesignForVariant(variant);
  if (!spec) return null;

  const model = new THREE.Group();
  model.name = `reviewed-storefront-${spec.id}`;
  const wall = designMaterial(spec.wall);
  const roof = designMaterial(spec.roof, 0.76);
  const accent = designMaterial(spec.accent, 0.76);
  const glass = new THREE.MeshStandardMaterial({
    color: spec.id === "flower" ? 0x83d9eb : 0x91c8c6,
    roughness: spec.id === "flower" ? 0.14 : 0.24,
    transparent: true,
    opacity: spec.id === "flower" ? 0.52 : 0.76,
  });
  const roofTop = spec.height + (spec.form === "greenhouse" ? 0.95 : 0.25);

  if (spec.form === "round") {
    addDesignCylinder(
      model,
      "storefront-shell-round",
      [spec.width / 2, spec.width / 2],
      spec.height,
      [0, spec.height / 2, 0],
      wall,
      8,
    );
    addDesignCylinder(
      model,
      "storefront-roof-round",
      [spec.width / 2 + 0.22, spec.width / 2 + 0.22],
      0.28,
      [0, spec.height + 0.14, 0],
      roof,
      8,
    );
  } else {
    addDesignBox(
      model,
      "storefront-shell-box",
      [spec.width, spec.height, spec.depth],
      [0, spec.height / 2, 0],
      wall,
    );
    if (spec.form === "greenhouse") {
      const greenhouseRoof = new THREE.Mesh(
        new THREE.ConeGeometry(spec.width * 0.56, 1.35, 4),
        roof,
      );
      greenhouseRoof.name = "storefront-greenhouse-roof";
      greenhouseRoof.position.y = spec.height + 0.68;
      greenhouseRoof.rotation.y = Math.PI / 4;
      greenhouseRoof.scale.z = spec.depth / spec.width;
      greenhouseRoof.castShadow = true;
      model.add(greenhouseRoof);
    } else {
      addDesignBox(
        model,
        "storefront-roof-cap",
        [spec.width + 0.42, 0.32, spec.depth + 0.42],
        [0, spec.height + 0.16, 0],
        roof,
      );
    }
  }

  addWindows(model, spec, glass);
  for (let level = 1; level < spec.levels; level += 1) {
    const y = (spec.height / spec.levels) * level;
    addDesignBox(
      model,
      "storefront-floor-band",
      [spec.width + 0.18, 0.12, spec.depth + 0.18],
      [0, y, 0],
      accent,
    );
  }

  if (["cafe", "restaurant", "bakery"].includes(spec.id)) {
    for (const z of [spec.depth / 2 + 0.23, -spec.depth / 2 - 0.23]) {
      addDesignBox(
        model,
        "storefront-awning",
        [spec.width * 0.58, 0.16, 0.5],
        [0, spec.height * 0.72, z],
        accent,
      );
    }
  }
  if (spec.id === "convenience") {
    addDesignBox(
      model,
      "convenience-shell-green-band",
      [spec.width + 0.16, 0.18, spec.depth + 0.16],
      [0, spec.height * 0.75, 0],
      designMaterial(0x45a36f),
    );
    addDesignBox(
      model,
      "convenience-shell-blue-band",
      [spec.width + 0.19, 0.19, spec.depth + 0.19],
      [0, spec.height * 0.67, 0],
      accent,
    );
    addDesignBox(
      model,
      "convenience-shell-orange-band",
      [spec.width + 0.22, 0.14, spec.depth + 0.22],
      [0, spec.height * 0.59, 0],
      designMaterial(spec.detail),
    );
    addDesignBox(
      model,
      "convenience-shell-violet-band",
      [spec.width + 0.24, 0.1, spec.depth + 0.24],
      [0, spec.height * 0.53, 0],
      designMaterial(0x7563a8),
    );
  }

  addStorefrontDesignAttachment(model, spec, roofTop);
  addDesignBox(
    model,
    "storefront-square-plot",
    [5.35, 0.2, 5.35],
    [0, -0.14, 0],
    designMaterial(0xc8d8c3),
  );
  model.userData = {
    categoryCode: variant.categoryCode,
    designId: spec.id,
    label: spec.label,
    assetStrategy: "reviewed-storefront-model",
  };
  return model;
}
