import fs from "node:fs";
import path from "node:path";

const batchIndexes = [1, 2, 3, 4, 5, 6];
const batchesData = JSON.parse(
  fs.readFileSync(".ua/intermediate/batches.json", "utf8"),
);

const fileSummaries = {
  "apps/api/src/app.js":
    "Express application을 만들고 CORS, health check, TeamFlow API router를 조립하는 API 진입 구성 파일입니다.",
  "apps/api/src/lib/auth.js":
    "Bearer token을 해석하고 Supabase에서 사용자를 검증해 요청에 인증 정보를 주입하는 Express authentication middleware를 제공합니다.",
  "apps/api/src/lib/cors.js":
    "허용 origin 환경 설정을 정규화하고 요청 origin을 검사하는 Express CORS 옵션을 구성합니다.",
  "apps/api/src/lib/supabaseClient.js":
    "서버용 Supabase URL과 service role key를 검증하고 TeamFlow API가 사용할 Supabase client를 생성합니다.",
  "apps/api/src/runtime.js":
    "환경 설정에서 인증, CORS, Supabase repository를 구성한 뒤 실행 가능한 TeamFlow Express application으로 결합합니다.",
  "apps/api/src/server.js":
    "구성된 Express application을 지정된 port에서 시작하는 API process entry point입니다.",
  "apps/api/src/teamflow/mockAiGenerator.js":
    "프로젝트의 작업·노트·자료 snapshot을 정규화하고 크기를 제한한 뒤 결정적인 Mock AI Markdown 결과를 생성합니다.",
  "apps/api/src/teamflow/teamFlowRepository.js":
    "Supabase table과 RPC를 통해 프로젝트, 멤버, 작업, 노트, 자료, 초대, AI 실행의 전체 데이터 수명주기를 구현하는 repository입니다.",
  "apps/api/src/teamflow/teamFlowRoutes.js":
    "TeamFlow HTTP endpoint를 정의하고 요청 payload 검증, authentication middleware, repository 호출, 오류 응답 변환을 조정합니다.",
  "apps/api/test/auth.test.js":
    "Bearer token 파싱과 Supabase 인증 검증, authentication middleware의 성공·실패 경계를 검증하는 Node 테스트입니다.",
  "apps/api/test/cors.test.js":
    "허용 origin 설정과 Express CORS callback이 승인·거절 요청을 올바르게 처리하는지 검증합니다.",
  "apps/api/test/health.test.js":
    "Express application의 health endpoint가 기대한 상태와 service 정보를 반환하는지 검증합니다.",
  "apps/api/test/mockAiGenerator.test.js":
    "Mock AI context 정규화, snapshot 제한, 결정적 Markdown 생성과 입력 격리 규칙을 폭넓게 검증합니다.",
  "apps/api/test/supabaseClient.test.js":
    "서버 Supabase 환경 설정의 누락·형식 오류와 정상 client 생성 조건을 검증합니다.",
  "apps/api/test/teamFlowRepository.test.js":
    "Supabase query와 RPC를 모의해 TeamFlow repository의 CRUD, 오류 변환, 자료 업로드, AI 실행 동작을 검증합니다.",
  "apps/api/test/teamFlowRoutes.test.js":
    "실제 Express router와 test repository를 사용해 TeamFlow API endpoint의 인증, 검증, 응답, 오류 처리를 통합 검증합니다.",
  "apps/web/src/components/layout/AppShell.jsx":
    "전역 navigation, 프로젝트 전환·생성, 사용자 또는 guest 계정 메뉴를 제공하는 TeamFlow 최상위 layout component입니다.",
  "apps/web/src/components/layout/ProjectShell.jsx":
    "선택된 프로젝트의 하위 route와 outlet context를 구성하고 작업 생성·상세 modal 상태를 조정하는 workspace shell입니다.",
  "apps/web/src/components/ui/Modal.jsx":
    "Escape와 overlay 닫기, 배경 scroll 잠금, 제목·본문·action 영역을 공통 처리하는 접근 가능한 modal component입니다.",
  "apps/web/src/features/dashboard/ProjectPeriodModal.jsx":
    "프로젝트 시작일과 종료일을 편집·검증하고 전역 action으로 저장하는 기간 설정 modal입니다.",
  "apps/web/src/features/members/EditMemberModal.jsx":
    "협업자의 이름과 역할을 편집하고 TeamFlow 상태 action으로 저장하는 member modal입니다.",
  "apps/web/src/features/members/InviteCollaboratorModal.jsx":
    "초대 이메일을 입력·검증해 프로젝트 협업자 초대 action을 실행하는 modal입니다.",
  "apps/web/src/features/members/MemberRemovalModal.jsx":
    "협업자 제거의 영향을 안내하고 확인 event를 실제 제거 action으로 연결하는 modal입니다.",
  "apps/web/src/features/members/MembersPage.jsx":
    "프로젝트 협업자와 초대 상태를 표시하고 초대·편집·제거 modal 흐름을 조정하는 팀원 관리 페이지입니다.",
  "apps/web/src/features/notes/NoteTemplateModal.jsx":
    "선택한 template으로 새 노트를 시작하도록 상위 callback을 호출하는 간단한 template 선택 modal입니다.",
  "apps/web/src/features/notes/NotesPage.jsx":
    "프로젝트 노트를 검색·정렬하고 생성, template 적용, 편집, Markdown preview, 삭제 수명주기를 관리하는 페이지입니다.",
  "apps/web/src/features/projects/components/NewProjectModal.jsx":
    "프로젝트 이름·설명·기간을 입력하고 검증한 뒤 새 프로젝트 생성 action을 실행하는 modal입니다.",
  "apps/web/src/features/resources/CreateFolderModal.jsx":
    "현재 자료 계층 아래에 새 folder를 만들기 위한 이름 입력과 생성 action을 처리합니다.",
  "apps/web/src/features/tasks/components/TaskCreateModal.jsx":
    "제목, 담당자, 마감일, 상태, 설명을 검증해 선택한 프로젝트에 새 작업을 생성하는 modal입니다.",
  "apps/web/src/state/useTeamFlow.js":
    "TeamFlowContext를 읽고 Provider 밖에서 호출되면 명시적 오류를 내는 전역 상태 접근용 custom hook입니다.",
  "apps/web/src/auth/AuthContext.js":
    "로그인 session, profile, guest 상태와 인증 action을 하위 component에 전달하는 React Context 객체를 정의합니다.",
  "apps/web/src/auth/AuthFlows.test.jsx":
    "Google OAuth, guest 진입, 보호 route, logout 등 주요 인증 사용자 흐름을 React 통합 수준에서 검증합니다.",
  "apps/web/src/auth/AuthProvider.jsx":
    "Supabase session 구독, Google OAuth, logout, guest session을 통합해 인증 상태와 action을 Context로 제공합니다.",
  "apps/web/src/auth/supabaseClient.js":
    "브라우저 Supabase 환경 설정을 검증하고 실제 또는 주입된 authentication client를 지연 해석합니다.",
  "apps/web/src/auth/supabaseClient.test.js":
    "브라우저 Supabase 설정의 누락·형식 오류와 정상 client 생성·주입 조건을 검증합니다.",
  "apps/web/src/features/AppFlows.test.jsx":
    "실제 route와 Provider를 함께 렌더링해 프로젝트, 작업, 노트, 자료, AI 팀원의 핵심 사용자 흐름을 검증합니다.",
  "apps/web/src/features/CollaborationFlows.test.jsx":
    "협업자 초대·수락·역할 변경·제거와 프로젝트 탈퇴 수명주기를 화면 event 중심으로 검증합니다.",
  "apps/web/src/features/notes/MarkdownPreview.jsx":
    "제한된 Markdown 문법을 안전한 React element로 변환해 노트 preview를 렌더링합니다.",
  "apps/web/src/features/tasks/components/TaskDetailModal.test.jsx":
    "작업 상세 modal의 상태 변경, 저장·삭제, 오류 표시와 권한별 동작을 검증합니다.",
  "apps/web/src/main.jsx":
    "React root를 만들고 BrowserRouter, AuthProvider, TeamFlowProvider, App을 조합해 웹 application을 부트스트랩합니다.",
  "apps/web/src/test/createTestTeamFlowRepository.js":
    "메모리 fixture를 복제하고 실제 repository와 같은 비동기 CRUD interface를 제공하는 테스트 대역을 구성합니다.",
  "apps/web/src/test/renderTeamFlowApp.jsx":
    "인증 session과 test repository를 주입해 TeamFlow App을 원하는 route에서 렌더링하는 공통 테스트 helper입니다.",
  "apps/web/src/test/teamFlowFixture.js":
    "프로젝트, 멤버, 작업, 노트, 자료, AI agent와 실행 기록의 일관된 테스트 fixture를 제공합니다.",
  "apps/web/src/components/ui/Avatar.jsx":
    "프로필 image가 있으면 사진을, 없으면 이름의 첫 글자를 표시하는 재사용 Avatar component입니다.",
  "apps/web/src/components/ui/StatusBadge.jsx":
    "프로젝트 또는 작업 상태를 한국어 label과 상태별 style로 표시하는 badge component입니다.",
  "apps/web/src/constants/labels.js":
    "프로젝트·작업·자료 상태의 화면 label과 작업 상태 정렬 순서를 중앙에서 정의합니다.",
  "apps/web/src/features/ai/AiPage.jsx":
    "프로젝트 AI 팀원의 설정, 실행 context, 결과 Markdown과 실행 이력을 조회·편집·실행하는 관리 페이지입니다.",
  "apps/web/src/features/dashboard/ProjectDashboardPage.jsx":
    "프로젝트 진행률, 상태별 작업, 협업자, 최근 노트·자료를 집계하고 기간 편집을 연결하는 dashboard입니다.",
  "apps/web/src/features/projects/components/ProjectSettingsModal.jsx":
    "프로젝트 정보 수정, owner 전용 위험 작업, 프로젝트 나가기 흐름을 권한에 따라 제공하는 설정 modal입니다.",
  "apps/web/src/features/tasks/MyTasksPage.jsx":
    "현재 사용자에게 배정된 작업을 프로젝트별로 모아 상태와 마감일 중심으로 보여 주는 개인 작업 페이지입니다.",
  "apps/web/src/features/tasks/ProjectTasksPage.jsx":
    "프로젝트 작업을 검색·필터·정렬하고 table 또는 board로 표시하며 inline 상태 변경을 제공합니다.",
  "apps/web/src/features/tasks/components/TaskDetailModal.jsx":
    "작업 상세 값을 편집·검증해 저장하고 상태 변경·삭제 확인과 권한·오류 처리를 제공하는 modal입니다.",
  "apps/web/src/lib/format.js":
    "날짜와 프로젝트 기간을 화면용 문자열 또는 로컬 ISO 날짜로 변환하는 순수 formatting helper 모음입니다.",
  "apps/web/src/lib/format.test.js":
    "날짜·기간 formatting과 로컬 날짜 계산 helper의 정상 값과 경계 사례를 검증합니다.",
  "apps/web/src/state/selectors.js":
    "TeamFlow 전역 state에서 프로젝트, 작업, 멤버, AI 실행, 초대와 dashboard 요약을 파생하는 순수 selector 모음입니다.",
  "apps/web/src/App.jsx":
    "landing, OAuth callback, guest demo, 인증 보호 route와 각 TeamFlow feature page를 연결하는 최상위 route tree입니다.",
  "apps/web/src/auth/AuthCallbackPage.jsx":
    "Supabase OAuth callback 처리 상태를 확인하고 성공 시 app으로, 실패 시 설명 가능한 오류 화면으로 전환합니다.",
  "apps/web/src/auth/ProtectedRoute.jsx":
    "인증 loading을 처리하고 로그인 사용자 또는 guest session만 하위 route에 접근하도록 제한합니다.",
  "apps/web/src/auth/useAuth.js":
    "AuthContext를 읽고 Provider 외부 사용을 차단하는 인증 상태 접근용 custom hook입니다.",
  "apps/web/src/data/apiTeamFlowRepository.js":
    "access token을 포함한 API 요청으로 TeamFlow 데이터를 처리하고 guest demo용 read-only repository도 제공하는 브라우저 data adapter입니다.",
  "apps/web/src/data/apiTeamFlowRepository.test.js":
    "API repository의 URL·header·payload 구성, 오류 변환과 guest read-only 동작을 fetch mock으로 검증합니다.",
  "apps/web/src/features/landing/LandingPage.jsx":
    "서비스 가치와 핵심 기능을 소개하고 Google 로그인 또는 guest demo 진입 event를 제공하는 landing page입니다.",
  "apps/web/src/state/TeamFlowContext.js":
    "TeamFlow 전역 데이터와 비동기 action을 component tree에 전달하기 위한 React Context 객체를 정의합니다.",
  "apps/web/src/state/TeamFlowProvider.jsx":
    "인증 또는 guest repository에서 데이터를 hydrate하고 reducer와 비동기 action으로 전체 협업 상태를 관리합니다.",
  "apps/web/src/components/ui/ResourceIcon.jsx":
    "자료 유형에 맞는 icon component를 선택해 일관된 시각 표시를 제공하는 UI adapter입니다.",
  "apps/web/src/features/resources/AddResourceModal.jsx":
    "link 또는 file 자료의 입력·validation·upload를 처리해 현재 folder에 새 자료를 추가하는 modal입니다.",
  "apps/web/src/features/resources/ResourceDetailModal.jsx":
    "자료 상세 정보를 표시하고 이름·link 편집, download, 삭제와 권한별 action을 조정하는 modal입니다.",
  "apps/web/src/features/resources/ResourcesPage.jsx":
    "folder breadcrumb와 자료 목록을 탐색하며 folder 생성, 자료 추가, 상세 modal 흐름을 관리하는 페이지입니다.",
  "apps/web/src/features/resources/resourceValidation.js":
    "안전한 HTTP URL, upload file 제한과 자료 유형별 필수 입력을 검증하는 순수 validation helper를 제공합니다.",
  "apps/web/src/features/resources/resourceValidation.test.js":
    "자료 URL과 upload file, 유형별 validation 규칙의 정상·실패·경계 사례를 검증합니다.",
};

