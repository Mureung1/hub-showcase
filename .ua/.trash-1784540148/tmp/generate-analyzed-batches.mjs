import fs from "node:fs";
import path from "node:path";

const projectRoot = "C:\\Users\\jsjh0\\Desktop\\부트캠프\\AI Agent Challenge\\hub";
const uaDir = path.join(projectRoot, ".ua");
const tmpDir = path.join(uaDir, "tmp");
const intermediateDir = path.join(uaDir, "intermediate");
const batchIndexes = [1, 5, 6, 7];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const batchesDocument = readJson(path.join(intermediateDir, "batches.json"));
const batchByIndex = new Map(
  batchesDocument.batches.map((batch) => [batch.batchIndex, batch]),
);

const complexityForLines = (nonEmptyLines) => {
  if (nonEmptyLines > 200) return "complex";
  if (nonEmptyLines >= 50) return "moderate";
  return "simple";
};

const fileMetadata = {
  "apps/web/src/App.jsx": {
    summary:
      "TeamFlow의 최상위 React route 구성을 정의하고 전체 프로젝트 화면을 AppShell과 ProjectShell 아래에 배치합니다.",
    tags: ["entry-point", "routing", "component", "react"],
  },
  "apps/web/src/components/layout/AppShell.jsx": {
    summary:
      "전역 브랜드·계정 영역과 프로젝트 탐색 메뉴를 제공하며 새 프로젝트 생성 modal의 표시 상태를 관리하는 애플리케이션 shell입니다.",
    tags: ["component", "layout", "navigation", "modal"],
  },
  "apps/web/src/components/layout/ProjectShell.jsx": {
    summary:
      "선택한 프로젝트의 탐색 구조와 outlet context를 구성하고 할 일 생성·상세 modal을 조정하는 프로젝트 작업공간 shell입니다.",
    tags: ["component", "layout", "routing", "task-management"],
  },
  "apps/web/src/data/apiTeamFlowRepository.js": {
    summary:
      "Mock 저장소의 기본 데이터와 API의 영속화된 할 일을 결합해 조회하고, 할 일 생성을 Express API로 전달하는 repository adapter입니다.",
    tags: ["service", "repository", "api-client", "serialization"],
    languageNotes:
      "Fetch 구현을 주입할 수 있는 factory 구조와 HTTP 상태·payload를 보존하는 사용자 정의 오류를 사용합니다.",
  },
  "apps/web/src/data/apiTeamFlowRepository.test.js": {
    summary:
      "API repository가 Mock 데이터와 서버 응답을 병합하고 생성 요청·오류 응답을 올바르게 처리하는지 검증합니다.",
    tags: ["test", "repository", "api-client", "error-handling"],
  },
  "apps/web/src/data/mockData.js": {
    summary:
      "프로젝트, 팀원, 할 일, 노트, 자료, AI 설정과 활동 기록에 사용할 초기 개발용 fixture를 제공합니다.",
    tags: ["data-model", "mock-data", "fixture", "development"],
  },
  "apps/web/src/data/mockTeamFlowRepository.js": {
    summary:
      "메모리 기반 TeamFlow 데이터를 복제해 제공하고 프로젝트·할 일·팀원·노트·자료·AI 설정 변경을 Promise API로 모사합니다.",
    tags: ["repository", "mock-data", "service", "state-management"],
  },
  "apps/web/src/features/AppFlows.test.jsx": {
    summary:
      "실제 route와 provider를 함께 렌더링해 프로젝트 생성, 할 일 흐름, 노트 편집과 AI 팀원 동작을 검증하는 통합 UI 테스트입니다.",
    tags: ["test", "integration-test", "user-flow", "react"],
  },
  "apps/web/src/features/ai/AiPage.jsx": {
    summary:
      "AI 팀원의 지침과 참조 context를 설정하고 brief를 AI 담당 할 일로 생성하며 처리 현황과 기록을 표시합니다.",
    tags: ["component", "ai-workflow", "task-management", "state-management"],
  },
  "apps/web/src/features/notes/MarkdownPreview.jsx": {
    summary:
      "노트 본문의 heading, 목록, 인용, 강조, inline code를 React 요소로 변환하는 경량 Markdown preview renderer입니다.",
    tags: ["component", "markdown", "rendering", "utility"],
    languageNotes:
      "외부 Markdown parser 없이 제한된 문법을 순차적인 문자열 변환으로 렌더링합니다.",
  },
  "apps/web/src/features/notes/NoteTemplateModal.jsx": {
    summary:
      "회의록 등 사전 정의된 노트 template을 선택해 편집 화면에 적용하도록 제공하는 modal component입니다.",
    tags: ["component", "modal", "template", "notes"],
  },
  "apps/web/src/features/notes/NotesPage.jsx": {
    summary:
      "프로젝트 노트를 검색·선택·편집하고 Markdown preview와 template 적용을 지원하는 노트 작업공간입니다.",
    tags: ["component", "notes", "markdown", "state-management"],
  },
  "apps/web/src/features/projects/ProjectListPage.test.jsx": {
    summary:
      "프로젝트 목록 route의 렌더링과 카드 상호작용을 실제 App·provider 조합에서 검증합니다.",
    tags: ["test", "component-test", "projects", "routing"],
  },
  "apps/web/src/features/projects/components/NewProjectModal.jsx": {
    summary:
      "프로젝트 이름·설명·기간·상태를 입력받아 검증한 뒤 TeamFlow action으로 새 프로젝트를 생성하는 modal form입니다.",
    tags: ["component", "modal", "validation", "form"],
  },
  "apps/web/src/main.jsx": {
    summary:
      "React root를 생성하고 BrowserRouter, TeamFlowProvider, App을 조합해 웹 애플리케이션을 부트스트랩합니다.",
    tags: ["entry-point", "react", "routing", "state-provider"],
  },
  "apps/web/src/state/TeamFlowContext.js": {
    summary:
      "TeamFlow 전역 상태와 action을 전달하기 위한 React context 객체를 정의합니다.",
    tags: ["state-management", "context", "react", "type-definition"],
  },
  "apps/web/src/state/TeamFlowProvider.jsx": {
    summary:
      "Repository에서 초기 데이터를 hydrate하고 reducer와 비동기 action을 통해 프로젝트·할 일·팀원·노트·자료·AI 설정 상태를 중앙 관리합니다.",
    tags: ["state-management", "context-provider", "repository", "service"],
    languageNotes:
      "useReducer로 상태 전이를 집중시키고 repository 작업 뒤 dispatch하며, 새 할 일의 임시 강조 상태를 timer로 정리합니다.",
  },
};

