import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const uaDir = path.join(projectRoot, ".ua");
const batches = JSON.parse(
  fs.readFileSync(path.join(uaDir, "intermediate", "batches.json"), "utf8"),
).batches;
const selected = new Set([2, 3, 4, 8]);

const fileInfo = {
  "apps/web/src/components/ui/Modal.jsx": {
    summary: "React portal로 대화상자를 렌더링하고 Escape 닫기, 키보드 focus trap, 이전 focus 복원을 처리하는 공용 Modal 컴포넌트다.",
    tags: ["react-component", "modal", "accessibility", "focus-management"],
    languageNotes: "useEffect와 DOM API를 함께 사용해 대화상자의 focus 생명주기를 관리한다.",
  },
  "apps/web/src/components/ui/ResourceIcon.jsx": {
    summary: "자료 유형에 맞는 아이콘을 선택해 일관된 크기와 접근성 속성으로 표시하는 공용 UI 컴포넌트다.",
    tags: ["react-component", "icon", "resource-type", "presentation"],
  },
  "apps/web/src/components/ui/StatusBadge.jsx": {
    summary: "프로젝트 또는 할 일 상태를 사용자용 라벨과 시각적 변형으로 변환해 보여주는 공용 badge 컴포넌트다.",
    tags: ["react-component", "status", "badge", "presentation"],
  },
  "apps/web/src/constants/labels.js": {
    summary: "프로젝트·할 일·자료 상태의 한국어 표시명과 할 일 상태 정렬 순서를 중앙에서 정의한다.",
    tags: ["constants", "localization", "status", "configuration"],
  },
  "apps/web/src/features/resources/AddResourceModal.jsx": {
    summary: "자료 이름을 검증하고 유형, 설명, 담당자, 상위 폴더를 수집해 현재 프로젝트에 새 자료를 생성하는 Modal이다.",
    tags: ["react-component", "resource-management", "form", "validation"],
  },
  "apps/web/src/features/resources/CreateFolderModal.jsx": {
    summary: "폴더 이름을 검증한 뒤 현재 프로젝트와 상위 폴더 문맥에 새 폴더 자료를 생성하는 Modal이다.",
    tags: ["react-component", "folder-management", "form", "validation"],
  },
  "apps/web/src/features/resources/ResourceDetailModal.jsx": {
    summary: "선택한 자료의 유형, 설명, 담당자, 수정일을 읽기 전용으로 표시하는 상세 Modal이다.",
    tags: ["react-component", "resource-detail", "modal", "presentation"],
  },
  "apps/web/src/features/resources/ResourcesPage.jsx": {
    summary: "프로젝트 자료를 폴더 계층으로 탐색하고 검색·유형 필터·수정일 정렬을 제공하며 생성 및 상세 Modal을 조정하는 페이지다.",
    tags: ["react-component", "resource-management", "folder-navigation", "search-filter"],
    languageNotes: "여러 useMemo 파생값으로 현재 폴더, 검색어, 자료 유형, 정렬 기준에 따른 목록을 계산한다.",
  },
  "apps/web/src/features/tasks/MyTasksPage.jsx": {
    summary: "현재 사용자에게 배정된 할 일을 프로젝트별로 묶어 보여주고 선택한 항목의 상세 수정·삭제 흐름을 여는 페이지다.",
    tags: ["react-component", "task-management", "grouping", "user-scope"],
  },
  "apps/web/src/features/tasks/components/TaskCreateModal.jsx": {
    summary: "제목, 담당자, 마감일, 상태, 설명을 검증해 프로젝트 할 일을 생성하고 제출 상태와 오류를 관리하는 Modal이다.",
    tags: ["react-component", "task-management", "form", "validation"],
  },
  "apps/web/src/features/tasks/components/TaskDetailModal.jsx": {
    summary: "할 일 상세 정보와 담당자를 표시하고 비동기 상태 변경 및 삭제 확인 흐름을 제공하는 Modal이다.",
    tags: ["react-component", "task-detail", "status-update", "deletion"],
  },
  "apps/web/src/lib/format.js": {
    summary: "로컬 시간대를 보존하면서 날짜를 ISO 형식으로 만들고 화면용 짧은 날짜와 프로젝트 기간 문자열을 생성하는 유틸리티 모음이다.",
    tags: ["utility", "date-formatting", "local-time", "serialization"],
    languageNotes: "timezone offset을 보정한 뒤 ISO 문자열을 잘라 로컬 날짜가 UTC 변환으로 달라지는 문제를 피한다.",
  },
  "apps/web/src/lib/format.test.js": {
    summary: "날짜 단축 표시, 기간 조합, 오늘 날짜, 로컬 날짜 가산 동작을 검증하는 단위 테스트다.",
    tags: ["test", "unit-test", "date-formatting", "regression"],
  },
  "apps/web/src/components/ui/Avatar.jsx": {
    summary: "사용자 이름의 이니셜과 선택 가능한 크기·색상을 원형 프로필 표식으로 표시하는 공용 Avatar 컴포넌트다.",
    tags: ["react-component", "avatar", "member", "presentation"],
  },
  "apps/web/src/features/dashboard/ProjectDashboardPage.jsx": {
    summary: "프로젝트의 진행률, 상태별 할 일, 멤버, 최근 노트, 자료를 집계해 각 작업 영역으로 이동시키는 대시보드 페이지다.",
    tags: ["react-component", "dashboard", "project-overview", "aggregation"],
    languageNotes: "여러 selector와 useMemo를 조합해 정렬·요약된 dashboard view model을 만든다.",
  },
  "apps/web/src/features/dashboard/ProjectPeriodModal.jsx": {
    summary: "프로젝트 시작일과 종료일의 순서를 검증하고 전역 상태의 프로젝트 기간을 갱신하는 Modal이다.",
    tags: ["react-component", "project-period", "form", "validation"],
  },
  "apps/web/src/features/members/AddMemberModal.jsx": {
    summary: "이름과 역할을 검증하고 설명·초기값을 포함한 새 멤버를 TeamFlow 상태에 추가하는 Modal이다.",
    tags: ["react-component", "member-management", "form", "validation"],
  },
  "apps/web/src/features/members/MembersPage.jsx": {
    summary: "프로젝트 멤버와 각 멤버의 할 일 및 참여 프로젝트를 계산해 보여주고 멤버 추가 흐름을 제공하는 페이지다.",
    tags: ["react-component", "member-management", "task-summary", "project-scope"],
  },
  "apps/web/src/features/projects/ProjectListPage.jsx": {
    summary: "프로젝트 요약을 이름과 설명으로 검색하고 카드 목록으로 표시하며 선택한 프로젝트로 이동시키는 페이지다.",
    tags: ["react-component", "project-list", "search-filter", "navigation"],
  },
  "apps/web/src/features/projects/components/ProjectCard.jsx": {
    summary: "프로젝트 상태, 진행률, 멤버, 기간과 설명을 하나의 탐색 가능한 카드로 표현하는 컴포넌트다.",
    tags: ["react-component", "project-card", "progress", "presentation"],
  },
  "apps/web/src/features/tasks/ProjectTasksPage.jsx": {
    summary: "프로젝트 할 일을 상태·검색어로 필터링하고 여러 기준으로 안정 정렬해 table 또는 board 형태로 표시하는 페이지다.",
    tags: ["react-component", "task-management", "sorting", "search-filter"],
    languageNotes: "원래 index를 보조 기준으로 유지해 동일한 정렬 값에서도 안정적인 표시 순서를 보장한다.",
  },
  "apps/web/src/state/selectors.js": {
    summary: "정규화되지 않은 TeamFlow 상태에서 프로젝트, 할 일, 멤버와 카드용 프로젝트 요약을 파생하는 순수 selector 모음이다.",
    tags: ["state-selector", "derived-state", "utility", "aggregation"],
  },
  "apps/web/src/state/useTeamFlow.js": {
    summary: "TeamFlowContext를 읽고 Provider 바깥에서 사용될 경우 오류를 내는 전역 상태 접근용 custom React hook이다.",
    tags: ["react-hook", "context", "state-management", "validation"],
  },
  "apps/api/src/app.js": {
    summary: "네트워크 port binding과 분리된 Express application factory로 JSON middleware, health endpoint, 선택적 task router를 구성한다.",
    tags: ["api-handler", "express", "application-factory", "health-check"],
  },
  "apps/api/src/lib/supabaseClient.js": {
    summary: "TeamFlow 전용 Supabase URL과 sb_secret_ key를 엄격히 검증하고 server-side client를 생성한다.",
    tags: ["supabase", "configuration", "validation", "security"],
    languageNotes: "다른 프로젝트 ref와 legacy key를 명시적으로 거부하고 client session persistence를 끈다.",
  },
  "apps/api/src/server.js": {
    summary: "환경변수로 port를 읽고 Supabase client, task repository, Express app을 조립해 TeamFlow API server를 시작하는 entry point다.",
    tags: ["entry-point", "server", "dependency-injection", "express"],
  },
  "apps/api/src/tasks/taskRepository.js": {
    summary: "공유 task contract와 Supabase tasks row 사이를 변환하고 조회·생성을 수행하며 저장소 오류를 안전한 전용 오류로 감싼다.",
    tags: ["data-access", "repository", "supabase", "serialization"],
  },
  "apps/api/src/tasks/taskRoutes.js": {
    summary: "할 일 생성 payload를 세부 검증하고 목록 조회·생성 endpoint 및 저장소 장애의 일관된 503 응답을 제공한다.",
    tags: ["api-handler", "routing", "validation", "error-handling"],
  },
  "apps/api/test/health.test.js": {
    summary: "임시 port에서 Express app을 실행해 GET /health의 상태 코드와 service payload를 검증하는 통합 테스트다.",
    tags: ["test", "integration-test", "health-check", "api-contract"],
  },
  "apps/api/test/supabaseClient.test.js": {
    summary: "TeamFlow 전용 Supabase project와 secret 형식만 허용하고 TimeBox project 및 legacy key를 거부하는지 검증한다.",
    tags: ["test", "unit-test", "supabase", "security"],
  },
  "apps/api/test/taskRepository.test.js": {
    summary: "task row mapping, 생성 input mapping, 정렬 조회, insert 반환값, Supabase 오류 래핑을 fake client로 검증한다.",
    tags: ["test", "unit-test", "repository", "supabase"],
  },
  "apps/api/test/tasks.test.js": {
    summary: "GET/POST task endpoint의 정상 응답, 입력 정제·검증, 저장소 장애 은닉을 실제 HTTP 요청으로 검증한다.",
    tags: ["test", "integration-test", "task-api", "error-handling"],
  },
  "apps/web/src/styles/global.css": {
    summary: "전역 box model, root 크기, 기본 typography, focus-visible, selection, loading 및 screen-reader-only 규칙을 설정한다.",
    tags: ["css", "global-style", "accessibility", "layout"],
  },
  "apps/web/src/styles/tokens.css": {
    summary: "Pretendard와 JetBrains Mono font를 불러오고 색상, 폭, radius 등 TeamFlow light theme의 전역 design token을 정의한다.",
    tags: ["css", "design-tokens", "theme", "typography"],
    languageNotes: "CSS custom properties로 상태별 색상과 공통 layout token을 중앙화한다.",
  },
  "apps/web/src/styles/workspace.module.css": {
    summary: "프로젝트 작업공간 페이지가 공유하는 container, header, button, card, table, 검색창, 빈 상태와 반응형 layout을 CSS Module로 제공한다.",
    tags: ["css-module", "workspace", "layout", "design-system"],
  },
};

