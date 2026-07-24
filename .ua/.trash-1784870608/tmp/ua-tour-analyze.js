import fs from "node:fs";
import path from "node:path";

function fail(error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}

try {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    throw new Error("Usage: node ua-tour-analyze.js <input.json> <output.json>");
  }
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const nodes = input.nodes ?? [];
  const edges = input.edges ?? [];
  const layers = input.layers ?? [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const structuralEdges = edges.filter(
    (edge) => nodeById.has(edge.source) && nodeById.has(edge.target),
  );

  const incoming = new Map(nodes.map((node) => [node.id, new Set()]));
  const outgoing = new Map(nodes.map((node) => [node.id, new Set()]));
  for (const edge of structuralEdges) {
    incoming.get(edge.target).add(edge.source);
    outgoing.get(edge.source).add(edge.target);
  }
  const rank = (field, map) =>
    nodes
      .map((node) => ({
        id: node.id,
        [field]: map.get(node.id).size,
        name: node.name,
      }))
      .sort(
        (left, right) =>
          right[field] - left[field] || left.id.localeCompare(right.id),
      )
      .slice(0, 20);
  const fanInRanking = rank("fanIn", incoming);
  const fanOutRanking = rank("fanOut", outgoing);

  const fanInValues = nodes
    .map((node) => incoming.get(node.id).size)
    .sort((a, b) => a - b);
  const fanOutValues = nodes
    .map((node) => outgoing.get(node.id).size)
    .sort((a, b) => b - a);
  const lowFanIn =
    fanInValues[Math.max(0, Math.ceil(nodes.length * 0.25) - 1)] ?? 0;
  const highFanOut =
    fanOutValues[Math.max(0, Math.ceil(nodes.length * 0.1) - 1)] ?? 0;
  const codeEntryNames = new Set([
    "index.ts",
    "index.js",
    "main.ts",
    "main.js",
    "app.ts",
    "app.js",
    "server.ts",
    "server.js",
    "mod.rs",
    "main.go",
    "main.py",
    "main.rs",
    "manage.py",
    "app.py",
    "wsgi.py",
    "asgi.py",
    "run.py",
    "__main__.py",
    "Application.java",
    "Main.java",
    "Program.cs",
    "config.ru",
    "index.php",
    "App.swift",
    "Application.kt",
    "main.cpp",
    "main.c",
  ]);
  const entryPointCandidates = nodes
    .map((node) => {
      let score = 0;
      const filePath = (node.filePath ?? "").replaceAll("\\", "/");
      const filename = path.posix.basename(filePath);
      if (node.type === "file") {
        if (codeEntryNames.has(filename)) score += 3;
        if (filePath.split("/").length <= 2) score += 1;
        if (highFanOut > 0 && outgoing.get(node.id).size >= highFanOut) score += 1;
        if (incoming.get(node.id).size <= lowFanIn) score += 1;
      } else if (node.type === "document") {
        if (filePath === "README.md") score += 5;
        else if (!filePath.includes("/") && filename.endsWith(".md")) score += 2;
      }
      return {
        id: node.id,
        score,
        name: node.name,
        summary: node.summary,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.id.localeCompare(right.id),
    )
    .slice(0, 5);

  const bfsStart = entryPointCandidates.find(
    (candidate) => nodeById.get(candidate.id)?.type === "file",
  )?.id;
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of structuralEdges.filter(
    (edge) => edge.type === "imports" || edge.type === "calls",
  )) {
    adjacency.get(edge.source).push(edge.target);
  }
  for (const targets of adjacency.values()) targets.sort();
  const order = [];
  const depthMap = {};
  const byDepth = {};
  if (bfsStart) {
    const queue = [bfsStart];
    depthMap[bfsStart] = 0;
    while (queue.length > 0) {
      const current = queue.shift();
      const depth = depthMap[current];
      order.push(current);
      byDepth[String(depth)] ??= [];
      byDepth[String(depth)].push(current);
      for (const target of adjacency.get(current) ?? []) {
        if (depthMap[target] !== undefined) continue;
        depthMap[target] = depth + 1;
        queue.push(target);
      }
    }
  }

  const inventory = (node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    summary: node.summary,
  });
  const nonCodeFiles = {
    documentation: nodes
      .filter((node) => node.type === "document")
      .map(inventory),
    infrastructure: nodes
      .filter((node) =>
        ["service", "pipeline", "resource"].includes(node.type),
      )
      .map(inventory),
    data: nodes
      .filter((node) => ["table", "schema", "endpoint"].includes(node.type))
      .map(inventory),
    config: nodes.filter((node) => node.type === "config").map(inventory),
  };

  const coupled = structuralEdges.filter(
    (edge) => edge.type === "imports" || edge.type === "calls",
  );
  const relationKeys = new Set(
    coupled.map((edge) => `${edge.source}\u0000${edge.target}`),
  );
  const mutualPairs = [];
  for (const edge of coupled) {
    if (!relationKeys.has(`${edge.target}\u0000${edge.source}`)) continue;
    const pair = [edge.source, edge.target].sort();
    if (!mutualPairs.some((item) => item[0] === pair[0] && item[1] === pair[1])) {
      mutualPairs.push(pair);
    }
  }
  const neighbors = new Map(nodes.map((node) => [node.id, new Set()]));
  for (const edge of coupled) {
    neighbors.get(edge.source).add(edge.target);
    neighbors.get(edge.target).add(edge.source);
  }
  const clusterMap = new Map();
  for (const pair of mutualPairs) {
    const cluster = new Set(pair);
    while (cluster.size < 5) {
      const candidate = nodes
        .filter((node) => !cluster.has(node.id))
        .map((node) => ({
          id: node.id,
          connections: [...cluster].filter((member) =>
            neighbors.get(node.id).has(member),
          ).length,
        }))
        .filter((item) => item.connections >= 2)
        .sort(
          (left, right) =>
            right.connections - left.connections ||
            left.id.localeCompare(right.id),
        )[0];
      if (!candidate) break;
      cluster.add(candidate.id);
    }
    const clusterNodes = [...cluster].sort();
    const key = clusterNodes.join("\u0000");
    const edgeCount = structuralEdges.filter(
      (edge) => cluster.has(edge.source) && cluster.has(edge.target),
    ).length;
    clusterMap.set(key, { nodes: clusterNodes, edgeCount });
  }
  const clusters = [...clusterMap.values()]
    .sort(
      (left, right) =>
        right.edgeCount - left.edgeCount ||
        left.nodes.join().localeCompare(right.nodes.join()),
    )
    .slice(0, 10);

  const nodeSummaryIndex = Object.fromEntries(
    nodes.map((node) => [
      node.id,
      { name: node.name, type: node.type, summary: node.summary },
    ]),
  );
  const output = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal: { startNode: bfsStart ?? null, order, depthMap, byDepth },
    nonCodeFiles,
    clusters,
    layers: {
      count: layers.length,
      list: layers.map(({ id, name, description }) => ({
        id,
        name,
        description,
      })),
    },
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  process.exit(0);
} catch (error) {
  fail(error);
}
