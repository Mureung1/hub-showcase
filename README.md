# Modu Brain

Modu Brain은 회의록, 리서치, 피드백에 흩어진 결정 배경과 참여자 관점, 미결 질문을 원문 근거와 함께 구조화하는 협업 맥락 웹 앱입니다. 로그인 사용자는 프로젝트와 기록을 저장하고 분석 이력을 비교할 수 있으며, 특정 분석 결과만 만료 가능한 읽기 전용 링크로 공유할 수 있습니다. 카카오톡 TXT, Teams·Notion JSON, 직접 붙여넣기도 개인 계정 연결 없이 공통 기록으로 가져와 원문 백링크와 Obsidian형 브레인 캔버스에서 함께 확인할 수 있습니다.

![Modu Brain 웹 화면](docs/images/modu-brain-web-desktop.png)

## 시스템 아키텍처 및 데이터 흐름 (`modu-brain-tjwnsdhfz.onrender.com`)

```mermaid
flowchart TB
    subgraph Frontend ["🖥️ 프론트엔드 레이어 (React SPA)"]
        direction TB
        UI_Home["공개 워크스페이스 (/)\n카카오톡 TXT · Teams · Notion JSON"]
        UI_Demo["공개 데모 (/demo)\n사전 구성 한국어 기록 & 결정 이력"]
        UI_Login["보안 로그인 (/login)\nTurnstile CAPTCHA & Magic Link"]
        UI_Project["브레인 캔버스 (/projects/:id)\n지식맵 · 원문 백링크 · 결정 이유 · Diff"]
        UI_Share["안전 공유 뷰어 (/share#token=...)\nFragment SHA-256 토큰 검증"]

        UI_Home -- "1. 비영속 로컬 분석 (fetch)" --> API_V1
        UI_Login -- "2. Magic Link & HttpOnly 쿠키" --> API_Auth
        UI_Project -- "3. 기록 저장 & 4단계 AI 분석" --> API_V1
        UI_Share -- "4. 만료/폐기 토큰 검증" --> API_Share
    end

    subgraph Backend ["⚙️ 백엔드 레이어 (Node BFF & Service Gateway)"]
        direction TB
        API_Auth["POST /api/v1/auth/magic-link\n(Origin/IP/CAPTCHA 검증)"]
        API_V1["POST /api/v1/projects\nPOST /api/v1/analysis-runs\n(BFF API Router)"]
        API_Share["POST /api/v1/shared/resolve\n(공유 해시 검증)"]
        
        Core["contextAnalysisCore.mjs\n1. 스냅숏 → 2. 분석 → 3. 근거 검증 → 4. 저장"]
        Repo["moduBrainRepository.mjs\n(PostgreSQL OpenApi & RPC 매핑)"]
        Gateway["supabaseGateway.mjs\n(JWT 세션 & Service-Role Isolation)"]

        API_V1 --> Gateway
        API_Auth --> Gateway
        API_Share --> Gateway
        Gateway --> Core
        Core --> Repo
    end

    subgraph Database ["🗄️ 데이터베이스 레이어 (Supabase PostgreSQL + RLS)"]
        direction TB
        DB_Projects[("projects\n(소유권 auth.uid() = owner_id)")]
        DB_Sources[("source_records\n(회의록 · 리서치 · 피드백 원문)")]
        DB_Runs[("analysis_runs & step_events\n(결정 이유 · 근거 부분문자열 인용)")]
        DB_Shares[("share_links\n(SHA-256 해시 토큰)")]

        Repo -- "5. SELECT / INSERT (RLS 제어)" --> DB_Projects
        Repo -- "6. 불변 원문 저장" --> DB_Sources
        Repo -- "7. 분석 이력 & 인용문 확정" --> DB_Runs
        Repo -- "8. 토큰 해시 검증 & 조회" --> DB_Shares
    end

    classDef fe fill:#e8f4fd,stroke:#0075de,stroke-width:2px,color:#000;
    classDef be fill:#fbfaf9,stroke:#615d59,stroke-width:2px,color:#000;
    classDef db fill:#e8f7ee,stroke:#1f7a3f,stroke-width:2px,color:#000;

    class UI_Home,UI_Demo,UI_Login,UI_Project,UI_Share fe;
    class API_Auth,API_V1,API_Share,Core,Repo,Gateway be;
    class DB_Projects,DB_Sources,DB_Runs,DB_Shares db;
```

