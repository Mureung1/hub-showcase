# 작업 계획: T30 — Neon PostgreSQL + Drizzle 데이터 계층

> 상태: 종료
>
> 작성일: 2026-07-20
>
> 최종 갱신일: 2026-07-20
>
> 현재 단계: 실제 Neon 개발 DB 검증까지 완료
>
> 다음 행동: T31에서 Vercel Preview `DATABASE_URL`·`waitUntil()` background write를 통합 검증
>
> CHECKLIST 항목: T30

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: 현재 `/api/generate`의 운영 메타데이터 sink가 `noop`이라 모델·프롬프트 버전별 성공률·지연·토큰·평가 결과를 재현하거나 운영 근거로 남길 수 없다.
- 목표 결과: 로그인과 사용자 흐름을 추가하지 않고 Neon PostgreSQL + Drizzle로 네 종류의 비식별 운영 데이터만 저장하는 서버 전용 데이터 계층을 만든다.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | `prompt_versions`·`template_versions`·`generation_runs`·`evaluation_runs` 네 테이블만 정의하고 원문·생성 문구·IP·사용자/세션 ID·메시지 hash 필드를 두지 않는다. | schema·migration 구조 테스트 + 금지 문자열 검사 | 필수 |
| AC-2 | Drizzle migration이 재현 가능하며 PK·FK·unique·check·index가 버전·실행·평가 조회와 음수 수치 차단을 보장한다. | migration 생성·SQL 검사 | 필수 |
| AC-3 | repository가 프롬프트/템플릿 배포 버전, 생성 실행, 집계 평가를 타입 안전하게 기록하고 브라우저 코드에서 DB 모듈을 import하지 않는다. | repository 테스트 + import 경계 검사 + API 타입검사 | 필수 |
| AC-4 | 기존 `GenerationMetric`은 허용 목록 mapper를 거쳐 `generation_runs`에 기록되며 사용자 요청 객체와 생성 결과는 repository 경계에 전달되지 않는다. | mapper/repository 테스트에서 정확한 key 집합 검증 | 필수 |
| AC-5 | DB 설정 누락·동기 예외·비동기 reject가 생성 HTTP 응답의 상태와 body를 바꾸지 않는다. | handler·sink 실패 주입 테스트 | 필수 |
| AC-6 | 개발·프리뷰·운영은 각 환경의 `DATABASE_URL`만 서버에서 읽고, 연결 문자열이나 비밀을 저장소·클라이언트 번들에 넣지 않는다. | entry/config 테스트 + 소스 검사 | 필수 |
| AC-7 | 관련 테스트, 전체 테스트, API 타입검사, lint, build, migration 검사, `git diff --check`가 통과한다. | 최종 자동 검증 | 필수 |
| AC-8 | 실제 Neon 개발 DB에서 migration 적용과 기록 왕복을 확인한다. | Neon 연결 smoke test | 필수 |

## 2. 의존성·정본 확인

- T항목과 의존성 상태: 2026-07-20 승인된 책임 분리로 CHECKLIST상 T30 의존은 T18 provider 비종속 프록시 기반이며 완료됐다. T17 배포와 Vercel Preview background write는 T30 자체 schema·migration·repository 검증의 선행조건이 아니고 T31 통합 범위다.
- CHECKLIST 본문이 직접 가리키는 문서·구간: `docs/CHECKLIST.md` T30, `docs/SPEC.md` PostgreSQL 데이터 경계, `docs/MVP.md` 데이터 계층·DoD.
- 추가로 확인한 정본: `docs/EDGE_CASES.md` 1-5, `docs/AI_DESIGN.md` 데이터 경계, `harness/README.md`, `.claude/skills/task-start/SKILL.md`.
- 이번 작업에서 바꾸지 않는 계약·범위: S0~S3 사용자 흐름, 로그인·회원가입·히스토리, `GenerationRequest`/`GenerationResponse`, 카드/이메일 로컬 경로, 실 provider 연결, 사용자 행동 추적, 결제.

## 3. 작업트리 기준선

