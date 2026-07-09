# AGENTS.md

이 파일은 이 저장소에서 코드를 수정할 때 AI 코딩 에이전트(Claude Code, Cursor, Copilot, Antigravity 등)가 준수해야 하는 행동 지침과 협업 규칙을 정의합니다.

## 저장소 개요

시니어 소프트웨어 엔지니어를 위한 Claude.ai 및 Claude Code 스킬 모음집입니다. 스킬은 Claude 및 코딩 에이전트의 역량을 확장하는 패키징된 지침과 스크립트입니다.

## OpenCode 통합

OpenCode는 `skill` 도구와 이 저장소의 `/skills` 디렉토리를 기반으로 작동하는 **스킬 기반 실행 모델**을 사용합니다.

### 핵심 규칙

- 작업이 스킬과 매핑된다면, **반드시(MUST)** 해당 스킬을 실행해야 합니다.
- 스킬은 `skills/<skill-name>/SKILL.md`에 위치합니다.
- 스킬이 적용 가능한 경우 절대로 직접 구현하지 마십시오.
- 항상 스킬 지침을 정확히 따르십시오. (일부만 적용해서는 안 됩니다)

### 의도 ➡️ 스킬 매핑

에이전트는 사용자의 의도를 스킬로 자동 매핑해야 합니다:

- 기능 개발 / 새로운 기능 ➡️ `spec-driven-development`, 그 다음 `incremental-implementation`, `test-driven-development`
- 계획 / 작업 세분화 ➡️ `planning-and-task-breakdown`
- 버그 / 예기치 않은 동작 ➡️ `debugging-and-error-recovery`
- 코드 리뷰 ➡️ `code-review-and-quality`
- 리팩토링 / 단순화 ➡️ `code-simplification`
- API 또는 인터페이스 설계 ➡️ `api-and-interface-design`
- UI 작업 ➡️ `frontend-ui-engineering`

### 라이프사이클 매핑 (암묵적 명령어)

OpenCode는 `/spec` 또는 `/plan`과 같은 슬래시 명령어를 지원하지 않습니다.

대신 에이전트는 내부적으로 다음 라이프사이클을 따라야 합니다:

- 정의 (DEFINE) ➡️ `spec-driven-development`
- 계획 (PLAN) ➡️ `planning-and-task-breakdown`
- 구축 (BUILD) ➡️ `incremental-implementation` + `test-driven-development`
- 검증 (VERIFY) ➡️ `debugging-and-error-recovery`
- 리뷰 (REVIEW) ➡️ `code-review-and-quality`
- 배포 (SHIP) ➡️ `shipping-and-launch`

### 실행 모델

모든 요청에 대해:

1. 스킬이 적용될 가능성이 조금이라도(1% 이상) 있는지 판단합니다.
2. `skill` 도구를 사용하여 적절한 스킬을 호출합니다.
3. 스킬 워크플로우를 엄격히 따릅니다.
4. 필수 단계(명세서 작성, 계획 수립 등)가 완료된 후에만 실제 구현으로 진행합니다.

### 자기합리화 방지

다음과 같은 생각은 잘못된 것이며 무시해야 합니다:

- "이 작업은 스킬을 쓰기에는 너무 작다"
- "그냥 빠르게 먼저 구현하겠다"
- "콘텍스트를 먼저 파악하겠다"

올바른 행동:

- 항상 스킬 사용 여부를 먼저 확인하고 적용하십시오.

이를 통해 OpenCode가 전체 워크플로우 통제 하에 Claude Code와 유사하게 동작하도록 보장합니다.

## 오케스트레이션: 페르소나, 스킬 및 명령어

이 저장소는 결합 가능한 세 가지 레이어를 가집니다. 서로 다른 역할을 수행하므로 혼동해서는 안 됩니다:

- **스킬** (`skills/<name>/SKILL.md`) — 단계와 종료 조건이 정의된 워크플로우. *어떻게(How)*에 해당하며, 의도가 일치할 때 필수적으로 거쳐 가야 합니다.
- **페르소나** (`agents/<role>.md`) — 역할 관점과 출력 형식을 가진 역할. *누가(Who)*에 해당합니다.
- **슬래시 명령어** (`.claude/commands/*.md`) — 사용자 인터페이스 진입점. *언제(When)*에 해당하며, 오케스트레이션 레이어입니다.

