# CLAUDE.md — 소상공인 정부지원금 큐레이터

에이전트·개발자용 프로젝트 맥락 문서. 코드 작업 전 이 파일과 `docs/plan.md`를 먼저 읽을 것.

## 프로젝트 한 줄 요약

소상공인이 업종·지역·사업 규모를 입력하면, 조건에 맞는 정부 지원금을 **매칭·정렬**해 보여주고 **외부 기관 사이트로 신청을 연결**하는 MVP 서비스.

## 핵심 문서

| 경로 | 내용 |
|------|------|
| `docs/plan.md` | 기획서 — 문제 정의, MVP 범위, 화면 흐름 |
| `prototype/gov_subsidy_home_wireframe.html` | UI/UX 단일 소스 (HTML 프로토타입) |
| `.cursor/skills/gov-subsidy-design/` | 디자인 구현 Skill (토큰·화면 스펙 포함) |
| `src/components/ProjectIntro.tsx` | 4주 로드맵·데이터 소스·MVP Must/Should/Won't |

## 기술 스택 (확정)

| 영역 | 선택 | 비고 |
|------|------|------|
| 프론트엔드 | **React 19 + TypeScript + Vite** | 루트 `src/` |
| 백엔드 | **Express 4 + TypeScript** | `server/` |
| 공유 타입 | **TypeScript** | `shared/` |
| DB | **PostgreSQL (Supabase)** | 1주차 스키마 설계 후 연동 |
| 크롤러 | Node.js + Cheerio | `crawler/` (1주차 생성 예정) |
| 스케줄링 | GitHub Actions cron | README 참고 |
| 배포 | Vercel(프론트) + Render/Fly 등(API) | 4주차 전 확정 |

> README의 Next.js 언급은 **구 스택**. 본 프로젝트는 **React + Express 분리 구조**로 진행.

## 디렉토리 구조

```
hub/
├── src/                    # React 클라이언트 (Vite)
│   ├── components/
│   ├── pages/              # 2주차: 라우트별 페이지
│   ├── styles/tokens.css   # 디자인 토큰 (와이어프레임 :root)
│   └── ...
├── server/                 # Express API
│   └── src/
│       ├── index.ts
│       ├── routes/
│       └── data/           # MVP 샘플 데이터
├── shared/                 # 프론트·백 공유 타입
│   └── src/types/
├── prototype/              # HTML 와이어프레임 (수정 시 Skill도 갱신)
├── docs/
├── crawler/                # 1주차: 기업마당 크롤러
├── .cursor/skills/gov-subsidy-design/
├── CLAUDE.md
└── package.json            # workspaces: server, shared
```

## 로컬 개발

```bash
npm install
cp .env.example .env        # server/ 에서 dotenv 로드
npm run dev                 # client :5173 + server :3001 동시 실행
```

- 클라이언트 API 호출: `/api/*` → Vite proxy → `http://localhost:3001`
- 헬스체크: `GET /api/health`
- 지원금 목록(MVP 샘플): `GET /api/subsidies`

## 테스트

- `npm test` — Vitest 실행 (`src/**/*.test.ts`, `server/src/**/*.test.ts`)
- 경계값·404·잘못된 입력 등 **엣지 케이스** 위주로 작성 (해피패스는 최소한만)
- PR을 main으로 열면 `.github/workflows/pr-checks.yml`이 lint + 테스트 + 커밋 메시지 검증을 자동 실행

## 핵심 기능 (MVP)

1. **조건 매칭 + 정렬** — 업종/지역/직원수/연매출(와이어프레임) + 업력(plan, API 필드)
2. **상세 + 외부 신청 연결** — 자격·서류·신청 방법, CTA는 외부 URL

### MVP 제외 (구현하지 않음)

- 로그인/회원, 관심 저장, 마감 알림 (UI placeholder만)
- 서비스 내 신청서 작성
- 전국 모든 지자체 완전 커버

## 화면·라우트

```
/                      Welcome
/onboarding/:step(1-4)  조건 입력
/onboarding/complete   완료 요약
/home                  매칭 리스트
/subsidies/:id         상세
```

디자인 구현 시 `.cursor/skills/gov-subsidy-design/SKILL.md` 따를 것.

## API 설계 (초안)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/health` | 상태 확인 |
| GET | `/api/subsidies` | 매칭 결과 (query: sort, profile fields) |
| GET | `/api/subsidies/:id` | 상세 |

2주차에 `POST /api/match` 또는 query 기반 필터링으로 확장.

## 데이터 소스

