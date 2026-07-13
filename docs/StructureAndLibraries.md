# 디렉토리 구조와 라이브러리 결정

## 1. 조사 기준

알바노트는 초기 버전에서 기능이 많아 보이지만, 핵심 흐름은 근무표 관리와 공개 대타 요청이다. 따라서 구조와 라이브러리는 다음 기준으로 결정한다.

- 기능별로 확장하기 쉬운가
- TypeScript와 잘 맞는가
- 현재 기능에 실제로 필요한가
- 외부 UI 라이브러리 없이 직접 디자인 규칙을 적용할 수 있는가
- Supabase Auth, Supabase Postgres와 역할이 겹치지 않는가

## 2. 현재 프로젝트 구조

현재 프로젝트는 React SPA 프론트엔드와 Express API 백엔드를 하나의 루트에서 관리하는 npm workspace 구조를 사용한다.

```txt
albanote/
  apps/
    frontend/
    backend/
  docs/
  prototype/
  package.json
```

이 구조는 유지한다. 프론트엔드와 백엔드가 같은 서비스 안에서 함께 개발되므로, 초기 프로젝트에는 모노레포 구성이 적절하다.

## 3. Frontend 구조 결정

프론트엔드는 React SPA와 기능 중심 구조를 사용한다.

```txt
apps/frontend/src/
  pages/
  features/
    schedule/
    substitute/
    worker/
    store/
    notification/
    payroll/
  shared/
    api/
    components/
    hooks/
    types/
    utils/
  styles.css
```

- `pages`: React Router가 연결할 URL 단위 화면을 둔다.
- `features`: 기능별 화면 조각, API 함수, 훅, 타입을 둔다.
- `shared`: 여러 기능에서 함께 쓰는 공통 코드만 둔다.
- 디자인 토큰과 전역 스타일은 우선 `styles.css`에서 관리한다.

추후 화면이 많아지면 `styles/` 폴더를 분리할 수 있지만, 지금은 파일 수를 과하게 늘리지 않는다.

## 4. Backend 구조 결정

백엔드는 기능별 모듈 구조와 레이어드 아키텍처를 사용한다.

```txt
apps/backend/src/
  app.ts
  server.ts
  common/
    config/
    middlewares/
    types/
    utils/
  modules/
    auth/
    stores/
    schedules/
    substituteRequests/
    workers/
    notifications/
    payroll/
```

각 기능 모듈은 기능이 구현되는 시점에 다음 구조를 따른다.

```txt
moduleName/
  moduleName.routes.ts
  moduleName.controller.ts
  moduleName.service.ts
  moduleName.repository.ts
  moduleName.types.ts
```

단, `health`처럼 비즈니스 로직이 없는 기능은 `routes`와 `controller`만 둘 수 있다.

## 5. 이미 설치된 라이브러리

### 공통

- `typescript`: TypeScript 기반 개발
- `concurrently`: 프론트엔드와 백엔드 개발 서버 동시 실행

### Frontend

- `react`
- `react-dom`
- `vite`
- `@vitejs/plugin-react`
- `@types/react`
- `@types/react-dom`

### Backend

- `express`
- `cors`
- `dotenv`
- `@supabase/supabase-js`
- `tsx`
- `@types/node`
- `@types/express`
- `@types/cors`

## 6. 추가 채택할 라이브러리

2026년 7월 9일 기준 npm registry에서 버전을 확인했다.

### Frontend

| 라이브러리 | 확인 버전 | 결정 | 사용 목적 |
| --- | ---: | --- | --- |
| `react-router-dom` | 7.18.1 | 채택 | SPA 클라이언트 라우팅 |
| `date-fns` | 4.4.0 | 채택 | 근무표 날짜 계산, 월간/일간 날짜 처리 |
| `react-hook-form` | 7.81.0 | 채택 | 근무표 등록, 대타 요청 폼 상태 관리 |
| `@hookform/resolvers` | 5.4.0 | 채택 | `react-hook-form`과 `zod` 연결 |
| `zod` | 4.4.3 | 채택 | 폼 입력값 검증, API 응답 타입 안정성 보조 |
| `@tanstack/react-query` | 5.101.2 | 채택 | 서버 데이터 조회, 캐싱, 로딩/에러 상태 관리 |

### Backend

| 라이브러리 | 확인 버전 | 결정 | 사용 목적 |
| --- | ---: | --- | --- |
| `zod` | 4.4.3 | 채택 | API 요청 body, params, query 검증 |
| `helmet` | 8.2.0 | 채택 | 기본 보안 헤더 설정 |
| `express-rate-limit` | 8.5.2 | 채택 | 로그인, 대타 신청 같은 민감 요청의 과도한 호출 제한 |
| `morgan` | 1.11.0 | 채택 | 개발 환경 요청 로그 확인 |

## 7. 보류할 라이브러리

| 라이브러리 | 결정 | 이유 |
| --- | --- | --- |
| `jsonwebtoken` | 보류 | 인증은 Supabase Auth를 사용하기로 확정했다. 직접 JWT를 발급하지 않는다. |
| `bcryptjs` | 보류 | 비밀번호 해싱은 Supabase Auth가 담당하므로 직접 처리하지 않는다. |
| `cookie-parser` | 보류 | 쿠키 기반 인증을 확정하지 않았다. |
| 외부 UI 라이브러리 | 사용 금지 | `AGENTS.md`와 `Design.md` 기준에 따라 직접 UI를 구현한다. |

## 8. 테스트 라이브러리 후보

테스트는 기능 구현이 시작되는 시점에 추가한다.

| 라이브러리 | 확인 버전 | 결정 | 사용 목적 |
| --- | ---: | --- | --- |
| `vitest` | 4.1.10 | 채택 예정 | 프론트엔드/백엔드 단위 테스트 |
| `@testing-library/react` | 16.3.2 | 채택 예정 | React 컴포넌트 테스트 |
| `supertest` | 7.2.2 | 채택 예정 | Express API 테스트 |

## 9. 설치 순서

기능 개발을 시작할 때 다음 순서로 설치한다.

1. 라우팅과 날짜 처리: `react-router-dom`, `date-fns`
2. 입력 검증과 폼: `zod`, `react-hook-form`, `@hookform/resolvers`
3. 서버 상태 관리: `@tanstack/react-query`
4. 백엔드 검증/보안/로그: `zod`, `helmet`, `express-rate-limit`, `morgan`
5. 테스트: `vitest`, `@testing-library/react`, `supertest`

## 10. 최종 결정

현재 디렉토리 구조는 유지한다. 라이브러리는 위 목록을 기준으로 하되, 실제 설치는 해당 기능을 구현하기 직전에 진행한다. 인증은 Supabase Auth를 기준으로 구현하며, 자체 JWT/비밀번호 해싱 라이브러리는 초기 버전에서 사용하지 않는다.
