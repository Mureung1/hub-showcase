# 1주차 목요일 진행 보고서

문서 상태: history

이 문서는 2026-07-09 당시 상태를 보존한다. 현재 Task와 기술 기준은 [4주 개발 백로그](./tasks.md)와 [시스템 아키텍처](./architecture.md)를 사용한다. 이 보고서에 기록된 CI는 이후 저장소 제출 규칙에 맞춰 제거됐다.

| 항목 | 내용 |
| --- | --- |
| 기준 커밋 | `fc0fcf7` on `develop` |
| 기준 일시 | 2026-07-09 |
| 보고 범위 | 1주차 시작부터 목요일까지 진행한 작업 |

## 1. 전체 요약

1주차 작업 계획은 디자인 시스템, 디자인 제작 Skill, 개발 환경 구성 세 영역으로 구성된다. 이 문서는 1주차 전체 완료 보고서가 아니라 목요일까지 `develop` 브랜치에 반영된 작업과 남은 항목을 정리한 진행 보고서다.

| 태스크 | 상태 | 요약 |
| --- | --- | --- |
| 디자인 시스템 | 기준 수립 완료 | 디자인 시스템 문서, CSS token, 프로토타입 HTML 구성 |
| 디자인 제작 Skill | 진행 중 | 디자인 시스템 문서가 skill 역할을 하나 별도 agent skill 파일 미생성 |
| 개발 환경 구성 | 환경 구성 완료 | React/Vite + FastAPI scaffold, lockfile, hooks, CI, 문서 전체 구성 |

## 2. 디자인 시스템

### 2.1 선택한 도구

| 항목 | 결정 |
| --- | --- |
| 디자인 도구 | 코드 기반 디자인 시스템 (문서 + CSS token + HTML 프로토타입) |
| 외부 도구 | Figma, Claude Design, Google Stitch는 사용하지 않음 |
| 이유 | 1인 프로젝트에서 기획서→문서→token→코드 일관성을 유지하기 위한 코드 중심 접근 |

Figma 같은 전용 디자인 도구 대신 `design-system.md`를 single source of truth로 사용하고, CSS token과 HTML 프로토타입으로 직접 검증하는 방식을 택했다. 디자인 도구 도입은 팀 확장 시 재검토한다.

### 2.2 현재까지 만든 디자인 산출물

디자인 시스템 문서:

```text
docs/design/design-system.md (325줄, 13KB)
```

포함 항목:

| 섹션 | 내용 |
| --- | --- |
| 제품 경험 원칙 | 분석 우선, 지도=작업공간, 수치 근거, 조용한 밀도, 3D=보조 |
| 색상 token | `--lt-color-brand` 등 11개 |
| 타이포그래피 | Inter + Pretendard 기반 6단계 |
| 간격과 크기 | 4/8/12/16/24/32px scale |
| border와 shadow | 최소 shadow 원칙 |
| 화면 구조 | 상권 분석 화면, 3D 탐색 화면, 반응형 동작 |
| component 규칙 | Button, Filter, Card, Marker, Chart/Score |
| 상태와 접근성 | 8가지 상태, WCAG AA, keyboard |
| content 규칙 | 한국어 UX writing, 과장 금지 |
| 변경 관리 | 변경 절차 정의 |

CSS design token 구현:

```text
product/apps/web/src/styles/tokens.css (37줄)
```

```css
:root {
  --lt-color-brand: #03c75a;
  --lt-color-brand-strong: #08703a;
  --lt-color-text: #14211b;
  --lt-color-text-muted: #65766d;
  --lt-color-canvas: #edf3ef;
  --lt-color-surface: #ffffff;
  --lt-color-border: rgba(15, 23, 42, 0.13);
  --lt-color-info: #2563eb;
  --lt-color-warning: #f59e0b;
  --lt-color-danger: #dc2626;

  --lt-space-1: 4px;  --lt-space-2: 8px;
  --lt-space-3: 12px; --lt-space-4: 16px;
  --lt-space-6: 24px; --lt-space-8: 32px;

  --lt-radius-control: 6px;
  --lt-radius-panel: 8px;
}
```