- 시작 시 `git status --short` 요약: 사용자 소유 untracked `.agents/skills/continue-dabnyangi-task/`, T25 설문 CSV, `tmp/`가 존재한다.
- 기존 변경 중 반드시 보존할 파일·의도: 위 untracked 경로 전체. 읽거나 수정·삭제·스테이징하지 않는다.
- 이번 작업이 소유하는 경로: `api/_lib/db/**`, `api/_lib/generation/metrics.ts`와 직접 테스트, `api/generate.ts`, `scripts/db-smoke.ts`, `tsconfig.api.json`, `.env.example`, `.gitignore`, Drizzle 설정·migration, `package.json`, `package-lock.json`, `docs/AI_DESIGN.md`, `docs/ARCHITECTURE_OVERVIEW.md`, `harness/tasks/T30-neon-drizzle-data-layer/**`, `docs/LOG.md`. 실제 완료 시에만 `docs/CHECKLIST.md`.

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | React 19 + TypeScript 6 + Vite 8 클라이언트와 Vercel `api/` 서버 경계. `any` 금지, 원문 비저장, 서버 전용 DB 연결, DB 장애 비차단이 핵심이다. 완료되면 AI 사용 자체가 아니라 버전·실행·평가를 재현하는 운영 데이터 기반이 생긴다. |
| 구체성 | 공식 문서로 호환 패키지를 고정하고 `drizzle.config.ts`, `api/_lib/db/schema.ts`, DB client/config, repository와 metrics sink, `drizzle/` migration 및 테스트를 추가한다. 네 테이블은 정규화된 허용 필드만 갖고 Git의 프롬프트·템플릿 본문은 저장하지 않는다. |
| 역할·예시 | 입력 `GenerationMetric { route:'ai', scenarioId:'professor', purposeId:'ask', status:'success', latencyMs:842, attemptCount:1 }` → 저장 row `{ route, scenarioId, purposeId, status, latencyMs, attemptCount, createdAt }`. `receivedMessage`, `situation`, 후보 문구, client key는 mapper 입력 타입과 row에 존재하지 않는다. |
| 단계화 | ① 공식 통합 방식·패키지 확인 → ② schema·제약·migration → ③ DB client와 네 repository → ④ `GenerationMetricsSink` 연결과 background write 수명주기 처리 → ⑤ 원문 비저장·실패 격리·migration 테스트 → ⑥ 전체 검증·문서 기록. 각 단계에서 관련 테스트와 API 타입검사를 수행한다. |
| 검증 | AC-1~7은 로컬 자동 검증으로, AC-8은 비공개 `DATABASE_URL`을 사용한 실제 Neon 개발 DB migration·repository·handler smoke로 증명한다. 최종 게이트는 관련 테스트, `npm test`, `npm run typecheck:api`, `npm run lint`, `npm run build`, migration 검사, 금지 필드/import 검색, `git diff --check`다. |

## 5. 변경 경계와 위험

- 허용된 변경: T30의 서버 전용 데이터 계층과 해당 설정·테스트·작업 기록.
- 명시적으로 제외한 변경: 로그인·사용자/세션 테이블·대화/생성문 저장·분석 대시보드·클라이언트 계측·실 AI provider·프론트 UI·유료 플랜.
- 구조·계약·의존성 승인이 필요한 지점: 네 테이블 외 추가 테이블, 공용 API 필드 변경, 새 외부 DB 생성은 새 승인이 필요하다. T30의 T18 단일 의존과 T31 Preview 통합 분리는 2026-07-20 승인됐다.
- 예상 위험과 대응: 서버리스 응답 후 fire-and-forget write 유실은 Vercel이 지원하는 background task 수명주기 API를 공식 문서로 확인해 사용한다. DB 연결 누락은 noop sink로 안전하게 강등한다. JSON 자유 필드 대신 정규화 열을 사용해 원문 혼입 가능성을 줄인다.

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-20 | 제안 | T17·T18 완료 전 실제 DB 연결·완료 체크를 제외한 T30 코드 우선 구현 제안 | `/task-start` 의존성 감사와 사용자 방향 전환 |
| 2026-07-20 | 승인됨 → 진행 중 | 로그인·UI 변경 없이 로컬 schema·migration·repository·비저장 테스트를 계속 착수 | 사용자 목표 `task 계속해서 착수` |
| 2026-07-20 | 승인됨 → 종료 | T30 의존을 완료된 T18 기반으로 한정하고 실제 Neon 개발 DB 검증으로 종료. Preview background write는 T31로 분리 | 사용자 “승인” |

## 7. 진행·인계

- 마지막으로 끝낸 단계: schema·migration·네 repository·Vercel background metrics sink 구현과 AC-1~7 자동 검증
- 현재 작업 중인 단계: 없음 — T30 종료.
- 다음 행동: T31에서 Preview 환경의 `/api/generate` background metric write와 환경 분리를 확인한다.
- 보류 사유와 재개 조건: 없음. Preview 런타임 검증은 T30 재개가 아니라 T31 범위다.

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-20 | 사용자별 로그가 아니라 원문 없는 운영 실행·버전·평가 데이터로 범위를 고정 | PRD/MVP/SPEC 비저장 원칙 유지 |
| 2026-07-20 | 브라우저 runtime이 없어 T17 Production S0 시각 확인은 재보류 | T17 완료 체크 없이 코드 우선 예외만 적용 |
| 2026-07-20 | Drizzle v1 RC·Neon HTTP·Vercel `waitUntil()` 공식 경로로 schema·migration·repository·sink 구현 | 단발성 서버리스 write와 응답 수명 분리 |
| 2026-07-20 | AC-1~7 자동 검증 통과, AC-8은 실제 DB 환경 부재로 보류 | T30 CHECKLIST 완료 체크 금지 |
| 2026-07-20 | `.env.local`의 비공개 연결을 사용해 Neon migration 최초·재실행 성공, public 테이블 4개·네 repository·generate handler background sink 기록/조회/역순 정리 통과 | AC-8 통과. 연결 문자열·행 내용은 로그에 출력하지 않음 |
| 2026-07-20 | 실제 DB 검증 뒤에도 T17·T18 의존 미충족으로 계획 상태를 보류 유지 | CHECKLIST 순서 규칙 준수 |
| 2026-07-20 | T30 의존을 완료된 T18 기반으로 정정하고 개발 Neon 검증을 완료 근거로 확정 | 제품 배포 gate와 데이터 계층 구현 gate를 분리한 사용자 승인 반영 |
