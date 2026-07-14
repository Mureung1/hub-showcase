# 알바노트 아키텍처

## 1. 기본 방향

알바노트는 사장님과 알바생이 함께 사용하는 React 기반 SPA 근무 관리 웹 서비스이다. 초기 개발에서는 복잡한 분산 구조보다 기능별 확장이 쉬운 모듈형 레이어드 아키텍처를 사용한다.

전체 흐름은 다음 구조를 기준으로 한다.

```txt
React SPA Frontend
  -> Express API
  -> Service Layer
  -> Repository Layer
  -> Supabase(Postgres)
```

- Frontend는 React SPA로 구성하며 화면, 사용자 입력, 클라이언트 라우팅, API 호출, 클라이언트 상태를 담당한다.
- Frontend 라우팅은 React Router를 기준으로 처리한다.
- Express API는 요청 검증, 인증/권한 확인, 서비스 호출을 담당한다.
- Express는 서버 사이드 화면 렌더링을 하지 않고 JSON API 서버 역할을 담당한다.
- Service Layer는 비즈니스 로직과 상태 변경 규칙을 담당한다.
- Repository Layer는 Supabase 데이터 접근을 담당한다.
- DB는 근무표, 매장, 사용자, 대타 요청, 알림, 급여 계산에 필요한 데이터를 저장한다.

## 2. Frontend 구조

Frontend는 기능 중심 구조를 사용한다.

```txt
src/
  pages/
  features/
    schedule/
    substitute/
    worker/
    store/
    notification/
    payroll/
  shared/
    components/
    hooks/
    api/
    types/
    utils/
```

- `pages`: 라우팅 단위 페이지를 둔다.
- `features`: 기능별 화면, 훅, API 호출, 타입을 둔다.
- `shared`: 여러 기능에서 재사용하는 공통 UI, 훅, API 클라이언트, 타입을 둔다.
- 기능 내부 구현은 가능한 한 해당 feature 폴더 안에 모은다.

## 3. Backend 구조

Backend는 기능별 모듈 구조를 사용한다.

```txt
src/
  modules/
    auth/
    stores/
    schedules/
    substituteRequests/
    workers/
    notifications/
    payroll/
  common/
    middlewares/
    errors/
    utils/
    types/
```

각 모듈은 기본적으로 다음 파일 구조를 따른다.

```txt
moduleName/
  moduleName.routes.ts
  moduleName.controller.ts
  moduleName.service.ts
  moduleName.repository.ts
  moduleName.types.ts
```

- `routes`: URL과 HTTP method를 정의한다.
- `controller`: 요청/응답 처리와 입력값 검증을 담당한다.
- `service`: 비즈니스 규칙과 상태 변경 로직을 담당한다.
- `repository`: Supabase DB 접근을 담당한다.
- `types`: 해당 모듈의 타입을 정의한다.

## 4. 기능별 디자인 패턴

### 인증과 권한

사용 패턴: `RBAC(Role-Based Access Control)`

- 사용자는 기본적으로 `OWNER`, `WORKER` 역할을 가진다.
- 사장님과 알바생은 접근 가능한 메뉴와 API가 다르다.
- 권한 검사는 Frontend 표시 제어와 Backend API 검사를 모두 적용한다.
- 인증은 Supabase Auth를 사용한다.
- Backend는 Supabase Auth 토큰을 검증한 뒤 요청 사용자의 매장 소속과 역할을 확인한다.
- 직접 JWT 발급, 비밀번호 해싱, 자체 세션 저장소는 초기 버전에서 구현하지 않는다.

### 근무표 관리

사용 패턴: `Service + Repository`

- 근무표 등록, 수정, 삭제, 조회 로직은 Service Layer에 둔다.
- DB 조회와 저장은 Repository Layer에 둔다.
- Controller에서 직접 DB를 호출하지 않는다.

### 반복 근무 등록

사용 패턴: `Factory`

- 매주 반복, 요일 반복, 기간 반복 등 반복 근무 데이터를 생성할 때 사용한다.
- 반복 규칙을 입력받아 실제 근무 일정 목록을 생성한다.

### 공개 대타 요청

사용 패턴: `State Machine`

대타 요청은 상태 변화가 핵심이므로 명확한 상태 전이를 사용한다.

```txt
OPEN
  -> PENDING_APPROVAL
  -> APPROVED
  -> REJECTED
  -> CLOSED
```

- `OPEN`: 같은 매장 알바생이 대타 신청할 수 있는 상태
- `PENDING_APPROVAL`: 먼저 신청한 알바생이 있어 사장님 승인 대기 중인 상태
- `APPROVED`: 사장님이 승인하여 대타가 확정된 상태
- `REJECTED`: 사장님이 거절한 상태
- `CLOSED`: 요청이 마감된 상태

상태 변경은 반드시 Service Layer에서만 처리한다.