핵심 화면 프로토타입:

```text
docs/prototypes/core-market-analysis-prototype.html (798줄)
```

프로토타입에서 검증된 화면:

```text
상단 App Bar (브랜드, 검색, 상권분석/3D 탐색 전환)
좌측 Sidebar (상권/업종/반경 필터, 점포 목록)
중앙 지도 (OSM tile, 반경 원, 점포 마커, 지도 도구)
우측 Inspector (입지 점수, 요약 지표, 시간대별 수요, 해석 리포트)
업종 전환 인터랙션 (카페 ↔ 음식점 데이터 변경)
반경 전환 인터랙션 (100m/300m/500m 시각 변경)
반응형 레이아웃 (1120px, 780px breakpoint)
```

### 2.3 디자인 → 개발 연결

| 연결 경로 | 상태 |
| --- | --- |
| `design-system.md` → `tokens.css` | 동기화됨 (같은 token name 사용) |
| `design-system.md` → 프로토타입 HTML | 같은 색상/spacing 사용 |
| `tokens.css` → `App.tsx` | `global.css`가 `tokens.css`를 import |
| 공통 component 구현 | 미구현 (Button, Filter, Panel 등) |

### 2.4 디자인 시스템 구현 진행률

`design-system.md` 10절 기준:

- [x] `product/apps/web/src/styles/tokens.css` 생성
- [ ] 공통 button, filter, panel, score, marker component 구현
- [ ] 임의 색상과 spacing 사용을 확인하는 lint/check 추가
- [ ] desktop/mobile visual regression 기준 화면 추가
- [ ] 기존 HTML 프로토타입을 token 기준으로 정리

## 3. 디자인 제작 Skill

### 3.1 현재 상태

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| 디자인 참고 문서 | 있음 | `design-system.md`가 디자인 기준 역할 |
| 프로토타입 참조 | 있음 | `core-market-analysis-prototype.html` |
| 사용자 디자인 비교 파일 | 있음 | `design-guide-visual-comparison.html` (건드리지 않음) |
| 별도 agent skill 파일 | 없음 | `.agents/` 디렉토리 비어 있음 |
| CLAUDE.md / Agent.md | 없음 | 저장소에 agent context 파일 없음 |

### 3.2 분석

현재 `design-system.md`가 사실상의 디자인 skill 역할을 하고 있다.

이 문서에 포함된 디자인 기준:

```text
디자인 원칙 — 분석 우선, 지도=작업공간, 조용한 밀도 등 5개 원칙
Token 참조 — 색상, 타이포, 간격, border/shadow
화면별 구조 — 상권 분석 화면, 3D 탐색 화면
Component 규칙 — Button, Filter, Card, Marker, Chart 등 component별 do/don't
UI 작업 절차 — 작업 전/중/후 체크리스트
변경 관리 — 디자인 변경 시 절차
```

Agent가 디자인 작업 시 이 문서를 읽으면 일관된 디자인을 생성할 수 있다.

### 3.3 미완료 항목과 권장 후속 작업

별도 agent skill 파일(`CLAUDE.md`, `.agents/design-skill.md` 등)은 아직 만들지 않았다. 이 파일이 있으면 Agent가 새 화면 작업 시 자동으로 디자인 시스템을 참조할 수 있다.

권장 skill 구조:

```text
CLAUDE.md 또는 .agents/design-context.md:
  design-system.md 참조 경로
  tokens.css 참조 경로
  프로토타입 HTML 참조 경로
  디자인 체크리스트 (원칙 준수 확인)
  피드백 반복 기준 (디자인 의도 부합 확인 방법)
```

## 4. 개발 환경 구성

### 4.1 현재 상태

목요일 계획 범위 중 개발 환경 구성은 완료했다. 로컬 전체 검증 통과, `develop` push와 검증 기록 작성까지 마쳤으며 제품 기능 개발은 아직 시작하지 않았다.

커밋 히스토리:

```text
03a3d7e chore(tooling): define repository toolchain
8ef957e chore(web): scaffold the React application
6251151 test(web): verify the application shell
c64bb1c chore(api): scaffold the FastAPI application
e3170f4 chore(data): establish data storage boundaries
87993d6 chore(git): enforce commit message structure
8ab9be5 chore(web): align design tokens with formatting
31d875b test(tooling): extend repository validation
7d18567 ci: validate docs web and api
d42fa37 docs: document the development environment
f74340b docs: define development conventions
8e8b972 docs: record pre-development decision gates
4be75c9 docs: define the develop branch workflow
18a7d18 chore(tooling): enforce documented conventions
c09aab8 docs: link development environment guidance
125f740 docs: record environment setup validation
227b7b8 docs: record remote validation limitation
```

17개 커밋, 각각 한 가지 목적으로 분리됐다.

### 4.2 기술 스택

| 영역 | 도구 | 버전 기준 |
| --- | --- | --- |
| JS runtime | Node.js | `24.11.x` |
| JS package manager | pnpm | `11.7.x` |
| Web framework | React + Vite + TypeScript | `product/apps/web/package.json` |
| Python | CPython | `3.13.9` |
| Python package manager | uv | `product/apps/api/uv.lock` |
| API framework | FastAPI + Uvicorn + Pydantic Settings | `product/apps/api/pyproject.toml` |
| Map 후보 | MapLibre GL JS + react-map-gl | PoC 후 확정 |

기획서의 `React와 Express` 기본 환경과 다르게 `React + Vite`(web)와 `FastAPI`(api)로 구성했다. Express 대신 FastAPI를 선택한 이유는 Python 기반 공간 계산, 데이터 파이프라인과의 일관성 때문이다.

### 4.3 디렉토리 구조

```text
LocalTwin/
  apps/
    web/                          React/Vite/TypeScript
      src/
        App.tsx                   최소 application shell
        App.test.tsx              component test
        main.tsx                  entry point
        styles/
          tokens.css              디자인 시스템 token
          global.css              전역 스타일
      package.json
      vite.config.ts
    api/                          FastAPI
      src/localtwin_api/
        main.py                   /health endpoint
        config.py                 Pydantic Settings
      tests/                      pytest
      pyproject.toml
      uv.lock
  data/
    raw/                          원본 공공데이터 (Git 추적 금지)
    processed/                    정규화 결과 (Git 추적 금지)
    fixtures/                     비식별 test/sample (추적 허용)
    scenes/                       촬영물/3D asset (Git 추적 금지)
  docs/
    design/                       디자인 시스템
    development/                  개발 환경, 컨벤션, 체크리스트 등 8개 문서
    features/                     기능 스펙 4개
    data/                         데이터 소스 매핑
    wiki/                         기획서, 실행 계획
    module-notes/                 범위 고정 명세
    evaluation/                   Agent 평가 시스템
    prototypes/                   HTML 프로토타입 2개
  scripts/
    check.ps1                     전체 검증 진입점
  .githooks/
    pre-commit                    큰 커밋/여러 영역 변경 차단
    commit-msg                    type(scope): summary + why + verify 강제
  .github/workflows/
    ci.yml                        docs/web/api 검증
    auto-merge.yml                자동 병합 (branch protection 필요)
  .harness/
    tasks/                        task packet
    runs/                         run report
```

### 4.4 설치된 라이브러리

Web runtime:

| Library | 역할 |
| --- | --- |
| `react`, `react-dom` | UI runtime |
| `maplibre-gl` | 2.5D 지도 PoC renderer |
| `react-map-gl` | React + MapLibre integration |
| `lucide-react` | 공통 icon |

Web development:

| Library | 역할 |
| --- | --- |
| `vite`, `@vitejs/plugin-react` | dev server + build |
| `typescript` | static type check |
| `oxlint` | TypeScript/React lint |
| `prettier` | formatting |
| `vitest` | unit/component test |
| `@testing-library/react`, `jest-dom` | component test |
| `jsdom` | browser-like test env |

API runtime:

| Library | 역할 |
| --- | --- |
| `fastapi` | HTTP API |
| `uvicorn` | ASGI dev server |
| `pydantic-settings` | env configuration |

API development:

| Library | 역할 |
| --- | --- |
| `pytest` | test runner |
| `httpx2` | TestClient transport |
| `ruff` | Python lint + format |

### 4.5 컨벤션과 커밋 규칙

코드 컨벤션은 `conventions.md`에 195줄로 정의됐다.

| 영역 | 핵심 규칙 |
| --- | --- |
| 공통 | UTF-8, LF, indent 2/4칸, secret 금지 |
| Web naming | PascalCase component, camelCase 함수, UPPER_SNAKE 상수 |
| Web structure | `features/<feature>/` 패턴, 재사용 코드만 `shared/`로 |
| TypeScript | strict mode, `any` 금지, `unknown` 사용 |
| API naming | snake_case module/함수, PascalCase class |
| API structure | `api/`, `domain/`, `services/`, `repositories/` 역할별 |
| API contract | `/api/v1`, snake_case JSON, ISO 8601 UTC, WGS84 |
| Data | raw/processed/fixtures/scenes 분리, raw 직접 수정 금지 |
| Test | 기능 구현과 test 동시, behavior/contract 검증 |
| Dependency | pnpm/uv만 사용, manifest+lockfile 동시 commit |

커밋 메시지 규칙은 `git-workflow.md`에 279줄로 정의됐다.

```text
type(scope): summary

why:
- 변경 이유

verify:
- 검증 내용
```

| 규칙 | 강제 방법 |
| --- | --- |
| 커밋 메시지 형식 | `commit-msg` hook |
| staged file ≤ 10개 | `pre-commit` hook |
| staged 영역 ≤ 3개 | `pre-commit` hook |
| README 링크 누락 | `pre-commit` hook |
| `--no-verify` 우회 금지 | 컨벤션 + branch protection (미설정) |

### 4.6 개발 전 결정 Gate

`pre-development-decisions.md`에 11개 Gate를 정의했다.

| Gate | 결정 시점 | 상태 |
| --- | --- | --- |
| G1. 대상 상권/업종 | 제품 개발 시작 전 | 미결정 |
| G2. 공공데이터 source | 제품 개발 시작 전 | 미결정 |
| G3. Canonical Schema | 첫 importer 구현 전 | 미결정 |
| G4. DB와 migration | 첫 persistent schema 전 | 미결정 |
| G5. 2.5D Map PoC | MapLibre 채택 전 | 미결정 |
| G6. 핵심 metric 정의 | 구현 전 | 미결정 |
| G7. 촬영과 privacy | 3D 기능 시작 전 | 미결정 |
| G8. GS pipeline | viewer 선택 전 | 미결정 |
| G9. 혼잡도 표현 | 3D 장면 구현 전 | 미결정 |
| G10. 배포 환경 | 첫 vertical slice 전 | 미결정 |
| G11. GitHub 보호 규칙 | 팀 작업/자동 병합 전 | 미결정 |

모든 Gate는 의도적으로 열린 상태로 두었다. 검증하지 않은 선택을 확정 사항처럼 기록하지 않겠다는 프로젝트 원칙에 따른 것이다.

### 4.7 Agent 맥락 파일

| 파일 | 상태 | 비고 |
| --- | --- | --- |
| `CLAUDE.md` | 미생성 | Claude 기반 Agent 맥락 |
| `Agent.md` | 미생성 | 범용 Agent 맥락 |
| `.codex/` | 디렉토리 존재 | 내용 비어 있음 |
| `.agents/` | 디렉토리 존재 | 내용 비어 있음 |

### 4.8 검증 결과

검증 기록은 `.harness/runs/2026-07-09-ENV-001-development-environment.md`에 있다.

```text
pnpm lockfile install passed
uv frozen sync passed
task packet, docs index, docs HTML/local links passed
web Prettier, strict TypeScript, Oxlint, 1 component test, production build passed
api Ruff lint/format and 1 health endpoint test passed
git diff whitespace check passed
```

알려진 제한 사항:

```text
원격 GitHub Actions 결과는 확인하지 못했다.
gh CLI 미설치, GitHub Actions API 비인증 404.
develop/main branch protection 미설정.
auto-merge workflow가 CI 상태를 자체 검사하지 않음.
제품 endpoint, DB, 실제 공공데이터, prototype은 의도적 제외.
```