const functionInfo = {
  "apps/web/src/components/ui/Modal.jsx:Modal": ["대화상자를 portal에 렌더링하고 열림 상태 동안 focus 이동·순환·복원을 관리한다.", ["react-component", "modal", "accessibility", "focus-management"]],
  "apps/web/src/components/ui/ResourceIcon.jsx:ResourceIcon": ["자료 유형에 대응하는 아이콘을 공통 규격으로 렌더링한다.", ["react-component", "icon", "resource-type"]],
  "apps/web/src/components/ui/StatusBadge.jsx:StatusBadge": ["상태값을 label과 CSS variant가 적용된 badge로 렌더링한다.", ["react-component", "status", "badge"]],
  "apps/web/src/features/resources/AddResourceModal.jsx:AddResourceModal": ["자료 생성 form 상태를 관리하고 필수값 검증 후 TeamFlow action을 호출한다.", ["react-component", "resource-management", "form", "validation"]],
  "apps/web/src/features/resources/CreateFolderModal.jsx:CreateFolderModal": ["폴더 이름을 검증하고 현재 project·parent 문맥에 폴더 resource를 생성한다.", ["react-component", "folder-management", "form", "validation"]],
  "apps/web/src/features/resources/ResourceDetailModal.jsx:ResourceDetailModal": ["선택한 자료와 담당자 정보를 읽기 전용 상세 화면으로 렌더링한다.", ["react-component", "resource-detail", "modal"]],
  "apps/web/src/features/resources/ResourcesPage.jsx:ResourcesPage": ["project resource를 폴더·검색·유형·정렬 상태에 따라 파생하고 관련 Modal을 조정한다.", ["react-component", "resource-management", "folder-navigation", "search-filter"]],
  "apps/web/src/features/tasks/MyTasksPage.jsx:MyTasksPage": ["현재 사용자의 할 일을 project별로 그룹화하고 상세 Modal 상태를 관리한다.", ["react-component", "task-management", "grouping", "user-scope"]],
  "apps/web/src/features/tasks/components/TaskCreateModal.jsx:TaskCreateModal": ["할 일 입력을 검증하고 비동기 생성 action의 제출·오류 상태를 처리한다.", ["react-component", "task-management", "form", "validation"]],
  "apps/web/src/features/tasks/components/TaskDetailModal.jsx:TaskDetailModal": ["할 일 정보를 표시하고 상태 갱신과 삭제 확인의 비동기 흐름을 관리한다.", ["react-component", "task-detail", "status-update", "deletion"]],
  "apps/web/src/lib/format.js:formatShortDate": ["ISO date 문자열을 월·일 중심의 짧은 화면 표시로 바꾼다.", ["utility", "date-formatting", "presentation"]],
  "apps/web/src/lib/format.js:formatPeriod": ["시작일과 종료일을 짧은 project 기간 문자열로 조합한다.", ["utility", "date-formatting", "project-period"]],
  "apps/web/src/lib/format.js:todayIso": ["현재 로컬 날짜를 YYYY-MM-DD 형식으로 반환한다.", ["utility", "local-time", "serialization"]],
  "apps/web/src/lib/format.js:addLocalDaysIso": ["현재 로컬 날짜에 지정한 일수를 더해 YYYY-MM-DD 형식으로 반환한다.", ["utility", "date-arithmetic", "local-time"]],
  "apps/web/src/components/ui/Avatar.jsx:Avatar": ["이름 이니셜을 size와 color option이 적용된 원형 avatar로 렌더링한다.", ["react-component", "avatar", "member"]],
  "apps/web/src/features/dashboard/ProjectDashboardPage.jsx:ProjectDashboardPage": ["project 전역 상태를 dashboard 지표와 최근 항목으로 파생하고 세부 화면 navigation을 연결한다.", ["react-component", "dashboard", "aggregation", "navigation"]],
  "apps/web/src/features/dashboard/ProjectPeriodModal.jsx:ProjectPeriodModal": ["프로젝트 기간 form을 검증하고 updateProject action으로 저장한다.", ["react-component", "project-period", "form", "validation"]],
  "apps/web/src/features/members/AddMemberModal.jsx:AddMemberModal": ["멤버 입력값을 검증하고 새 member record를 전역 상태에 추가한다.", ["react-component", "member-management", "form", "validation"]],
  "apps/web/src/features/members/MembersPage.jsx:MembersPage": ["현재 프로젝트 멤버별 할 일과 참여 프로젝트를 파생해 표시한다.", ["react-component", "member-management", "task-summary", "project-scope"]],
  "apps/web/src/features/projects/ProjectListPage.jsx:ProjectListPage": ["project summary를 검색어로 필터링하고 선택 navigation을 제공한다.", ["react-component", "project-list", "search-filter", "navigation"]],
  "apps/web/src/features/projects/components/ProjectCard.jsx:ProjectCard": ["project 핵심 지표와 멤버·기간을 재사용 가능한 card로 렌더링한다.", ["react-component", "project-card", "progress", "presentation"]],
  "apps/web/src/features/tasks/ProjectTasksPage.jsx:ProjectTasksPage": ["project task를 검색·상태 필터·정렬한 뒤 table 또는 board view로 렌더링한다.", ["react-component", "task-management", "sorting", "search-filter"]],
  "apps/web/src/features/tasks/ProjectTasksPage.jsx:SortHeader": ["현재 정렬 상태를 표시하고 column별 정렬 변경 callback을 호출하는 table header다.", ["react-component", "sorting", "table-header"]],
  "apps/web/src/state/selectors.js:selectProject": ["ID로 project를 조회한다.", ["state-selector", "project", "lookup"]],
  "apps/web/src/state/selectors.js:selectProjectTasks": ["project ID에 속한 task 목록을 필터링한다.", ["state-selector", "task-management", "filtering"]],
  "apps/web/src/state/selectors.js:selectProjectMembers": ["project member ID 목록을 실제 member record로 변환한다.", ["state-selector", "member-management", "derived-state"]],
  "apps/web/src/state/selectors.js:selectProjectSummaries": ["각 project의 task 진행률과 member 정보를 결합한 card용 summary를 만든다.", ["state-selector", "aggregation", "project-summary"]],
  "apps/web/src/state/useTeamFlow.js:useTeamFlow": ["TeamFlowContext 값을 반환하고 Provider 누락을 즉시 오류로 알린다.", ["react-hook", "context", "state-management", "validation"]],
  "apps/api/src/app.js:createApp": ["JSON middleware, health endpoint, 선택적 task router를 갖는 테스트 가능한 Express app을 생성한다.", ["api-handler", "express", "application-factory", "health-check"]],
  "apps/api/src/lib/supabaseClient.js:readTeamFlowSupabaseConfig": ["환경변수의 URL·project ref·secret prefix를 검증해 안전한 Supabase 설정을 반환한다.", ["configuration", "validation", "supabase", "security"]],
  "apps/api/src/lib/supabaseClient.js:createTeamFlowSupabaseClient": ["검증된 TeamFlow 설정으로 session persistence가 비활성화된 Supabase server client를 만든다.", ["factory", "supabase", "server-client", "security"]],
  "apps/api/src/tasks/taskRepository.js:TaskStoreError": ["Supabase 세부 오류를 외부 contract와 분리하기 위한 task 저장소 전용 오류다.", ["error-type", "repository", "error-handling"]],
  "apps/api/src/tasks/taskRepository.js:mapTaskRow": ["snake_case Supabase row를 shared camelCase task contract로 변환한다.", ["serialization", "data-mapping", "repository"]],
  "apps/api/src/tasks/taskRepository.js:mapTaskInput": ["shared camelCase task input을 Supabase insert용 snake_case row로 변환한다.", ["serialization", "data-mapping", "repository"]],
  "apps/api/src/tasks/taskRepository.js:createSupabaseTaskRepository": ["Supabase tasks table의 최신순 조회와 단건 생성을 제공하는 repository를 구성한다.", ["factory", "repository", "supabase", "data-access"]],
  "apps/api/src/tasks/taskRoutes.js:validateTaskCreateInput": ["task 생성 payload의 ID, 제목, 실제 달력 날짜, 상태, 설명 형식을 검증하고 정제한다.", ["validation", "task-api", "input-sanitization"]],
  "apps/api/src/tasks/taskRoutes.js:createTaskRouter": ["task 목록 GET과 생성 POST endpoint를 repository에 연결하고 오류 응답을 표준화한다.", ["api-handler", "routing", "task-api", "error-handling"]],
};