### 먼저 신청한 알바생 선정

사용 패턴: `Transaction / Locking`

- 여러 알바생이 동시에 신청해도 가장 먼저 신청한 한 명만 후보가 되어야 한다.
- 후보 선정과 상태 변경은 하나의 트랜잭션으로 처리한다.
- 이미 `PENDING_APPROVAL` 이상인 요청에는 추가 후보가 선정되지 않도록 한다.

### 알림

사용 패턴: `Observer`

- 대타 요청 등록, 대타 신청, 승인, 거절, 근무표 변경 같은 이벤트가 발생하면 알림을 생성한다.
- 이벤트 발생 지점에서 알림 생성 로직을 직접 흩뿌리지 않고, 이벤트를 기준으로 처리한다.

### 급여 계산

사용 패턴: `Strategy`

- 초기에는 기본 시급 계산 전략을 사용한다.
- 추후 야간수당, 주휴수당, 휴일수당 등이 필요해지면 계산 전략을 추가한다.
- 급여 계산 로직은 화면이나 Controller에 두지 않는다.

### 환경 설정과 헬스체크

사용 패턴: `Route + Controller`

- 서버 상태 확인처럼 비즈니스 로직이 없는 인프라성 기능은 Service와 Repository를 생략할 수 있다.
- 헬스체크는 `GET /api/health`를 기본으로 사용한다.
- 환경 변수는 공통 설정 모듈에서 읽고, 기능 코드에서 직접 `process.env`를 반복해서 사용하지 않는다.

## 5. API 설계 원칙

- REST API를 기본으로 한다.
- 리소스 중심 URL을 사용한다.
- HTTP method는 의미에 맞게 사용한다.
  - `GET`: 조회
  - `POST`: 생성
  - `PATCH`: 일부 수정 또는 상태 변경
  - `DELETE`: 삭제
- 권한 검사가 필요한 요청은 Backend에서 반드시 한 번 더 확인한다.

예시:

```txt
GET /api/stores/:storeId/schedules
POST /api/stores/:storeId/substitute-requests
PATCH /api/substitute-requests/:requestId/apply
PATCH /api/substitute-requests/:requestId/approve
PATCH /api/substitute-requests/:requestId/reject
```

### MVP API 목록

초기 개발에서 사용할 주요 API는 다음 목록을 기준으로 한다.

```txt
GET    /api/health

GET    /api/me
GET    /api/stores
POST   /api/stores
GET    /api/stores/:storeId
PATCH  /api/stores/:storeId

GET    /api/stores/:storeId/workers
POST   /api/stores/:storeId/invitations
PATCH  /api/stores/:storeId/workers/:workerId

GET    /api/stores/:storeId/schedules
GET    /api/stores/:storeId/schedules/:date
POST   /api/stores/:storeId/schedules
PATCH  /api/schedules/:scheduleId
DELETE /api/schedules/:scheduleId
POST   /api/stores/:storeId/recurring-schedules

GET    /api/stores/:storeId/substitute-requests
POST   /api/stores/:storeId/substitute-requests
GET    /api/substitute-requests/:requestId
PATCH  /api/substitute-requests/:requestId/apply
PATCH  /api/substitute-requests/:requestId/approve
PATCH  /api/substitute-requests/:requestId/reject
PATCH  /api/substitute-requests/:requestId/cancel

GET    /api/notifications
PATCH  /api/notifications/:notificationId/read

GET    /api/stores/:storeId/payroll/summary
```

## 6. 데이터베이스 설계 초안

초기 DB는 Supabase Postgres를 기준으로 다음 테이블을 사용한다. 컬럼명은 실제 구현 시 snake_case를 사용한다.

### profiles

Supabase Auth 사용자와 연결되는 서비스 사용자 프로필이다.

- `id`: Supabase Auth user id
- `email`
- `name`
- `phone`: 선택 정보
- `created_at`
- `updated_at`

### stores

매장 정보이다.

- `id`
- `owner_id`
- `name`
- `address`
- `created_at`
- `updated_at`

### store_members

사용자와 매장의 소속 관계를 나타낸다.

- `id`
- `store_id`
- `user_id`
- `role`: `OWNER` 또는 `WORKER`
- `hourly_wage`
- `default_work_start_time`
- `default_work_end_time`
- `joined_at`
- `created_at`
- `updated_at`

### store_invitations

사장님이 알바생을 매장으로 초대하는 기록이다.

- `id`
- `store_id`
- `invited_by`
- `invitee_email`
- `status`: `PENDING`, `ACCEPTED`, `EXPIRED`, `CANCELED`
- `created_at`
- `accepted_at`

### schedules

실제 근무 일정이다.

- `id`
- `store_id`
- `worker_id`
- `work_date`
- `start_time`
- `end_time`
- `position`
- `memo`
- `source`: `MANUAL`, `RECURRING`, `SUBSTITUTE`
- `created_at`
- `updated_at`