const specialFunctionSummaries = {
  createApp:
    "CORS와 health endpoint, TeamFlow router를 결합한 Express application을 생성합니다.",
  readBearerToken:
    "Authorization header에서 Bearer token을 안전하게 추출하고 잘못된 형식을 거부합니다.",
  displayProfile:
    "Supabase user metadata를 API에서 사용할 간결한 사용자 profile로 변환합니다.",
  createSupabaseAuthVerifier:
    "Supabase authentication API로 access token을 검증하는 verifier 함수를 구성합니다.",
  createAuthenticationMiddleware:
    "검증된 사용자 정보를 요청에 주입하고 인증 실패를 HTTP 오류로 전달하는 middleware를 생성합니다.",
  normalizeOrigin:
    "origin 문자열을 비교 가능한 정규 형식으로 변환합니다.",
  readAllowedOrigins:
    "환경 설정의 허용 origin 목록을 파싱하고 중복을 제거합니다.",
  createCorsOptions:
    "요청 origin을 허용 목록과 비교하는 Express CORS 옵션을 생성합니다.",
  readTeamFlowSupabaseConfig:
    "서버 Supabase URL과 service role key의 존재와 형식을 검증합니다.",
  createTeamFlowSupabaseClient:
    "검증된 서버 설정으로 인증 session을 유지하지 않는 Supabase client를 생성합니다.",
  createConfiguredTeamFlowApp:
    "환경 설정과 주입된 의존성으로 인증·CORS·repository·Express app을 조립합니다.",
  buildMockAiContext:
    "프로젝트 snapshot을 정렬·정규화하고 제한된 Mock AI 실행 context로 구성합니다.",
  generateMockAiResult:
    "정규화된 context에서 결정적인 Mock AI Markdown 결과를 생성합니다.",
  createSupabaseDemoRepository:
    "guest가 읽을 수 있는 demo workspace를 Supabase에서 조회하는 read-only repository를 생성합니다.",
  createSupabaseTeamFlowRepository:
    "인증 사용자의 프로젝트·협업·콘텐츠·AI 작업을 Supabase table과 RPC에 연결하는 repository를 생성합니다.",
  validateTaskCreateInput:
    "작업 생성 payload의 제목, 담당자, 날짜, 상태와 설명 규칙을 검증합니다.",
  createTeamFlowRouter:
    "TeamFlow endpoint와 authentication, validation, repository 호출, 오류 응답을 하나의 Express router로 구성합니다.",
  useTeamFlow:
    "TeamFlowContext의 전역 state와 action을 반환하고 Provider 밖의 잘못된 사용을 차단합니다.",
  profileFromSession:
    "Supabase session metadata를 화면에서 사용할 사용자 profile로 변환합니다.",
  readBrowserSupabaseConfig:
    "브라우저 환경변수의 Supabase URL과 publishable key를 검증합니다.",
  createBrowserSupabaseClient:
    "검증된 browser 설정으로 Supabase authentication client를 생성합니다.",
  resolveBrowserSupabaseClient:
    "주입된 client를 우선 사용하고 없으면 browser Supabase client를 지연 생성합니다.",
  renderWithAuth:
    "테스트용 authentication client와 route를 주입해 인증 흐름 component를 렌더링합니다.",
  inline:
    "간단한 inline Markdown token을 React element로 변환합니다.",
  createTestAuthClient:
    "지정한 session 상태를 반환하는 테스트용 authentication client를 구성합니다.",
  renderAuthenticatedApp:
    "인증 session과 test repository를 주입해 지정 route의 TeamFlow App을 렌더링합니다.",
  formatShortDate:
    "ISO 날짜 값을 사용자가 읽기 쉬운 짧은 날짜 문자열로 변환합니다.",
  formatPeriod:
    "프로젝트 시작일과 종료일을 하나의 기간 문자열로 조합합니다.",
  todayIso:
    "현재 로컬 날짜를 ISO 날짜 문자열로 반환합니다.",
  addLocalDaysIso:
    "로컬 날짜에 일수를 더한 ISO 날짜 문자열을 계산합니다.",
  useAuth:
    "AuthContext의 인증 상태와 action을 반환하고 Provider 밖의 잘못된 사용을 차단합니다.",
  normalizeApiBaseUrl:
    "API 기본 URL의 공백과 끝 slash를 정리하고 유효한 요청 기준 URL로 변환합니다.",
  readJson:
    "fetch 응답의 JSON body를 안전하게 읽고 API 오류 정보를 보존합니다.",
  createApiTeamFlowRepository:
    "access token과 fetch를 사용해 TeamFlow HTTP API를 호출하는 browser repository를 생성합니다.",
  createDemoTeamFlowRepository:
    "고정 demo 데이터를 제공하고 변경 작업을 거부하는 read-only repository를 생성합니다.",
  reducer:
    "TeamFlow action 유형에 따라 불변 state를 계산하는 중앙 reducer입니다.",
  isSafeHttpUrl:
    "입력 URL이 허용된 HTTP 또는 HTTPS 주소인지 검증합니다.",
  validateUploadFile:
    "업로드 파일의 존재, 크기와 허용 형식을 검증합니다.",
  validateResource:
    "자료 유형에 따라 이름, URL 또는 파일 입력의 필수 규칙을 검증합니다.",
};

