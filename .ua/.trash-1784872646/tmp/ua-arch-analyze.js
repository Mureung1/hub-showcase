import fs from "node:fs";

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  fail("Usage: node ua-arch-analyze.js <input.json> <output.json>");
}

try {
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const fileNodes = input.fileNodes ?? [];
  const importEdges = input.importEdges ?? [];
  const allEdges = input.allEdges ?? [];
  const nodeById = new Map(fileNodes.map((node) => [node.id, node]));

  const pathSegments = fileNodes.map((node) =>
    String(node.filePath ?? node.name ?? "").split("/").filter(Boolean),
  );
  let commonPrefix = pathSegments.length ? [...pathSegments[0]] : [];
  for (const segments of pathSegments.slice(1)) {
    let index = 0;
    while (
      index < commonPrefix.length &&
      index < segments.length &&
      commonPrefix[index] === segments[index]
    ) {
      index += 1;
    }
    commonPrefix = commonPrefix.slice(0, index);
  }
  if (
    pathSegments.some((segments) => segments.length === commonPrefix.length)
  ) {
    commonPrefix = commonPrefix.slice(
      0,
      Math.max(0, commonPrefix.length - 1),
    );
  }

  function directoryGroup(node) {
    const segments = String(node.filePath ?? node.name ?? "")
      .split("/")
      .filter(Boolean);
    const remaining = segments.slice(commonPrefix.length);
    if (remaining.length <= 1) return "root";
    return remaining[0];
  }

  const groupByNode = new Map();
  const directoryGroups = {};
  const nodeTypeGroups = {};
  for (const node of fileNodes) {
    const group = directoryGroup(node);
    groupByNode.set(node.id, group);
    (directoryGroups[group] ??= []).push(node.id);
    (nodeTypeGroups[node.type] ??= []).push(node.id);
  }

  const fileFanIn = Object.fromEntries(fileNodes.map((node) => [node.id, 0]));
  const fileFanOut = Object.fromEntries(fileNodes.map((node) => [node.id, 0]));
  const adjacency = Object.fromEntries(fileNodes.map((node) => [node.id, []]));
  const interCounts = new Map();
  const groupImports = {};
  const groupImportedBy = {};
  for (const group of Object.keys(directoryGroups)) {
    groupImports[group] = new Set();
    groupImportedBy[group] = new Set();
  }

  for (const edge of importEdges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
    fileFanOut[edge.source] += 1;
    fileFanIn[edge.target] += 1;
    adjacency[edge.source].push(edge.target);
    const from = groupByNode.get(edge.source);
    const to = groupByNode.get(edge.target);
    if (from !== to) {
      const key = `${from}\u0000${to}`;
      interCounts.set(key, (interCounts.get(key) ?? 0) + 1);
      groupImports[from].add(to);
      groupImportedBy[to].add(from);
    }
  }

  const interGroupImports = [...interCounts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("\u0000");
      return { from, to, count };
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.from.localeCompare(b.from) ||
        a.to.localeCompare(b.to),
    );

  const intraGroupDensity = {};
  for (const group of Object.keys(directoryGroups)) {
    let internalEdges = 0;
    let totalEdges = 0;
    for (const edge of importEdges) {
      const from = groupByNode.get(edge.source);
      const to = groupByNode.get(edge.target);
      if (from === group || to === group) {
        totalEdges += 1;
        if (from === group && to === group) internalEdges += 1;
      }
    }
    intraGroupDensity[group] = {
      internalEdges,
      totalEdges,
      density: totalEdges ? Number((internalEdges / totalEdges).toFixed(4)) : 0,
    };
  }

  const crossCategoryMap = new Map();
  for (const edge of allEdges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;
    const key = `${source.type}\u0000${target.type}\u0000${edge.type}`;
    crossCategoryMap.set(key, (crossCategoryMap.get(key) ?? 0) + 1);
  }
  const crossCategoryEdges = [...crossCategoryMap.entries()]
    .map(([key, count]) => {
      const [fromType, toType, edgeType] = key.split("\u0000");
      return { fromType, toType, edgeType, count };
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.fromType.localeCompare(b.fromType) ||
        a.toType.localeCompare(b.toType) ||
        a.edgeType.localeCompare(b.edgeType),
    );

  const patternTable = [
    [/^(routes?|api|controllers?|endpoints?|handlers?|serializers?)$/i, "api"],
    [/^(services?|core|lib|domain|logic|internal|signals|jobs|channels)$/i, "service"],
    [/^(models?|db|data|persistence|repository|entities|entity|migrations?|sql|database|schema)$/i, "data"],
    [/^(components?|views?|pages?|ui|layouts?|screens?)$/i, "ui"],
    [/^(middleware|plugins?|interceptors?|guards?)$/i, "middleware"],
    [/^(utils?|helpers?|common|shared|tools|pkg)$/i, "utility"],
    [/^(config|constants?|env|settings|management|commands)$/i, "config"],
    [/^(__tests__|tests?|specs?)$/i, "test"],
    [/^(types?|interfaces?|schemas?|contracts?|dtos?|dto|request|response)$/i, "types"],
    [/^hooks$/i, "hooks"],
    [/^(store|state|reducers?|actions?|slices)$/i, "state"],
    [/^(assets?|static|public)$/i, "assets"],
    [/^(docs|documentation|wiki)$/i, "documentation"],
    [/^(\.github|\.gitlab|\.circleci)$/i, "ci-cd"],
    [/^(deploy|deployment|infra|infrastructure|k8s|kubernetes|helm|charts|terraform|tf|docker)$/i, "infrastructure"],
    [/^(cmd|bin)$/i, "entry"],
  ];
  const patternMatches = {};
  for (const group of Object.keys(directoryGroups)) {
    const match = patternTable.find(([pattern]) => pattern.test(group));
    patternMatches[group] = match ? match[1] : "unclassified";
  }

  const paths = fileNodes.map((node) => node.filePath ?? "");
  const deploymentTopology = {
    hasDockerfile: paths.some((value) =>
      /(^|\/)Dockerfile(?:\.|$)/i.test(value),
    ),
    hasCompose: paths.some((value) =>
      /(^|\/)(docker-)?compose\.ya?ml$/i.test(value),
    ),
    hasK8s: paths.some((value) =>
      /(^|\/)(k8s|kubernetes|helm|charts)(\/|$)/i.test(value),
    ),
    hasTerraform: paths.some((value) => /\.tf(?:vars)?$/i.test(value)),
    hasCI: paths.some((value) =>
      /(^|\/)(\.github\/workflows|\.gitlab-ci\.yml|Jenkinsfile|\.circleci\/)/i.test(
        value,
      ),
    ),
    infraFiles: fileNodes
      .filter((node) =>
        ["service", "resource", "pipeline"].includes(node.type),
      )
      .map((node) => node.filePath)
      .sort(),
  };

  const dataPipeline = {
    schemaFiles: fileNodes
      .filter(
        (node) =>
          ["schema", "endpoint"].includes(node.type) ||
          /\.(graphql|gql|proto|prisma)$/i.test(node.filePath ?? ""),
      )
      .map((node) => node.filePath),
    migrationFiles: [
      ...new Set(
        fileNodes
          .filter(
            (node) =>
              node.type === "table" ||
              /(^|\/)migrations?(\/|$)/i.test(node.filePath ?? ""),
          )
          .map((node) => node.filePath),
      ),
    ].sort(),
    dataModelFiles: fileNodes
      .filter(
        (node) =>
          node.type === "file" &&
          (/repository|models?|entities|data/i.test(node.filePath ?? "") ||
            (node.tags ?? []).some((tag) =>
              ["repository", "data-model", "data-access"].includes(tag),
            )),
      )
      .map((node) => node.filePath)
      .sort(),
    apiHandlerFiles: fileNodes
      .filter(
        (node) =>
          node.type === "file" &&
          (/routes?|controllers?|handlers?|apps\/api/i.test(
            node.filePath ?? "",
          ) ||
            (node.tags ?? []).includes("api-handler")),
      )
      .map((node) => node.filePath)
      .sort(),
  };

  const documentedGroups = new Set();
  for (const node of fileNodes) {
    if (node.type === "document") documentedGroups.add(groupByNode.get(node.id));
  }
  for (const edge of allEdges) {
    if (edge.type !== "documents") continue;
    const targetGroup = groupByNode.get(edge.target);
    if (targetGroup) documentedGroups.add(targetGroup);
  }
  const groups = Object.keys(directoryGroups);
  const docCoverage = {
    groupsWithDocs: documentedGroups.size,
    totalGroups: groups.length,
    coverageRatio: groups.length
      ? Number((documentedGroups.size / groups.length).toFixed(4))
      : 0,
    undocumentedGroups: groups
      .filter((group) => !documentedGroups.has(group))
      .sort(),
  };

  const pairNames = new Set();
  for (const item of interGroupImports) {
    pairNames.add([item.from, item.to].sort().join("\u0000"));
  }
  const dependencyDirection = [];
  for (const pair of pairNames) {
    const [a, b] = pair.split("\u0000");
    const aToB = interCounts.get(`${a}\u0000${b}`) ?? 0;
    const bToA = interCounts.get(`${b}\u0000${a}`) ?? 0;
    if (aToB === bToA) {
      dependencyDirection.push({
        dependent: a,
        dependsOn: b,
        forwardCount: aToB,
        reverseCount: bToA,
        tied: true,
      });
    } else {
      dependencyDirection.push({
        dependent: aToB > bToA ? a : b,
        dependsOn: aToB > bToA ? b : a,
        forwardCount: Math.max(aToB, bToA),
        reverseCount: Math.min(aToB, bToA),
      });
    }
  }
  dependencyDirection.sort(
    (a, b) =>
      b.forwardCount - a.forwardCount ||
      a.dependent.localeCompare(b.dependent),
  );

  const directoryDependency = {};
  for (const group of groups) {
    directoryDependency[group] = {
      importsFrom: [...groupImports[group]].sort(),
      importedBy: [...groupImportedBy[group]].sort(),
    };
  }

  const result = {
    scriptCompleted: true,
    commonPrefix: commonPrefix.join("/"),
    directoryGroups,
    nodeTypeGroups,
    importAdjacency: adjacency,
    directoryDependency,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    deploymentTopology,
    dataPipeline,
    docCoverage,
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup: Object.fromEntries(
        Object.entries(directoryGroups).map(([group, ids]) => [
          group,
          ids.length,
        ]),
      ),
      nodeTypeCounts: Object.fromEntries(
        Object.entries(nodeTypeGroups).map(([type, ids]) => [type, ids.length]),
      ),
    },
    fileFanIn,
    fileFanOut,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  fail(error.stack ?? String(error));
}