### recurring_schedule_rules

반복 근무 생성 규칙이다.

- `id`
- `store_id`
- `worker_id`
- `weekday`
- `start_time`
- `end_time`
- `start_date`
- `end_date`
- `created_at`
- `updated_at`

### substitute_requests

공개 대타 요청이다.

- `id`
- `store_id`
- `schedule_id`
- `requester_id`
- `candidate_worker_id`
- `status`: `OPEN`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CLOSED`
- `reason`
- `reject_reason`
- `created_at`
- `updated_at`

### substitute_applications

대타 신청 기록이다. 가장 먼저 신청한 알바생만 `candidate_worker_id`로 선정된다.

- `id`
- `request_id`
- `worker_id`
- `created_at`

### notifications

웹 내부 알림이다.

- `id`
- `user_id`
- `type`
- `title`
- `message`
- `read_at`
- `created_at`

### work_records

급여 계산에 사용할 근무 기록이다. 초기에는 확정된 근무 일정을 기준으로 단순 계산한다.

- `id`
- `store_id`
- `worker_id`
- `schedule_id`
- `work_date`
- `start_time`
- `end_time`
- `hourly_wage`
- `created_at`

## 7. 권한 규칙

권한 검사는 Backend에서 반드시 수행한다.

| 기능 | OWNER | WORKER |
| --- | --- | --- |
| 매장 생성/수정 | 가능 | 불가 |
| 알바생 초대/관리 | 가능 | 불가 |
| 근무표 조회 | 소유 매장 가능 | 소속 매장 가능 |
| 근무표 등록/수정/삭제 | 가능 | 불가 |
| 공개 대타 요청 등록 | 불가 | 본인 근무에 한해 가능 |
| 공개 대타 요청 신청 | 불가 | 같은 매장 요청에 가능 |
| 대타 승인/거절 | 가능 | 불가 |
| 알림 조회 | 본인 알림만 가능 | 본인 알림만 가능 |
| 급여 요약 조회 | 소유 매장 가능 | 본인 정보만 가능 |

## 8. 대타 요청 상태 전이

대타 요청 상태 전이는 Service Layer에서만 처리한다.

```txt
OPEN
  -> PENDING_APPROVAL
  -> APPROVED
  -> REJECTED
  -> CLOSED
```

- `OPEN -> PENDING_APPROVAL`: 같은 매장 알바생이 가장 먼저 신청한 경우
- `PENDING_APPROVAL -> APPROVED`: 사장님이 승인한 경우
- `PENDING_APPROVAL -> REJECTED`: 사장님이 거절한 경우
- `OPEN -> CLOSED`: 요청자가 취소한 경우
- `REJECTED -> CLOSED`: 거절된 요청을 마감 처리한 경우

`APPROVED` 상태가 되면 기존 근무자의 일정은 대타 근무자 기준으로 자동 변경한다. 원래 근무자와 대타 근무자 이력은 `substitute_requests`, `substitute_applications`, `work_records`를 통해 추적한다.

## 9. React SPA 라우팅 기준

초기 라우팅은 React Router 기반 클라이언트 라우팅을 기준으로 사용한다. 아래 경로들은 별도 HTML 파일이 아니라 하나의 React 앱 안에서 전환되는 화면이다.

```txt
/                         비로그인 메인 또는 로그인 후 근무표
/login                    로그인
/signup                   회원가입
/stores/select            매장 선택
/schedule                 월간 근무표
/schedule/:date           일간 근무표 상세
/substitute-requests      공개 대타 요청 목록
/substitute-requests/new  공개 대타 요청 등록
/workers                  알바생 관리
/notifications            알림
/my-work                  내 근무 정보
```

권한에 따라 같은 URL이라도 접근 가능한 메뉴와 동작을 다르게 제어한다. 단, Frontend 라우팅 제어는 사용자 경험을 위한 것이며 실제 권한 판단은 Backend API에서 다시 수행한다.

새로고침 또는 직접 URL 접근 시에도 SPA 라우트가 정상 동작하도록 배포 환경에서는 모든 비 API 경로가 `index.html`로 fallback되도록 설정한다.

## 10. 코드 작성 규칙

- 새로운 기능을 구현하기 전 이 문서에서 해당 기능의 구조와 패턴을 먼저 확인한다.
- 이 문서에 정의되지 않은 기능은 구현 전에 사용할 패턴을 먼저 정한다.
- Controller에서 비즈니스 로직을 직접 처리하지 않는다.
- Repository에서 상태 전이 규칙을 판단하지 않는다.
- Frontend는 Backend 권한 검사를 대체하지 않는다.
- 상태값은 문자열을 직접 흩뿌리지 않고 타입 또는 상수로 관리한다.