function featureForPath(filePath) {
  if (filePath.includes("/auth/")) return "authentication";
  if (filePath.includes("/members/")) return "member-management";
  if (filePath.includes("/notes/")) return "notes";
  if (filePath.includes("/resources/")) return "resources";
  if (filePath.includes("/tasks/")) return "tasks";
  if (filePath.includes("/projects/")) return "projects";
  if (filePath.includes("/dashboard/")) return "dashboard";
  if (filePath.includes("/ai/")) return "ai-workflow";
  if (filePath.includes("/landing/")) return "landing";
  if (filePath.includes("/state/")) return "state-management";
  if (filePath.includes("/teamflow/")) return "teamflow-domain";
  if (filePath.includes("/lib/")) return "utility";
  if (filePath.includes("/data/")) return "data-access";
  if (filePath.includes("/test/")) return "test-support";
  return "application";
}

function complexityFromLines(lines) {
  if (lines < 50) return "simple";
  if (lines <= 200) return "moderate";
  return "complex";
}

function fileTags(filePath) {
  const name = path.basename(filePath).toLowerCase();
  const feature = featureForPath(filePath);
  if (name.includes(".test.") || filePath.includes("/test/")) {
    return ["test", feature, "verification", "regression"];
  }
  if (filePath.endsWith(".jsx")) {
    if (name.includes("modal")) {
      return ["component", "modal", feature, "event-handler"];
    }
    if (name.includes("page")) {
      return ["component", "page", feature, "state-management"];
    }
    return ["component", feature, "react", "ui"];
  }
  if (name === "server.js") {
    return ["entry-point", "express", "server", "runtime"];
  }
  if (name === "app.js" || name === "runtime.js") {
    return ["entry-point", "factory", "express", "dependency-injection"];
  }
  if (name.includes("repository")) {
    return ["repository", "data-access", feature, "service"];
  }
  if (name.includes("routes")) {
    return ["api-handler", "routing", "validation", "express"];
  }
  if (name.includes("context")) {
    return ["react-context", "state-management", "provider", feature];
  }
  if (name.startsWith("use")) {
    return ["hook", "react-context", feature, "validation"];
  }
  if (name.includes("validation")) {
    return ["validation", "utility", feature, "security"];
  }
  if (name.includes("auth")) {
    return ["authentication", "middleware", "security", feature];
  }
  if (name.includes("cors")) {
    return ["cors", "middleware", "security", "configuration"];
  }
  if (name.includes("supabase")) {
    return ["supabase", "factory", "configuration", "data-access"];
  }
  if (name.includes("selector")) {
    return ["selector", "state-management", "utility", "derived-state"];
  }
  if (name.includes("format")) {
    return ["utility", "formatting", "date", "pure-function"];
  }
  return [feature, "service", "javascript", "application-logic"];
}

