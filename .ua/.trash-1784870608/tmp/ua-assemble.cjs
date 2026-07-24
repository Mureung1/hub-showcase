#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const projectRoot = process.argv[2];
const gitCommitHash = process.argv[3];
const uaDir = path.join(projectRoot, ".ua");
const intermediate = path.join(uaDir, "intermediate");

const readJson = (name) =>
  JSON.parse(fs.readFileSync(path.join(intermediate, name), "utf8"));

const scan = readJson("scan-result.json");
const assembled = readJson("assembled-graph.json");
const layers = readJson("layers.json");
const tour = readJson("tour.json");
const nodeIds = new Set(assembled.nodes.map((node) => node.id));

if (!Array.isArray(layers)) throw new Error("layers.json is not an array");
if (!Array.isArray(tour)) throw new Error("tour.json is not an array");

for (const layer of layers) {
  for (const field of ["id", "name", "description", "nodeIds"]) {
    if (layer[field] === undefined) throw new Error(`Layer missing ${field}`);
  }
  if (!Array.isArray(layer.nodeIds)) throw new Error(`Layer ${layer.id} nodeIds is not an array`);
  for (const id of layer.nodeIds) {
    if (!nodeIds.has(id)) throw new Error(`Layer ${layer.id} references missing node ${id}`);
  }
}

for (const step of tour) {
  for (const field of ["order", "title", "description", "nodeIds"]) {
    if (step[field] === undefined) throw new Error(`Tour step missing ${field}`);
  }
  if (!Array.isArray(step.nodeIds)) throw new Error(`Tour step ${step.order} nodeIds is not an array`);
  for (const id of step.nodeIds) {
    if (!nodeIds.has(id)) throw new Error(`Tour step ${step.order} references missing node ${id}`);
  }
}

const graph = {
  version: "1.0.0",
  project: {
    name: scan.name,
    languages: scan.languages,
    frameworks: scan.frameworks,
    description: scan.description,
    analyzedAt: new Date().toISOString(),
    gitCommitHash,
  },
  nodes: assembled.nodes,
  edges: assembled.edges,
  layers,
  tour,
};

fs.writeFileSync(
  path.join(intermediate, "assembled-graph.json"),
  JSON.stringify(graph, null, 2) + "\n",
);
