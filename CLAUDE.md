# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI 소비 코치(SpendMate) — 자취/기숙사 대학생을 위해 영수증을 찍으면 자동으로 카테고리별 지출을 정리하고, 현재 소비 속도로 생활비가 언제 바닥나는지 예측하며, 필요할 때만 개입해 절약 방법(대체 레시피, 최저가 비교)을 제안하는 앱. 4주 개발 일정, 2주차부터 본격 구현 시작 — 현재는 백엔드 스캐폴딩(Express + Prisma 스키마)과 프론트 5개 화면 프로토타입까지 있는 단계.

## Repo 구조

- `SpendMate/be/` — Express 백엔드 (Node.js + TypeScript + Prisma)
- `SpendMate/fe/` — React 프론트엔드 (Vite, Figma Make export). 자체 `CLAUDE.md`/`AGENTS.md`와 디자인 스킬(`fe/.claude/skills/spendmate-design-rules`) 보유
- `docs/` — 기획/설계 문서

## Tech stack

- 백엔드: Node.js + Express (TypeScript)
- LLM Agent: Claude API (tool use), Anthropic Node SDK(`@anthropic-ai/sdk`)로 연동 예정
- OCR: 네이버 클로바 OCR (업스테이지와 PoC 비교 후 확정 예정)
- 구매 비교 Tool: 네이버 쇼핑 검색 API
- 레시피 Tool: 공공데이터포털 레시피 API
- DB: PostgreSQL + Prisma
- 프론트엔드: React (`SpendMate/fe/`)

## Commands

```
cd SpendMate/be
pnpm install
pnpm dev                # 개발 서버 (tsx watch, 기본 4000 포트)
pnpm build && pnpm start   # 빌드 후 실행
pnpm exec tsc --noEmit  # 타입체크만
pnpm prisma:generate    # Prisma Client 생성
pnpm prisma:migrate     # DB 마이그레이션 (로컬 Postgres 필요)
```

```
cd SpendMate/fe
pnpm install
pnpm dev      # 개발 서버 (기본 8443 포트)
pnpm build    # 빌드
```

## Architecture

두 단계로 나뉜 파이프라인 (상세 스펙은 [docs/plan.md](docs/plan.md) 5장 참고):

1. **결정론적 분석 파이프라인** (F1~F8, F12, F13) — OCR → 파싱 → 카테고리 분류 → 예산/소진일 계산 → 소비 신호(Context) 생성. 규칙 기반이며 확률/추정 없이 실제 계산값만 다룬다.
2. **AI Agent** (F16) — 파이프라인이 만든 Context를 받아 개입 여부와 Tool 선택(F11 Recipe Tool / F15 Smart Purchase Tool / 개입 안 함)을 판단. 하나의 신호만으로 판단하지 않고 전체 상황(예산 사용률 등)을 함께 본다. Tool 실행 결과는 그대로 노출하지 않고 "추천 이유 → Tool 결과 → 예상 절약 효과 → 예산 소진 예상일" 순서로 재구성해 사용자에게 전달한다.

현재 `SpendMate/be/prisma/schema.prisma`에는 도메인 모델(`User`, `Receipt`, `Expense`, `Subscription`, `Category`, `ReceiptSourceType`, `ExpenseInputType`)이 정의돼 있고, `src/app.ts`는 `/health` 헬스체크 라우트만 있는 상태 — 실제 라우트/컨트롤러/서비스/Agent 레이어는 아직 없음. 진행 순서는 [docs/checklist.md](docs/checklist.md)의 주차별 체크리스트를 따른다: ① OCR PoC → ② 네이버 쇼핑 API PoC → ③ Recipe Tool 데이터 확보 → ④ Agent 프롬프트 설계 → ⑤ Function Calling 연결.

DB 연결은 Prisma 7 방식(드라이버 어댑터)을 따른다 — `schema.prisma`의 `datasource` 블록엔 `url`을 넣지 않고, 연결 정보는 `prisma.config.ts`(마이그레이션/CLI용)와 런타임 `PrismaClient` 생성 시 `@prisma/adapter-pg`(설치 필요, 아직 미설치) 어댑터로 따로 넘긴다.

`Category` enum(`DELIVERY`, `CONVENIENCE_STORE`, `CAFE`, `MEAL_KIT`, `MART`, `CAMPUS_MEAL`, `SHOPPING`, `OTHER`)은 프론트엔드 카테고리 라벨(카페/편의점/외식/식료품/교통/쇼핑)과 이름이 1:1로 대응하지 않으므로, API 응답을 설계할 때 매핑이 필요하다 — [docs/design.md](docs/design.md)의 카테고리 컬러 매핑 참고.

## 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 형식 사용: `<type>: <설명>`

- `feat` — 새 기능
- `fix` — 버그 수정
- `docs` — 문서만 변경
- `refactor` — 동작 변화 없는 코드 구조 변경
- `chore` — 빌드/설정/의존성 등 잡무
- `test` — 테스트 추가/수정
- `style` — 포맷팅 등 코드 의미에 영향 없는 변경

예: `feat: 구독 등록 API 추가`, `fix: 예산 소진일 계산 오프바이원 버그 수정`

## 코드 컨벤션

- 백엔드는 `routes → controllers → services` 레이어드 구조. 라우트는 요청/응답 처리만, 비즈니스 로직은 `services/`에.
- ESLint + Prettier 사용 (`pnpm lint`, `pnpm format`).
- 프론트엔드 스타일 규칙은 `SpendMate/fe/.claude/skills/spendmate-design-rules`가 별도로 관리 — 화면/컴포넌트 작업 시 그쪽 우선 참고.

## AI 코치 메시지 작성 시 제약

가짜 확신도/확률 숫자(예: "소진 확률 82%")를 절대 노출하지 않는다 — 규칙 기반 추정치이지 보정된 확률이 아니기 때문. 실제로 계산 가능한 숫자(금액, 비율, 일수)만 사용한다 ([docs/plan.md](docs/plan.md) 6.2 비기능 요구사항 참고).

---

- 기획서: [docs/plan.md](docs/plan.md)
- 개발 체크리스트: [docs/checklist.md](docs/checklist.md)
- 디자인: [docs/design.md](docs/design.md)