function functionTags(name, filePath) {
  const lower = name.toLowerCase();
  const feature = featureForPath(filePath);
  if (/^[A-Z]/.test(name) && filePath.endsWith(".jsx")) {
    return ["component", "react", feature, "event-handler"];
  }
  if (lower.startsWith("validate") || lower.startsWith("issafe")) {
    return ["validation", "pure-function", feature, "security"];
  }
  if (lower.startsWith("create")) {
    return ["factory", feature, "dependency-injection", "service"];
  }
  if (lower.startsWith("select")) {
    return ["selector", "pure-function", "derived-state", feature];
  }
  if (lower.startsWith("format") || lower.startsWith("normalize")) {
    return ["utility", "pure-function", "formatting", feature];
  }
  if (lower.startsWith("map")) {
    return ["serialization", "data-mapping", "utility", feature];
  }
  if (lower.startsWith("render")) {
    return ["rendering", feature, "utility", "serialization"];
  }
  if (lower.startsWith("use")) {
    return ["hook", "react-context", feature, "state-management"];
  }
  if (lower === "reducer") {
    return ["reducer", "state-management", "pure-function", feature];
  }
  return ["function", feature, "application-logic", "utility"];
}

function functionSummary(name, filePath) {
  if (specialFunctionSummaries[name]) return specialFunctionSummaries[name];
  const feature = featureForPath(filePath).replaceAll("-", " ");
  if (/^[A-Z]/.test(name) && filePath.endsWith(".jsx")) {
    if (name.toLowerCase().includes("modal")) {
      return `${name} React component는 ${feature} 입력·확인 흐름을 modal로 렌더링하고 사용자 event를 action에 연결합니다.`;
    }
    if (name.toLowerCase().includes("page")) {
      return `${name} React component는 ${feature} 데이터를 파생하고 페이지 UI와 사용자 action을 조정합니다.`;
    }
    return `${name} React component는 ${feature} 영역의 상태와 사용자 event를 조정해 UI를 렌더링합니다.`;
  }
  if (name.startsWith("validate")) {
    return `${name} 함수는 ${feature} 입력의 필수 값, 형식과 허용 범위를 검증합니다.`;
  }
  if (name.startsWith("map")) {
    return `${name} 함수는 Supabase row를 TeamFlow ${feature} 도메인 객체로 변환합니다.`;
  }
  if (name.startsWith("select")) {
    return `${name} selector는 TeamFlow state에서 ${feature} 화면에 필요한 파생 데이터를 계산합니다.`;
  }
  if (name.startsWith("render")) {
    return `${name} 함수는 정규화된 ${feature} 데이터를 화면 또는 Markdown 표현으로 변환합니다.`;
  }
  if (name.startsWith("compare")) {
    return `${name} 함수는 결정적인 결과를 위해 ${feature} 값을 안정된 순서로 비교합니다.`;
  }
  if (name.startsWith("normalize")) {
    return `${name} 함수는 ${feature} 입력을 비교·저장 가능한 일관된 형태로 정규화합니다.`;
  }
  if (name.startsWith("create")) {
    return `${name} 함수는 ${feature} 동작에 필요한 의존성과 interface를 구성해 반환합니다.`;
  }
  return `${name} 함수는 ${feature} 파일의 핵심 데이터 변환 또는 사용자 흐름을 구현합니다.`;
}

