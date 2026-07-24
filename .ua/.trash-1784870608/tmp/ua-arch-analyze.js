import fs from "node:fs";
import path from "node:path";

function fail(error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}

function commonDirectoryPrefix(filePaths) {
  const split = filePaths.map((filePath) => filePath.replaceAll("\\", "/").split("/"));
  if (split.length === 0) return [];
  const prefix = [];
  const shortest = Math.min(...split.map((parts) => parts.length - 1));
  for (let index = 0; index < shortest; index += 1) {
    const value = split[0][index];
    if (!split.every((parts) => parts[index] === value)) break;
    prefix.push(value);
  }
  return prefix;
}

function filePattern(filePath, nodeType) {
  const normalized = filePath.replaceAll("\\", "/");
  const name = path.posix.basename(normalized);
  const segments = normalized.split("/").map((segment) => segment.toLowerCase());
  if (nodeType === "pipeline" || normalized.startsWith(".github/workflows/")) return "ci-cd";
  if (nodeType === "document" || /\.(md|rst)$/i.test(name)) return "documentation";
  if (nodeType === "table" || nodeType === "schema" || /\.sql$/i.test(name)) return "data";
  if (nodeType === "config") return "config";
  if (/(\.test\.|\.spec\.)/i.test(name) || segments.some((segment) => ["test", "tests", "__tests__", "spec", "specs"].includes(segment))) {
    return "test";
  }
  if (/^(index\.(js|ts)|__init__\.py)$/i.test(name)) return "entry";
  if (["dockerfile", "makefile", "jenkinsfile"].includes(name.toLowerCase()) || /\.(tf|tfvars)$/i.test(name)) {
    return "infrastructure";
  }
  const patterns = [
    [["routes", "api", "controllers", "endpoints", "handlers", "serializers", "controller", "routers", "blueprints"], "api"],
    [["services", "core", "lib", "domain", "logic", "internal", "signals", "mailers", "jobs", "channels"], "service"],
    [["models", "db", "data", "persistence", "repository", "entities", "migrations", "sql", "database", "schema", "entity"], "data"],
    [["components", "views", "pages", "ui", "layouts", "screens"], "ui"],
    [["middleware", "plugins", "interceptors", "guards"], "middleware"],
    [["utils", "helpers", "common", "shared", "tools", "pkg", "templatetags"], "utility"],
    [["config", "constants", "env", "settings", "management", "commands"], "config"],
    [["types", "interfaces", "schemas", "contracts", "dtos", "dto", "request", "response"], "types"],
    [["hooks"], "hooks"],
    [["store", "state", "reducers", "actions", "slices"], "state"],
    [["assets", "static", "public"], "assets"],
    [["cmd", "bin"], "entry"],
    [["docs", "documentation", "wiki"], "documentation"],
    [["deploy", "deployment", "infra", "infrastructure", "k8s", "kubernetes", "helm", "charts", "terraform", "tf", "docker"], "infrastructure"],
    [[".github", ".gitlab", ".circleci"], "ci-cd"],
  ];
  for (const [names, label] of patterns) {
    if (segments.some((segment) => names.includes(segment))) return label;
  }
  return "unclassified";
}

