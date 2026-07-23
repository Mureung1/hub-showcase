# TeamFlow 아키텍처 설명서

## 1. 한 문장으로 설명

TeamFlow는 React 화면이 Express API에 요청을 보내고, Express가 로그인 사용자의 JWT를 검증한 뒤 Supabase PostgreSQL에 접근하는 3계층 웹 애플리케이션입니다.

```text
사용자 → React/Vite → Express API → Supabase PostgreSQL
                    ↘ Supabase Auth
```

전체 연결은 [README의 시스템 아키텍처](../README.md#시스템-아키텍처)에서 확인할 수 있습니다.

## 2. 각 영역의 역할

### React/Vite 웹

사용자가 실제로 보는 화면과 브라우저 상태를 담당합니다.

- `App.jsx`: 공개·로그인·게스트 경로를 구분하고 화면을 연결합니다.
- `AuthProvider.jsx`: Supabase 로그인 세션과 JWT를 관리합니다.
- `TeamFlowProvider.jsx`: 서버에서 받은 프로젝트·팀원·할 일을 React 상태로 보관합니다.
- `apiTeamFlowRepository.js`: 화면에서 필요한 작업을 HTTP API 요청으로 바꿉니다.

중요한 점은 화면 컴포넌트가 `fetch`를 직접 호출하지 않는다는 것입니다. 화면은 `TeamFlowProvider`에 작업을 요청하고, Provider가 Repository를 사용합니다. 덕분에 화면 로직과 통신 로직이 분리됩니다.

### Express API

브라우저 요청을 검증하고 Supabase 작업으로 연결합니다.

- `app.js`: Express 앱과 `/health`, `/api` 경로를 구성합니다.
- `teamFlowRoutes.js`: 입력값 검사와 HTTP 응답을 담당합니다.
- `auth.js`: Bearer JWT를 읽고 Supabase Auth로 사용자를 확인합니다.
- `teamFlowRepository.js`: 프로젝트·팀원·할 일을 실제 DB 명령으로 바꿉니다.
- `server.js`: 인증기, Repository, Express 앱을 조립하고 서버를 실행합니다.

라우트와 DB 접근을 분리했기 때문에 HTTP 규칙을 바꾸는 작업과 데이터 저장 방식을 바꾸는 작업이 서로 덜 얽힙니다.

### Supabase

인증과 영구 데이터 저장을 담당합니다.

- Auth: Google OAuth 로그인, 세션, JWT 발급을 담당합니다.
- PostgreSQL: 프로젝트·팀원·할 일과 게스트 데모를 저장합니다.
- RLS: JWT의 사용자 ID를 기준으로 자신이 소유한 데이터만 접근하도록 제한합니다.

브라우저와 Express는 모두 publishable key를 사용합니다. `service_role`이나 secret key로 RLS를 우회하지 않습니다.

### Shared 패키지

`packages/shared`에는 프론트엔드와 API가 함께 사용하는 프로젝트·할 일 상태값과 검증 함수가 있습니다. 양쪽에서 같은 값의 의미를 공유해 계약 불일치를 줄입니다.

## 3. Google 로그인 흐름

1. 사용자가 랜딩 화면에서 Google 로그인을 선택합니다.
2. `AuthProvider`가 Supabase Auth에 OAuth 로그인을 요청합니다.
3. Google 인증이 끝나면 브라우저가 `/auth/callback`으로 돌아옵니다.
4. `AuthProvider`가 로그인 세션과 JWT를 확인합니다.
5. 인증이 완료되면 원래 접근하려던 화면 또는 `/projects`로 이동합니다.

비밀번호와 Google Client Secret은 TeamFlow 웹이나 Express가 직접 다루지 않습니다. Google Client Secret은 Supabase Dashboard에만 둡니다.

## 4. 로그인 사용자의 데이터 흐름

새 할 일을 등록하는 경우를 예로 들면 다음과 같습니다.

1. 사용자가 React 모달에서 할 일 정보를 입력합니다.
2. 화면이 `TeamFlowProvider.createTask`를 호출합니다.
3. API Repository가 `POST /api/tasks` 요청을 만들고 Bearer JWT를 붙입니다.
4. Express 인증 미들웨어가 JWT를 검증해 현재 사용자를 식별합니다.
5. Route가 제목, 담당자, 날짜, 상태 등의 입력값을 검사합니다.
6. TeamFlow Repository가 Supabase의 `tasks` 테이블에 데이터를 저장합니다.
7. RLS가 해당 프로젝트가 현재 사용자의 소유인지 확인합니다.
8. 저장 결과가 JSON으로 React에 돌아옵니다.
9. `TeamFlowProvider`가 state에 새 할 일을 추가하고 React가 화면을 다시 렌더링합니다.

즉, React의 핵심 흐름은 다음과 같습니다.

```text
사용자 이벤트 → API 요청 → DB 저장 → JSON 응답 → state 변경 → 화면 갱신
```

## 5. 게스트 데이터 흐름

게스트는 로그인 세션 대신 브라우저의 게스트 상태를 사용합니다.

1. React가 인증이 필요 없는 `GET /api/demo`를 호출합니다.
2. Express의 게스트 Repository가 활성 데모 데이터만 조회합니다.
3. React가 받은 데이터를 일반 프로젝트 화면에 표시합니다.
4. 생성·수정·삭제 요청은 웹의 게스트 Repository에서 거부합니다.

따라서 게스트 화면은 실제 Supabase 데이터를 사용하지만 읽기 전용입니다.

## 6. 현재 영속화 범위

현재 로그인 사용자가 Supabase에 저장할 수 있는 데이터는 다음과 같습니다.

- 프로젝트 생성과 기간 변경
- 협업자 초대와 프로젝트 역할 수정
- 할 일 생성, 상태 변경, 삭제

공유 노트, 자료실, AI 팀원 화면은 존재하지만 아직 로그인 사용자 데이터가 Supabase에 저장되지는 않습니다. 코드의 `capabilities` 값이 화면에서 사용할 수 있는 기능 범위를 나타냅니다.

## 7. 구조를 설명할 때 강조할 점

- React는 화면과 상태, Express는 요청 검증과 업무 연결, Supabase는 인증과 저장을 담당합니다.
- JWT는 로그인한 사용자를 증명하며, RLS는 그 사용자가 접근할 수 있는 DB 행을 제한합니다.
- Repository 계층을 둬서 화면, HTTP, DB 코드를 서로 분리했습니다.
- 로그인 사용자 데이터와 게스트 데모 데이터는 같은 화면에서 보이지만 접근 방식과 권한이 다릅니다.
- 아직 모든 화면이 영속화된 것은 아니며 현재 범위가 코드와 README에 명시되어 있습니다.

## 8. 1분 발표 예시

> TeamFlow는 React, Express, Supabase의 3계층 구조입니다. React는 사용자 화면과 상태를 담당하고, 로그인은 브라우저에서 Supabase Auth와 직접 연결합니다. 로그인 후 프로젝트나 할 일을 변경하면 React가 JWT를 담아 Express API를 호출합니다. Express는 JWT와 입력값을 검증한 뒤 Repository를 통해 Supabase PostgreSQL에 접근합니다. 이때 RLS가 사용자 ID를 기준으로 다른 사용자의 데이터 접근을 막습니다. DB 처리 결과는 JSON으로 돌아오고 React state가 변경되면서 화면이 갱신됩니다. 게스트는 별도의 공개 데모 데이터만 읽을 수 있고 수정은 차단됩니다. 현재 프로젝트·협업 팀원·할 일은 실제 DB에 저장되며, 할 일은 프로젝트에 참여한 협업 팀원에게만 배정할 수 있습니다.

## 9. 주요 코드 위치

- 웹 진입점: [`apps/web/src/main.jsx`](../apps/web/src/main.jsx)
- 화면 라우팅: [`apps/web/src/App.jsx`](../apps/web/src/App.jsx)
- 인증 상태: [`apps/web/src/auth/AuthProvider.jsx`](../apps/web/src/auth/AuthProvider.jsx)
- 전역 데이터 상태: [`apps/web/src/state/TeamFlowProvider.jsx`](../apps/web/src/state/TeamFlowProvider.jsx)
- 웹 API Repository: [`apps/web/src/data/apiTeamFlowRepository.js`](../apps/web/src/data/apiTeamFlowRepository.js)
- Express 조립: [`apps/api/src/server.js`](../apps/api/src/server.js)
- 인증 미들웨어: [`apps/api/src/lib/auth.js`](../apps/api/src/lib/auth.js)
- API Routes: [`apps/api/src/teamflow/teamFlowRoutes.js`](../apps/api/src/teamflow/teamFlowRoutes.js)
- DB Repository: [`apps/api/src/teamflow/teamFlowRepository.js`](../apps/api/src/teamflow/teamFlowRepository.js)
- DB 및 RLS 정의: [`supabase/migrations/20260721054012_google_auth_workspace.sql`](../supabase/migrations/20260721054012_google_auth_workspace.sql)
