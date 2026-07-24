import fs from "node:fs";
import path from "node:path";

const projectRoot = "C:\\Users\\jsjh0\\Desktop\\부트캠프\\AI Agent Challenge\\hub";
const uaDir = path.join(projectRoot, ".ua");
const tmpDir = path.join(uaDir, "tmp");
const intermediateDir = path.join(uaDir, "intermediate");
const batchIndexes = [1, 2, 3, 4, 5];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const batchesDocument = readJson(path.join(intermediateDir, "batches.json"));
const batchByIndex = new Map(
  batchesDocument.batches.map((batch) => [batch.batchIndex, batch]),
);

const fileSummaries = {
  "apps/web/src/components/layout/AppShell.jsx":
    "전역 탐색, 프로젝트 전환·생성, 로그인 사용자 또는 게스트의 계정 메뉴를 제공하는 TeamFlow 최상위 layout입니다.",
  "apps/web/src/components/layout/ProjectShell.jsx":
    "선택한 프로젝트의 하위 route 탐색과 outlet context를 구성하고 할 일 생성·상세 modal을 조정하는 프로젝트 작업공간 shell입니다.",
  "apps/web/src/components/ui/Modal.jsx":
    "배경 scroll 제어, Escape·overlay 닫기, 제목과 action 영역을 공통 처리하는 접근 가능한 modal 기반 component입니다.",
  "apps/web/src/features/dashboard/ProjectPeriodModal.jsx":
    "프로젝트 시작일과 종료일을 검증해 기간 수정 action으로 전달하는 dashboard용 modal form입니다.",
  "apps/web/src/features/members/EditMemberModal.jsx":
    "프로젝트 협업자의 이름과 역할을 편집하고 변경 내용을 저장하는 member 관리 modal입니다.",
  "apps/web/src/features/members/InviteCollaboratorModal.jsx":
    "이메일 주소를 검증해 프로젝트 협업자 초대를 전송하고 제출 오류를 표시하는 modal입니다.",
  "apps/web/src/features/members/MemberRemovalModal.jsx":
    "협업자 제거 또는 현재 사용자의 프로젝트 나가기를 확인하고 관련 action을 실행하는 경고 modal입니다.",
  "apps/web/src/features/members/MembersPage.jsx":
    "프로젝트 협업자와 초대 상태를 보여주고 초대·편집·제거 흐름을 연결하는 member 관리 화면입니다.",
  "apps/web/src/features/notes/NoteTemplateModal.jsx":
    "회의록 등 미리 정의된 노트 template을 선택해 편집 화면에 적용하도록 제공하는 modal입니다.",
  "apps/web/src/features/notes/NotesPage.jsx":
    "공유 노트를 검색·정렬·생성·편집·삭제하고 Markdown preview와 template 적용, 저장 상태를 관리하는 노트 작업공간입니다.",
  "apps/web/src/features/projects/components/NewProjectModal.jsx":
    "프로젝트 이름·설명·기간·상태를 검증해 새 프로젝트 생성 action으로 전달하는 modal form입니다.",
  "apps/web/src/features/resources/CreateFolderModal.jsx":
    "현재 자료실 위치 아래에 새 폴더를 만들기 위한 이름 입력과 validation·제출 상태를 관리합니다.",
  "apps/web/src/features/tasks/components/TaskCreateModal.jsx":
    "담당 가능한 협업자를 기준으로 제목·담당자·마감일·상태·설명을 검증해 프로젝트 할 일을 생성합니다.",
  "apps/web/src/state/selectors.js":
    "TeamFlow 전역 상태에서 프로젝트·할 일·협업자·AI 실행·초대와 카드용 요약을 파생하는 순수 selector 모음입니다.",
  "apps/web/src/state/useTeamFlow.js":
    "TeamFlowContext를 읽고 Provider 밖에서 호출되면 명시적 오류를 내는 전역 상태 접근용 custom hook입니다.",
  "apps/web/src/auth/AuthContext.js":
    "로그인 session, profile, guest 상태와 인증 action을 전달하기 위한 React Context 객체를 정의합니다.",
  "apps/web/src/auth/AuthFlows.test.jsx":
    "Google OAuth 로그인, guest 진입, 보호 route와 logout 등 주요 인증 사용자 흐름을 검증합니다.",
  "apps/web/src/auth/AuthProvider.jsx":
    "Supabase session 구독과 Google OAuth, logout, guest session을 통합해 인증 상태를 React Context로 제공합니다.",
  "apps/web/src/auth/supabaseClient.js":
    "브라우저 환경변수의 Supabase URL·anon key를 검증하고 인증용 client를 지연 생성하거나 주입받도록 합니다.",
  "apps/web/src/auth/supabaseClient.test.js":
    "브라우저 Supabase 설정 누락·형식 오류와 정상 client 생성 조건을 검증합니다.",
  "apps/web/src/features/AppFlows.test.jsx":
    "실제 route와 provider를 함께 렌더링해 프로젝트·할 일·노트·자료·AI 팀원 등 핵심 사용자 흐름을 검증하는 통합 UI 테스트입니다.",
  "apps/web/src/features/CollaborationFlows.test.jsx":
    "협업자 초대·수락·역할 편집·제거와 프로젝트 탈퇴 같은 협업 수명주기를 검증하는 통합 테스트입니다.",
  "apps/web/src/features/notes/MarkdownPreview.jsx":
    "노트의 제한된 Markdown heading·목록·인용·강조·inline code를 React element로 변환하는 경량 preview renderer입니다.",
  "apps/web/src/features/tasks/components/TaskDetailModal.test.jsx":
    "할 일 상세 modal의 상태 변경, 저장·삭제, 오류 표시와 권한별 동작을 검증합니다.",
  "apps/web/src/main.jsx":
    "React root를 만들고 BrowserRouter, AuthProvider, TeamFlowProvider, App을 조합해 웹 애플리케이션을 부트스트랩합니다.",
  "apps/web/src/test/createTestTeamFlowRepository.js":
    "프로젝트·협업자·할 일·노트·자료·AI 실행을 메모리에서 처리하는 테스트 전용 repository 구현을 제공합니다.",
  "apps/web/src/test/renderTeamFlowApp.jsx":
    "인증 session과 테스트 repository를 주입해 TeamFlow App을 원하는 route에서 렌더링하는 공통 테스트 helper입니다.",
  "apps/web/src/test/teamFlowFixture.js":
    "통합 테스트가 공유하는 프로젝트, 협업자, 할 일, 노트, 자료, AI agent·run fixture를 정의합니다.",
  "apps/web/src/components/ui/Avatar.jsx":
    "프로필 이미지가 있으면 사진을, 없으면 이름 이니셜을 표시하는 재사용 가능한 avatar component입니다.",
  "apps/web/src/components/ui/StatusBadge.jsx":
    "공유 상태 상수를 한국어 label과 시각적 variant로 매핑해 표시하는 badge component입니다.",
  "apps/web/src/constants/labels.js":
    "project·task 상태와 resource 유형의 한국어 표시명 및 task 정렬 순서를 중앙에서 정의합니다.",
  "apps/web/src/features/ai/AiPage.jsx":
    "프로젝트 AI 팀원의 설정·context·brief, 실행 요청·상태 polling·결과 기록을 한 화면에서 관리합니다.",
  "apps/web/src/features/dashboard/ProjectDashboardPage.jsx":
    "프로젝트 진행률, 상태별 할 일, 협업자, 최근 노트·자료를 집계하고 기간 편집을 연결하는 dashboard입니다.",
  "apps/web/src/features/projects/components/ProjectSettingsModal.jsx":
    "프로젝트 기본 정보 수정, 초대 관리와 프로젝트 삭제 등 설정 작업을 한 modal에서 제공합니다.",
  "apps/web/src/features/tasks/MyTasksPage.jsx":
    "현재 사용자에게 배정된 할 일을 프로젝트별로 묶어 보여주고 선택한 항목의 상세 흐름을 엽니다.",
  "apps/web/src/features/tasks/ProjectTasksPage.jsx":
    "프로젝트 할 일을 상태·검색어로 필터링하고 정렬하며 table 또는 board 형태와 inline 상태 변경을 제공합니다.",
  "apps/web/src/features/tasks/components/TaskDetailModal.jsx":
    "할 일 상세 값을 편집·검증해 저장하고 상태 변경·삭제 확인과 권한·오류 처리를 제공하는 modal입니다.",
  "apps/web/src/lib/format.js":
    "날짜 단축 표시, 프로젝트 기간, 오늘 날짜와 로컬 날짜 가산을 일관된 ISO 형식으로 제공하는 utility입니다.",
  "apps/web/src/lib/format.test.js":
    "날짜 표시와 기간 조합, 로컬 오늘 날짜·날짜 가산의 정상 및 경계 사례를 검증합니다.",
  "apps/web/src/App.jsx":
    "landing·OAuth callback·guest demo·보호 route를 포함한 TeamFlow의 최상위 React route tree를 정의합니다.",
  "apps/web/src/auth/AuthCallbackPage.jsx":
    "Supabase OAuth callback 처리 상태를 확인하고 성공 시 app으로, 실패 시 설명 가능한 오류 화면으로 전환합니다.",
  "apps/web/src/auth/ProtectedRoute.jsx":
    "인증 loading을 처리하고 로그인 사용자나 guest session만 하위 route에 접근하도록 제한합니다.",
  "apps/web/src/auth/useAuth.js":
    "AuthContext를 읽고 Provider 외부 사용을 차단하는 인증 상태 접근용 custom hook입니다.",
  "apps/web/src/data/apiTeamFlowRepository.js":
    "access token을 포함한 API 요청으로 프로젝트·협업자·할 일·노트·자료·AI 실행을 처리하고 guest demo용 read-only repository도 제공합니다.",
  "apps/web/src/data/apiTeamFlowRepository.test.js":
    "API base URL, 인증 header, 각 repository method의 요청·응답 mapping과 오류 정규화를 검증합니다.",
  "apps/web/src/features/landing/LandingPage.jsx":
    "TeamFlow 가치 제안과 Google 로그인, guest demo 진입 action을 제공하는 공개 landing 화면입니다.",
  "apps/web/src/state/TeamFlowContext.js":
    "TeamFlow 전역 데이터와 action을 전달하기 위한 React Context 객체를 정의합니다.",
  "apps/web/src/state/TeamFlowProvider.jsx":
    "인증 또는 guest repository에서 데이터를 hydrate하고 reducer와 비동기 action으로 전체 협업 상태를 관리합니다.",
  "apps/web/src/components/ui/ResourceIcon.jsx":
    "folder·link·file resource 유형을 일관된 icon으로 표시하는 공용 presentation component입니다.",
  "apps/web/src/features/resources/AddResourceModal.jsx":
    "link 또는 file resource의 입력·upload·validation·제출 상태를 관리해 현재 폴더에 자료를 추가합니다.",
  "apps/web/src/features/resources/ResourceDetailModal.jsx":
    "resource metadata를 편집하고 link 열기·file download·삭제 확인과 오류 처리를 제공하는 상세 modal입니다.",
  "apps/web/src/features/resources/ResourcesPage.jsx":
    "자료를 폴더 계층으로 탐색하고 검색·유형 filter·수정일 정렬하며 folder·resource 생성과 상세 modal을 조정합니다.",
  "apps/web/src/features/resources/resourceValidation.js":
    "허용 URL scheme, file 크기·형식, resource 유형별 필수 값을 검사하는 자료실 validation utility입니다.",
  "apps/web/src/features/resources/resourceValidation.test.js":
    "안전한 link, upload file 제한과 resource 유형별 validation 규칙의 정상·실패 사례를 검증합니다.",
};