try {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    throw new Error("Usage: node ua-arch-analyze.js <input.json> <output.json>");
  }
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const fileNodes = input.fileNodes ?? [];
  const importEdges = input.importEdges ?? [];
  const allEdges = input.allEdges ?? [];
  const nodeById = new Map(fileNodes.map((node) => [node.id, node]));
  const prefix = commonDirectoryPrefix(fileNodes.map((node) => node.filePath));

  const groupForPath = (filePath) => {
    const parts = filePath.replaceAll("\\", "/").split("/");
    const remaining = parts.slice(prefix.length);
    if (remaining.length <= 1) return "root";
    return remaining[0] || "root";
  };
  const groupById = new Map(
    fileNodes.map((node) => [node.id, groupForPath(node.filePath)]),
  );
  const directoryGroups = {};
  for (const node of fileNodes) {
    const group = groupById.get(node.id);
    directoryGroups[group] ??= [];
    directoryGroups[group].push(node.id);
  }
  for (const ids of Object.values(directoryGroups)) ids.sort();

  const nodeTypeGroups = {};
  for (const node of fileNodes) {
    nodeTypeGroups[node.type] ??= [];
    nodeTypeGroups[node.type].push(node.id);
  }
  for (const ids of Object.values(nodeTypeGroups)) ids.sort();

  const incoming = new Map(fileNodes.map((node) => [node.id, new Set()]));
  const outgoing = new Map(fileNodes.map((node) => [node.id, new Set()]));
  const groupImportsFrom = new Map(Object.keys(directoryGroups).map((group) => [group, new Set()]));
  const groupImportedBy = new Map(Object.keys(directoryGroups).map((group) => [group, new Set()]));
  const interGroupCounts = new Map();
  for (const edge of importEdges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
    incoming.get(edge.target).add(edge.source);
    outgoing.get(edge.source).add(edge.target);
    const from = groupById.get(edge.source);
    const to = groupById.get(edge.target);
    if (from !== to) {
      groupImportsFrom.get(from).add(to);
      groupImportedBy.get(to).add(from);
      const key = `${from}\u0000${to}`;
      interGroupCounts.set(key, (interGroupCounts.get(key) ?? 0) + 1);
    }
  }

  const directoryDependencies = Object.fromEntries(
    Object.keys(directoryGroups).map((group) => [
      group,
      {
        importsFrom: [...groupImportsFrom.get(group)].sort(),
        importedBy: [...groupImportedBy.get(group)].sort(),
      },
    ]),
  );
  const interGroupImports = [...interGroupCounts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("\u0000");
      return { from, to, count };
    })
    .sort((left, right) => right.count - left.count || left.from.localeCompare(right.from) || left.to.localeCompare(right.to));

  const intraGroupDensity = {};
  for (const group of Object.keys(directoryGroups)) {
    let internalEdges = 0;
    let totalEdges = 0;
    for (const edge of importEdges) {
      const from = groupById.get(edge.source);
      const to = groupById.get(edge.target);
      if (from === group || to === group) totalEdges += 1;
      if (from === group && to === group) internalEdges += 1;
    }
    intraGroupDensity[group] = {
      internalEdges,
      totalEdges,
      density: totalEdges === 0 ? 0 : Number((internalEdges / totalEdges).toFixed(4)),
    };
  }

  const crossCategoryMap = new Map();
  const nonCodeConnections = {};
  for (const edge of allEdges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;
    const key = `${source.type}\u0000${target.type}\u0000${edge.type}`;
    crossCategoryMap.set(key, (crossCategoryMap.get(key) ?? 0) + 1);
    if (source.type !== "file") {
      nonCodeConnections[source.id] ??= [];
      nonCodeConnections[source.id].push({
        target: target.id,
        edgeType: edge.type,
      });
    }
  }
  const crossCategoryEdges = [...crossCategoryMap.entries()]
    .map(([key, count]) => {
      const [fromType, toType, edgeType] = key.split("\u0000");
      return { fromType, toType, edgeType, count };
    })
    .sort((left, right) => right.count - left.count || left.fromType.localeCompare(right.fromType));

  const patternMatches = {};
  for (const [group, ids] of Object.entries(directoryGroups)) {
    const labels = ids.map((id) => filePattern(nodeById.get(id).filePath, nodeById.get(id).type));
    const counts = new Map();
    for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
    patternMatches[group] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  }
  const filePatternMatches = Object.fromEntries(
    fileNodes.map((node) => [node.id, filePattern(node.filePath, node.type)]),
  );

  const normalizedPaths = fileNodes.map((node) => node.filePath.replaceAll("\\", "/"));
  const infraFiles = fileNodes
    .filter((node) => ["service", "pipeline", "resource"].includes(node.type) || ["infrastructure", "ci-cd"].includes(filePatternMatches[node.id]))
    .map((node) => node.filePath)
    .sort();
  const deploymentTopology = {
    hasDockerfile: normalizedPaths.some((filePath) => /^(.+\/)?Dockerfile(?:\..+)?$/.test(filePath)),
    hasCompose: normalizedPaths.some((filePath) => /(^|\/)(docker-compose\.(yml|yaml)|compose\.(yml|yaml))$/.test(filePath)),
    hasK8s: normalizedPaths.some((filePath) => /(^|\/)(k8s|kubernetes|helm|charts)\//.test(filePath)),
    hasTerraform: normalizedPaths.some((filePath) => /\.(tf|tfvars)$/.test(filePath)),
    hasCI: fileNodes.some((node) => node.type === "pipeline" || filePatternMatches[node.id] === "ci-cd"),
    infraFiles,
  };

  const dataPipeline = {
    schemaFiles: fileNodes
      .filter((node) => ["schema", "table"].includes(node.type) || /\.(graphql|gql|proto|prisma)$/.test(node.filePath))
      .map((node) => node.filePath)
      .sort(),
    migrationFiles: [...new Set(fileNodes.filter((node) => /(^|\/)migrations\/|\.sql$/.test(node.filePath)).map((node) => node.filePath))].sort(),
    dataModelFiles: fileNodes
      .filter((node) => node.tags?.some((tag) => ["data-model", "repository", "shared-contract"].includes(tag)))
      .map((node) => node.filePath)
      .sort(),
    apiHandlerFiles: fileNodes
      .filter((node) => node.tags?.some((tag) => ["api-handler", "middleware"].includes(tag)) || /(^|\/)(routes?|handlers?|controllers?)\//.test(node.filePath))
      .map((node) => node.filePath)
      .sort(),
  };

  const documentedGroups = new Set();
  for (const node of fileNodes.filter((node) => node.type === "document")) {
    documentedGroups.add(groupForPath(node.filePath));
  }
  for (const edge of allEdges.filter((edge) => edge.type === "documents")) {
    const targetGroup = groupById.get(edge.target);
    if (targetGroup) documentedGroups.add(targetGroup);
  }
  const groupNames = Object.keys(directoryGroups);
  const docCoverage = {
    groupsWithDocs: groupNames.filter((group) => documentedGroups.has(group)).length,
    totalGroups: groupNames.length,
    coverageRatio: groupNames.length === 0 ? 0 : Number((groupNames.filter((group) => documentedGroups.has(group)).length / groupNames.length).toFixed(4)),
    undocumentedGroups: groupNames.filter((group) => !documentedGroups.has(group)).sort(),
  };

  const dependencyDirection = [];
  const unorderedPairs = new Set();
  for (const item of interGroupImports) {
    const pair = [item.from, item.to].sort();
    unorderedPairs.add(pair.join("\u0000"));
  }
  for (const pairKey of unorderedPairs) {
    const [left, right] = pairKey.split("\u0000");
    const leftToRight = interGroupCounts.get(`${left}\u0000${right}`) ?? 0;
    const rightToLeft = interGroupCounts.get(`${right}\u0000${left}`) ?? 0;
    if (leftToRight === rightToLeft) continue;
    dependencyDirection.push(
      leftToRight > rightToLeft
        ? { dependent: left, dependsOn: right, count: leftToRight }
        : { dependent: right, dependsOn: left, count: rightToLeft },
    );
  }
  dependencyDirection.sort((left, right) => right.count - left.count || left.dependent.localeCompare(right.dependent));

  const output = {
    scriptCompleted: true,
    commonPathPrefix: prefix.join("/"),
    directoryGroups,
    nodeTypeGroups,
    directoryDependencies,
    crossCategoryEdges,
    nonCodeConnections,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    filePatternMatches,
    deploymentTopology,
    dataPipeline,
    docCoverage,
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup: Object.fromEntries(Object.entries(directoryGroups).map(([group, ids]) => [group, ids.length])),
      nodeTypeCounts: Object.fromEntries(Object.entries(nodeTypeGroups).map(([type, ids]) => [type, ids.length])),
    },
    fileFanIn: Object.fromEntries(fileNodes.map((node) => [node.id, incoming.get(node.id).size])),
    fileFanOut: Object.fromEntries(fileNodes.map((node) => [node.id, outgoing.get(node.id).size])),
    fileIndex: Object.fromEntries(
      fileNodes.map((node) => [
        node.id,
        {
          filePath: node.filePath,
          type: node.type,
          summary: node.summary,
          tags: node.tags,
          pattern: filePatternMatches[node.id],
          directoryGroup: groupById.get(node.id),
        },
      ]),
    ),
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  process.exit(0);
} catch (error) {
  fail(error);
}