const symbolMetadata = {
  "apps/web/src/App.jsx:App": {
    summary:
      "TeamFlow의 전역 route tree를 구성해 목록 화면과 프로젝트별 중첩 화면을 연결합니다.",
    tags: ["component", "routing", "entry-point"],
  },
  "apps/web/src/components/layout/AppShell.jsx:AppShell": {
    summary:
      "전역 탐색 sidebar와 outlet, 새 프로젝트 modal을 묶는 최상위 layout component입니다.",
    tags: ["component", "layout", "navigation"],
  },
  "apps/web/src/components/layout/AppShell.jsx:Brand": {
    summary: "TeamFlow 브랜드 표식을 렌더링하는 작은 표시 component입니다.",
    tags: ["component", "branding", "presentation"],
  },
  "apps/web/src/components/layout/AppShell.jsx:Account": {
    summary: "현재 사용자 계정 영역을 렌더링하는 표시 component입니다.",
    tags: ["component", "account", "presentation"],
  },
  "apps/web/src/components/layout/ProjectShell.jsx:ProjectShell": {
    summary:
      "현재 프로젝트를 선택하고 프로젝트 탐색·중첩 화면·할 일 modal 상태를 통합합니다.",
    tags: ["component", "layout", "task-management"],
  },
  "apps/web/src/data/apiTeamFlowRepository.js:readJson": {
    summary:
      "응답 JSON을 안전하게 읽고 실패한 HTTP 응답을 TeamFlowApiError로 변환합니다.",
    tags: ["serialization", "error-handling", "utility"],
  },
  "apps/web/src/data/apiTeamFlowRepository.js:requestJson": {
    summary:
      "주입된 fetch 구현으로 요청을 실행하고 네트워크 오류와 HTTP 오류를 일관된 repository 오류로 정규화합니다.",
    tags: ["api-client", "error-handling", "utility"],
  },
  "apps/web/src/data/apiTeamFlowRepository.js:createApiTeamFlowRepository": {
    summary:
      "Mock 데이터와 서버의 영속화된 할 일을 병합하고 생성 API를 제공하는 repository 객체를 만듭니다.",
    tags: ["factory", "repository", "api-client"],
  },
  "apps/web/src/data/apiTeamFlowRepository.js:TeamFlowApiError": {
    summary:
      "API 요청 실패 시 HTTP status와 응답 payload를 함께 전달하는 사용자 정의 오류입니다.",
    tags: ["error-handling", "api-client", "data-model"],
  },
  "apps/web/src/features/ai/AiPage.jsx:AiPage": {
    summary:
      "AI 팀원 설정, brief 기반 할 일 생성, 처리 현황과 활동 기록을 하나의 화면에서 조정합니다.",
    tags: ["component", "ai-workflow", "task-management"],
  },
  "apps/web/src/features/notes/MarkdownPreview.jsx:inline": {
    summary:
      "강조, 취소선, inline code 표기를 React inline 요소로 변환합니다.",
    tags: ["utility", "markdown", "rendering"],
  },
  "apps/web/src/features/notes/MarkdownPreview.jsx:MarkdownPreview": {
    summary:
      "노트의 줄 단위 Markdown 구조를 해석해 heading, 목록, 인용과 본문 요소를 렌더링합니다.",
    tags: ["component", "markdown", "rendering"],
  },
  "apps/web/src/features/notes/NoteTemplateModal.jsx:NoteTemplateModal": {
    summary: "사용 가능한 노트 template을 나열하고 선택 결과를 상위 편집기에 전달합니다.",
    tags: ["component", "modal", "template"],
  },
  "apps/web/src/features/notes/NotesPage.jsx:NotesPage": {
    summary:
      "노트 선택·검색·편집·저장과 Markdown preview 전환 및 template 적용을 관리합니다.",
    tags: ["component", "notes", "state-management"],
  },
  "apps/web/src/features/projects/components/NewProjectModal.jsx:NewProjectModal": {
    summary:
      "새 프로젝트 form의 입력 상태와 검증 오류를 관리하고 유효한 값을 생성 action에 전달합니다.",
    tags: ["component", "form", "validation"],
  },
  "apps/web/src/state/TeamFlowProvider.jsx:reducer": {
    summary:
      "hydrate와 프로젝트·할 일·팀원·노트·자료·AI 설정 action을 불변 상태 전이로 처리합니다.",
    tags: ["state-management", "reducer", "event-handler"],
  },
  "apps/web/src/state/TeamFlowProvider.jsx:TeamFlowProvider": {
    summary:
      "Repository 수명주기와 비동기 mutation을 React context 값으로 묶어 하위 화면에 제공합니다.",
    tags: ["context-provider", "state-management", "service"],
  },
};

