# DEVELOPMENT.md

> Development guidelines for the IRIS project.

---

# Project Overview

IRIS is a Discord-based university notice notification service.

The project helps users reduce repeated visits to university notice websites by receiving category-based and keyword-based notice alerts through Discord.

The MVP focuses on building a working flow from notice site registration to Discord notification delivery.

---

# Tech Stack

## Frontend

- TypeScript
- React
- Vite
- Tailwind CSS
- Vercel

## Backend

- TypeScript
- Node.js
- Express.js

## Discord

- TypeScript
- discord.js

## Crawling

- Axios
- Cheerio

## Database

### Development

- MySQL with Docker
- Prisma ORM

### Production

- MySQL

## Scheduler

- node-cron

## Language Policy

- Frontend, backend, Discord bot code should be written in TypeScript.
- Shared request/response types and domain models should be extracted when duplication becomes meaningful.
- Avoid using `any` for core domain data such as guilds, notice sites, categories, notices, subscriptions, and keywords.
- Prisma schema remains the database source of truth, and TypeScript types should align with it.

## Deployment

### Frontend

- Vercel

### Backend

- Docker
- EC2

### CI/CD

- GitHub Actions

## Future

- OpenAI API

---

# Environment Variables

각 앱의 예시 파일을 복사해 로컬 환경 변수를 준비한다.

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

- Backend: `NODE_ENV`, `PORT`, `DATABASE_URL`, `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `ADMIN_WEB_URL`
- Frontend: `VITE_API_BASE_URL`, `VITE_DISCORD_INVITE_URL`, `VITE_SELECTOR_GUIDE_URL`
- `.env`와 `.env.*`는 커밋하지 않으며, 공유 가능한 예시 파일인 `.env.example`만 버전 관리한다.
- 실제 Discord 토큰과 운영 DB 접속 정보는 로컬 `.env` 또는 배포 플랫폼의 환경 변수에만 저장한다.

## Database Setup

로컬 개발 DB는 루트의 Docker Compose로 MySQL을 실행한다.

```powershell
docker-compose up -d mysql
cd backend
npm run db:migrate
npm run db:seed
npm run db:check
```

- Local `DATABASE_URL`: `mysql://iris:iris@localhost:3307/iris`
- Local `SHADOW_DATABASE_URL`: `mysql://root:root@localhost:3307/iris_shadow`
- Production `DATABASE_URL`: `mysql://<user>:<password>@<host>:3306/<database>`
- 배포 환경에서는 애플리케이션 컨테이너 시작 전에 `npm run db:deploy`로 커밋된 migration을 적용한다.

---

# Directory Structure

IRIS는 도메인 기준으로 코드를 나누고, 각 도메인 내부에 controller, service, repository, route, type 파일을 둔다.

계층별 폴더(`controllers`, `services`, `repositories`)에 모든 기능을 몰아두지 않는다.

```text
hub
├── docs
│   └── image
│       └── design
├── prototype
├── intro
├── frontend
│   ├── public
│   └── src
│       ├── app
│       ├── pages
│       ├── components
│       ├── features
│       │   ├── notice-config
│       │   │   ├── api
│       │   │   ├── components
│       │   │   ├── hooks
│       │   │   └── types
│       │   └── discord
│       │       ├── api
│       │       └── types
│       ├── api
│       ├── styles
│       └── types
├── backend
│   ├── prisma
│   │   └── schema.prisma
│   └── src
│       ├── main.ts
│       ├── app.ts
│       ├── config
│       ├── db
│       ├── shared
│       │   ├── errors
│       │   ├── logger
│       │   ├── http
│       │   └── types
│       ├── modules
│       │   ├── notice-config
│       │   │   ├── notice-config.controller.ts
│       │   │   ├── notice-config.service.ts
│       │   │   ├── notice-config.repository.ts
│       │   │   ├── notice-config.routes.ts
│       │   │   ├── notice-config.schema.ts
│       │   │   └── notice-config.types.ts
│       │   ├── crawling
│       │   │   ├── crawler.service.ts
│       │   │   ├── crawler.repository.ts
│       │   │   ├── crawl-test.service.ts
│       │   │   └── link-normalizer.ts
│       │   ├── discord
│       │   │   ├── discord.client.ts
│       │   │   ├── discord-role.service.ts
│       │   │   ├── discord-channel.service.ts
│       │   │   └── commands
│       │   │       ├── help.command.ts
│       │   │       ├── setup.command.ts
│       │   │       ├── subscribe.command.ts
│       │   │       └── keyword.command.ts
│       │   ├── subscription
│       │   ├── keyword
│       │   ├── notification
│       │   └── summary
│       └── scheduler
│           └── notice-cron.ts
└── README.md
```

