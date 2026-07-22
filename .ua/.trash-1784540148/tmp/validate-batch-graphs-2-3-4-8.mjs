import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const uaDir = path.join(projectRoot, ".ua");
const selected = new Set([2, 3, 4, 8]);
const batches = JSON.parse(
  fs.readFileSync(path.join(uaDir, "intermediate", "batches.json"), "utf8"),
).batches.filter((batch) => selected.has(batch.batchIndex));
const nodeTypes = new Set([
  "file",
  "function",
  "class",
  "config",
  "document",
  "service",
  "table",
  "endpoint",
  "pipeline",
  "schema",
  "resource",
]);
const edgeWeights = new Map([
  ["contains", 1.0],
  ["imports", 0.7],
  ["calls", 0.8],
  ["inherits", 0.9],
  ["implements", 0.9],
  ["exports", 0.8],
  ["depends_on", 0.6],
  ["tested_by", 0.5],
  ["configures", 0.6],
  ["documents", 0.5],
  ["deploys", 0.7],
  ["migrates", 0.7],
  ["triggers", 0.6],
  ["defines_schema", 0.8],
  ["serves", 0.7],
  ["provisions", 0.7],
  ["routes", 0.6],
  ["related", 0.5],
]);

for (const batch of batches) {
  const outputPath = path.join(
    uaDir,
    "intermediate",
    `batch-${batch.batchIndex}.json`,
  );
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
    throw new Error(`batch ${batch.batchIndex}: output missing or empty`);
  }

  const graph = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error(`batch ${batch.batchIndex}: nodes/edges array missing`);
  }
  if (graph.nodes.length > 60 || graph.edges.length > 120) {
    throw new Error(`batch ${batch.batchIndex}: multipart threshold exceeded`);
  }

  const nodeIds = new Set();
  for (const node of graph.nodes) {
    if (
      !node.id ||
      !nodeTypes.has(node.type) ||
      !node.name ||
      !node.summary ||
      !Array.isArray(node.tags) ||
      node.tags.length < 3 ||
      !["simple", "moderate", "complex"].includes(node.complexity)
    ) {
      throw new Error(`batch ${batch.batchIndex}: malformed node ${JSON.stringify(node)}`);
    }
    if (!/[가-힣]/.test(node.summary)) {
      throw new Error(`batch ${batch.batchIndex}: non-Korean summary ${node.id}`);
    }
    if (node.languageNotes && !/[가-힣]/.test(node.languageNotes)) {
      throw new Error(`batch ${batch.batchIndex}: non-Korean languageNotes ${node.id}`);
    }
    if (nodeIds.has(node.id)) {
      throw new Error(`batch ${batch.batchIndex}: duplicate node ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  const expectedFileIds = new Set(batch.files.map((file) => `file:${file.path}`));
  for (const fileId of expectedFileIds) {
    if (!nodeIds.has(fileId)) {
      throw new Error(`batch ${batch.batchIndex}: missing file node ${fileId}`);
    }
  }

  const allowedFilePaths = new Set();
  for (const values of Object.values(batch.batchImportData)) {
    for (const filePath of values) allowedFilePaths.add(filePath);
  }
  const allowedSymbols = new Set();
  for (const neighbors of Object.values(batch.neighborMap)) {
    for (const neighbor of neighbors) {
      allowedFilePaths.add(neighbor.path);
      for (const symbol of neighbor.symbols) {
        allowedSymbols.add(`function:${neighbor.path}:${symbol}`);
        allowedSymbols.add(`class:${neighbor.path}:${symbol}`);
      }
    }
  }

  for (const item of graph.edges) {
    if (
      item.direction !== "forward" ||
      !edgeWeights.has(item.type) ||
      item.weight !== edgeWeights.get(item.type)
    ) {
      throw new Error(`batch ${batch.batchIndex}: malformed edge ${JSON.stringify(item)}`);
    }
    if (item.source === item.target) {
      throw new Error(`batch ${batch.batchIndex}: self edge ${item.source}`);
    }
    for (const endpoint of [item.source, item.target]) {
      if (nodeIds.has(endpoint)) continue;
      if (endpoint.startsWith("file:") && allowedFilePaths.has(endpoint.slice(5))) continue;
      if (
        (endpoint.startsWith("function:") || endpoint.startsWith("class:")) &&
        allowedSymbols.has(endpoint)
      ) {
        continue;
      }
      throw new Error(
        `batch ${batch.batchIndex}: unresolved ${endpoint} in ${item.source} -> ${item.target}`,
      );
    }
  }

  let expectedImports = 0;
  for (const file of batch.files) {
    const source = `file:${file.path}`;
    const expectedTargets = batch.batchImportData[file.path] ?? [];
    expectedImports += expectedTargets.length;
    const actualTargets = graph.edges
      .filter((item) => item.type === "imports" && item.source === source)
      .map((item) => item.target.slice(5));
    if (JSON.stringify(actualTargets) !== JSON.stringify(expectedTargets)) {
      throw new Error(`batch ${batch.batchIndex}: import mismatch for ${file.path}`);
    }
  }

  const actualImports = graph.edges.filter((item) => item.type === "imports").length;
  if (actualImports !== expectedImports) {
    throw new Error(`batch ${batch.batchIndex}: import total mismatch`);
  }

  const skipped = JSON.parse(
    fs.readFileSync(
      path.join(uaDir, "tmp", `ua-file-extract-results-${batch.batchIndex}.json`),
      "utf8",
    ),
  ).filesSkipped;
  console.log(
    JSON.stringify({
      batchIndex: batch.batchIndex,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      imports: actualImports,
      skipped,
      bytes: fs.statSync(outputPath).size,
    }),
  );
}