const makeNode = ({
  id,
  type,
  name,
  filePath,
  summary,
  tags,
  complexity,
  languageNotes,
  lineRange,
}) => {
  const node = { id, type, name, filePath, summary, tags, complexity };
  if (languageNotes) node.languageNotes = languageNotes;
  if (lineRange) node.lineRange = lineRange;
  return node;
};

const edge = (source, target, type, weight) => ({
  source,
  target,
  type,
  direction: "forward",
  weight,
});

function buildBatch1(batch, extraction) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  for (const result of extraction.results) {
    const metadata = fileMetadata[result.path];
    const fileNode = makeNode({
      id: `file:${result.path}`,
      type: "file",
      name: path.basename(result.path),
      filePath: result.path,
      summary: metadata.summary,
      tags: metadata.tags,
      complexity: complexityForLines(result.nonEmptyLines),
      languageNotes: metadata.languageNotes,
    });
    nodes.push(fileNode);
    nodeIds.add(fileNode.id);

    const exportedNames = new Set((result.exports ?? []).map((item) => item.name));
    for (const fn of result.functions ?? []) {
      const lineCount = fn.endLine - fn.startLine + 1;
      if (lineCount < 10 && !exportedNames.has(fn.name)) continue;
      const metadataKey = `${result.path}:${fn.name}`;
      const symbol = symbolMetadata[metadataKey];
      if (!symbol) throw new Error(`Missing function metadata for ${metadataKey}`);
      const id = `function:${result.path}:${fn.name}`;
      const fnNode = makeNode({
        id,
        type: "function",
        name: fn.name,
        filePath: result.path,
        lineRange: [fn.startLine, fn.endLine],
        summary: symbol.summary,
        tags: symbol.tags,
        complexity: complexityForLines(lineCount),
      });
      nodes.push(fnNode);
      nodeIds.add(id);
      edges.push(edge(fileNode.id, id, "contains", 1.0));
      if (exportedNames.has(fn.name)) {
        edges.push(edge(fileNode.id, id, "exports", 0.8));
      }
    }

    for (const cls of result.classes ?? []) {
      const lineCount = cls.endLine - cls.startLine + 1;
      if (
        lineCount < 20 &&
        (cls.methods ?? []).length < 2 &&
        !exportedNames.has(cls.name)
      ) {
        continue;
      }
      const metadataKey = `${result.path}:${cls.name}`;
      const symbol = symbolMetadata[metadataKey];
      if (!symbol) throw new Error(`Missing class metadata for ${metadataKey}`);
      const id = `class:${result.path}:${cls.name}`;
      const classNode = makeNode({
        id,
        type: "class",
        name: cls.name,
        filePath: result.path,
        lineRange: [cls.startLine, cls.endLine],
        summary: symbol.summary,
        tags: symbol.tags,
        complexity: complexityForLines(lineCount),
      });
      nodes.push(classNode);
      nodeIds.add(id);
      edges.push(edge(fileNode.id, id, "contains", 1.0));
      if (exportedNames.has(cls.name)) {
        edges.push(edge(fileNode.id, id, "exports", 0.8));
      }
    }
  }

  for (const file of batch.files) {
    if (file.fileCategory !== "code") continue;
    for (const targetPath of batch.batchImportData[file.path]) {
      edges.push(
        edge(`file:${file.path}`, `file:${targetPath}`, "imports", 0.7),
      );
    }
  }

  const testedByPairs = [
    [
      "apps/web/src/data/apiTeamFlowRepository.js",
      "apps/web/src/data/apiTeamFlowRepository.test.js",
    ],
    ["apps/web/src/App.jsx", "apps/web/src/features/AppFlows.test.jsx"],
    [
      "apps/web/src/data/mockTeamFlowRepository.js",
      "apps/web/src/features/AppFlows.test.jsx",
    ],
    [
      "apps/web/src/features/notes/MarkdownPreview.jsx",
      "apps/web/src/features/AppFlows.test.jsx",
    ],
    [
      "apps/web/src/state/TeamFlowProvider.jsx",
      "apps/web/src/features/AppFlows.test.jsx",
    ],
    [
      "apps/web/src/App.jsx",
      "apps/web/src/features/projects/ProjectListPage.test.jsx",
    ],
    [
      "apps/web/src/state/TeamFlowProvider.jsx",
      "apps/web/src/features/projects/ProjectListPage.test.jsx",
    ],
  ];
  for (const [production, test] of testedByPairs) {
    edges.push(edge(`file:${production}`, `file:${test}`, "tested_by", 0.5));
  }

  const crossBatchCalls = [
    [
      "apps/web/src/components/layout/ProjectShell.jsx",
      "ProjectShell",
      "apps/web/src/state/useTeamFlow.js",
      "useTeamFlow",
    ],
    [
      "apps/web/src/components/layout/ProjectShell.jsx",
      "ProjectShell",
      "apps/web/src/state/selectors.js",
      "selectProject",
    ],
    [
      "apps/web/src/components/layout/ProjectShell.jsx",
      "ProjectShell",
      "apps/web/src/state/selectors.js",
      "selectProjectMembers",
    ],
    [
      "apps/web/src/features/ai/AiPage.jsx",
      "AiPage",
      "apps/web/src/state/useTeamFlow.js",
      "useTeamFlow",
    ],
    [
      "apps/web/src/features/ai/AiPage.jsx",
      "AiPage",
      "apps/web/src/lib/format.js",
      "addLocalDaysIso",
    ],
    [
      "apps/web/src/features/ai/AiPage.jsx",
      "AiPage",
      "apps/web/src/lib/format.js",
      "formatShortDate",
    ],
    [
      "apps/web/src/features/notes/NotesPage.jsx",
      "NotesPage",
      "apps/web/src/state/useTeamFlow.js",
      "useTeamFlow",
    ],
    [
      "apps/web/src/features/notes/NotesPage.jsx",
      "NotesPage",
      "apps/web/src/lib/format.js",
      "formatShortDate",
    ],
    [
      "apps/web/src/features/projects/components/NewProjectModal.jsx",
      "NewProjectModal",
      "apps/web/src/state/useTeamFlow.js",
      "useTeamFlow",
    ],
  ];
  for (const [sourcePath, sourceName, targetPath, targetName] of crossBatchCalls) {
    edges.push(
      edge(
        `function:${sourcePath}:${sourceName}`,
        `function:${targetPath}:${targetName}`,
        "calls",
        0.8,
      ),
    );
  }

  return { nodes, edges };
}