결합 규칙: **사용자(또는 슬래시 명령어)가 오케스트레이터입니다. 페르소나는 다른 페르소나를 호출하지 않습니다.** 페르소나는 스킬을 호출할 수 있습니다.

이 저장소가 지원하는 유일한 다중 페르소나 오케스트레이션 패턴은 **병렬 분산 후 병합(parallel fan-out with a merge step)**입니다. 예를 들어 `/ship` 명령어는 `code-reviewer`, `security-auditor`, `test-engineer`를 동시에 실행하고 그들의 보고서를 합성합니다. 어떤 페르소나를 호출할지 결정하는 '라우터' 페르소나를 만들지 마십시오. 그것은 슬래시 명령어와 의도 매핑의 역할입니다.

의사결정 매트릭스는 [docs/agents.md](docs/agents.md)를, 전체 패턴 카탈로그는 [references/orchestration-patterns.md](references/orchestration-patterns.md)를 참조하십시오.

**Claude Code 호환성:** `agents/` 폴더의 페르소나들은 Claude Code 서브에이전트(플러그인의 `agents/` 디렉토리에서 자동 감지됨) 및 Agent Teams 팀원(생성 시 이름으로 참조됨)으로 동작합니다. 두 가지 플랫폼 제약사항이 우리 규칙에 정합합니다: 서브에이전트는 다른 서브에이전트를 생성할 수 없으며, 팀은 중첩될 수 없습니다. 플러그인 에이전트들은 `hooks`, `mcpServers`, `permissionMode` 프론트매터 필드를 무시합니다.

## 새로운 스킬 생성

