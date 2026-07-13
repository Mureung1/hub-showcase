# 사이사이 디렉터리 구조

## 1. 구조 원칙

- 4주 MVP 동안 루트 `package.json`과 `package-lock.json` 하나를 프론트와 백엔드가 함께 사용한다.
- 프론트와 백엔드는 기능 중심으로 배치하고, 인증·설정·오류 같은 공통 인프라만 별도 폴더에 둔다.
- 기능 폴더 이름은 kebab-case, React 컴포넌트 파일과 컴포넌트 이름은 PascalCase를 사용한다.
- 파일은 실제 역할이 생길 때 추가한다. 현재의 `.gitkeep`은 개발 시작 시 실제 파일로 교체한다.
- `prototype/`은 참고용으로 동결하며 React 앱에서 import하지 않는다.

## 2. 기준 구조

```text
hub/
├─ src/
│  ├─ app/                       # 앱 진입, AppShell, 전역 상태 조합
│  │  ├─ App.jsx
│  │  └─ App.css
│  ├─ components/
│  │  └─ ui/                    # 여러 기능이 함께 쓰는 순수 UI
│  ├─ features/
│  │  ├─ auth/
│  │  ├─ onboarding/
│  │  ├─ posts/
│  │  ├─ help-requests/
│  │  ├─ group-buys/
│  │  └─ conversations/
│  ├─ repositories/             # API 계약과 HTTP 구현체
│  ├─ mocks/                    # 기존 빈 디렉터리, 3주 MVP에서 사용하지 않음
│  ├─ lib/                      # Supabase client, 날짜 등 공통 인프라
│  ├─ styles/                   # 전역 토큰과 전역 스타일
│  └─ main.jsx
├─ server/
│  ├─ src/
│  │  ├─ app.js                 # Express 앱 조립, 구현 시 생성
│  │  ├─ server.js              # 서버 부팅·종료, 구현 시 생성
│  │  ├─ modules/
│  │  │  ├─ users/
│  │  │  ├─ communities/
│  │  │  ├─ posts/
│  │  │  ├─ help-requests/
│  │  │  ├─ group-buys/
│  │  │  ├─ conversations/
│  │  │  └─ addresses/
│  │  ├─ middleware/            # 인증, rate limit, 404 등
│  │  ├─ lib/                   # Supabase client와 범용 유틸
│  │  ├─ config/                # 환경 변수 파싱과 런타임 설정
│  │  └─ errors/                # 공통 도메인·HTTP 오류
│  ├─ test/                     # API 통합 테스트
│  └─ .env.example              # 백엔드 구현 시 생성
├─ supabase/
│  ├─ config.toml               # `supabase init` 시 생성
│  ├─ migrations/               # 스키마, 함수, trigger, RLS
│  ├─ tests/                    # RLS, RPC, 제약 조건 SQL 테스트
│  └─ seed.sql                  # Auth가 필요 없는 DB 기준 데이터
├─ scripts/
│  └─ seed-demo.mjs             # Auth 계정과 사용자별 데모 데이터
├─ docs/                        # 기획, 디자인, task, 일정, 구조 문서
├─ prototype/                   # 동결된 HTML/CSS/JS 참고 구현
├─ package.json
├─ package-lock.json
└─ vite.config.js
```

구조에 표시된 미구현 파일은 해당 주차에 생성한다. 빈 실행 파일을 미리 만들어 구현된 것처럼 보이게 하지 않는다.

## 3. 프론트엔드 배치 규칙

### `app/`

- 앱 최상위 조립, 인증·온보딩·앱 진입 분기, 탭 내비게이션을 담당한다.
- 개별 게시글이나 공동구매의 도메인 로직을 직접 구현하지 않는다.

### `components/ui/`

- `Button`, `Modal`, `TextField`, `StatusBadge`처럼 두 개 이상의 feature가 쓰는 표현 컴포넌트만 둔다.
- 특정 도메인 이름이나 repository 호출을 포함하지 않는다.

### `features/<feature>/`