function buildBatch5(extraction) {
  const result = extraction.results[0];
  return {
    nodes: [
      makeNode({
        id: `pipeline:${result.path}`,
        type: "pipeline",
        name: path.basename(result.path),
        filePath: result.path,
        summary:
          "매일 13:00 UTC 또는 수동 실행으로 열린 pull request를 조회하고, 대상 branch·review label·변경 요청·충돌 규칙에 따라 보류·종료·병합하는 GitHub Actions workflow입니다.",
        tags: ["ci-cd", "github-actions", "pull-request", "automation"],
        complexity: complexityForLines(result.nonEmptyLines),
        languageNotes:
          "actions/github-script에서 GraphQL로 PR 목록을 읽고 REST API로 comment, close, merge 작업을 수행합니다.",
      }),
    ],
    edges: [],
  };
}

function buildBatch6(extraction) {
  const result = extraction.results[0];
  return {
    nodes: [
      makeNode({
        id: `table:${result.path}:tasks`,
        type: "table",
        name: "tasks",
        filePath: result.path,
        summary:
          "프로젝트별 할 일을 저장하는 public.tasks table을 생성하고 제목·상태·설명 제약, 최신순 조회 index, RLS와 service_role 권한을 설정하는 Supabase migration입니다.",
        tags: ["database", "migration", "task-storage", "row-level-security", "indexing"],
        complexity: complexityForLines(result.nonEmptyLines),
        languageNotes:
          "PostgreSQL check constraint로 입력 범위를 제한하고 service_role에 select·insert만 허용합니다.",
      }),
    ],
    edges: [],
  };
}