function classSummary(name, filePath) {
  if (name === "TeamFlowApiError") {
    return "TeamFlow HTTP API의 status와 payload를 보존해 UI 계층에 전달하는 browser 오류 형식입니다.";
  }
  if (name === "AuthenticationError") {
    return "인증 실패 원인과 HTTP status를 함께 표현하는 API authentication 오류 형식입니다.";
  }
  if (name.startsWith("TeamFlow")) {
    return `${name} class는 TeamFlow repository의 저장소 오류를 의미별로 구분해 route 계층에 전달합니다.`;
  }
  return `${name} class는 ${featureForPath(filePath)} 영역의 오류 또는 동작 계약을 캡슐화합니다.`;
}

function classTags(name, filePath) {
  return ["error-model", featureForPath(filePath), "exception", "error-handling"];
}

function languageNotes(filePath) {
  if (filePath === "apps/web/src/state/TeamFlowProvider.jsx") {
    return "React useReducer와 Context를 결합해 event → state update → rerender 흐름을 한 Provider에서 관리합니다.";
  }
  if (filePath === "apps/web/src/state/selectors.js") {
    return "selector를 순수 함수로 유지하면 state 변경 없이 파생 데이터를 계산하고 독립 테스트할 수 있습니다.";
  }
  if (filePath.endsWith(".jsx") && !filePath.includes(".test.")) {
    return "함수형 React component가 hook으로 상태를 읽고 JSX를 state의 선언적 결과로 반환합니다.";
  }
  if (filePath.startsWith("apps/api/test/")) {
    return "Node.js 내장 test runner를 사용해 외부 의존성을 test double로 격리합니다.";
  }
  if (filePath.includes(".test.")) {
    return "Vitest와 Testing Library로 내부 구현보다 사용자 event와 관찰 가능한 UI 결과를 검증합니다.";
  }
  if (filePath.includes("Repository.js")) {
    return "factory가 closure 안에 client 의존성을 보관하고 비동기 method를 가진 object interface를 반환합니다.";
  }
  return undefined;
}