## 5. 전체 체크리스트 진행률

`checklist.md` 기준:

| 섹션 | 완료 | 미완료 |
| --- | --- | --- |
| 0. 전체 마일스톤 | 0 | 10 |
| 1. 기획 및 범위 고정 | 21 | 0 |
| 2. 대상 상권 선정 | 0 | 7 |
| 3. 공공데이터 수집/정규화 | 0 | 19 |
| 4. 입지 점수/AI 리포트 | 0 | 11 |
| 5. DB/저장 구조 | 0 | 10 |
| 6. 백엔드/API | 4 | 6 |
| 7. 프론트엔드 | 3 | 15 |
| 8. 혼잡도 3D 탐색 | 0 | 15 |
| 9. 사람 영역 익명화 | 3 | 8 |
| 10. 시간대별 관찰 | 0 | 12 |
| 11. 통합 검증 | 0 | 11 |
| 12. 포트폴리오 정리 | 0 | 8 |
| 합계 | 31 | 122 |

## 6. 후속 작업 권장 사항

### 즉시 가능한 작업

| 작업 | 우선순위 | 근거 |
| --- | --- | --- |
| `CLAUDE.md` 또는 Agent context 파일 생성 | 높음 | 디자인 시스템, 컨벤션, 프로젝트 맥락을 Agent에 자동 전달 |
| 디자인 제작 skill 파일 생성 | 높음 | `design-system.md` 기반의 디자인 검증 자동화 |
| GitHub branch protection 설정 | 높음 | `--no-verify` 우회 방지 |

### 2주차 개발 착수 전 Gate

| Gate | 필요 행동 |
| --- | --- |
| G1 | 후보 상권 2~3곳 → v0.1 대상 1곳 확정 |
| G2 | `data.go.kr` API 키 발급, 실제 응답 확인 |
| G3 | Canonical Schema 6개 model 확정 |
| G4 | SQLite vs SQLAlchemy 결정 |
| G5 | 대상 상권 sample로 MapLibre 2.5D PoC |

## 7. 문서 허브 반영 상태

개발 환경 구성 결과는 저장소에만 남겨두지 않고 공개 문서 허브에 반영했다.

공개 주소:

```text
https://hub-localtwin-docs-vercel.vercel.app
```

Home 배치:

| 위치 | 노출 문서 |
| --- | --- |
| Development 카드 | 개발환경, 개발 컨벤션, 개발 전 결정 Gate, 검증 가이드, 1주차 목요일 진행 보고서 |
| Document Tree / development | `docs/development/`의 Markdown 9개 전체 |
| README | 공개 문서사이트와 주요 개발문서 링크 |

Document Tree는 폴더별 `<details>`와 `<summary>`를 사용한다. pointer와 keyboard로 폴더를 접거나 펼칠 수 있고, 각 파일명은 Markdown viewer 또는 독립 HTML 문서로 바로 연결된다.

2026-07-09 배포 검증:

```text
docs-only production deployment: READY
공개 index + docs 파일: 29/29 HTTP 200
내부 전용 경로: 4/4 HTTP 404
Home의 개발환경/컨벤션/결정 Gate/1주차 보고서 링크 확인
development 폴더 접기/펼치기 확인
desktop/mobile 문서 트리 확인
browser console error 없음
```

공개하지 않는 경로:

```text
.harness/
scripts/
apps/
.env.example
```

`README.md`는 GitHub 저장소의 최상위 진입점으로 관리하며, Vercel의 공개 문서 집합은 `index.html`과 `docs/` 아래 문서로 제한한다.

## 8. 관련 문서

- [전체 개발문서](./overview.md)
- [개발환경](./environment.md)
- [개발 컨벤션](./conventions.md)
- [개발 전 결정 Gate](./pre-development-decisions.md)
- [전체 개발 체크리스트](./checklist.md)
- [Git 작업 규칙](./git-workflow.md)
- [LocalTwin 디자인 시스템](../design/design-system.md)
- [검증 가이드](./validation.md)