function buildBatch7(extraction) {
  const byPath = new Map(extraction.results.map((result) => [result.path, result]));
  const specs = [
    {
      path: ".oxlintrc.json",
      type: "config",
      prefix: "config",
      summary:
        "React hook 규칙을 error로 강제하고 component 외 상수 export를 허용하도록 oxlint의 React·OXC 규칙을 설정합니다.",
      tags: ["configuration", "linting", "react", "code-quality"],
    },
    {
      path: "CLAUDE.md",
      type: "document",
      prefix: "document",
      summary:
        "TeamFlow의 기술 스택, 개발 명령, 코드·commit convention, 디자인 제약과 참고 문서를 정리한 개발 Agent 지침입니다.",
      tags: ["documentation", "development", "conventions", "agent-guidance"],
    },
    {
      path: "README.md",
      type: "document",
      prefix: "document",
      summary:
        "TeamFlow의 현재 구현 범위, monorepo 구성, Node·Supabase 설정, 로컬 실행과 검증 명령을 안내하는 프로젝트 시작 문서입니다.",
      tags: ["documentation", "entry-point", "setup", "overview"],
    },
    {
      path: "package.json",
      type: "config",
      prefix: "config",
      summary:
        "apps와 packages workspace, Node·npm version 범위, web/API 개발·build·lint·test script를 정의하는 monorepo root manifest입니다.",
      tags: ["configuration", "monorepo", "build-system", "npm-workspaces"],
      languageNotes:
        "npm workspace script를 통해 web과 API package의 명령을 root에서 위임 실행합니다.",
    },
  ];
  const nodes = specs.map((spec) => {
    const result = byPath.get(spec.path);
    return makeNode({
      id: `${spec.prefix}:${spec.path}`,
      type: spec.type,
      name: path.basename(spec.path),
      filePath: spec.path,
      summary: spec.summary,
      tags: spec.tags,
      complexity: complexityForLines(result.nonEmptyLines),
      languageNotes: spec.languageNotes,
    });
  });
  const edges = [
    edge(
      "document:README.md",
      "config:package.json",
      "documents",
      0.5,
    ),
    edge(
      "document:CLAUDE.md",
      "config:package.json",
      "documents",
      0.5,
    ),
    edge(
      "config:package.json",
      "config:.oxlintrc.json",
      "depends_on",
      0.6,
    ),
  ];
  return { nodes, edges };
}

