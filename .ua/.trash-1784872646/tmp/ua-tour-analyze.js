import fs from "node:fs";

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  fail("Usage: node ua-tour-analyze.js <input.json> <output.json>");
}

try {
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const nodes = input.nodes ?? [];
  const edges = input.edges ?? [];
  const layers = input.layers ?? [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const fanIn = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  const fanOut = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (edge.source in fanOut) fanOut[edge.source] += 1;
    if (edge.target in fanIn) fanIn[edge.target] += 1;
  }

  const ranking = (counts, field) =>
    nodes
      .map((node) => ({
        id: node.id,
        [field]: counts[node.id] ?? 0,
        name: node.name,
      }))
      .sort(
        (a, b) =>
          b[field] - a[field] ||
          String(a.id).localeCompare(String(b.id)),
      )
      .slice(0, 20);

  const fanInRanking = ranking(fanIn, "fanIn");
  const fanOutRanking = ranking(fanOut, "fanOut");
  const fanOutValues = nodes
    .map((node) => fanOut[node.id] ?? 0)
    .sort((a, b) => a - b);
  const fanInValues = nodes
    .map((node) => fanIn[node.id] ?? 0)
    .sort((a, b) => a - b);
  const highFanOutCutoff =
    fanOutValues[Math.max(0, Math.floor(fanOutValues.length * 0.9))] ?? 0;
  const lowFanInCutoff =
    fanInValues[Math.max(0, Math.floor(fanInValues.length * 0.25))] ?? 0;
  const entryNames = new Set([
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
      const filePath = node.filePath ?? "";
      const segments = filePath.split("/").filter(Boolean);
      if (node.type === "file") {
        if (entryNames.has(node.name)) score += 3;
        if (segments.length <= 2) score += 1;
        if ((fanOut[node.id] ?? 0) >= highFanOutCutoff) score += 1;
        if ((fanIn[node.id] ?? 0) <= lowFanInCutoff) score += 1;
      } else if (node.type === "document") {
        if (filePath === "README.md") score += 5;
        else if (segments.length === 1 && /\.md$/i.test(filePath)) score += 2;
      }
      return {
        id: node.id,
        score,
        name: node.name,
        summary: node.summary,
        type: node.type,
      };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(a.id).localeCompare(String(b.id)),
    )
    .slice(0, 5);

  const codeEntry =
    entryPointCandidates.find((candidate) => candidate.type === "file") ??
    nodes.find(
      (node) => node.type === "file" && entryNames.has(node.name),
    );
  const traversableTypes = new Set(["imports", "calls"]);
  const forward = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (
      traversableTypes.has(edge.type) &&
      forward.has(edge.source) &&
      nodeById.has(edge.target)
    ) {
      forward.get(edge.source).push(edge.target);
    }
  }
  for (const targets of forward.values()) {
    targets.sort((a, b) => a.localeCompare(b));
  }

  const bfsTraversal = {
    startNode: codeEntry?.id ?? null,
    order: [],
    depthMap: {},
    byDepth: {},
  };
  if (codeEntry?.id) {
    const queue = [codeEntry.id];
    bfsTraversal.depthMap[codeEntry.id] = 0;
    while (queue.length) {
      const current = queue.shift();
      const depth = bfsTraversal.depthMap[current];
      bfsTraversal.order.push(current);
      (bfsTraversal.byDepth[String(depth)] ??= []).push(current);
      for (const target of forward.get(current) ?? []) {
        if (target in bfsTraversal.depthMap) continue;
        bfsTraversal.depthMap[target] = depth + 1;
        queue.push(target);
      }
    }
  }

  const nonCodeFiles = {
    documentation: [],
    infrastructure: [],
    data: [],
    config: [],
  };
  for (const node of nodes) {
    const item = {
      id: node.id,
      name: node.name,
      type: node.type,
      summary: node.summary,
    };
    if (node.type === "document") nonCodeFiles.documentation.push(item);
    else if (["service", "pipeline", "resource"].includes(node.type)) {
      nonCodeFiles.infrastructure.push(item);
    } else if (["table", "schema", "endpoint"].includes(node.type)) {
      nonCodeFiles.data.push(item);
    } else if (node.type === "config") {
      nonCodeFiles.config.push(item);
    }
  }
  for (const items of Object.values(nonCodeFiles)) {
    items.sort((a, b) => a.id.localeCompare(b.id));
  }

  const mutualTypes = new Set(["imports", "calls"]);
  const connectionTypes = new Map();
  for (const edge of edges) {
    if (!mutualTypes.has(edge.type)) continue;
    connectionTypes.set(
      `${edge.source}\u0000${edge.target}\u0000${edge.type}`,
      true,
    );
  }
  const mutualPairs = [];
  for (const edge of edges) {
    if (!mutualTypes.has(edge.type)) continue;
    if (
      connectionTypes.has(
        `${edge.target}\u0000${edge.source}\u0000${edge.type}`,
      ) &&
      edge.source.localeCompare(edge.target) < 0
    ) {
      mutualPairs.push([edge.source, edge.target]);
    }
  }

  const clusters = [];
  const usedSeeds = new Set();
  for (const [left, right] of mutualPairs) {
    const seed = `${left}\u0000${right}`;
    if (usedSeeds.has(seed)) continue;
    usedSeeds.add(seed);
    const cluster = new Set([left, right]);
    let expanded = true;
    while (expanded && cluster.size < 5) {
      expanded = false;
      for (const node of nodes) {
        if (cluster.has(node.id)) continue;
        let connections = 0;
        for (const member of cluster) {
          if (
            connectionTypes.has(`${node.id}\u0000${member}\u0000imports`) ||
            connectionTypes.has(`${member}\u0000${node.id}\u0000imports`) ||
            connectionTypes.has(`${node.id}\u0000${member}\u0000calls`) ||
            connectionTypes.has(`${member}\u0000${node.id}\u0000calls`)
          ) {
            connections += 1;
          }
        }
        if (connections >= 2) {
          cluster.add(node.id);
          expanded = true;
          if (cluster.size >= 5) break;
        }
      }
    }
    const members = [...cluster].sort();
    let edgeCount = 0;
    for (const edge of edges) {
      if (members.includes(edge.source) && members.includes(edge.target)) {
        edgeCount += 1;
      }
    }
    clusters.push({ nodes: members, edgeCount });
  }
  clusters.sort(
    (a, b) =>
      b.edgeCount - a.edgeCount ||
      a.nodes.join("|").localeCompare(b.nodes.join("|")),
  );

  const nodeSummaryIndex = Object.fromEntries(
    nodes.map((node) => [
      node.id,
      {
        name: node.name,
        type: node.type,
        summary: node.summary,
      },
    ]),
  );

  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal,
    nonCodeFiles,
    clusters: clusters.slice(0, 10),
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

  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  fail(error.stack ?? String(error));
}
