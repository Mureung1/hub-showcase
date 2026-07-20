import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as THREE from "../apps/web/node_modules/three/build/three.module.js";
import { GLTFExporter } from "../apps/web/node_modules/three/examples/jsm/exporters/GLTFExporter.js";

class NodeFileReader {
  result = null;
  onloadend = null;

  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }

  async readAsDataURL(blob) {
    const bytes = Buffer.from(await blob.arrayBuffer());
    this.result = `data:${blob.type};base64,${bytes.toString("base64")}`;
    this.onloadend?.();
  }
}

globalThis.FileReader = NodeFileReader;

const root = new THREE.Group();
root.name = "storefront-body-v1";
const neutral = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });

function addBox(name, size, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), neutral);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  root.add(mesh);
}

addBox("shop-body", [4.2, 2.8, 2.6], [0, 1.45, 0]);
addBox("roof-cap", [4.7, 0.34, 3.05], [0, 3.02, 0]);
addBox("awning-front", [3.6, 0.18, 0.82], [0, 1.83, 1.63], [-0.3, 0, 0]);
addBox("awning-back", [3.6, 0.18, 0.82], [0, 1.83, -1.63], [0.3, Math.PI, 0]);
addBox("awning-left", [2.3, 0.18, 0.82], [-2.43, 1.83, 0], [-0.3, -Math.PI / 2, 0]);
addBox("awning-right", [2.3, 0.18, 0.82], [2.43, 1.83, 0], [-0.3, Math.PI / 2, 0]);

for (const side of ["front", "back"]) {
  const z = side === "front" ? 1.37 : -1.37;
  addBox(`window-${side}-left`, [1.22, 1.28, 0.12], [-1.17, 1.1, z]);
  addBox(`window-${side}-right`, [1.22, 1.28, 0.12], [1.17, 1.1, z]);
}

for (const side of ["left", "right"]) {
  const x = side === "left" ? -2.13 : 2.13;
  addBox(`window-${side}-left`, [0.12, 1.28, 0.92], [x, 1.1, -0.62]);
  addBox(`window-${side}-right`, [0.12, 1.28, 0.92], [x, 1.1, 0.62]);
}

root.updateMatrixWorld(true);
const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(root, { binary: true, onlyVisible: true });
const outputDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../apps/web/public/assets/storefront",
);
await mkdir(outputDirectory, { recursive: true });
const body = Buffer.from(glb);
await writeFile(path.join(outputDirectory, "storefront-body-v1.glb"), body);
const atlas = await stat(path.join(outputDirectory, "storefront-category-atlas.svg"));
const manifest = {
  version: 1,
  license: "LocalTwin original asset; project use permitted",
  source:
    "Generated in-repository without external models, textures, trademarks, or facade imagery",
  body: {
    path: "storefront-body-v1.glb",
    bytes: body.byteLength,
    generator: "product/scripts/generate_storefront_body.mjs",
  },
  categoryAtlas: {
    path: "storefront-category-atlas.svg",
    bytes: atlas.size,
    cells: ["flower", "coffee", "meal", "bakery", "convenience"],
  },
};
await writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
