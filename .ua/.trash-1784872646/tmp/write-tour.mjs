import fs from "node:fs";

const tour = [
  {
    order: 1,
    title: "프로젝트 전체 지도",
    description:
      "README에서 TeamFlow가 해결하는 팀 프로젝트 문제와 현재 구현 범위, 실행·검증·배포 흐름을 먼저 파악합니다. 제품 기획서는 사용자 시나리오와 화면 흐름을, 아키텍처 문서는 React·Express·Supabase·shared 패키지의 책임과 데이터 이동을 연결합니다. 이후 단계의 파일이 어떤 사용자 가치와 시스템 경계에 속하는지 판단할 기준을 세우는 출발점입니다.",
    nodeIds: [
      "document:README.md",
      "document:docs/plan.md",
      "document:docs/architecture.md",
    ],
  },
  {
    order: 2,
    title: "웹 앱 부트스트랩",
    description:
      "루트 package.json은 web·API·shared workspace와 공통 실행 명령을 정의하고, 웹 package.json은 React·Vite·Vitest 환경을 구체화합니다. main.jsx가 BrowserRouter와 두 Provider를 React root에 조립하면 App.jsx가 landing, OAuth callback, guest와 보호 route를 feature page에 연결합니다. Android의 Application·Activity·Navigation을 웹의 root·Provider·Router에 대응시키면 application 시작 구조를 빠르게 읽을 수 있습니다.",
    nodeIds: [
      "config:package.json",
      "config:apps/web/package.json",
      "file:apps/web/src/main.jsx",
      "file:apps/web/src/App.jsx",
    ],
    languageLesson:
      "React는 화면 객체를 직접 교체하지 않고 component tree를 root에 선언합니다. BrowserRouter는 URL을 상태로 해석하고 Provider는 하위 component가 공유할 실행 문맥을 공급합니다.",
  },
  {
    order: 3,
    title: "공유 도메인 계약",
    description:
      "화면과 서버를 보기 전에 project.js에서 프로젝트·작업·자료·팀원·AI·초대 상태와 검증·진행률 규칙을 읽습니다. index.js는 이 정의를 shared 패키지의 공개 API로 모아 웹과 Express가 같은 용어와 허용 값을 사용하게 합니다. Kotlin의 공통 data class와 sealed state처럼 계층 사이 의미가 어긋나지 않도록 지키는 계약입니다.",
    nodeIds: [
      "file:packages/shared/src/project.js",
      "file:packages/shared/src/index.js",
    ],
    languageLesson:
      "JSDoc은 JavaScript runtime을 바꾸지 않으면서 객체 형태와 함수 계약을 문서화합니다. 배럴 파일(barrel file)은 여러 export를 하나의 진입점으로 모아 패키지의 공개 표면을 좁힙니다.",
  },
  {
    order: 4,
    title: "브라우저 인증 세션",
    description:
      "브라우저 Supabase client가 공개 URL과 publishable key를 검증하고 OAuth session 통신을 시작합니다. AuthProvider는 session 구독, Google 로그인, logout과 guest 상태를 Context로 통합하며 useAuth가 이를 안전하게 읽게 합니다. ProtectedRoute는 loading과 인증 여부를 화면 접근 정책으로 바꾸므로, 인증 상태가 route 렌더링을 결정하는 경계를 확인할 수 있습니다.",
    nodeIds: [
      "file:apps/web/src/auth/supabaseClient.js",
      "file:apps/web/src/auth/AuthProvider.jsx",
      "file:apps/web/src/auth/useAuth.js",
      "file:apps/web/src/auth/ProtectedRoute.jsx",
    ],
    languageLesson:
      "React Context 값이 바뀌면 이를 구독하는 component가 다시 render됩니다. Android에서 인증 StateFlow를 collect해 navigation을 바꾸는 흐름과 비교하면 이해하기 쉽습니다.",
  },
  {
    order: 5,
    title: "UI 이벤트 출발점",
    description:
      "ProjectTasksPage는 작업을 검색·정렬·필터링하고 table 또는 board로 렌더링하며, 생성·상세 modal을 사용자 event의 출발점으로 제공합니다. form 입력과 click event는 local state에서 먼저 검증된 뒤 생성·수정·상태 변경·삭제 action을 호출합니다. 여기서는 화면이 데이터를 직접 저장하지 않고 의도를 action으로 올려보낸다는 점에 집중합니다.",
    nodeIds: [
      "file:apps/web/src/features/tasks/ProjectTasksPage.jsx",
      "file:apps/web/src/features/tasks/components/TaskCreateModal.jsx",
      "file:apps/web/src/features/tasks/components/TaskDetailModal.jsx",
    ],
    languageLesson:
      "controlled component에서는 input 값이 React state에 있고 onChange가 그 값을 갱신합니다. UI component는 사용자 의도를 callback으로 전달하고 실제 저장 책임은 상위 state·data 계층에 맡깁니다.",
  },
  {
    order: 6,
    title: "상태와 재렌더링",
    description:
      "앞 단계의 event가 useTeamFlow로 얻은 action을 호출하면 TeamFlowProvider의 비동기 작업과 reducer가 새로운 전역 state를 만듭니다. Context 값이 바뀌면 이를 구독하는 component가 re-render되고, selectors가 새 state에서 화면용 데이터를 다시 파생해 screen을 갱신합니다. 즉 event → state update → re-render → screen update라는 React의 핵심 단방향 흐름이 완성됩니다.",
    nodeIds: [
      "file:apps/web/src/state/TeamFlowContext.js",
      "file:apps/web/src/state/TeamFlowProvider.jsx",
      "file:apps/web/src/state/useTeamFlow.js",
      "file:apps/web/src/state/selectors.js",
    ],
    languageLesson:
      "React reducer는 기존 객체를 수정하기보다 새 state를 반환하고 Context가 그 변화를 구독자에게 전파합니다. 이는 event → StateFlow update → Compose recomposition → 화면 갱신과 대응되는 구조입니다.",
  },
  {
    order: 7,
    title: "브라우저 API Repository",
    description:
      "TeamFlowProvider의 원격 action은 apiTeamFlowRepository를 통해 HTTP 요청으로 변환됩니다. 이 browser Repository는 API 기본 URL, access token, endpoint와 오류 변환을 캡슐화하고 guest에게는 read-only 구현을 제공합니다. 따라서 UI와 state 계층은 fetch 세부사항을 몰라도 브라우저 → API Repository라는 명확한 경계를 사용할 수 있습니다.",
    nodeIds: [
      "file:apps/web/src/data/apiTeamFlowRepository.js",
      "config:apps/web/.env.example",
    ],
    languageLesson:
      "Repository pattern은 Android에서 ViewModel과 remote data source 사이를 중재하듯 React state와 fetch 사이를 분리합니다. 같은 interface에 실제 API와 guest 구현을 끼울 수 있어 호출부의 조건 분기가 줄어듭니다.",
  },
  {
    order: 8,
    title: "Express Route와 인증",
    description:
      "브라우저 요청은 app.js가 조립한 Express application에 도착하고 teamFlowRoutes가 endpoint별 payload 검증과 Repository 호출을 조정합니다. auth middleware는 Bearer token을 읽어 Supabase에서 사용자를 확인하고 인증된 요청 정보로 바꾸며, API 문서는 요청·응답·상태값·오류 코드의 외부 계약을 설명합니다. 이 단계가 API Repository → Express route → authentication middleware라는 서버 진입 경계입니다.",
    nodeIds: [
      "file:apps/api/src/app.js",
      "file:apps/api/src/teamflow/teamFlowRoutes.js",
      "file:apps/api/src/lib/auth.js",
      "document:docs/api.md",
    ],
    languageLesson:
      "Express middleware는 요청과 응답 사이의 공통 처리를 chain으로 구성합니다. Android interceptor와 비슷하지만, 서버에서는 인증 결과를 다음 route handler가 사용할 request context로 전달합니다.",
  },
  {
    order: 9,
    title: "서버 Repository 경계",
    description:
      "runtime.js는 CORS, authentication, 서버 Supabase client와 TeamFlow Repository를 조립해 실행 가능한 application을 만듭니다. teamFlowRepository는 route의 사용자 의도를 table query와 보안 RPC로 변환하고, Mock AI 생성기는 제한된 snapshot에서 결정적인 결과를 만듭니다. 서버 전용 service role key와 복잡한 데이터 수명주기를 브라우저에 노출하지 않는 것이 이 계층의 핵심입니다.",
    nodeIds: [
      "file:apps/api/src/runtime.js",
      "file:apps/api/src/lib/supabaseClient.js",
      "file:apps/api/src/teamflow/teamFlowRepository.js",
      "file:apps/api/src/teamflow/mockAiGenerator.js",
    ],
    languageLesson:
      "서버 Repository는 HTTP route와 SQL/RPC 세부사항 사이의 adapter입니다. 의존성을 factory에 주입하면 production Supabase client와 test double을 같은 interface로 교체할 수 있습니다.",
  },
  {
    order: 10,
    title: "Supabase Schema와 RLS",
    description:
      "서버 Repository 아래에서 projects, project_access와 tasks table이 프로젝트 소유권·접근 관계·작업 데이터를 영속화합니다. 후속 migration은 외래 키와 검사 제약, RPC 권한, 비공개 Storage upload 상태 전이를 강화해 코드 밖에서도 잘못된 데이터를 차단합니다. 브라우저 → API Repository → Express route/auth → 서버 Repository → Supabase/RLS로 이어지는 전체 보안·데이터 경계가 여기서 닫힙니다.",
    nodeIds: [
      "table:supabase/migrations/20260721054012_google_auth_workspace.sql:projects",
      "table:supabase/migrations/20260722112108_collaboration_and_content_crud.sql:project_access",
      "table:supabase/migrations/20260720030115_create_tasks.sql:tasks",
      "table:supabase/migrations/20260722114219_collaboration_and_content_hardening.sql:migration",
      "table:supabase/migrations/20260723094500_harden_private_resource_uploads.sql:migration",
    ],
    languageLesson:
      "RLS(Row Level Security)는 현재 인증 주체와 row의 관계에 따라 database 결과를 제한합니다. UI의 권한 숨김은 편의 기능이고 실제 보호는 SQL 제약, RLS와 제한된 RPC가 서버 측에서 보장해야 합니다.",
  },
  {
    order: 11,
    title: "계층별 테스트 안전망",
    description:
      "shared 테스트는 상태·진행률 계약을, AppFlows는 실제 route와 Provider를 통한 event·screen 흐름을 검증합니다. API route 테스트는 authentication·validation·응답을 test Repository로 확인하고, SQL 통합 테스트는 RLS 격리와 RPC 상태 전이를 transaction 안에서 검증합니다. 공통 render helper까지 함께 보면 순수 함수 → React 통합 → Express 통합 → database 보안으로 이어지는 테스트 피라미드를 이해할 수 있습니다.",
    nodeIds: [
      "file:packages/shared/test/project.test.js",
      "file:apps/web/src/features/AppFlows.test.jsx",
      "file:apps/web/src/test/renderTeamFlowApp.jsx",
      "file:apps/api/test/teamFlowRoutes.test.js",
      "table:supabase/tests/database/mock_ai_team_member_rls.sql:ai_test_state",
    ],
    languageLesson:
      "Testing Library는 component 내부 구현보다 사용자가 발생시키는 event와 관찰 가능한 screen 결과를 검증합니다. Repository와 authentication client를 주입하면 실제 network 없이도 비동기 상태 전이와 오류 경계를 재현할 수 있습니다.",
  },
  {
    order: 12,
    title: "배포와 변경 자동화",
    description:
      "deployment 문서는 React를 Vercel에, Express를 Render에 배포하고 CORS·환경변수·OAuth redirect를 연결하는 순서를 정리합니다. Vercel 설정은 React Router 요청을 SPA 진입점으로 되돌리고 Render 설정은 API 실행·health check와 서버 secret 경계를 선언합니다. GitHub Actions는 PR review와 충돌 규칙에 따라 병합을 자동화해 코드 변경이 운영 환경까지 이동하는 수명주기를 마무리합니다.",
    nodeIds: [
      "document:docs/deployment.md",
      "config:apps/web/vercel.json",
      "config:render.yaml",
      "pipeline:.github/workflows/auto-merge.yml",
    ],
    languageLesson:
      "YAML은 들여쓰기가 문법의 일부이며 CI/CD에서는 trigger, job, step이 자동화의 시작 조건과 실행 순서를 선언합니다. 배포 환경변수는 build-time 공개 값과 server-only secret을 분리해야 합니다.",
  },
];

fs.writeFileSync(
  ".ua/intermediate/tour.json",
  `${JSON.stringify(tour, null, 2)}\n`,
);
