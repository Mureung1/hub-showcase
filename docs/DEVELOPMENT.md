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
- Frontend: `VITE_API_BASE_URL`
- `.env`와 `.env.*`는 커밋하지 않으며, 공유 가능한 예시 파일인 `.env.example`만 버전 관리한다.
- 실제 Discord 토큰과 운영 DB 접속 정보는 로컬 `.env` 또는 배포 플랫폼의 환경 변수에만 저장한다.

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

- `pages`는 라우트 단위 화면을 둔다.
- `features`는 notice config, subscribe preview 등 도메인 기능 단위로 API, UI, 상태, 타입을 함께 관리한다.
- `components`는 Button, Input, Table 같은 재사용 UI를 둔다.
- 루트 `api`는 base URL, 공통 요청 처리, 공통 에러 변환처럼 특정 도메인을 모르는 backend REST API client만 둔다.
- `features/*/api`는 해당 도메인의 endpoint와 request/response 변환을 둔다.
- 도메인 API를 루트 `api`에 모으지 않고 소유하는 feature 내부에 둔다.
- `types`는 frontend에서 공유하는 TypeScript 타입을 둔다.