const fileLanguageNotes = {
  "apps/web/src/state/selectors.js":
    "selector를 순수 함수로 유지해 React component와 저장소 구현 없이 파생 상태를 독립 검증할 수 있습니다.",
  "apps/web/src/auth/AuthProvider.jsx":
    "Supabase의 초기 session 조회와 auth state subscription을 React effect 수명주기 안에서 정리합니다.",
  "apps/web/src/features/notes/MarkdownPreview.jsx":
    "외부 Markdown parser 없이 제한된 문법만 순차 문자열 변환으로 렌더링합니다.",
  "apps/web/src/App.jsx":
    "React Router의 중첩 route와 경계 component로 공개·인증·guest 화면을 분리합니다.",
  "apps/web/src/data/apiTeamFlowRepository.js":
    "repository factory가 token provider와 fetch 구현을 주입받아 인증과 HTTP 처리를 테스트 가능하게 분리합니다.",
  "apps/web/src/state/TeamFlowProvider.jsx":
    "useReducer로 상태 전이를 집중시키고 repository mutation 뒤 dispatch하여 서버 상태와 화면 상태를 동기화합니다.",
  "apps/web/src/features/resources/resourceValidation.js":
    "URL parser와 allowlist를 함께 사용해 javascript 같은 위험한 scheme을 거부합니다.",
};