- `/`: 로그인 없이 붙여넣기·카카오톡 TXT·Teams JSON·Notion JSON을 정규화하고 분석하는 비영속 워크스페이스
- `/demo`: 사전 구성된 한국어 기록과 분석 결과를 바로 여는 공개 데모
- `/login`: Supabase 이메일 Magic Link 로그인
- `/privacy`: 수집 정보, AI 전송, 보관·삭제와 비공개 보안 제보 안내
- `/projects`: 사용자 소유 프로젝트 목록과 생성
- `/projects/:id`: 외부 맥락 가져오기, 기록, 분석 이력, 검색·필터·근거 탐색이 가능한 브레인 캔버스, 백링크, 온보딩, 공유
- `/share#token=…`: 기본 요약 또는 명시적으로 확인한 근거 공개 범위의 읽기 전용 분석 결과
- `/api/v1/**`: HttpOnly 세션, 사용자 범위 RLS 읽기와 service-only 소유권 검증 쓰기가 적용된 영속 API
- `/api/context-analysis`: 한 릴리스 동안 유지하는 비영속 호환 API
- `/api/context-analysis/import`: 계정 없이 내보낸 기록을 정규화한 뒤 로컬 분석하는 same-origin 비영속 API

## 로컬 실행

### 준비물

- Node.js `22.20.0` (`.nvmrc`)
- Docker와 [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) — 영속 프로젝트 흐름과 DB 정책 테스트에 필요

```bash
npm ci
cp .env.example .env
```

Windows PowerShell에서는 `Copy-Item .env.example .env`를 사용합니다. `.env`의 Supabase 값을 실제 로컬 또는 전용 개발 프로젝트 값으로 교체합니다.

로컬 Supabase를 사용하는 경우:

```bash
supabase start
supabase db reset
supabase test db
```

Windows에서 local-only 정책과 인증 FE–BE–DB 새로고침 흐름을 한 번에 검증하려면 Docker Desktop 엔진을 실행한 뒤 다음 스크립트를 사용합니다. 이 스크립트는 원격 login·link·push를 수행하지 않고 Supabase CLI `2.109.1`과 프로세스 환경변수만 사용합니다.

```powershell
.\scripts\run-local-auth-e2e.ps1
```

`supabase status -o env`의 `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`는 로컬 CLI용 legacy 변수에 매핑할 수 있습니다. 호스팅 프로젝트에서는 새 `publishable`/`secret` 키를 우선 사용합니다. `npm run build`는 SPA와 호환 Worker 번들을 만들며, 정식 서비스는 Node 서버가 SPA와 API를 함께 제공하는 Render 단일 주소입니다.

```bash
npm run build
npm run start
```

브라우저에서 `http://127.0.0.1:4173`을 엽니다. UI만 빠르게 수정할 때는 `npm run dev`를 사용할 수 있지만, 인증·DB API를 포함한 최종 검증은 위 full-stack 명령을 기준으로 합니다.

## 환경변수

