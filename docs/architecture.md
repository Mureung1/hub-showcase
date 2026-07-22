# SUBZIP 아키텍처 다이어그램

현재 코드베이스에 **실제로 구현된** 화면 → 서버 → DB 흐름만을 기준으로 그린 as-is 다이어그램. `docs/api-spec.md`에 `[초안]`으로만 존재하고 아직 라우트가 없는 영역(정산, 파티원 관리 API 등)은 포함하지 않는다.

## 다이어그램

```mermaid
flowchart TB
    subgraph FE["Frontend Screens (react-router-dom)"]
        Layout["Layout\n(공통 레이아웃 + 인증 체크)"]
        Home["Home /\n(SubscriptionList)"]
        About["ProjectInfo\n/about"]
        New["SubscriptionForm\n/subscriptions/new"]
        Detail["SubscriptionDetail\n/subscriptions/:id"]
        NotFound["NotFound\n*"]
        OAuthCB["OAuthCallback\n/oauth/callback (Layout 밖)"]

        Layout --> Home
        Layout --> About
        Layout --> New
        Layout --> Detail
        Layout --> NotFound
    end

    subgraph LIB["API 클라이언트 (frontend/src/lib)"]
        subsJs["subscriptions.js"]
        authJs["auth.js"]
    end

    Google(["Google OAuth"])

    subgraph BE["Backend (Express 4, ESM)"]
        Health["GET /api/health"]
        AuthRoutes["/api/auth\nGET /google\nGET /google/callback"]
        UsersRoutes["/api/users\nGET /me"]
        SubsRoutes["/api/subscriptions\nPOST / · GET / · GET /:id"]
        MW["requireAuth\n(JWT, middleware/auth.js)"]
    end

    Prisma[["Prisma Client"]]

    subgraph DB["PostgreSQL"]
        UsersTbl[("users")]
        SubsTbl[("subscriptions")]
        PartyTbl[("party_members")]
    end

    Home --> subsJs
    Detail --> subsJs
    New --> subsJs
    Layout --> authJs
    Home -. "로그인 링크(a href)" .-> AuthRoutes

    subsJs -->|"GET/POST /api/subscriptions"| SubsRoutes
    authJs -->|"GET /api/users/me"| UsersRoutes

    AuthRoutes <--> Google
    AuthRoutes -->|"user.upsert"| Prisma
    AuthRoutes -. "JWT 발급 후 redirect" .-> OAuthCB

    SubsRoutes --> MW
    UsersRoutes --> MW
    MW --> Prisma

    Prisma --> UsersTbl
    Prisma --> SubsTbl
    SubsRoutes -. "role 체크용 read" .-> PartyTbl
```

## 레이어 요약

### Frontend — 화면 (`frontend/src/App.jsx`)

| 경로 | 컴포넌트 | 비고 |
| --- | --- | --- |
| `/` | `Home` (`SubscriptionList`) | Layout 하위 |
| `/about` | `ProjectInfo` | Layout 하위 |
| `/subscriptions/new` | `SubscriptionForm` | Layout 하위 |
| `/subscriptions/:id` | `SubscriptionDetail` | Layout 하위 |
| `/oauth/callback` | `OAuthCallback` | Layout 밖 (OAuth 리다이렉트 전용) |
| `*` | `NotFound` | Layout 하위 |

API 호출은 `frontend/src/lib/subscriptions.js`(`createSubscription`, `getSubscriptions`, `getSubscription`)와 `frontend/src/lib/auth.js`(`fetchMe`)가 담당. 둘 다 axios 없이 순수 `fetch` 기반.

### Backend — 라우트 (`backend/src/index.js` 마운트 기준)

| 라우트 | 파일 | 인증 |
| --- | --- | --- |
| `GET /api/health` | `index.js` (인라인) | 불필요 |
| `GET /api/auth/google`, `GET /api/auth/google/callback` | `routes/auth.routes.js` | 불필요 (로그인 자체) |
| `GET /api/users/me` | `routes/users.routes.js` | `requireAuth` |
| `POST /api/subscriptions`, `GET /api/subscriptions`, `GET /api/subscriptions/:id` | `routes/subscriptions.routes.js` | `requireAuth` |

`requireAuth`는 `backend/src/middleware/auth.js`에서 JWT(`backend/src/lib/jwt.js`)를 검증.

### DB — Prisma / PostgreSQL (`backend/prisma/schema.prisma`)

| 모델 | 테이블 | 비고 |
| --- | --- | --- |
| `User` | `users` | Google OAuth 시 upsert |
| `Subscription` | `subscriptions` | 생성/목록/상세 조회 구현됨 |
| `PartyMember` | `party_members` | 스키마·마이그레이션은 존재하지만 전용 API(참여/멤버 목록 등)는 아직 미구현 — 현재는 `subscriptions.routes.js`에서 role 체크용으로만 read |

## docs/api-spec.md 대비 구현 범위

- **1. Auth `[확정]`**: 구현된 라우트와 일치.
- **2. Subscription `[초안]`**: 명세된 것 중 생성/목록/상세 조회만 구현. 수정/삭제/정산 관련 엔드포인트는 미구현.
- **3. Party Member `[초안]`**: DB 테이블만 존재, API 라우트 없음.

새 기능을 구현하며 이 표가 달라지면 이 문서도 함께 갱신할 것.