const symbolSummaries = {
  AppShell: "전역 navigation과 outlet, 프로젝트 생성 및 계정 영역을 조합하는 application shell입니다.",
  Brand: "TeamFlow 브랜드 표식을 렌더링하는 작은 presentation component입니다.",
  Account: "로그인 profile 또는 guest 정보를 표시하고 계정 menu와 logout 동작을 관리합니다.",
  AccountAvatar: "profile image 또는 사용자 이니셜을 account avatar로 표시합니다.",
  ProjectShell: "현재 프로젝트를 선택하고 프로젝트 navigation·outlet·할 일 modal context를 구성합니다.",
  Modal: "modal overlay와 panel의 접근성, 닫기 동작, header·body·footer 구성을 공통화합니다.",
  ProjectPeriodModal: "시작일·종료일의 유효성을 검사해 프로젝트 기간 변경을 저장합니다.",
  EditMemberModal: "협업자 이름과 역할 입력을 관리하고 수정 action을 제출합니다.",
  InviteCollaboratorModal: "초대 이메일을 검증하고 협업자 invitation action을 실행합니다.",
  MemberRemovalModal: "협업자 제거 또는 프로젝트 탈퇴를 확인한 뒤 destructive action을 실행합니다.",
  MembersPage: "프로젝트 협업자·초대를 조회하고 초대·편집·제거 modal 흐름을 조정합니다.",
  MemberCard: "협업자의 profile, 역할과 관리 action을 카드 형태로 표시합니다.",
  NoteTemplateModal: "노트 template 목록을 보여주고 선택 결과를 편집기에 전달합니다.",
  sortNotes: "선택한 정렬 기준에 따라 노트 배열의 안정적인 표시 순서를 계산합니다.",
  NotesPage: "공유 노트의 선택·검색·정렬·편집·저장·삭제와 preview 상태를 통합 관리합니다.",
  NewProjectModal: "새 프로젝트 form 값을 검증하고 생성 action에 정규화된 payload를 전달합니다.",
  CreateFolderModal: "자료실 folder 이름을 검증해 현재 위치 아래에 새 folder를 생성합니다.",
  TaskCreateModal: "담당자·마감일·상태를 포함한 새 할 일 form을 검증하고 제출합니다.",
  selectProject: "project ID로 단일 프로젝트를 선택합니다.",
  selectProjectTasks: "project ID에 속한 할 일만 선택합니다.",
  selectProjectMembers: "project ID에 연결된 협업자 목록을 선택합니다.",
  selectAssignableProjectMembers: "할 일 담당자로 지정 가능한 활성 협업자를 선택합니다.",
  selectProjectAiMember: "프로젝트에 연결된 AI member를 선택합니다.",
  selectProjectAiAgent: "프로젝트 AI agent 설정을 선택합니다.",
  selectProjectAiRuns: "프로젝트 AI 실행 기록을 최신 흐름에 맞게 선택합니다.",
  selectProjectSummaries: "각 프로젝트의 할 일·협업자·진행률 요약을 계산합니다.",
  selectReceivedInvitations: "현재 사용자에게 도착한 협업 invitation을 선택합니다.",
  useTeamFlow: "TeamFlowContext 값을 반환하고 Provider 외부 호출을 오류로 차단합니다.",
  renderWithAuth: "테스트용 AuthProvider와 route를 조합해 인증 화면을 렌더링합니다.",
  profileFromSession: "Supabase session metadata에서 화면에 사용할 사용자 profile을 정규화합니다.",
  AuthProvider: "인증 session, Google OAuth, logout과 guest mode를 Context value로 제공합니다.",
  readBrowserSupabaseConfig: "브라우저 환경변수에서 Supabase URL과 anon key를 읽고 유효성을 검사합니다.",
  createBrowserSupabaseClient: "검증된 브라우저 설정으로 Supabase client를 생성합니다.",
  resolveBrowserSupabaseClient: "주입된 client를 우선 사용하고 없으면 기본 브라우저 client를 지연 생성합니다.",
  inline: "강조·취소선·inline code 표기를 React inline element로 변환합니다.",
  MarkdownPreview: "줄 단위 Markdown을 heading·목록·인용·본문 element로 렌더링합니다.",
  createTestAuthClient: "인증 상태와 auth callback을 예측 가능하게 모사하는 테스트 client를 만듭니다.",
  renderAuthenticatedApp: "인증 session과 repository를 주입한 TeamFlow app을 지정 route에서 렌더링합니다.",
  Avatar: "profile image가 없을 때 이름 이니셜로 fallback하는 avatar를 렌더링합니다.",
  StatusBadge: "도메인 상태를 label과 색상 variant가 있는 badge로 표시합니다.",
  AiPage: "AI agent 설정·brief 실행·polling·결과와 오류 상태를 통합 관리합니다.",
  ProjectDashboardPage: "프로젝트 핵심 지표와 최근 활동을 집계해 dashboard panel로 구성합니다.",
  ProjectSettingsModal: "프로젝트 정보·협업 설정·삭제 action을 하나의 설정 modal에서 관리합니다.",
  MyTasksPage: "현재 사용자 할 일을 프로젝트별로 그룹화하고 상세 modal을 연결합니다.",
  ProjectTasksPage: "프로젝트 할 일을 검색·filter·정렬하고 table 또는 board view로 표시합니다.",
  SortHeader: "현재 정렬 상태와 다음 방향을 반영하는 table header control을 렌더링합니다.",
  TaskStatusMenu: "할 일 상태 선택 menu와 비동기 변경 상태를 관리합니다.",
  TaskDetailModal: "할 일 값을 편집·검증하고 저장·상태 변경·삭제 workflow를 조정합니다.",
  formatShortDate: "날짜 값을 한국어 단축 날짜 문자열로 안전하게 변환합니다.",
  formatPeriod: "시작일과 종료일을 하나의 프로젝트 기간 문자열로 조합합니다.",
  todayIso: "현재 로컬 날짜를 YYYY-MM-DD 형식으로 반환합니다.",
  addLocalDaysIso: "오늘을 기준으로 지정한 일수만큼 이동한 로컬 ISO 날짜를 계산합니다.",
  App: "공개 landing, OAuth callback, guest demo와 보호된 TeamFlow route tree를 구성합니다.",
  TeamFlowBoundary: "인증·guest 상태에 맞는 repository를 선택해 TeamFlowProvider 경계를 만듭니다.",
  AuthCallbackPage: "OAuth callback 결과를 해석해 app redirect 또는 오류 안내를 렌더링합니다.",
  ProtectedRoute: "인증 또는 guest session이 있을 때만 하위 route를 렌더링합니다.",
  useAuth: "AuthContext 값을 반환하고 Provider 외부 호출을 오류로 차단합니다.",
  normalizeApiBaseUrl: "환경에 따른 API base URL을 검증하고 trailing slash를 정규화합니다.",
  readJson: "HTTP 응답 JSON을 읽고 실패 상태를 TeamFlowApiError로 변환합니다.",
  createApiTeamFlowRepository: "인증 API를 통해 TeamFlow 도메인 CRUD와 AI 실행을 제공하는 repository를 만듭니다.",
  createDemoTeamFlowRepository: "guest demo 데이터를 읽기 전용으로 제공하고 mutation을 차단하는 repository를 만듭니다.",
  TeamFlowApiError: "HTTP status와 응답 payload를 보존하는 API 전용 오류입니다.",
  LandingPage: "서비스 소개와 Google 로그인·guest demo 진입 action을 표시합니다.",
  reducer: "hydrate와 모든 도메인 mutation action을 불변 상태 전이로 처리합니다.",
  TeamFlowProvider: "repository 수명주기와 비동기 action을 Context value로 묶어 하위 화면에 제공합니다.",
  ResourceIcon: "resource 유형에 맞는 folder·link·file icon을 렌더링합니다.",
  AddResourceModal: "link 또는 file 입력을 검증하고 upload·생성 action을 제출합니다.",
  ResourceDetailModal: "resource 편집·열기·download·삭제와 오류 상태를 관리합니다.",
  ResourcesPage: "folder navigation, 검색·filter·정렬과 resource modal 흐름을 통합합니다.",
  isSafeHttpUrl: "URL을 parse해 HTTP·HTTPS scheme만 안전한 link로 허용합니다.",
  validateUploadFile: "upload file의 크기와 허용 조건을 검사합니다.",
  validateResource: "resource 유형별 필수 field와 URL·file 조건을 종합 검증합니다.",
};

