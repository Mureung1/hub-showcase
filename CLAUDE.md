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