| 이름 | 노출 | 용도 |
| --- | --- | --- |
| `SUPABASE_URL` | 서버 | Supabase 프로젝트 API URL |
| `SUPABASE_PUBLISHABLE_KEY` | 서버 | 사용자 JWT와 함께 보내는 공개 PostgREST API key |
| `SUPABASE_SECRET_KEY` | 서버 전용 | 소유권 재검증 `app_*` 쓰기 RPC, admin Auth, 공유 조회와 유지보수. 브라우저에 절대 노출하지 않음 |
| `VITE_SUPABASE_URL` | 공개 번들 | 브라우저 Magic Link Auth URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 공개 번들 | RLS로 보호되는 공개 publishable key |
| `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY` | 호환 | 로컬 Supabase CLI의 legacy JWT key fallback |
| `MODU_BRAIN_ANALYSIS_PROVIDER` | 서버 | 기본 `local-heuristic`; 호환 API의 provider 선택 |
| `MODU_BRAIN_OPENAI_ENABLED` | 서버 | `true`일 때만 인증된 V1 API에서 OpenAI 선택 허용. 기본 `false` |
| `MODU_BRAIN_OPENAI_MODEL` | 서버 | 기본 `gpt-5.6-terra`; 계정의 preview 접근 권한 확인 필요 |
| `MODU_BRAIN_OPENAI_REASONING_EFFORT` | 서버 | 기본 `low` |
| `OPENAI_API_KEY` | 서버 전용 | 로그인 사용자가 명시적으로 OpenAI 분석을 선택할 때만 필요 |
| `SAFETY_IDENTIFIER_SECRET` | 서버 전용 | 사용자 UUID를 비식별 `safety_identifier`로 해시할 때 사용하는 salt |
| `IP_HASH_SECRET` | 서버 전용 | rate limit용 IP를 복원하기 어려운 HMAC으로 변환하는 별도 비밀키 |
| `MODU_BRAIN_CANONICAL_ORIGIN` | 서버 | Magic Link redirect와 same-origin 경계에 사용하는 정식 Render origin |
| `MODU_BRAIN_CAPTCHA_REQUIRED` | 서버 | 운영에서 `true`; CAPTCHA 토큰 누락 요청 차단 |
| `VITE_TURNSTILE_SITE_KEY` | 공개 번들 | Cloudflare Turnstile 공개 site key. secret은 Supabase Auth에만 저장 |
| `HOST` | 서버 | 로컬 기본 `127.0.0.1`, Render는 `0.0.0.0` |
| `PORT` | 서버 | 로컬 기본 `4173`, Render가 배포 시 제공 |

`SUPABASE_SECRET_KEY`/legacy service role과 `OPENAI_API_KEY`는 저장소, `render.yaml`의 평문 값, Vite 변수, 브라우저 로그에 넣지 않습니다. `gpt-5.6-terra`를 사용할 수 없는 계정은 `MODU_BRAIN_OPENAI_MODEL`을 접근 가능한 구조화 출력 모델 ID로 명시적으로 바꿉니다. 자동 모델 fallback은 하지 않습니다.

## 데이터베이스와 인증

SQL migration은 `supabase/migrations/`가 유일한 스키마 원본입니다. Dashboard에서만 스키마를 수정하거나 앱 시작 시 migration을 자동 실행하지 않습니다.
대응하는 `supabase/rollback/` down SQL은 CI에서 적용 후 실행하고 같은 migration을 재적용해 가역성을 확인합니다.

- `projects`: 개인 소유 프로젝트
- `source_records`: 회의·리서치·피드백·메모 원문
- `analysis_runs`: 실행 상태, provider, 버전별 JSON 결과와 안전한 오류
- `analysis_run_sources`: 분석 당시 원문의 불변 스냅숏
- `analysis_run_step_events`: 원문·prompt·사고과정 없이 4단계 상태와 검증·소요 지표만 보관하는 append-only 이벤트
- `analysis_run_annotations`: 성공 결과에 사용자가 남기는 idempotent·불변 검토 기록
- `share_links`: SHA-256으로 해시된 만료·폐기 가능 토큰
- `rate_limit_buckets`: 사용자·IP별 AI/공유 조회 제한

모든 앱 테이블은 RLS를 사용합니다. Magic Link 요청도 same-origin BFF가 origin·Turnstile·IP/이메일 HMAC 제한을 확인한 뒤 Supabase로 전달하고, 로그인 token은 즉시 HttpOnly 쿠키로 교환해 Web Storage에 보관하지 않습니다. 읽기는 검증된 사용자 JWT와 RLS, 쓰기는 service-only `app_*` RPC의 사용자 ID·소유권 재검증을 함께 사용합니다. legacy Bearer 인증은 한 릴리스 동안만 호환하며, 다른 사용자 리소스는 존재 여부가 노출되지 않도록 `404`로 응답합니다. 공개 공유 API만 토큰 해시와 만료·폐기 상태를 서버에서 검증한 뒤 허용된 공개 범위만 반환합니다.

## 분석 계약

영속 분석은 선택한 기록 ID와 `Idempotency-Key`를 받습니다. 소유권·입력 길이·요청 키를 먼저 검증한 뒤 다음 4단계를 append-only 이벤트로 추적합니다.

