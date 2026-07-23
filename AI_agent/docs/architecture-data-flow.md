# Career Mission AI 데이터 흐름 아키텍처

시각화 도구는 Mermaid flowchart를 선택했다. Mermaid는 Markdown 안에 텍스트로 다이어그램을 유지할 수 있어, 화면/라우트/API가 바뀔 때 문서도 코드처럼 수정하기 쉽다.

바로 열어볼 수 있는 이미지 파일: [architecture-data-flow.svg](images/architecture-data-flow.svg)

```mermaid
flowchart LR
  user["사용자"]

  subgraph client["React + Vite 프론트엔드"]
    pages["화면 라우트\n/, /signup, /login, /me\n/specs, /analysis, /mission\n/mission/:missionId, /upload\n/feedback, /portfolio"]
    protected["ProtectedRoute\n로그인 필요 화면 보호"]
    authStorage["authStorage\nJWT/session localStorage"]
    apiClient["프론트 API helper\nrequestJson / requestAuthJson"]
    mockData["프론트 mock data\n추천 미션, 피드백, 포트폴리오 초안"]
  end

  subgraph server["Express 백엔드 API"]
    cors["CORS + JSON parser"]
    authRoutes["/api/auth\nregister, login, me\nverify-email, verification-email"]
    specRoutes["/api/specs\nGET /me, POST /"]
    analysisRoutes["/api/analysis\nGET /me, POST /"]
    missionRoutes["/api/missions\nGET/PATCH /:missionId/progress"]
    submissionRoutes["/api/submissions\nGET /me, GET /latest, POST /"]
    careerRoutes["/api/jobs\n/api/qualifications\n/api/schools\n/api/majors"]
    requireAuth["requireAuth\nAuthorization: Bearer JWT 검증"]
  end

  subgraph services["백엔드 서비스 계층"]
    userService["userService\n회원, 로그인, 프로필"]
    specService["specService\n스펙 저장/조회"]
    analysisService["analysisService\n스펙 검증, 최신 분석 캐시"]
    missionProgressService["missionProgressService\n체크리스트 진행 상태 upsert"]
    submissionService["submissionService\n결과물 제출/조회"]
    searchServices["job/school/qualification services\n외부 API + fallback 검색"]
    openaiService["openaiService\nAI 분석 생성"]
    emailService["emailService\n인증 메일 발송"]
  end

  subgraph database["PostgreSQL / Supabase"]
    dbUser[("User\n계정, 이메일 인증, 프로필")]
    dbSpec[("UserSpec\n목표 직무, 학점, 활동, 기술")]
    dbAnalysis[("AnalysisResult\nAI 분석 결과")]
    dbMission[("Mission\n미션 메타 정보")]
    dbUserMission[("UserMission\nstatus, checkedItems,\n제출 URL/파일, feedback")]
  end

  subgraph external["외부 시스템"]
    smtp["SMTP 서버\n이메일 인증"]
    openai["OpenAI API\n커리어 분석"]
    careerNet["CareerNet API\n직업/학교/전공"]
    qnet["Q-Net 공공데이터 API\n자격증"]
  end

  user --> pages
  pages --> protected
  protected --> authStorage
  pages --> apiClient
  apiClient -->|"VITE_API_BASE_URL\nJSON 요청"| cors

  cors --> authRoutes
  cors --> specRoutes
  cors --> analysisRoutes
  cors --> missionRoutes
  cors --> submissionRoutes
  cors --> careerRoutes

  specRoutes --> requireAuth
  analysisRoutes --> requireAuth
  missionRoutes --> requireAuth
  submissionRoutes --> requireAuth
  authRoutes --> requireAuth

  authRoutes --> userService
  specRoutes --> specService
  analysisRoutes --> analysisService
  missionRoutes --> missionProgressService
  submissionRoutes --> submissionService
  careerRoutes --> searchServices

  userService --> dbUser
  specService --> dbSpec
  analysisService --> dbSpec
  analysisService --> dbAnalysis
  missionProgressService --> dbMission
  missionProgressService --> dbUserMission
  submissionService --> dbMission
  submissionService --> dbUserMission

  authRoutes --> emailService --> smtp
  analysisService --> openaiService --> openai
  searchServices --> careerNet
  searchServices --> qnet

  pages --> mockData
  mockData --> pages

  dbUser --> requireAuth
  dbUser --> dbSpec
  dbUser --> dbAnalysis
  dbUser --> dbUserMission
  dbMission --> dbUserMission

  classDef client fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef server fill:#f8fafc,stroke:#475569,color:#0f172a;
  classDef service fill:#ecfeff,stroke:#06b6d4,color:#0f172a;
  classDef db fill:#f0fdf4,stroke:#22c55e,color:#0f172a;
  classDef external fill:#fff7ed,stroke:#f97316,color:#0f172a;
  class pages,protected,authStorage,apiClient,mockData client;
  class cors,authRoutes,specRoutes,analysisRoutes,missionRoutes,submissionRoutes,careerRoutes,requireAuth server;
  class userService,specService,analysisService,missionProgressService,submissionService,searchServices,openaiService,emailService service;
  class dbUser,dbSpec,dbAnalysis,dbMission,dbUserMission db;
  class smtp,openai,careerNet,qnet external;
```

## 핵심 데이터 흐름

- 인증: `Signup/Login/VerifyEmail/MyPage` 화면에서 `/api/auth/*`를 호출하고, 서버는 `User`를 읽고 쓰며 JWT를 발급한다. 프론트는 JWT를 `authStorage`에 저장해 보호 API 호출에 사용한다.
- 스펙: `/specs` 화면은 `specApi`로 `/api/specs`를 호출하고, `UserSpec`에 사용자별 스펙을 저장한다.
- AI 분석: `/analysis` 화면은 `/api/analysis`를 호출한다. 서버는 `UserSpec`을 확인한 뒤 OpenAI API를 호출하고 결과를 `AnalysisResult`에 저장한다. 스펙 변경 이후 새 분석이 없으면 기존 최신 분석을 재사용한다.
- 미션 진행: `/mission/:missionId` 화면은 `/api/missions/:missionId/progress`를 호출한다. 체크리스트 진행 상태는 `UserMission.checkedItems`에 저장된다.
- 결과물 제출: `/upload` 화면은 `/api/submissions`를 호출한다. 제출 URL/파일 정보와 제출 상태는 `UserMission`에 저장되고, `/feedback`, `/portfolio`는 최신 제출 정보를 조회해 화면을 구성한다.
- 검색: 회원가입/스펙 입력 화면의 학교, 전공, 직업, 자격증 검색은 백엔드 `/api/jobs`, `/api/qualifications`, `/api/schools`, `/api/majors`를 거쳐 CareerNet/Q-Net 또는 fallback 데이터로 응답한다.

## 코드 기준

- 프론트 라우팅: `frontend/src/App.jsx`, `frontend/src/router.js`
- 프론트 API helper: `frontend/src/features/auth/authService.js`, `frontend/src/features/career/*Api.js`
- 백엔드 라우팅: `backend/src/app.js`, `backend/src/routes`
- 백엔드 서비스: `backend/src/services`
- DB 모델: `backend/prisma/schema.prisma`