- 화면, feature 전용 컴포넌트, 상태 조합과 유틸을 함께 둔다.
- 예: `features/group-buys/GroupBuyList.jsx`, `GroupBuyDetail.jsx`, `groupBuyUtils.js`.
- 다른 feature의 내부 파일을 직접 import하지 않는다. 함께 쓰는 코드는 `components/ui`, `repositories`, `lib` 중 책임에 맞는 곳으로 올린다.
- 도움 1:1과 공동구매 그룹 채팅의 공통 화면·polling 로직은 `features/conversations/`에 둔다.

### `repositories/`, `mocks/`, `lib/`

- UI는 `fetch`를 직접 사용하지 않고 `HttpSaisaiRepository`를 호출한다.
- 3주 MVP는 실제 Supabase Auth와 Express API만 사용하고 `MockSaisaiRepository`를 만들지 않는다.
- 기존 빈 `mocks/` 디렉터리는 참조하지 않으며 구현 완료 상태로 표현하지 않는다.
- `lib/`에는 Supabase client, 날짜 포맷 등 도메인에 종속되지 않는 인프라만 둔다.

프론트 단위 테스트를 도입하면 대상 파일 옆에 `*.test.jsx` 또는 `*.test.js`로 둔다.

## 4. 백엔드 배치 규칙

각 기능 module은 필요에 따라 다음 파일을 가진다.

```text
server/src/modules/group-buys/
├─ groupBuy.routes.js
├─ groupBuy.controller.js
├─ groupBuy.service.js
├─ groupBuy.schema.js
└─ groupBuy.service.test.js
```

- routes는 HTTP 경로와 middleware 연결만 담당한다.
- controller는 요청·응답 변환만 담당한다.
- service는 권한이 전제된 도메인 흐름과 Supabase/RPC 호출을 담당한다.
- schema는 Zod 입력 검증을 담당한다.
- 의존 방향은 routes → controller → service → `lib/` 또는 DB RPC로 유지한다.
- 다른 module의 controller나 내부 schema를 직접 참조하지 않는다. 공통 기능은 `lib/`, 공통 요청 처리는 `middleware/`로 이동한다.
- `server/test/`에는 여러 module을 거치는 API 통합 테스트만 둔다.

## 5. Supabase와 seed 규칙

- migration에는 재현 가능한 스키마, 함수, trigger, RLS만 둔다.
- `seed.sql`에는 Auth 사용자 생성 없이 실행할 수 있는 기준 데이터만 둔다.
- Auth Admin API와 service role이 필요한 데모 계정은 `scripts/seed-demo.mjs`에서 멱등 생성한다.
- SQL 기반 RLS·RPC 테스트는 `supabase/tests/`에 둔다.
- service role 환경 변수는 seed 스크립트 실행 환경에만 주입하고 프론트와 일반 Render API 환경에는 두지 않는다.
- Kakao 주소 원문과 좌표는 API 요청 처리 중에만 사용하며 profile이나 별도 주소 테이블에 저장하지 않는다.

## 6. 문서와 참고 구현

- 제품 기획의 저장소 기준 문서는 `docs/product-plan.md`다.
- 세부 구현 범위는 `docs/frontend-tasks.md`, `docs/backend-tasks.md`, `docs/database-tasks.md`를 따른다.
- 실제 구조가 이 문서와 달라지면 같은 변경에서 이 문서와 `AGENTS.md`를 함께 수정한다.
- `prototype/`은 화면과 문구 참고용이며 기능을 수정하거나 프로덕션 코드와 공유하지 않는다.

## 7. 지금 사용하지 않는 구조

- `apps/web`, `apps/api`, `packages/*` 형태의 npm workspace는 현재 규모에서 도입하지 않는다.
- 프론트와 백엔드에 각각 별도 `package.json`과 lock 파일을 만들지 않는다.
- 기능이 하나뿐인 코드를 공통 폴더로 미리 추출하지 않는다.
- 배포 설정 파일은 Vercel·Render 설정이 실제로 필요할 때 추가한다.