const semanticEdges = {
  2: [
    ["function:apps/web/src/features/resources/AddResourceModal.jsx:AddResourceModal", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/features/resources/AddResourceModal.jsx:AddResourceModal", "function:apps/web/src/lib/format.js:todayIso", "calls", 0.8],
    ["function:apps/web/src/features/resources/CreateFolderModal.jsx:CreateFolderModal", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/features/resources/CreateFolderModal.jsx:CreateFolderModal", "function:apps/web/src/lib/format.js:todayIso", "calls", 0.8],
    ["function:apps/web/src/features/resources/ResourceDetailModal.jsx:ResourceDetailModal", "function:apps/web/src/lib/format.js:formatShortDate", "calls", 0.8],
    ["function:apps/web/src/features/resources/ResourcesPage.jsx:ResourcesPage", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/features/resources/ResourcesPage.jsx:ResourcesPage", "function:apps/web/src/lib/format.js:formatShortDate", "calls", 0.8],
    ["function:apps/web/src/features/tasks/MyTasksPage.jsx:MyTasksPage", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/features/tasks/MyTasksPage.jsx:MyTasksPage", "function:apps/web/src/lib/format.js:formatShortDate", "calls", 0.8],
    ["function:apps/web/src/features/tasks/components/TaskCreateModal.jsx:TaskCreateModal", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/features/tasks/components/TaskDetailModal.jsx:TaskDetailModal", "function:apps/web/src/lib/format.js:formatShortDate", "calls", 0.8],
    ["function:apps/web/src/lib/format.js:formatPeriod", "function:apps/web/src/lib/format.js:formatShortDate", "calls", 0.8],
  ],
  3: [
    ["function:apps/web/src/features/dashboard/ProjectDashboardPage.jsx:ProjectDashboardPage", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/features/dashboard/ProjectDashboardPage.jsx:ProjectDashboardPage", "function:apps/web/src/state/selectors.js:selectProjectTasks", "calls", 0.8],
    ["function:apps/web/src/features/dashboard/ProjectDashboardPage.jsx:ProjectDashboardPage", "function:apps/web/src/state/selectors.js:selectProjectMembers", "calls", 0.8],
    ["function:apps/web/src/features/dashboard/ProjectDashboardPage.jsx:ProjectDashboardPage", "function:apps/web/src/lib/format.js:formatPeriod", "calls", 0.8],
    ["function:apps/web/src/features/dashboard/ProjectPeriodModal.jsx:ProjectPeriodModal", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/features/members/AddMemberModal.jsx:AddMemberModal", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/features/members/MembersPage.jsx:MembersPage", "function:apps/web/src/state/selectors.js:selectProject", "calls", 0.8],
    ["function:apps/web/src/features/members/MembersPage.jsx:MembersPage", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/features/projects/ProjectListPage.jsx:ProjectListPage", "function:apps/web/src/state/selectors.js:selectProjectSummaries", "calls", 0.8],
    ["function:apps/web/src/features/projects/components/ProjectCard.jsx:ProjectCard", "function:apps/web/src/lib/format.js:formatPeriod", "calls", 0.8],
    ["function:apps/web/src/features/tasks/ProjectTasksPage.jsx:ProjectTasksPage", "function:apps/web/src/state/selectors.js:selectProjectTasks", "calls", 0.8],
    ["function:apps/web/src/features/tasks/ProjectTasksPage.jsx:ProjectTasksPage", "function:apps/web/src/state/selectors.js:selectProjectMembers", "calls", 0.8],
    ["function:apps/web/src/features/tasks/ProjectTasksPage.jsx:ProjectTasksPage", "function:apps/web/src/state/useTeamFlow.js:useTeamFlow", "calls", 0.8],
    ["function:apps/web/src/state/selectors.js:selectProjectMembers", "function:apps/web/src/state/selectors.js:selectProject", "calls", 0.8],
    ["function:apps/web/src/state/selectors.js:selectProjectSummaries", "function:apps/web/src/state/selectors.js:selectProjectTasks", "calls", 0.8],
  ],
  4: [
    ["function:apps/api/src/app.js:createApp", "function:apps/api/src/tasks/taskRoutes.js:createTaskRouter", "calls", 0.8],
    ["function:apps/api/src/lib/supabaseClient.js:createTeamFlowSupabaseClient", "function:apps/api/src/lib/supabaseClient.js:readTeamFlowSupabaseConfig", "calls", 0.8],
    ["function:apps/api/src/tasks/taskRepository.js:createSupabaseTaskRepository", "function:apps/api/src/tasks/taskRepository.js:mapTaskRow", "calls", 0.8],
    ["function:apps/api/src/tasks/taskRepository.js:createSupabaseTaskRepository", "function:apps/api/src/tasks/taskRepository.js:mapTaskInput", "calls", 0.8],
    ["function:apps/api/src/tasks/taskRoutes.js:createTaskRouter", "function:apps/api/src/tasks/taskRoutes.js:validateTaskCreateInput", "calls", 0.8],
    ["file:apps/api/src/app.js", "file:apps/api/test/health.test.js", "tested_by", 0.5],
    ["file:apps/api/src/app.js", "file:apps/api/test/tasks.test.js", "tested_by", 0.5],
    ["file:apps/api/src/lib/supabaseClient.js", "file:apps/api/test/supabaseClient.test.js", "tested_by", 0.5],
    ["file:apps/api/src/tasks/taskRepository.js", "file:apps/api/test/taskRepository.test.js", "tested_by", 0.5],
  ],
  8: [
    ["file:apps/web/src/styles/global.css", "file:apps/web/src/main.jsx", "related", 0.5],
    ["file:apps/web/src/styles/tokens.css", "file:apps/web/src/main.jsx", "related", 0.5],
    ["file:apps/web/src/styles/workspace.module.css", "file:apps/web/src/features/ai/AiPage.jsx", "related", 0.5],
    ["file:apps/web/src/styles/workspace.module.css", "file:apps/web/src/features/dashboard/ProjectDashboardPage.jsx", "related", 0.5],
    ["file:apps/web/src/styles/workspace.module.css", "file:apps/web/src/features/members/MembersPage.jsx", "related", 0.5],
    ["file:apps/web/src/styles/workspace.module.css", "file:apps/web/src/features/resources/ResourcesPage.jsx", "related", 0.5],
    ["file:apps/web/src/styles/workspace.module.css", "file:apps/web/src/features/tasks/MyTasksPage.jsx", "related", 0.5],
    ["file:apps/web/src/styles/workspace.module.css", "file:apps/web/src/features/tasks/ProjectTasksPage.jsx", "related", 0.5],
    ["file:apps/web/src/styles/workspace.module.css", "file:apps/web/src/features/tasks/components/TaskDetailModal.jsx", "related", 0.5],
  ],
};

function basename(filePath) {
  return filePath.split("/").at(-1);
}

function complexity(lines, structuralCount = 0) {
  if (lines > 200 || structuralCount > 20) return "complex";
  if (lines >= 50 || structuralCount > 8) return "moderate";
  return "simple";
}

function functionComplexity(startLine, endLine) {
  return complexity(endLine - startLine + 1);
}

function edge(source, target, type, weight) {
  return { source, target, type, direction: "forward", weight };
}

for (const batch of batches) {
  if (!selected.has(batch.batchIndex)) continue;

  const resultPath = path.join(
    uaDir,
    "tmp",
    `ua-file-extract-results-${batch.batchIndex}.json`,
  );
  const extraction = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  if (!extraction.scriptCompleted) {
    throw new Error(`batch ${batch.batchIndex}: structural extraction not completed`);
  }

  const resultByPath = new Map(extraction.results.map((item) => [item.path, item]));
  const nodes = [];
  const edges = [];
  const exportedSubnodes = new Set();

  for (const file of batch.files) {
    const info = fileInfo[file.path];
    if (!info) throw new Error(`batch ${batch.batchIndex}: missing file semantics for ${file.path}`);

    const extracted = resultByPath.get(file.path);
    const lines = extracted?.nonEmptyLines ?? file.sizeLines;
    const structuralCount = extracted
      ? extracted.metrics.functionCount + extracted.metrics.classCount + extracted.metrics.exportCount
      : 0;
    const fileNode = {
      id: `file:${file.path}`,
      type: "file",
      name: basename(file.path),
      filePath: file.path,
      summary: info.summary,
      tags: info.tags,
      complexity: complexity(lines, structuralCount),
    };
    if (info.languageNotes) fileNode.languageNotes = info.languageNotes;
    nodes.push(fileNode);

    if (!extracted) continue;
    const exports = new Set((extracted.exports ?? []).map((item) => item.name));

    for (const fn of extracted.functions ?? []) {
      const significant = fn.endLine - fn.startLine + 1 >= 10 || exports.has(fn.name);
      if (!significant) continue;
      const key = `${file.path}:${fn.name}`;
      const semantic = functionInfo[key];
      if (!semantic) throw new Error(`batch ${batch.batchIndex}: missing function semantics for ${key}`);
      const id = `function:${file.path}:${fn.name}`;
      nodes.push({
        id,
        type: "function",
        name: fn.name,
        filePath: file.path,
        lineRange: [fn.startLine, fn.endLine],
        summary: semantic[0],
        tags: semantic[1],
        complexity: functionComplexity(fn.startLine, fn.endLine),
      });
      edges.push(edge(fileNode.id, id, "contains", 1.0));
      if (exports.has(fn.name)) {
        edges.push(edge(fileNode.id, id, "exports", 0.8));
        exportedSubnodes.add(id);
      }
    }

    for (const klass of extracted.classes ?? []) {
      const significant =
        klass.endLine - klass.startLine + 1 >= 20 ||
        klass.methods.length >= 2 ||
        exports.has(klass.name);
      if (!significant) continue;
      const key = `${file.path}:${klass.name}`;
      const semantic = functionInfo[key];
      if (!semantic) throw new Error(`batch ${batch.batchIndex}: missing class semantics for ${key}`);
      const id = `class:${file.path}:${klass.name}`;
      nodes.push({
        id,
        type: "class",
        name: klass.name,
        filePath: file.path,
        lineRange: [klass.startLine, klass.endLine],
        summary: semantic[0],
        tags: semantic[1],
        complexity: functionComplexity(klass.startLine, klass.endLine),
      });
      edges.push(edge(fileNode.id, id, "contains", 1.0));
      if (exports.has(klass.name)) {
        edges.push(edge(fileNode.id, id, "exports", 0.8));
        exportedSubnodes.add(id);
      }
    }
  }

  let expectedImports = 0;
  for (const file of batch.files) {
    const imports = batch.batchImportData[file.path] ?? [];
    expectedImports += imports.length;
    for (const importedPath of imports) {
      edges.push(edge(`file:${file.path}`, `file:${importedPath}`, "imports", 0.7));
    }
  }

  for (const [source, target, type, weight] of semanticEdges[batch.batchIndex] ?? []) {
    edges.push(edge(source, target, type, weight));
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) {
    throw new Error(`batch ${batch.batchIndex}: duplicate node id`);
  }
  if (nodes.filter((node) => node.type === "file").length !== batch.files.length) {
    throw new Error(`batch ${batch.batchIndex}: missing file node`);
  }
  const actualImports = edges.filter((item) => item.type === "imports").length;
  if (actualImports !== expectedImports) {
    throw new Error(
      `batch ${batch.batchIndex}: import edge mismatch ${actualImports}/${expectedImports}`,
    );
  }
  for (const item of edges) {
    if (item.source === item.target) {
      throw new Error(`batch ${batch.batchIndex}: self edge ${item.source}`);
    }
  }
  if (nodes.length > 60 || edges.length > 120) {
    throw new Error(
      `batch ${batch.batchIndex}: output requires multipart (${nodes.length} nodes, ${edges.length} edges)`,
    );
  }

  const outputPath = path.join(
    uaDir,
    "intermediate",
    `batch-${batch.batchIndex}.json`,
  );
  fs.writeFileSync(outputPath, `${JSON.stringify({ nodes, edges }, null, 2)}\n`, "utf8");
}
