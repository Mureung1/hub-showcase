import * as THREE from "three";

import type { StorefrontDesignSpec } from "./storefrontDesignCatalog";
import { addDesignBox, addDesignCylinder, designMaterial } from "./storefrontDesignPrimitives";

function createBaguetteGeometry() {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.025, -0.86),
      new THREE.Vector2(0.14, -0.7),
      new THREE.Vector2(0.21, -0.4),
      new THREE.Vector2(0.23, 0.18),
      new THREE.Vector2(0.19, 0.55),
      new THREE.Vector2(0.11, 0.75),
      new THREE.Vector2(0.025, 0.86),
    ],
    18,
  );
}

export function addFoodDesignAttachment(marker: THREE.Group, spec: StorefrontDesignSpec) {
  const light = designMaterial(0xfff4dc, 0.72);
  const accent = designMaterial(spec.accent, 0.72);
  const detail = designMaterial(spec.detail, 0.72);

  if (spec.id === "cafe") {
    const coffee = designMaterial(0x4b2818, 0.58);
    addDesignCylinder(marker, "cafe-roof-saucer", [0.7, 0.7], 0.09, [0, 0.06, 0], accent, 24);
    addDesignCylinder(marker, "cafe-roof-cup-foot", [0.36, 0.44], 0.11, [0, 0.16, 0], light, 24);
    const cup = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.36, 0.16),
          new THREE.Vector2(0.5, 0.19),
          new THREE.Vector2(0.67, 0.32),
          new THREE.Vector2(0.78, 0.53),
          new THREE.Vector2(0.8, 0.75),
          new THREE.Vector2(0.79, 0.8),
        ],
        32,
      ),
      light,
    );
    cup.name = "cafe-roof-cup";
    marker.add(cup);
    addDesignCylinder(
      marker,
      "cafe-roof-coffee-surface",
      [0.72, 0.72],
      0.04,
      [0, 0.8, 0],
      coffee,
      28,
    );
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.055, 8, 28), light);
    rim.name = "cafe-roof-cup-rim";
    rim.position.y = 0.81;
    rim.rotation.x = Math.PI / 2;
    marker.add(rim);
    const handlePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.7, 0.66, 0),
      new THREE.Vector3(1.05, 0.69, 0),
      new THREE.Vector3(1.17, 0.48, 0),
      new THREE.Vector3(1.02, 0.28, 0),
      new THREE.Vector3(0.68, 0.31, 0),
    ]);
    const handle = new THREE.Mesh(new THREE.TubeGeometry(handlePath, 24, 0.085, 10, false), light);
    handle.name = "cafe-roof-cup-handle";
    marker.add(handle);
    const beanMaterial = designMaterial(0x7a3f21, 0.62);
    const beanGrooveMaterial = designMaterial(0x2b140b, 0.5);
    for (const angle of [Math.PI / 4, Math.PI * 1.25]) {
      const x = Math.sin(angle) * 0.79;
      const z = Math.cos(angle) * 0.79;
      const bean = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), beanMaterial);
      bean.name = "cafe-coffee-bean-emblem";
      bean.scale.set(0.72, 1, 0.16);
      bean.position.set(x, 0.48, z);
      bean.rotation.y = angle;
      bean.rotation.z = -0.42;
      marker.add(bean);
      const groove = addDesignBox(
        marker,
        "cafe-coffee-bean-groove",
        [0.045, 0.4, 0.025],
        [Math.sin(angle) * 0.85, 0.48, Math.cos(angle) * 0.85],
        beanGrooveMaterial,
      );
      groove.rotation.y = angle;
      groove.rotation.z = -0.42;
    }
  }

  if (spec.id === "restaurant") {
    addDesignCylinder(marker, "restaurant-bowl", [0.84, 0.58], 0.5, [-0.2, 0.3, 0], light, 24);
    addDesignCylinder(marker, "restaurant-food", [0.71, 0.71], 0.05, [-0.2, 0.57, 0], accent, 24);
    for (const x of [0.94, 1.13]) {
      const stick = addDesignBox(
        marker,
        "restaurant-chopstick",
        [0.07, 0.07, 1.42],
        [x, 0.12, 0],
        detail,
      );
      stick.rotation.y = -0.1;
    }
    const spoonHandle = addDesignBox(
      marker,
      "restaurant-spoon-handle",
      [0.12, 0.08, 1.05],
      [1.45, 0.12, 0.1],
      light,
    );
    spoonHandle.rotation.y = -0.08;
    const spoonHead = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 10), light);
    spoonHead.name = "restaurant-spoon-head";
    spoonHead.scale.set(0.72, 0.28, 1);
    spoonHead.position.set(1.49, 0.16, -0.52);
    marker.add(spoonHead);
  }

  if (spec.id === "bakery") {
    const basket = addDesignCylinder(
      marker,
      "bakery-basket-base",
      [0.82, 1],
      0.55,
      [0, 0.3, 0],
      designMaterial(0x9a623d),
      24,
    );
    basket.scale.z = 0.7;
    for (const y of [0.12, 0.3, 0.48, 0.62]) {
      const weave = new THREE.Mesh(
        new THREE.TorusGeometry(0.92, 0.055, 7, 24),
        designMaterial(0x74472f),
      );
      weave.name = "bakery-basket-weave";
      weave.position.y = y;
      weave.rotation.x = Math.PI / 2;
      weave.scale.z = 0.7;
      marker.add(weave);
    }
    const loafPositions = [
      [-0.12, 0.58, 0.16, -Math.PI / 5],
      [0, 0.58, -0.14, 0],
      [0.12, 0.58, 0.04, Math.PI / 5],
    ] as const;
    for (const [index, [x, y, z, rotation]] of loafPositions.entries()) {
      const loaf = new THREE.Group();
      loaf.name = "bakery-baguette";
      loaf.position.set(x, y, z);
      loaf.rotation.z = rotation;
      const baguette = new THREE.Mesh(createBaguetteGeometry(), index === 1 ? detail : accent);
      baguette.name = "bakery-baguette-loaf";
      baguette.position.y = 0.86;
      loaf.add(baguette);
      for (const scoreY of [0.47, 0.86, 1.25]) {
        const score = addDesignBox(
          loaf,
          "bakery-baguette-score",
          [0.29, 0.05, 0.025],
          [0, scoreY, 0.205],
          designMaterial(0xb66332),
        );
        score.rotation.z = -0.55;
      }
      marker.add(loaf);
    }
  }
}