1. `source_snapshot`: `running` 실행과 선택 원문의 불변 스냅숏을 저장합니다.
2. `provider_analysis`: DB 트랜잭션 밖에서 로컬 또는 OpenAI provider를 호출합니다.
3. `evidence_validation`: 결과 스키마와 모든 인용문이 스냅숏의 실제 부분 문자열인지 검증합니다.
4. `result_persistence`: 실행을 `succeeded`, `failed`, `cancelled` 중 하나로 확정합니다.

같은 프로젝트·같은 키·같은 입력은 기존 실행을 반환합니다. 같은 키에 다른 입력은 `409`이며, 실패한 실행은 최근 성공 결과를 덮어쓰지 않습니다. OpenAI 요청은 서버에서만 실행하고 `store: false`, 비식별 `safety_identifier`, 30초 제한을 적용합니다.

프로젝트 이름과 모든 원문은 provider 관점에서 신뢰하지 않는 데이터입니다. 원문 안의 역할 변경·비밀 공개·출력 변경 지시는 따르지 않으며 hidden reasoning 또는 chain-of-thought를 요청·저장·반환하지 않습니다. 원문은 사용자가 선택한 `source_records`와 실행 스냅숏에만 보관하고 단계 이벤트·annotation·로그에는 복제하지 않습니다. 성공 실행에는 수정 불가능한 annotation을 추가할 수 있지만 annotation은 후속 분석 입력이나 공유 결과에 자동 포함되지 않습니다.

## API 요약

```text
GET|POST       /api/v1/projects
GET|PATCH|DELETE /api/v1/projects/:projectId
GET|POST       /api/v1/projects/:projectId/sources
POST           /api/v1/projects/:projectId/imports
PATCH|DELETE   /api/v1/sources/:sourceId
GET            /api/v1/sources/:sourceId/segments
GET|POST       /api/v1/projects/:projectId/analysis-runs
GET|DELETE     /api/v1/analysis-runs/:runId
GET            /api/v1/analysis-runs/:runId/step-events
GET|POST       /api/v1/analysis-runs/:runId/annotations
GET|POST       /api/v1/analysis-runs/:runId/share-links
DELETE         /api/v1/share-links/:shareLinkId
POST           /api/v1/shared/resolve
POST           /api/v1/auth/magic-link
POST           /api/context-analysis/import
GET            /api/v1/capabilities
GET            /api/health/live
GET            /api/health/ready
```

성공 응답은 `{ "data": … }`, 실패 응답은 `{ "error": { "code", "message", "details" } }` 형식입니다. 자세한 계약은 [TRD](docs/trd.md)와 [에이전트 워크플로 계약](docs/agent-workflow-contract.md)을 참고합니다.

## 품질 확인

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run ops:validate
npm run build
npm run test:e2e:install
npm run test:e2e
```

- Vitest: 서버·클라이언트 계약, 보안 경계, 로컬 분석 회귀
- SQL/pgTAP: 빈 DB 적용·down rollback·재적용과 92개 RLS/권한 계약
- 한국어 eval 30건: 회의·리서치·피드백·빈 근거·개인정보·prompt injection 문구를 유료 호출 없이 검증
- Playwright: 공개 가져오기·모바일 메뉴·리플로우와 `로그인 → 프로젝트 → 외부 맥락 가져오기 → 분석 → 근거·백링크 → 이력 → 공유 → 새로고침`
- GitHub Actions: lint, typecheck, coverage, build, production audit, secret scan, 공개 스모크, 내부 PR의 로컬 Supabase/E2E

## Sites 전환 종료

기존 `*.chatgpt.site` 배포는 Render 검증 뒤 7일 동안 공식 주소 안내만 표시하는 전환용입니다. 그 뒤 Sites 런타임 비밀과 Supabase redirect 허용 항목을 제거하고 배포를 중지합니다. 새 기능·인증·데이터 migration의 운영 기준은 Sites가 아니라 아래 Render 서비스입니다.

## Render 배포

`render.yaml`은 단일 Node Web Service를 정의합니다. Render에서 Blueprint를 연결하기 전에 다음을 완료합니다.

1. Supabase 데모 프로젝트의 migration ledger가 저장소의 최신 10개와 일치하는지 확인합니다.
2. Auth Site URL을 Render origin으로 두고 `https://<service>.onrender.com/login`을 redirect allowlist에 허용합니다. 로컬 검증에는 `http://127.0.0.1:4173/login`도 추가합니다.
3. `render.yaml`에서 `sync: false`인 Supabase 값을 Dashboard에 입력합니다. OpenAI를 켤 때만 별도로 API key를 추가합니다.
4. `VITE_SUPABASE_*`와 서버용 Supabase URL·anon key가 같은 프로젝트를 가리키는지 확인합니다.
5. `GET /api/health/ready`가 `200`인지 확인한 뒤 공개합니다.