function validateGraph(batch, graph) {
  const allowedTypes = new Set([
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
  const allowedComplexity = new Set(["simple", "moderate", "complex"]);
  const localIds = new Set();
  for (const node of graph.nodes) {
    if (localIds.has(node.id)) throw new Error(`Duplicate node: ${node.id}`);
    localIds.add(node.id);
    if (!allowedTypes.has(node.type)) throw new Error(`Invalid node type: ${node.id}`);
    if (!node.summary || !Array.isArray(node.tags) || node.tags.length < 3) {
      throw new Error(`Incomplete node: ${node.id}`);
    }
    if (!allowedComplexity.has(node.complexity)) {
      throw new Error(`Invalid complexity: ${node.id}`);
    }
  }

  const externalFiles = new Set();
  for (const [sourcePath, targets] of Object.entries(batch.batchImportData)) {
    externalFiles.add(sourcePath);
    for (const target of targets) externalFiles.add(target);
  }
  const neighborSymbols = new Map();
  for (const [sourcePath, neighbors] of Object.entries(batch.neighborMap)) {
    externalFiles.add(sourcePath);
    for (const neighbor of neighbors) {
      externalFiles.add(neighbor.path);
      neighborSymbols.set(neighbor.path, new Set(neighbor.symbols));
    }
  }

  const referenceIsKnown = (id) => {
    if (localIds.has(id)) return true;
    if (id.startsWith("file:")) return externalFiles.has(id.slice(5));
    const match = /^(function|class):(.+):([^:]+)$/.exec(id);
    if (!match) return false;
    const [, , filePath, symbol] = match;
    return neighborSymbols.get(filePath)?.has(symbol) ?? false;
  };

  for (const graphEdge of graph.edges) {
    if (graphEdge.source === graphEdge.target) {
      throw new Error(`Self-referencing edge: ${graphEdge.source}`);
    }
    if (!referenceIsKnown(graphEdge.source) || !referenceIsKnown(graphEdge.target)) {
      throw new Error(
        `Unknown edge reference: ${graphEdge.source} -> ${graphEdge.target}`,
      );
    }
  }

  const expectedImports = batch.files
    .filter((file) => file.fileCategory === "code")
    .reduce(
      (total, file) => total + (batch.batchImportData[file.path]?.length ?? 0),
      0,
    );
  const actualImports = graph.edges.filter(
    (graphEdge) => graphEdge.type === "imports",
  ).length;
  if (expectedImports !== actualImports) {
    throw new Error(
      `Batch ${batch.batchIndex} import mismatch: expected ${expectedImports}, got ${actualImports}`,
    );
  }
}

function writeGraph(batchIndex, graph) {
  if (graph.nodes.length > 60 || graph.edges.length > 120) {
    throw new Error(
      `Batch ${batchIndex} unexpectedly requires partitioning: ${graph.nodes.length} nodes, ${graph.edges.length} edges`,
    );
  }
  const outputPath = path.join(intermediateDir, `batch-${batchIndex}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(graph, null, 2)}\n`, "utf8");
  const reparsed = readJson(outputPath);
  if (!Array.isArray(reparsed.nodes) || !Array.isArray(reparsed.edges)) {
    throw new Error(`Invalid output arrays: ${outputPath}`);
  }
  return outputPath;
}

const reports = [];
for (const batchIndex of batchIndexes) {
  const batch = batchByIndex.get(batchIndex);
  if (!batch) throw new Error(`Missing batch ${batchIndex}`);
  const extraction = readJson(
    path.join(tmpDir, `ua-file-extract-results-${batchIndex}.json`),
  );
  if (!extraction.scriptCompleted || extraction.filesSkipped.length > 0) {
    throw new Error(
      `Extraction incomplete for batch ${batchIndex}: ${extraction.filesSkipped.join(", ")}`,
    );
  }

  let graph;
  if (batchIndex === 1) graph = buildBatch1(batch, extraction);
  if (batchIndex === 5) graph = buildBatch5(extraction);
  if (batchIndex === 6) graph = buildBatch6(extraction);
  if (batchIndex === 7) graph = buildBatch7(extraction);

  validateGraph(batch, graph);
  const outputPath = writeGraph(batchIndex, graph);
  reports.push({
    batchIndex,
    outputPath,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    filesSkipped: extraction.filesSkipped,
  });
}

console.log(JSON.stringify(reports, null, 2));