> **시작하기 전에**: [CONTRIBUTING.md](CONTRIBUTING.md#before-proposing-a-new-skill)에서 사전 점검 사항을 확인하고, 카탈로그를 검색하며, 열려 있는 PR 목록을 확인하십시오 (`gh pr list --state open`). 아이디어가 [docs/skill-anatomy.md](docs/skill-anatomy.md)에 부합하는지 확인하고 PR 본문에 근거를 제시하십시오. 대부분의 새 스킬 제안은 기존 스킬이나 오픈된 PR과 겹치므로, 유사한 것을 새로 추가하기보다는 기존 스킬을 확장하는 편이 좋습니다. CONTRIBUTING.md가 이 워크플로우의 유일한 기준입니다.

이 저장소의 스킬은 마크다운 우선입니다: 각 스킬은 `skills/<kebab-case-name>/SKILL.md` 경로에 YAML 프론트매터(`name`, `description`)와 함께 저장되며, 섹션 구조(Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification)를 따릅니다. 스킬에 실행 가능한 헬퍼가 포함될 때만 `scripts/` 디렉토리를 추가하고, 대부분의 스킬은 마크다운 파일로만 구성됩니다. 스킬별 별도 zip 패키지는 제공하지 않습니다.

전체 포맷, 명명 규칙, 프론트매터 규칙, 지원 파일 기준 및 작성 원칙은 스킬 구조의 유일한 기준인 [docs/skill-anatomy.md](docs/skill-anatomy.md)를 참고하시고, 여기에 해당 내용을 중복해서 적지 말고 링크로 연결하십시오.

---

## Development Environment & Conventions (개발 환경 및 컨벤션)

이 프로젝트는 대안 자산 예측 마켓 **DropCast**의 실제 구현을 위한 개발 환경 및 코딩 컨벤션을 정의합니다.

### 1. 기술 스택 (Core Tech Stack)
* **Frontend**: React + TypeScript (Vite 기반 개발 환경 구성 권장)
* **Backend**: Express.js + Node.js
* **Database**: PostgreSQL (추천 - 사용자 포인트, 예측 레코드, 랭킹 및 이력 관리를 위한 관계형 스키마에 적합) + Prisma ORM

### 2. 코딩 컨벤션 및 커밋 로그 규칙 (Coding Conventions & Commit Rules)

#### 코딩 규칙 (Coding Style)
- **프론트엔드 스타일**: `August*` 디자인 가이드라인에 맞춘 Brutalist Dark Monochromatic 스타일 적용. 헤드라인 및 로고 등 주요 텍스트는 철저한 **소문자(`lowercase`)** 정책을 유지합니다. 모서리는 완전한 직각을 기본으로 삼습니다.
- **포맷팅**: ESLint + Prettier 설정을 준수합니다.
- **비동기 처리**: `async/await` 패턴을 일관되게 사용합니다.

#### 커밋 로그 규칙 (Commit Message Convention)
커밋 메시지는 Angular Git Commit Guidelines를 준수하며, 한글 작성을 표준으로 합니다.
* 형식: `<type>: <description>` (예: `feat: 주간 랭킹 대시보드 추가`)
* **Type 종류**:
  - `feat`: 새로운 기능 추가
  - `fix`: 버그 수정
  - `docs`: 문서 수정 (README.md, AGENTS.md 등)
  - `style`: 코드 포맷팅, 세미콜론 누락 등 (비즈니스 로직 변경 없음)
  - `refactor`: 코드 리팩토링
  - `chore`: 빌드 설정, 패키지 매니저 설정 등
  - `test`: 테스트 코드 추가 및 수정

### 3. 디렉토리 구조 및 필수 라이브러리 (Directory Structure & Libraries)

#### 권장 디렉토리 구조 (Recommended Structure)
```text
/hub (Root)
├── backend/                  # 백엔드 (Express)
│   ├── src/
│   │   ├── controllers/      # API 컨트롤러 (인증, 투표, 랭킹)
│   │   ├── models/           # Prisma DB 스키마 및 쿼리
│   │   ├── cron/             # Node-cron 정산 스케줄러
│   │   ├── crawler/          # Puppeteer 크롤러
│   │   └── app.js            # Express 진입점
│   ├── package.json
│   └── .env
│
├── frontend/                 # 프론트엔드 (React + TypeScript + Vite)
│   ├── src/
│   │   ├── assets/           # 이미지 (artist_bw.png, tunnel_green.png)
│   │   ├── components/       # 공통 UI 컴포넌트 (.tsx)
│   │   ├── views/            # 페이지 뷰 (.tsx)
│   │   ├── styles/           # CSS 파일 (style.css 기반)
│   │   └── main.tsx          # TypeScript 진입점
│   ├── package.json
│   ├── tsconfig.json         # TypeScript 설정 파일
│   └── vite.config.ts        # Vite 설정 파일
```

#### 필수 설치 라이브러리 (Required Dependencies)
* **Backend**:
  - `express`, `cors`, `dotenv` (기본 API 환경)
  - `puppeteer`, `puppeteer-extra` (크롤링 모듈)
  - `node-cron` (주간 정산 자동화 스케줄러)
  - `socket.io` (실시간 소켓 데이터 동기화)
  - `@prisma/client`, `prisma` (DB ORM)
* **Frontend**:
  - `react`, `react-dom`
  - `socket.io-client`
  - `canvas-confetti` (주간 정산 팝업 시 상위 랭커 축하 효과용)
  - **DevDependencies (Types)**: `typescript`, `@types/react`, `@types/react-dom`, `@types/canvas-confetti`

### 4. 에이전트 추가 권장 사항 (Agent Recommendations)

AI 코더 및 에이전트는 DropCast 프로젝트를 구현할 때 다음 사항을 특별히 점검하고 설계해야 합니다.
1. **크롤링 장애 내성 (Crawling Fallback)**: Puppeteer를 통한 리셀 플랫폼 크롤링은 IP 차단이나 사이트 레이아웃 변경에 취약합니다. 이를 대비해 **[수동 가격 덤프 어드민 페이지]**를 백엔드에 반드시 확보하여, 크롤링 실패 시 관리자가 수동으로 이번 주 종가를 입력해 배칭을 강제 실행할 수 있도록 설계해야 합니다.
2. **어뷰징 방지 보안 (Anti-Abuse System)**: 무료 가상 포인트를 사용한 랭킹 리워드 지급 플랫폼 특성상 중복 회원 가입 및 다계정 예측 난사를 막아야 합니다. 회원가입 시 소셜 로그인(Kakao/Google) 필수 연동 및 IP/Device 단위의 예측 제출 제한(Rate Limit)을 적용해야 합니다.
3. **투표 마감 데드라인 (Lock-in Policy)**: 일요일 23:59 정산 직전 투표가 몰려 정답률이 100%에 수렴하는 불공정 어뷰징을 막기 위해, **매주 금요일 09:00(실제 발매일 개시 시점)에 해당 주의 투표를 완전히 잠금(Lock)** 처리하고, 그 이후의 투표 제출은 금지하도록 정산 로직을 철저히 검증해야 합니다.
