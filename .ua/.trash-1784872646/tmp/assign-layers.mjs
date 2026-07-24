import fs from "node:fs";

const analysis = JSON.parse(
  fs.readFileSync(".ua/tmp/ua-arch-results.json", "utf8"),
);

const typeById = new Map();
for (const [type, ids] of Object.entries(analysis.nodeTypeGroups)) {
  for (const id of ids) typeById.set(id, type);
}

const layers = [
  {
    id: "layer:web-ui",
    name: "React UI",
    description:
      "React route, layout, feature page, modal과 CSS Module이 사용자 event를 받아 상태 기반 화면을 구성합니다.",
    nodeIds: [],
  },
  {
    id: "layer:web-application",
    name: "인증·상태 및 브라우저 데이터 접근",
    description:
      "브라우저 인증 session, React Context와 reducer, selector, API Repository가 UI와 원격 데이터 사이의 단방향 흐름을 조정합니다.",
    nodeIds: [],
  },
  {
    id: "layer:api-server",
    name: "Express API·서버 Repository",
    description:
      "Express 진입점과 middleware, route validation, Supabase 서버 client와 Repository가 HTTP 요청을 인증된 TeamFlow 데이터 작업으로 변환합니다.",
    nodeIds: [],
  },
  {
    id: "layer:shared-domain",
    name: "공유 도메인·유틸리티",
    description:
      "웹과 API가 공유하는 TeamFlow 상태 계약과 검증 규칙, 화면 label, 날짜 formatting helper를 제공합니다.",
    nodeIds: [],
  },
  {
    id: "layer:supabase-data",
    name: "Supabase 데이터·RLS",
    description:
      "SQL migration이 프로젝트·협업·콘텐츠·AI 실행 schema와 RLS, RPC, 비공개 Storage 정책을 순서대로 정의하고 강화합니다.",
    nodeIds: [],
  },
  {
    id: "layer:test",
    name: "테스트",
    description:
      "Node test, Vitest·Testing Library와 SQL 통합 검증이 순수 계약부터 React 사용자 흐름, Express API, Supabase RLS까지 계층별 동작을 보호합니다.",
    nodeIds: [],
  },
  {
    id: "layer:config-infrastructure",
    name: "설정·배포 및 CI/CD",
    description:
      "workspace manifest, 환경변수 예시, Vite·Vercel·Render 설정과 GitHub Actions가 개발·빌드·배포·PR 자동화 환경을 구성합니다.",
    nodeIds: [],
  },
  {
    id: "layer:documentation",
    name: "문서·디자인 가이드",
    description:
      "README, 기획·아키텍처·API·배포 문서와 agent workflow 자료가 제품 의도, 시스템 경계와 협업 절차를 설명합니다.",
    nodeIds: [],
  },
];

const byId = new Map(layers.map((layer) => [layer.id, layer]));

function nodePath(id, type) {
  const rest = id.slice(type.length + 1);
  if (type === "table") {
    const sqlEnd = rest.toLowerCase().indexOf(".sql");
    return sqlEnd >= 0 ? rest.slice(0, sqlEnd + 4) : rest;
  }
  return rest;
}

function isTestPath(filePath) {
  return (
    filePath.includes("/test/") ||
    filePath.includes("/tests/") ||
    filePath.includes(".test.") ||
    filePath.includes(".spec.")
  );
}

for (const [id, type] of typeById.entries()) {
  const filePath = nodePath(id, type);
  let layerId;

  if (isTestPath(filePath)) {
    layerId = "layer:test";
  } else if (
    type === "document" ||
    filePath.startsWith("docs/") ||
    filePath.startsWith(".claude/skills/") ||
    filePath === "LICENSE"
  ) {
    layerId = "layer:documentation";
  } else if (filePath.startsWith("supabase/")) {
    layerId = "layer:supabase-data";
  } else if (
    ["config", "pipeline", "service", "resource"].includes(type) ||
    filePath === ".nvmrc" ||
    filePath.endsWith("/vite.config.js")
  ) {
    layerId = "layer:config-infrastructure";
  } else if (filePath.startsWith("apps/api/src/")) {
    layerId = "layer:api-server";
  } else if (
    filePath.startsWith("packages/shared/src/") ||
    filePath.startsWith("apps/web/src/constants/") ||
    filePath.startsWith("apps/web/src/lib/")
  ) {
    layerId = "layer:shared-domain";
  } else if (
    filePath.startsWith("apps/web/src/auth/") ||
    filePath.startsWith("apps/web/src/state/") ||
    filePath.startsWith("apps/web/src/data/")
  ) {
    layerId = "layer:web-application";
  } else if (
    filePath.startsWith("apps/web/src/") ||
    filePath === "apps/web/index.html"
  ) {
    layerId = "layer:web-ui";
  } else {
    throw new Error(`Unassigned file-level node: ${id} (${filePath})`);
  }

  byId.get(layerId).nodeIds.push(id);
}

for (const layer of layers) {
  layer.nodeIds.sort((a, b) => a.localeCompare(b));
  if (!layer.nodeIds.length) {
    throw new Error(`Empty layer: ${layer.id}`);
  }
}

const assigned = layers.flatMap((layer) => layer.nodeIds);
if (assigned.length !== analysis.fileStats.totalFileNodes) {
  throw new Error(
    `Assignment count mismatch: ${assigned.length} != ${analysis.fileStats.totalFileNodes}`,
  );
}
if (new Set(assigned).size !== assigned.length) {
  throw new Error("Duplicate file-level node assignment");
}
for (const id of typeById.keys()) {
  if (!assigned.includes(id)) throw new Error(`Missing assignment: ${id}`);
}

fs.writeFileSync(
  ".ua/intermediate/layers.json",
  `${JSON.stringify(layers, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      count: layer.nodeIds.length,
    })),
    null,
    2,
  ),
);