export function addRetailDesignAttachment(marker: THREE.Group, spec: StorefrontDesignSpec) {
  const light = designMaterial(0xfff4dc, 0.72);
  const accent = designMaterial(spec.accent, 0.72);
  const detail = designMaterial(spec.detail, 0.72);

  if (spec.id === "convenience") {
    const panelMaterial = designMaterial(0xf3f5ef, 0.4);
    const signColors = [0x3286bb, 0xf07b32, 0x52a84d, 0x7652a4];
    for (const z of [-1.76, 1.76]) {
      addDesignBox(
        marker,
        "convenience-fascia-panel",
        [3.9, 0.58, 0.12],
        [0, -0.18, z],
        panelMaterial,
      );
      for (const [index, x] of [-1.38, -0.46, 0.46, 1.38].entries()) {
        addDesignBox(
          marker,
          "convenience-fascia-segment",
          [0.72, 0.22, 0.05],
          [x, -0.18, z + Math.sign(z) * 0.085],
          designMaterial(signColors[index]),
        );
      }
    }
    for (const x of [-2.34, 2.34]) {
      addDesignBox(
        marker,
        "convenience-side-fascia",
        [0.12, 0.58, 2.82],
        [x, -0.18, 0],
        panelMaterial,
      );
      for (const [index, z] of [-1.02, -0.34, 0.34, 1.02].entries()) {
        addDesignBox(
          marker,
          "convenience-side-segment",
          [0.05, 0.22, 0.52],
          [x + Math.sign(x) * 0.085, -0.18, z],
          designMaterial(signColors[index]),
        );
      }
    }
  }

  if (spec.id === "beauty") {
    for (const [x, rotation] of [
      [-0.18, -0.17],
      [0.18, 0.17],
    ] as const) {
      const blade = addDesignBox(
        marker,
        "beauty-scissor-blade",
        [0.16, 0.1, 1.65],
        [x, 0.16, 0.42],
        light,
      );
      blade.rotation.y = rotation;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 10, 24), accent);
      ring.name = "beauty-scissor-ring";
      ring.position.set(x * 1.8, 0.18, -0.62);
      ring.rotation.x = Math.PI / 2;
      marker.add(ring);
    }
    addDesignCylinder(marker, "beauty-scissor-pivot", [0.14, 0.14], 0.16, [0, 0.22, 0], detail, 16);
  }

  if (spec.id === "apparel") {
    addDesignBox(marker, "apparel-roof-shirt", [1.45, 0.12, 1.58], [0, 0.15, 0.14], detail);
    for (const [x, rotation] of [
      [-0.95, -0.34],
      [0.95, 0.34],
    ] as const) {
      const sleeve = addDesignBox(
        marker,
        "apparel-shirt-sleeve",
        [0.92, 0.12, 0.72],
        [x, 0.055, -0.24],
        light,
      );
      sleeve.rotation.y = rotation;
    }
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.065, 8, 20, Math.PI), accent);
    collar.name = "apparel-shirt-collar";
    collar.position.set(0, 0.2, -0.66);
    collar.rotation.x = Math.PI / 2;
    marker.add(collar);
  }
}