function complexityForLines(lines) {
  if (lines > 200) return "complex";
  if (lines >= 50) return "moderate";
  return "simple";
}

function domainTag(filePath) {
  if (filePath.includes("/auth/")) return "authentication";
  if (filePath.includes("/members/")) return "collaboration";
  if (filePath.includes("/notes/")) return "notes";
  if (filePath.includes("/resources/")) return "resources";
  if (filePath.includes("/tasks/")) return "task-management";
  if (filePath.includes("/projects/")) return "project-management";
  if (filePath.includes("/dashboard/")) return "dashboard";
  if (filePath.includes("/ai/")) return "ai-workflow";
  if (filePath.includes("/state/")) return "state-management";
  if (filePath.includes("/test/")) return "testing";
  return "teamflow";
}

function fileTags(filePath) {
  const domain = domainTag(filePath);
  if (filePath.includes(".test.")) return ["test", domain, "regression"];
  if (filePath.endsWith("/main.jsx")) return ["entry-point", "react", "routing"];
  if (filePath.endsWith("/App.jsx")) return ["entry-point", "routing", "component"];
  if (filePath.includes("/test/")) return ["test-utility", "fixture", "testing"];
  if (filePath.includes("/state/"))
    return ["state-management", "react", filePath.includes("selectors") ? "selector" : "context"];
  if (filePath.includes("/auth/")) return ["authentication", "security", "react"];
  if (filePath.includes("/data/")) return ["repository", "api-client", "serialization"];
  if (filePath.includes("/constants/")) return ["configuration", "localization", "type-definition"];
  if (filePath.includes("/lib/")) return ["utility", "date", "formatting"];
  if (filePath.includes("/components/ui/")) return ["component", "ui", "react"];
  if (filePath.includes("/components/layout/")) return ["component", "layout", "navigation"];
  if (filePath.includes("Validation")) return ["validation", domain, "security"];
  return ["component", domain, "react"];
}

