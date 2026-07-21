# 작업 계획: T24 — 흐름 계측 운영 검증

> 상태: 종료
>
> 작성일: 2026-07-21
>
> 최종 갱신일: 2026-07-21
>
> 현재 단계: 완료 — same-origin 왕복, `waitUntil()` 실동작, 집계 query, 보존 기간 확인
>
> 다음 행동: 없음(검증 보고서 `verification.md` 참고)
>
> CHECKLIST 항목: T24

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: T36에서 구현한 `/api/interaction` 계약·DB sink가 실제 배포 환경(Vercel Production/Preview)에서 진짜로 동작하는지 확인한다. 코드·로컬 테스트만으로는 서버리스 런타임에서의 모듈 로딩, `waitUntil()` 백그라운드 write 완주, 실제 DB 반영을 보장하지 않는다.
- 목표 결과: same-origin 요청 처리, `waitUntil()` best-effort write가 DB에 실제로 반영됨, 허용 5종 event의 집계 query 동작, 현재 보존 기간(실제 동작) 확인을 근거와 함께 기록한다.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | 배포된 Production `/api/interaction`이 유효한 event에 202를 반환한다(same-origin 프론트에서 호출하는 것과 동일 경로) | 실제 배포 URL에 대한 POST 요청·응답 코드 확인 | 필수 |
| AC-2 | `waitUntil()` 백그라운드 write가 실제로 DB 행을 남긴다(202 응답이 곧 저장 성공을 뜻하지 않으므로 별도 확인) | 개발 DB에서 실 handler(`createDataRepositories`)로 삽입 후 즉시 조회 확인(스모크 스크립트) | 필수 |
| AC-3 | 허용 event 5종에 대한 집계 query(route/scenario/eventName 단위 count)가 정상 동작한다 | `scripts/interaction-smoke.ts` 실행 로그 | 필수 |
| AC-4 | 원문·후보·수정문·IP·user/session/device ID가 request/schema/log 어디에도 없다 | schema 컬럼 목록·handler 코드 재확인(T36에서 이미 테스트로 고정, 이번엔 재확인만) | 필수 |
| AC-5 | 보존 기간이 실제로 무엇인지(자동 삭제 job 존재 여부) 확인해 정직하게 기록한다 | 코드베이스·migration 전수 확인 | 필수 |

## 2. 의존성·정본 확인

- T항목과 의존성 상태: T24 의존 T10(완료)·T17(완료)·T36(완료) — 모두 충족
- CHECKLIST 본문이 직접 가리키는 문서·구간: SPEC.md 7장 "비식별 흐름 계측", docs/CICD.md T17 체크리스트 5번
- 추가로 확인한 정본: docs/AI_DESIGN.md 7장 개인정보·재방문 정책
- 이번 작업에서 바꾸지 않는 계약·범위: `interaction_events` schema, `/api/interaction` strict allowlist, T36의 클라이언트 계약

## 3. 작업트리 기준선

- 시작 시 `git status --short` 요약: T20~T21 커밋 4개, ESM 확장자 수정 커밋 1개가 이미 push된 상태. 워킹 트리는 origin과 동기화됨
- 기존 변경 중 반드시 보존할 파일·의도: 해당 없음
- 이번 작업이 소유하는 경로: `scripts/interaction-smoke.ts`, `package.json`(스크립트 항목 추가), `harness/tasks/T24-interaction-ops-verification/`

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | `/api/interaction`은 T36에서 코드·로컬 테스트로만 검증됐다. 이번 세션 중 실제로 Production에 배포된 `/api/generate`·`/api/interaction`이 `ERR_MODULE_NOT_FOUND`로 크래시하는 걸 발견해 별도로 수정·재배포했다(별도 fix 커밋). 그 복구 과정에서 이미 same-origin 왕복(AC-1)을 확인했으므로, T24 본작업은 AC-2~AC-5에 집중한다 |
| 구체성 | `scripts/interaction-smoke.ts` 신설: 개발 DB에 합성 event 4건을 실 repository로 삽입→집계 query로 재확인→정확히 그 4건만 삭제. `db-smoke.ts`와 동일하게 `DB_SMOKE_CONFIRM` 가드, `VERCEL_ENV=production` 차단을 재사용한다 |
| 역할·예시 | 합성 event 예: `{eventName:'copy_succeeded', route:'manual_ai', scenarioId:'professor', mode:'initiate', toneLevel:1}`. 집계 결과 예: `{count:2, eventName:'result_shown', route:'manual_ai', scenarioId:'professor'}` |
| 단계화 | ① 개발 DB 테이블 존재 확인(`interaction_events`가 없어 `npm run db:migrate`로 T35·T36 additive migration을 재적용) → ② 스모크 스크립트 작성·실행(삽입·집계·삭제) → ③ 보존 기간 코드 전수 확인(삭제 job 존재 여부) → ④ 전체 검증 |
| 검증 | `npm test`·lint·`typecheck:api`·build·`git diff --check` + 스모크 스크립트 2회 연속 실행(잔여 행 없이 반복 가능함을 확인) |

## 5. 변경 경계와 위험

- 허용된 변경: 위 "이번 작업이 소유하는 경로"
- 명시적으로 제외한 변경: `/api/interaction` 계약, `interaction_events` schema, 실제 삭제 job 신규 구현(MVP 범위 밖 — SPEC에 명시된 요구 없음, 현재 상태를 정직하게 기록하는 것이 이번 작업의 범위)
- 구조·계약·의존성 승인이 필요한 지점: 없음
- 예상 위험과 대응: 개발 DB에 합성 행이 남을 위험 → 삽입 시점 타임스탬프 기준으로 정확히 그 4건만 삭제하고 재실행으로 잔여 없음을 확인

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-21 | 승인됨 | T24 진행 지시, 안전하게 만들 수 있는 부분(집계 쿼리 스모크)은 바로 진행하고 Production 합성 테스트는 사용자 승인 하에 직접 수행 | 대화 기록 |

## 7. 진행·인계

- 마지막으로 끝낸 단계: 스모크 스크립트 작성·2회 연속 실행 성공, 보존 기간 확인, 전체 검증 통과
- 현재 작업 중인 단계: 없음
- 다음 행동: 없음
- 보류 사유와 재개 조건: 해당 없음

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-21 | Production 크래시 수습 과정에서 AC-1(same-origin 왕복) 사실상 확인 | 별도 fix 커밋·curl 검증 |
| 2026-07-21 | 개발 DB에 `interaction_events`·`retrieval_examples` 테이블이 없음을 발견(이전 세션 마이그레이션이 현재 `.env.local` DB에는 적용 안 됨) → `npm run db:migrate` 재실행으로 해결 | `scripts/_debug-tables.ts`(임시), `npm run db:migrate` 로그 |
| 2026-07-21 | `scripts/interaction-smoke.ts` 작성·2회 연속 실행으로 AC-2·AC-3 확인 | 스크립트 실행 로그 |