function addNode(nodesById, node) {
  if (nodesById.has(node.id)) {
    throw new Error(`Duplicate node id: ${node.id}`);
  }
  nodesById.set(node.id, node);
}

function addEdge(edges, edge) {
  if (edge.source === edge.target) return;
  const key = `${edge.source}|${edge.target}|${edge.type}`;
  if (edges.some((item) => `${item.source}|${item.target}|${item.type}` === key)) {
    return;
  }
  edges.push(edge);
}

const written = [];

for (const batchIndex of batchIndexes) {
  const batch = batchesData.batches.find(
    (candidate) => candidate.batchIndex === batchIndex,
  );
  if (!batch) throw new Error(`Missing batch ${batchIndex}`);

  const extraction = JSON.parse(
    fs.readFileSync(
      `.ua/tmp/ua-file-extract-results-${batchIndex}.json`,
      "utf8",
    ),
  );
  if (!extraction.scriptCompleted) {
    throw new Error(`Extraction incomplete for batch ${batchIndex}`);
  }
  if (extraction.filesSkipped?.length) {
    throw new Error(
      `Skipped files in batch ${batchIndex}: ${extraction.filesSkipped.join(", ")}`,
    );
  }

  const resultByPath = new Map(
    extraction.results.map((result) => [result.path, result]),
  );
  const batchFilePaths = new Set(batch.files.map((file) => file.path));
  const nodesById = new Map();
  const edges = [];

  for (const batchFile of batch.files) {
    const result = resultByPath.get(batchFile.path);
    if (!result) throw new Error(`Missing result for ${batchFile.path}`);
    const summary = fileSummaries[batchFile.path];
    if (!summary) throw new Error(`Missing summary for ${batchFile.path}`);

    const note = languageNotes(batchFile.path);
    const fileNode = {
      id: `file:${batchFile.path}`,
      type: "file",
      name: path.basename(batchFile.path),
      filePath: batchFile.path,
      summary,
      tags: fileTags(batchFile.path),
      complexity: complexityFromLines(result.nonEmptyLines),
      ...(note ? { languageNotes: note } : {}),
    };
    addNode(nodesById, fileNode);

    const exportedNames = new Set(
      (result.exports ?? []).map((item) => item.name),
    );

    for (const fn of result.functions ?? []) {
      const lineCount = fn.endLine - fn.startLine + 1;
      if (lineCount < 10 && !exportedNames.has(fn.name)) continue;
      const id = `function:${batchFile.path}:${fn.name}`;
      addNode(nodesById, {
        id,
        type: "function",
        name: fn.name,
        filePath: batchFile.path,
        lineRange: [fn.startLine, fn.endLine],
        summary: functionSummary(fn.name, batchFile.path),
        tags: functionTags(fn.name, batchFile.path),
        complexity: complexityFromLines(lineCount),
      });
      addEdge(edges, {
        source: fileNode.id,
        target: id,
        type: "contains",
        direction: "forward",
        weight: 1.0,
      });
      if (exportedNames.has(fn.name)) {
        addEdge(edges, {
          source: fileNode.id,
          target: id,
          type: "exports",
          direction: "forward",
          weight: 0.8,
        });
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
      const id = `class:${batchFile.path}:${cls.name}`;
      addNode(nodesById, {
        id,
        type: "class",
        name: cls.name,
        filePath: batchFile.path,
        lineRange: [cls.startLine, cls.endLine],
        summary: classSummary(cls.name, batchFile.path),
        tags: classTags(cls.name, batchFile.path),
        complexity: complexityFromLines(lineCount),
      });
      addEdge(edges, {
        source: fileNode.id,
        target: id,
        type: "contains",
        direction: "forward",
        weight: 1.0,
      });
      if (exportedNames.has(cls.name)) {
        addEdge(edges, {
          source: fileNode.id,
          target: id,
          type: "exports",
          direction: "forward",
          weight: 0.8,
        });
      }
    }
  }

  let expectedImports = 0;
  for (const batchFile of batch.files) {
    const imports = batch.batchImportData[batchFile.path] ?? [];
    expectedImports += imports.length;
    for (const targetPath of imports) {
      addEdge(edges, {
        source: `file:${batchFile.path}`,
        target: `file:${targetPath}`,
        type: "imports",
        direction: "forward",
        weight: 0.7,
      });
    }

    const isTest =
      batchFile.path.includes(".test.") || batchFile.path.includes("/test/");
    if (isTest) {
      for (const targetPath of imports) {
        const targetIsTest =
          targetPath.includes(".test.") || targetPath.includes("/test/");
        if (!targetIsTest && batchFilePaths.has(targetPath)) {
          addEdge(edges, {
            source: `file:${targetPath}`,
            target: `file:${batchFile.path}`,
            type: "tested_by",
            direction: "forward",
            weight: 0.5,
          });
        }
      }
    }
  }

  const importCount = edges.filter((edge) => edge.type === "imports").length;
  if (importCount !== expectedImports) {
    throw new Error(
      `Batch ${batchIndex} import mismatch: ${importCount} != ${expectedImports}`,
    );
  }

  const nodes = [...nodesById.values()];
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const parts = Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
  const sortedFiles = [...batch.files]
    .map((file) => file.path)
    .sort((a, b) => a.localeCompare(b));
  const chunkSize = Math.ceil(sortedFiles.length / parts);

  for (let partIndex = 0; partIndex < parts; partIndex += 1) {
    const partFiles = new Set(
      sortedFiles.slice(partIndex * chunkSize, (partIndex + 1) * chunkSize),
    );
    const partNodes = nodes.filter((node) => partFiles.has(node.filePath));
    const partNodeIds = new Set(partNodes.map((node) => node.id));
    const partEdges = edges.filter((edge) => partNodeIds.has(edge.source));
    const suffix = parts === 1 ? "" : `-part-${partIndex + 1}`;
    const outputPath = `.ua/intermediate/batch-${batchIndex}${suffix}.json`;
    fs.writeFileSync(
      outputPath,
      `${JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)}\n`,
    );
    written.push({
      batchIndex,
      outputPath,
      nodeCount: partNodes.length,
      edgeCount: partEdges.length,
    });
  }

  const writtenNodes = written
    .filter((item) => item.batchIndex === batchIndex)
    .reduce((sum, item) => sum + item.nodeCount, 0);
  const writtenEdges = written
    .filter((item) => item.batchIndex === batchIndex)
    .reduce((sum, item) => sum + item.edgeCount, 0);
  if (writtenNodes !== nodeCount || writtenEdges !== edgeCount) {
    throw new Error(
      `Batch ${batchIndex} partition mismatch nodes=${writtenNodes}/${nodeCount} edges=${writtenEdges}/${edgeCount}`,
    );
  }
}

console.log(JSON.stringify(written, null, 2));