function symbolTags(filePath, name, type) {
  const domain = domainTag(filePath);
  if (type === "class") return ["error-handling", "api-client", "data-model"];
  if (name.startsWith("select")) return ["selector", "state-management", "utility"];
  if (name.startsWith("use")) return ["hook", domain, "react"];
  if (name === "reducer") return ["reducer", "state-management", "event-handler"];
  if (/validate|SafeHttpUrl/.test(name)) return ["validation", domain, "security"];
  if (/format|todayIso|addLocalDaysIso/.test(name)) return ["utility", "formatting", "date"];
  if (/render|createTestAuthClient/.test(name)) return ["test-utility", "testing", "react"];
  if (/Supabase|Session|AuthProvider/.test(name))
    return ["authentication", "security", "service"];
  if (/Repository|readJson|normalizeApi/.test(name))
    return ["repository", "api-client", "serialization"];
  if (/^sort/.test(name)) return ["utility", "sorting", domain];
  if (/^[A-Z]/.test(name)) return ["component", domain, "react"];
  return ["utility", domain, "javascript"];
}

function makeNode({ id, type, name, filePath, summary, tags, complexity, lineRange, languageNotes }) {
  const node = { id, type, name, filePath, summary, tags, complexity };
  if (lineRange) node.lineRange = lineRange;
  if (languageNotes) node.languageNotes = languageNotes;
  return node;
}

