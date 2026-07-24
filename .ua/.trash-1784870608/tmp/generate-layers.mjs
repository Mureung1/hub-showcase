import fs from "node:fs";
import path from "node:path";

const projectRoot = "C:\\Users\\jsjh0\\Desktop\\부트캠프\\AI Agent Challenge\\hub";
const resultsPath = path.join(projectRoot, ".ua", "tmp", "ua-arch-results.json");
const outputPath = path.join(projectRoot, ".ua", "intermediate", "layers.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));

const layerSpecs = [
  {
    id: "layer:ui",
    name: "React UI 레이어",
    description:
      "TeamFlow의 route shell, 프로젝트·할 일·협업자·노트·자료·AI 화면, 공용 component와 CSS 디자인 표현을 구성합니다.",
    nodeIds: [],
  },
  {
    id: "layer:application-state",
    name: "인증·상태 및 데이터 접근 레이어",
    description:
      "Supabase 인증, React Context·selector·provider와 API repository를 통해 사용자 session과 협업 상태의 조회·변경을 조정합니다.",
    nodeIds: [],
  },
  {
    id: "layer:shared-domain",
    name: "공유 도메인·유틸리티 레이어",
    description:
      "project·task·member·resource 계약, 상태 상수, 날짜 formatting과 화면 공통 표시 규칙을 web 전반에 제공합니다.",
    nodeIds: [],
  },
  {
    id: "layer:data",
    name: "Supabase 데이터·RLS 레이어",
    description:
      "프로젝트·협업자·할 일·노트·자료·AI agent table, RPC, index, storage와 RLS 정책을 migration 및 DB 검증 SQL로 정의합니다.",
    nodeIds: [],
  },
  {
    id: "layer:test",
    name: "테스트 레이어",
    description:
      "Vitest·Testing Library와 Node test helper·fixture로 인증, 협업, UI flow, repository와 공유 계약의 회귀를 검증합니다.",
    nodeIds: [],
  },
  {
    id: "layer:config-ci",
    name: "설정·배포 및 CI/CD 레이어",
    description:
      "npm workspace, Node·Vite·환경변수, Vercel·Render 배포, lint와 GitHub Actions·검증 Agent 설정을 관리합니다.",
    nodeIds: [],
  },
  {
    id: "layer:documentation",
    name: "문서·디자인 가이드 레이어",
    description:
      "제품 기획, architecture·REST API·배포·주간 계획, 협업 규칙과 UI 디자인·테스트 작성 지침을 사람과 Agent에게 전달합니다.",
    nodeIds: [],
  },
];

const byId = new Map(layerSpecs.map((layer) => [layer.id, layer]));

function chooseLayer(nodeId, details) {
  const filePath = details.filePath.replaceAll("\\", "/");
  if (["table", "schema", "endpoint"].includes(details.type)) return "layer:data";
  if (details.type === "document") return "layer:documentation";
  if (["config", "pipeline", "service", "resource"].includes(details.type)) {
    return "layer:config-ci";
  }
  if (
    filePath === "docs/agent-workflow.html" ||
    filePath === ".claude/skills/teamflow-design/tokens.css"
  ) {
    return "layer:documentation";
  }
  if (
    filePath === ".nvmrc" ||
    filePath.endsWith("/vite.config.js")
  ) {
    return "layer:config-ci";
  }
  if (
    details.pattern === "test" ||
    /(^|\/)(test|tests)\//.test(filePath) ||
    /\.(test|spec)\./.test(filePath)
  ) {
    return "layer:test";
  }
  if (
    filePath.startsWith("packages/shared/src/") ||
    filePath.startsWith("apps/web/src/lib/") ||
    filePath.startsWith("apps/web/src/constants/")
  ) {
    return "layer:shared-domain";
  }
  if (
    filePath.startsWith("apps/web/src/auth/") ||
    filePath.startsWith("apps/web/src/state/") ||
    filePath.startsWith("apps/web/src/data/")
  ) {
    return "layer:application-state";
  }
  return "layer:ui";
}

for (const [nodeId, details] of Object.entries(results.fileIndex)) {
  byId.get(chooseLayer(nodeId, details)).nodeIds.push(nodeId);
}
for (const layer of layerSpecs) layer.nodeIds.sort();

const assigned = layerSpecs.flatMap((layer) => layer.nodeIds);
const unique = new Set(assigned);
const expected = Object.keys(results.fileIndex);
if (layerSpecs.length < 3 || layerSpecs.length > 10) {
  throw new Error(`Invalid layer count: ${layerSpecs.length}`);
}
if (layerSpecs.some((layer) => layer.nodeIds.length === 0)) {
  throw new Error("Empty layer detected");
}
if (assigned.length !== expected.length || unique.size !== expected.length) {
  throw new Error(
    `Assignment mismatch: assigned=${assigned.length}, unique=${unique.size}, expected=${expected.length}`,
  );
}
const unexpected = assigned.filter((nodeId) => !(nodeId in results.fileIndex));
if (unexpected.length > 0) {
  throw new Error(`Unexpected node IDs: ${unexpected.join(", ")}`);
}

fs.writeFileSync(outputPath, `${JSON.stringify(layerSpecs, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      outputPath,
      totalFileNodes: expected.length,
      layers: layerSpecs.map((layer) => ({
        id: layer.id,
        name: layer.name,
        fileCount: layer.nodeIds.length,
      })),
    },
    null,
    2,
  ),
);
