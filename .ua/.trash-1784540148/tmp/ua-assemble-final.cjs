const fs = require("fs");
const path = require("path");

const projectRoot = process.argv[2];
const uaDir = path.join(projectRoot, ".ua");
const intermediate = path.join(uaDir, "intermediate");

const readJson = (file) =>
  JSON.parse(fs.readFileSync(path.join(intermediate, file), "utf8"));

const graph = readJson("assembled-graph.json");
const scan = readJson("scan-result.json");
const rawLayers = readJson("layers.json");
const rawTour = readJson("tour.json");
const layersInput = Array.isArray(rawLayers) ? rawLayers : rawLayers.layers || [];
const tourInput = Array.isArray(rawTour) ? rawTour : rawTour.steps || [];
const nodeIds = new Set(graph.nodes.map((node) => node.id));
const knownPrefixes = [
  "file:",
  "config:",
  "document:",
  "service:",
  "pipeline:",
  "table:",
  "schema:",
  "resource:",
  "endpoint:",
];

const normalizeId = (value) => {
  if (knownPrefixes.some((prefix) => value.startsWith(prefix))) return value;
  return `file:${value}`;
};

const layers = layersInput
  .map((layer) => {
    const sourceIds = layer.nodeIds || layer.nodes || [];
    const normalizedIds = sourceIds
      .map((entry) => normalizeId(typeof entry === "string" ? entry : entry.id))
      .filter((id) => nodeIds.has(id));
    const fallbackId = `layer:${String(layer.name || "unnamed")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-|-$/g, "")}`;
    return {
      id: layer.id || fallbackId,
      name: layer.name || "이름 없는 레이어",
      description: layer.description || "레이어 설명이 없습니다.",
      nodeIds: normalizedIds,
    };
  })
  .filter((layer) => layer.nodeIds.length > 0);

const tour = tourInput
  .map((step, index) => {
    const sourceIds = step.nodeIds || step.nodesToInspect || [];
    const normalized = {
      order: Number.isInteger(step.order) ? step.order : index + 1,
      title: step.title || `학습 단계 ${index + 1}`,
      description:
        step.description || step.whyItMatters || "이 단계의 설명이 없습니다.",
      nodeIds: sourceIds.map(normalizeId).filter((id) => nodeIds.has(id)),
    };
    if (typeof step.languageLesson === "string" && step.languageLesson) {
      normalized.languageLesson = step.languageLesson;
    }
    return normalized;
  })
  .filter((step) => step.nodeIds.length > 0)
  .sort((a, b) => a.order - b.order)
  .map((step, index) => ({ ...step, order: index + 1 }));

const finalGraph = {
  version: "1.0.0",
  project: {
    name: scan.name,
    languages: scan.languages,
    frameworks: scan.frameworks,
    description: scan.description,
    analyzedAt: new Date().toISOString(),
    gitCommitHash: process.argv[3],
  },
  nodes: graph.nodes,
  edges: graph.edges,
  layers,
  tour,
};

fs.writeFileSync(
  path.join(intermediate, "assembled-graph.json"),
  `${JSON.stringify(finalGraph, null, 2)}\n`,
);