function makeEdge(source, target, type, weight) {
  return { source, target, type, direction: "forward", weight };
}

function analyzeBatch(batch, extraction) {
  const nodes = [];
  const edges = [];
  const localFilePaths = new Set(batch.files.map((file) => file.path));

  for (const result of extraction.results) {
    const summary = fileSummaries[result.path];
    if (!summary) throw new Error(`Missing file summary for ${result.path}`);
    const fileNode = makeNode({
      id: `file:${result.path}`,
      type: "file",
      name: path.basename(result.path),
      filePath: result.path,
      summary,
      tags: fileTags(result.path),
      complexity: complexityForLines(result.nonEmptyLines),
      languageNotes: fileLanguageNotes[result.path],
    });
    nodes.push(fileNode);

    const exportedNames = new Set((result.exports ?? []).map((item) => item.name));
    for (const fn of result.functions ?? []) {
      const lineCount = fn.endLine - fn.startLine + 1;
      if (lineCount < 10 && !exportedNames.has(fn.name)) continue;
      const functionSummary = symbolSummaries[fn.name];
      if (!functionSummary) {
        throw new Error(`Missing function summary for ${result.path}:${fn.name}`);
      }
      const functionId = `function:${result.path}:${fn.name}`;
      nodes.push(
        makeNode({
          id: functionId,
          type: "function",
          name: fn.name,
          filePath: result.path,
          lineRange: [fn.startLine, fn.endLine],
          summary: functionSummary,
          tags: symbolTags(result.path, fn.name, "function"),
          complexity: complexityForLines(lineCount),
        }),
      );
      edges.push(makeEdge(fileNode.id, functionId, "contains", 1.0));
      if (exportedNames.has(fn.name)) {
        edges.push(makeEdge(fileNode.id, functionId, "exports", 0.8));
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
      const classSummary = symbolSummaries[cls.name];
      if (!classSummary) {
        throw new Error(`Missing class summary for ${result.path}:${cls.name}`);
      }
      const classId = `class:${result.path}:${cls.name}`;
      nodes.push(
        makeNode({
          id: classId,
          type: "class",
          name: cls.name,
          filePath: result.path,
          lineRange: [cls.startLine, cls.endLine],
          summary: classSummary,
          tags: symbolTags(result.path, cls.name, "class"),
          complexity: complexityForLines(lineCount),
        }),
      );
      edges.push(makeEdge(fileNode.id, classId, "contains", 1.0));
      if (exportedNames.has(cls.name)) {
        edges.push(makeEdge(fileNode.id, classId, "exports", 0.8));
      }
    }
  }

  for (const file of batch.files) {
    if (file.fileCategory !== "code") continue;
    for (const targetPath of batch.batchImportData[file.path]) {
      edges.push(makeEdge(`file:${file.path}`, `file:${targetPath}`, "imports", 0.7));
    }
  }

  for (const testFile of batch.files.filter((file) => file.path.includes(".test."))) {
    for (const productionPath of batch.batchImportData[testFile.path]) {
      if (!localFilePaths.has(productionPath) || productionPath.includes(".test.")) continue;
      edges.push(
        makeEdge(`file:${productionPath}`, `file:${testFile.path}`, "tested_by", 0.5),
      );
    }
  }

  return { nodes, edges };
}

function knownReferenceValidator(batch, localIds) {
  const knownFiles = new Set();
  const neighborSymbols = new Map();
  for (const [sourcePath, targets] of Object.entries(batch.batchImportData)) {
    knownFiles.add(sourcePath);
    for (const target of targets) knownFiles.add(target);
  }
  for (const [sourcePath, neighbors] of Object.entries(batch.neighborMap)) {
    knownFiles.add(sourcePath);
    for (const neighbor of neighbors) {
      knownFiles.add(neighbor.path);
      neighborSymbols.set(neighbor.path, new Set(neighbor.symbols));
    }
  }
  return (id) => {
    if (localIds.has(id)) return true;
    if (id.startsWith("file:")) return knownFiles.has(id.slice(5));
    const match = /^(function|class):(.+):([^:]+)$/.exec(id);
    return Boolean(match && neighborSymbols.get(match[2])?.has(match[3]));
  };
}

function validateGraph(batch, graph) {
  const localIds = new Set();
  for (const node of graph.nodes) {
    if (localIds.has(node.id)) throw new Error(`Duplicate node ${node.id}`);
    localIds.add(node.id);
    if (!node.summary || !Array.isArray(node.tags) || node.tags.length < 3) {
      throw new Error(`Incomplete node ${node.id}`);
    }
    if (!["simple", "moderate", "complex"].includes(node.complexity)) {
      throw new Error(`Invalid complexity ${node.id}`);
    }
  }
  const referenceIsKnown = knownReferenceValidator(batch, localIds);
  for (const edge of graph.edges) {
    if (edge.source === edge.target) throw new Error(`Self edge ${edge.source}`);
    if (!referenceIsKnown(edge.source) || !referenceIsKnown(edge.target)) {
      throw new Error(`Unknown edge ${edge.source} -> ${edge.target}`);
    }
  }
  const expectedImports = batch.files
    .filter((file) => file.fileCategory === "code")
    .reduce((sum, file) => sum + batch.batchImportData[file.path].length, 0);
  const actualImports = graph.edges.filter((edge) => edge.type === "imports").length;
  if (expectedImports !== actualImports) {
    throw new Error(
      `Batch ${batch.batchIndex} import mismatch: ${expectedImports} != ${actualImports}`,
    );
  }
  const coveredFiles = new Set(graph.nodes.map((node) => node.filePath));
  const missingFiles = batch.files.filter((file) => !coveredFiles.has(file.path));
  if (missingFiles.length > 0) {
    throw new Error(`Batch ${batch.batchIndex} missing files: ${missingFiles.map((file) => file.path)}`);
  }
}

function partitionGraph(batch, graph) {
  const requestedParts = Math.ceil(
    Math.max(graph.nodes.length / 60, graph.edges.length / 120),
  );
  if (requestedParts <= 1) return [graph];
  const sortedFiles = [...batch.files].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  const chunkSize = Math.ceil(sortedFiles.length / requestedParts);
  const parts = [];
  for (let offset = 0; offset < sortedFiles.length; offset += chunkSize) {
    const filePaths = new Set(
      sortedFiles.slice(offset, offset + chunkSize).map((file) => file.path),
    );
    const partNodes = graph.nodes.filter((node) => filePaths.has(node.filePath));
    const partNodeIds = new Set(partNodes.map((node) => node.id));
    const partEdges = graph.edges.filter((edge) => partNodeIds.has(edge.source));
    parts.push({ nodes: partNodes, edges: partEdges });
  }
  return parts;
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
  const graph = analyzeBatch(batch, extraction);
  validateGraph(batch, graph);
  const parts = partitionGraph(batch, graph);
  const outputFiles = [];
  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const outputName =
      parts.length === 1
        ? `batch-${batchIndex}.json`
        : `batch-${batchIndex}-part-${partIndex + 1}.json`;
    const outputPath = path.join(intermediateDir, outputName);
    fs.writeFileSync(outputPath, `${JSON.stringify(parts[partIndex], null, 2)}\n`, "utf8");
    const reparsed = readJson(outputPath);
    if (!Array.isArray(reparsed.nodes) || !Array.isArray(reparsed.edges)) {
      throw new Error(`Invalid output ${outputName}`);
    }
    const partIds = new Set(reparsed.nodes.map((node) => node.id));
    const referenceIsKnown = knownReferenceValidator(batch, partIds);
    for (const edge of reparsed.edges) {
      if (!referenceIsKnown(edge.source) || !referenceIsKnown(edge.target)) {
        throw new Error(
          `Part validation failed ${outputName}: ${edge.source} -> ${edge.target}`,
        );
      }
    }
    outputFiles.push(outputName);
  }
  reports.push({
    batchIndex,
    outputFiles,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    imports: graph.edges.filter((edge) => edge.type === "imports").length,
    filesSkipped: extraction.filesSkipped,
  });
}

console.log(JSON.stringify(reports, null, 2));