## Backend Module Rules

- `modules/*`는 기능 도메인 기준으로 나눈다.
- 도메인 내부에서 controller, service, repository, schema, type을 함께 관리한다.
- controller는 HTTP 요청/응답 변환만 담당한다.
- service는 비즈니스 규칙과 Discord API orchestration을 담당한다.
- repository는 Prisma를 통한 DB 접근만 담당한다.
- schema는 request validation과 DTO 검증에 사용한다.
- `shared`에는 특정 도메인에 속하지 않는 error, logger, http helper, 공통 type만 둔다.
- `summary`는 1차 MVP 필수 구현이 아니지만, 요약 버튼 확장을 위해 모듈 위치를 예약한다.

## Frontend Structure Rules

- 정식 FSD 전체 계층을 강제하지 않고, MVP 규모에 맞춰 `app`, `pages`, `features`, `components`, `api`, `types`, `styles` 중심의 feature-based 구조를 사용한다.
- `app`은 앱 진입점, 라우팅, 전역 Provider만 담당하고 페이지 UI를 직접 누적하지 않는다.
- `pages`는 라우트 단위 화면을 둔다.
- Page는 화면 흐름과 조립을 담당하고, 실제 도메인 UI와 API 경계는 가능한 한 feature 내부로 분리한다.
- Page는 feature component를 import해 조립할 수 있으며, step/state/API 호출 연결처럼 route 흐름에 가까운 책임만 가진다.
- Feature component는 page를 import하지 않고 props와 callback으로 필요한 값을 전달받는다.
- 페이지 내부에서만 쓰는 작은 컴포넌트, 정적 데이터, page 전용 스타일은 우선 해당 `pages/{page}` 폴더 안에 둔다.
- `features`는 notice config, subscribe preview 등 도메인 기능 단위로 API, UI, 상태, 타입을 함께 관리한다.
- 여러 페이지에서 재사용되는 도메인 기능은 `features/{domain}`으로 이동한다.
- `components`는 Button, Input, Table 같은 재사용 UI를 둔다.
- 한 번만 쓰는 UI를 성급하게 공통 컴포넌트로 빼지 않고, 두 개 이상의 화면에서 반복될 때 `components`로 이동한다.
- 루트 `api`는 base URL, 공통 요청 처리, 공통 에러 변환처럼 특정 도메인을 모르는 backend REST API client만 둔다.
- `features/*/api`는 해당 도메인의 endpoint와 request/response 변환을 둔다.
- 도메인 API를 루트 `api`에 모으지 않고 소유하는 feature 내부에 둔다.
- Mock API는 실제 API와 같은 request/response 형태를 유지해 이후 실제 API로 교체할 때 UI 변경을 줄인다.
- `types`는 frontend에서 공유하는 TypeScript 타입을 둔다.
- page 전용 CSS는 page 폴더에 두고, `styles/global.css`에는 전역 reset, font, base element style만 둔다.
- 파일이 커지거나 변경 이유가 둘 이상으로 늘어나면 컴포넌트, hook, api, type 단위로 분리한다.