function addFlower(
  parent: THREE.Object3D,
  position: readonly [number, number, number],
  petal: THREE.Material,
  center: THREE.Material,
) {
  const flower = new THREE.Group();
  flower.name = "design-flower";
  flower.position.set(...position);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), petal);
    mesh.scale.set(1, 0.62, 0.42);
    mesh.position.set(Math.cos(angle) * 0.17, Math.sin(angle) * 0.17, 0);
    flower.add(mesh);
  }
  const middle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), center);
  middle.position.z = 0.06;
  flower.add(middle);
  parent.add(flower);
}

export function addCommunityDesignAttachment(marker: THREE.Group, spec: StorefrontDesignSpec) {
  const light = designMaterial(0xfff4dc, 0.72);
  const accent = designMaterial(spec.accent, 0.72);
  const detail = designMaterial(spec.detail, 0.72);
  const dark = designMaterial(0x2f3d36, 0.66);

  if (spec.id === "academy") {
    const book = new THREE.Group();
    book.name = "academy-open-book";
    book.position.y = 0.66;
    book.rotation.x = Math.PI / 4;
    for (const [x, rotation] of [
      [-0.46, -0.2],
      [0.46, 0.2],
    ] as const) {
      const page = addDesignBox(
        book,
        "academy-open-book-page",
        [0.98, 0.12, 1.28],
        [x, 0, 0],
        x < 0 ? light : detail,
      );
      page.rotation.z = rotation;
    }
    addDesignBox(book, "academy-open-book-spine", [0.12, 0.18, 1.34], [0, -0.02, 0], accent);
    marker.add(book);
    const stand = addDesignBox(
      marker,
      "academy-book-stand",
      [1.62, 0.12, 0.88],
      [0, 0.38, -0.28],
      dark,
    );
    stand.rotation.x = Math.PI / 4;
    addDesignBox(marker, "academy-book-stand-lip", [1.72, 0.14, 0.24], [0, 0.18, 0.53], accent);
  }

  if (spec.id === "lodging") {
    addDesignBox(marker, "lodging-roof-bed", [1.9, 0.24, 1.3], [0, 0.16, 0], accent);
    addDesignBox(marker, "lodging-roof-mattress", [1.76, 0.25, 1.17], [0, 0.4, 0], light);
    addDesignBox(marker, "lodging-roof-pillow", [0.52, 0.16, 0.88], [0.5, 0.62, 0], detail);
    addDesignBox(marker, "lodging-roof-blanket", [1.02, 0.1, 1.13], [-0.34, 0.59, 0], accent);
    addDesignBox(marker, "lodging-roof-headboard", [0.13, 0.72, 1.3], [0.94, 0.4, 0], accent);
  }

  if (spec.id === "sports") {
    const bar = addDesignCylinder(
      marker,
      "sports-dumbbell-bar",
      [0.09, 0.09],
      1.45,
      [0, 0.52, 0],
      dark,
      12,
    );
    bar.rotation.z = Math.PI / 2;
    for (const x of [-0.78, 0.78]) {
      const weight = addDesignCylinder(
        marker,
        "sports-dumbbell-weight",
        [0.32, 0.32],
        0.22,
        [x, 0.52, 0],
        accent,
        14,
      );
      weight.rotation.z = Math.PI / 2;
    }
  }

  if (spec.id === "flower") {
    addDesignCylinder(
      marker,
      "flower-roof-pot",
      [0.5, 0.38],
      0.58,
      [0, 0.31, 0],
      designMaterial(0x79503a),
      14,
    );
    for (const [x, y] of [
      [-0.42, 0.85],
      [0, 1.08],
      [0.42, 0.85],
    ] as const) {
      addDesignBox(
        marker,
        "flower-stem",
        [0.07, 0.5, 0.07],
        [x, y - 0.24, 0],
        designMaterial(0x4c7f56),
      );
      addFlower(marker, [x, y, 0], accent, detail);
    }
  }
}