1. **MVP 1순위**: [기업마당](https://www.bizinfo.go.kr) — API 또는 리스트 파싱
2. 후순위: K-스타트업, 소진공, 지자체

## 코딩 컨벤션

### 일반

- **언어**: 코드·변수·주석은 영어, **UI 카피는 한국어** (와이어프레임 문구 유지)
- **TypeScript strict** — `any` 지양, 공유 타입은 `shared/`에 정의
- **포맷**: oxlint (`npm run lint`)

### 파일·네이밍

| 대상 | 규칙 | 예 |
|------|------|-----|
| React 컴포넌트 | PascalCase | `SubsidyCard.tsx` |
| hooks | camelCase, `use` prefix | `useOnboarding.ts` |
| API routes | kebab 또는 resource | `subsidies.ts` |
| CSS | co-located `.css` 또는 `.module.css` | `SubsidyCard.css` |
| 상수 | SCREAMING_SNAKE | `SORT_OPTIONS` |

### React

- 함수형 컴포넌트 + hooks
- 2주차부터 **React Router** 도입
- 서버 상태: **TanStack Query** (2주차 추가)
- 온boarding state: Context 또는 sessionStorage

### Express

- 라우터는 `server/src/routes/`에 분리
- 요청 검증: **zod**
- 에러 응답: `{ error: string }` + 적절한 HTTP status

## 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/) + 한글 본문 허용:

```
<type>(<scope>): <한 줄 요약>

[선택 본문]
```

| type | 용도 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서만 |
| `style` | 포맷·UI (로직 변경 없음) |
| `refactor` | 리팩터 |
| `chore` | 빌드·deps·설정 |
| `test` | 테스트 |

**scope 예**: `client`, `server`, `shared`, `crawler`, `design`

**예시**:
```
feat(client): 온보딩 step1 업종 선택 UI 구현
fix(server): subsidies 404 응답 형식 통일
docs: CLAUDE.md API 초안 추가
```

**자동 검증**: `commitlint.config.js` + husky `commit-msg` 훅이 위 `type` 목록과 형식을 로컬 커밋 시점에 강제합니다. 타입을 추가/변경하면 두 곳(이 표, `commitlint.config.js`)을 함께 수정할 것. PR에서도 `.github/workflows/pr-checks.yml`의 `commitlint` 잡이 브랜치의 모든 커밋 메시지를 재검증합니다.

## PR 규칙

`.github/pull_request_template.md` 따름:
- 타이틀: `[N100_실명] 작업 한 줄 요약`
- 주요 작업 리스트 + 스크린샷
- 설명 가능한 부분 / 이해 못 한 부분 / 새로 알게 된 것

## 개발 전·2주차 전 결정 사항

### 이미 결정됨

| 항목 | 결정 |
|------|------|
| 아키텍처 | React(Vite) + Express 분리, npm workspaces |
| 스타일 | CSS 변수 + co-located CSS, Pretendard |
| UI 기준 | `prototype/gov_subsidy_home_wireframe.html` |
| 정렬 우선순위 | 매칭도 > 마감임박 > 지원금액 |
| 인증 | MVP 없음 |
| 신청 처리 | 외부 링크 redirect |

### 1주차에 결정할 것

- [ ] Supabase 프로젝트 생성 및 `subsidies` 테이블 스키마
- [ ] 기업마당 수집 방식 (공식 API vs Cheerio 크롤링)
- [ ] 크롤러 실행 주기 (GitHub Actions cron 표현)
- [ ] `districts` 전국 데이터 소스 (정적 JSON vs API)

### 2주차 전에 결정할 것

- [ ] React Router vs 상태 기반 screen switch (와이어프레임 방식)
- [ ] TanStack Query 도입 및 API client 패턴
- [ ] 온보딩 state 저장 (sessionStorage vs URL)
- [ ] plan.md **업력(연차)** 필드 UI 추가 여부
- [ ] AI 요약(Claude API) 적용 범위 — 상세 본문만 vs 카드 요약

### 3주차·배포 전

- [ ] 매칭 점수 알고리즘 가중치
- [ ] API·프론트 배포 타겟 및 env 분리
- [ ] E2E/수동 테스트 체크리스트

## plan.md ↔ 와이어프레임 차이

| plan.md | 와이어프레임 | 현재 방침 |
|---------|-------------|-----------|
| 업력 필수 | 연매출만 | UI는 와이어프레임, API에 `businessYears` optional |
| 신용도 선택 | 없음 | API optional, UI 미노출 |
| 알림 MVP 제외 | 알림 UI 있음 | placeholder |

## 에이전트 작업 시

1. UI 작업 → `gov-subsidy-design` Skill 로드
2. 기능 범위 확인 → `docs/plan.md` MVP 제외 항목
3. 타입 변경 → `shared/` 먼저 수정 후 client/server 반영
4. 와이어프레임 수정 시 → Skill `design-tokens.md`, `screens.md` 동기화