Render는 `npm ci --include=dev && npm run build`, `npm start`, `HOST=0.0.0.0`을 사용하며 CI 성공 후 자동 배포합니다. build 단계에는 TypeScript/Vite 도구를 포함하고 runtime은 `NODE_ENV=production`을 유지합니다. readiness는 DB/config를 확인하므로 필수 환경변수가 없으면 의도적으로 `503`을 반환하고 배포 트래픽을 받지 않습니다. [Render Blueprint 문서](https://render.com/docs/blueprint-spec)

## 보안·개인정보 운영 기준

- 원문과 분석 스냅숏은 기본 90일, 선택적으로 30일 또는 삭제 전까지 보관하며 만료·영구 삭제 시 관련 실행과 공유 링크도 함께 제거합니다.
- 공유 토큰은 URL query나 서버 로그가 아닌 `/share#token=…` fragment로 전달하고 DB에는 해시만 저장합니다.
- 요약 공유는 기본 7일·최대 30일이며 참여자 이름·원문 제목·정확한 인용문·이메일·provider를 제외합니다.
- 근거 공유는 최근 인증과 민감정보 확인이 필요하고 기본 24시간·최대 7일이며 즉시 폐기할 수 있습니다.
- AI 실행은 사용자당 동시 1건·시간당 10건·일당 30건, 공유 조회는 IP당 시간당 60건으로 제한합니다.
- JSON 본문은 256KB, 영속 분석 입력 합계는 100,000자 이하로 제한합니다. 공개 가져오기는 IP당 시간당 20회, 정규화 후 20,000자까지 허용합니다.
- 비밀정보·JWT·원문은 애플리케이션 로그에 기록하지 않습니다.
- 단계 이벤트에는 원문·prompt·provider 응답·hidden reasoning을 저장하지 않으며 annotation도 모델 입력으로 자동 사용하지 않습니다.
- 공개 전 Supabase RLS, Auth redirect allowlist, Render secrets, OpenAI 모델 권한을 다시 확인합니다.

## 현재 제외 범위

팀 초대·역할 관리, 공동 편집, Slack·Notion·Teams 계정/OAuth 직접 연결, 결제, 실시간 동기화, 백그라운드 작업 큐, 임의 두 분석 간 비교는 이번 공개 데모에서 제외합니다. 사용자가 선택한 카카오톡 TXT와 Teams·Notion JSON 가져오기는 계정 연결 없이 지원합니다.

## 문서와 디자인

- [PRD](docs/prd.md)
- [TRD](docs/trd.md)
- [에이전트 워크플로 계약](docs/agent-workflow-contract.md)
- [개발 기획·검증 Agent](agents/README.md)
- [2주차 결정 이유 핵심 시나리오](docs/week-2-core-scenario.md)
- [프롬프트 설계](docs/prompt-design.md)
- [Figma 개발 핸드오프](docs/figma-handoff.md)
- [KoPubWorld 돋움 웹 임베딩 안내](docs/kopub-font-embedding.md)
- [PR 벤치마크](docs/benchmark-prs.md)
- [PR 설명 초안](docs/pr-description-draft.md)
- [무료 운영·백업·장애 대응 런북](docs/operations/free-tier-runbook.md)
- [age 암호화 백업·Credential Manager·복원 런북](docs/encrypted-backup-runbook.md)
- [Supabase migration ledger 정합화 절차](docs/operations/migration-ledger-reconciliation.md)
