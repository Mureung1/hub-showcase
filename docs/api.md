# TeamFlow API 명세서

## 기본 정보

- 로컬 API 주소: `http://localhost:3000`
- 요청과 응답 형식: `application/json`
- 웹 개발 환경에서는 Vite가 `/api` 요청을 `http://127.0.0.1:3000`으로 전달합니다.
- `/health`, `/api/demo`를 제외한 요청에는 Supabase 로그인 JWT가 필요합니다.

```http
Authorization: Bearer <access_token>
```

## API 목록

| Method | Path | 인증 | 기능 |
|---|---|---:|---|
| `GET` | `/health` | 불필요 | API 서버 상태 확인 |
| `GET` | `/api/demo` | 불필요 | 읽기 전용 게스트 데이터 조회 |
| `GET` | `/api/bootstrap` | 필요 | 로그인 사용자의 초기 데이터 조회 |
| `POST` | `/api/projects` | 필요 | 프로젝트 생성 |
| `PATCH` | `/api/projects/:projectId` | 필요 | 프로젝트 기간 변경 |
| `POST` | `/api/tasks` | 필요 | 할 일 생성 |
| `PATCH` | `/api/tasks/:taskId` | 필요 | 할 일 상태 변경 |
| `DELETE` | `/api/tasks/:taskId` | 필요 | 할 일 삭제 |

## 공통 상태값

```text
프로젝트: not_started | in_progress | completed
할 일:    not_started | in_progress | in_review | completed
날짜:     YYYY-MM-DD
ID:       UUID
```

## 공개 API

### `GET /health`

API 서버가 실행 중인지 확인합니다.

```json
{
  "status": "ok",
  "service": "teamflow-api"
}
```

### `GET /api/demo`

게스트에게 읽기 전용 데모 워크스페이스를 반환합니다. 응답 구조는 `/api/bootstrap`과 같으며 `accessMode`는 `guest`, 모든 `capabilities` 값은 `false`입니다.

## 로그인 사용자 API

### `GET /api/bootstrap`

첫 화면에 필요한 사용자 데이터를 한 번에 조회합니다.

```json
{
  "projects": [],
  "members": [],
  "tasks": [],
  "notes": [],
  "resources": [],
  "aiSettings": {},
  "aiHistory": [],
  "currentUserId": "member-uuid",
  "aiMemberId": "",
  "accessMode": "authenticated",
  "capabilities": {
    "projects": true,
    "members": true,
    "tasks": true,
    "notes": false,
    "resources": false,
    "ai": false
  }
}
```

### `POST /api/projects`

프로젝트를 생성합니다. `startDate`와 `endDate`는 빈 문자열을 허용합니다.

```json
{
  "name": "AI Agent Challenge",
  "description": "TeamFlow 개발 프로젝트",
  "status": "not_started",
  "startDate": "2026-07-20",
  "endDate": "2026-08-14"
}
```

성공: `201 Created`

```json
{
  "project": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "AI Agent Challenge",
    "description": "TeamFlow 개발 프로젝트",
    "status": "not_started",
    "startDate": "2026-07-20",
    "endDate": "2026-08-14",
    "memberIds": ["22222222-2222-4222-8222-222222222222"],
    "creatorId": "22222222-2222-4222-8222-222222222222"
  }
}
```

### `PATCH /api/projects/:projectId`

프로젝트 시작일과 종료일을 변경합니다.

```json
{
  "startDate": "2026-07-21",
  "endDate": "2026-08-15"
}
```

성공: `200 OK`

```json
{
  "project": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "AI Agent Challenge",
    "description": "TeamFlow 개발 프로젝트",
    "status": "not_started",
    "startDate": "2026-07-21",
    "endDate": "2026-08-15"
  }
}
```

### `POST /api/tasks`

새 할 일을 생성합니다. `assigneeId`에는 초대를 수락한 프로젝트 협업 팀원의 ID만 사용할 수 있습니다.

```json
{
  "projectId": "11111111-1111-4111-8111-111111111111",
  "title": "아키텍처 다이어그램 작성",
  "assigneeId": "22222222-2222-4222-8222-222222222222",
  "dueDate": "2026-07-22",
  "status": "not_started",
  "description": "README에 Mermaid로 추가"
}
```

성공: `201 Created`

```json
{
  "task": {
    "id": "33333333-3333-4333-8333-333333333333",
    "projectId": "11111111-1111-4111-8111-111111111111",
    "title": "아키텍처 다이어그램 작성",
    "assigneeId": "22222222-2222-4222-8222-222222222222",
    "dueDate": "2026-07-22",
    "status": "not_started",
    "description": "README에 Mermaid로 추가",
    "isNew": true
  }
}
```

### `PATCH /api/tasks/:taskId`

할 일의 진행 상태를 변경합니다.

```json
{ "status": "completed" }
```

성공: `200 OK`

```json
{
  "task": {
    "id": "33333333-3333-4333-8333-333333333333",
    "projectId": "11111111-1111-4111-8111-111111111111",
    "title": "아키텍처 다이어그램 작성",
    "assigneeId": "22222222-2222-4222-8222-222222222222",
    "dueDate": "2026-07-22",
    "status": "completed",
    "description": "README에 Mermaid로 추가"
  }
}
```

### `DELETE /api/tasks/:taskId`

할 일을 삭제합니다. 요청 본문은 없습니다.

성공: `200 OK`

```json
{ "taskId": "33333333-3333-4333-8333-333333333333" }
```

## 오류 응답

모든 오류는 `error` 객체로 반환합니다.

| 상태 코드 | code | 의미 |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | ID, 필수 입력값 또는 상태값이 잘못됨 |
| `401` | `AUTH_REQUIRED` | Bearer JWT가 없음 |
| `401` | `INVALID_AUTH_TOKEN` | JWT가 만료됐거나 유효하지 않음 |
| `404` | `NOT_FOUND` | 접근 가능한 데이터가 존재하지 않음 |
| `503` | `TEAMFLOW_STORE_UNAVAILABLE` | Supabase 저장소 처리 실패 |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해 주세요.",
    "fields": {
      "title": "제목은 1자 이상 200자 이하여야 합니다."
    }
  }
}
```

## 구현 위치

- 백엔드 API 정의: [`apps/api/src/teamflow/teamFlowRoutes.js`](../apps/api/src/teamflow/teamFlowRoutes.js)
- 인증 처리: [`apps/api/src/lib/auth.js`](../apps/api/src/lib/auth.js)
- DB 처리: [`apps/api/src/teamflow/teamFlowRepository.js`](../apps/api/src/teamflow/teamFlowRepository.js)
- 프론트엔드 API 호출: [`apps/web/src/data/apiTeamFlowRepository.js`](../apps/web/src/data/apiTeamFlowRepository.js)
- 공통 상태값과 데이터 계약: [`packages/shared/src/project.js`](../packages/shared/src/project.js)
