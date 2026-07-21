# 검증 보고서: T24 — 흐름 계측 운영 검증

> 상태: 통과
>
> 검증일: 2026-07-21
>
> 관련 계획: `plan.md`
>
> 검증 대상: 배포된 Production(`https://dabnyang.vercel.app`) + 미커밋 작업트리(`scripts/interaction-smoke.ts`, `package.json`)

## 1. 변경·범위 요약

- 목표 대비 결과: same-origin 왕복, `waitUntil()` 실제 DB 반영, 집계 query, 보존 기간(실제 상태) 네 가지를 모두 확인했다.
- 변경한 파일: `scripts/interaction-smoke.ts`(신설), `package.json`(`db:smoke:interaction` 스크립트 추가), `harness/tasks/T24-interaction-ops-verification/`
- 변경하지 않은 경계: `/api/interaction` 계약, `interaction_events` schema, 삭제 job(신규 구현 안 함 — 현재 부재를 그대로 기록)
- 시작 시 기존 변경 보존 여부: 해당 없음(직전 커밋들이 모두 push된 깨끗한 상태에서 시작)
- 허용 범위와 실제 diff 비교 결과: 계획 범위 내. `npm run db:migrate`로 개발 DB에 T35·T36 additive migration을 재적용한 것은 스키마 자체를 바꾼 게 아니라 이미 정본에 있던 migration을 이 DB에 처음 적용한 것(개발 DB 한정, 프로덕션 아님)

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | Production `/api/interaction`에 실제 POST | 통과 | `curl -X POST https://dabnyang.vercel.app/api/interaction` → `202`. 같은 세션에서 발견한 배포 크래시(ESM 확장자 결함)를 수정한 뒤 확인 |
| AC-2 | 개발 DB에 실 repository로 삽입 후 즉시 조회 | 통과 | `scripts/interaction-smoke.ts`가 4건 삽입 후 같은 트랜잭션 밖에서 재조회해 정확히 반영됨을 확인(2회 연속 실행 모두 통과) |
| AC-3 | route/scenario/eventName 집계 query | 통과 | 동일 스크립트의 `group by` 쿼리 결과가 삽입한 4건과 정확히 일치(`{count:2, result_shown, manual_ai, professor}` 등) |
| AC-4 | schema 컬럼·handler 코드 재확인 | 통과 | `interaction_events` 컬럼은 `eventName/route/scenarioId/mode/situationId/toneLevel/createdAt`뿐이고 원문·후보·수정문·IP·user/session/device ID 컬럼이 없음을 `schema.ts` 재확인. `parseInteractionEvent`가 allowlist 외 키를 거부함은 T36 테스트로 이미 고정 |
| AC-5 | 삭제/TTL job 존재 여부 전수 확인 | 통과(정직한 기록) | 저장소 전체에서 `interaction_events` 삭제·TTL·cron 관련 코드를 찾지 못했다. **현재 보존 기간은 사실상 무기한**이며 자동 삭제 메커니즘이 없다. 이는 MVP 범위에 삭제 job이 명시되지 않았기 때문(SPEC 7장은 저장 필드 제한만 요구)이며, 필요시 후속 작업으로 별도 승인받아야 한다 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | 없음(스크립트는 실 DB 대상 수동 실행, 단위테스트 대상 아님) | 해당 없음 | `typecheck:api`가 타입 안전성을 담보 |
| 전체 테스트 | `npm test` | 통과 | 41파일 349개(1회 일시적 flake는 재실행으로 재현 안 됨 확인) |
| 린트 | `npm run lint` | 통과 | 오류 0 |
| API 타입검사 | `npm run typecheck:api` | 통과 | 오류 0 |
| 빌드 | `npm run build` | 통과 | 기존 500KB 청크 경고만 비차단 |
| 변경 형식 | `git diff --check` | 통과 | 공백 오류 0 |
| 작업별 추가 검증 | `DB_SMOKE_CONFIRM=t30-development-write npx tsx scripts/interaction-smoke.ts` ×2 | 통과 | 두 번 모두 동일한 집계 결과, 잔여 행 없이 반복 가능 확인 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| Production same-origin 왕복 | 실제 배포 URL, curl(프론트와 동일 origin에서 호출되는 경로 재현) | 202 반환 | 202 반환 | 통과 |

## 5. 정본·규칙 확인

- 작업별 정본(SPEC 7장) 정합성: 이벤트 5종·필드 allowlist·원문 비저장 요구와 실제 schema·handler가 일치
- MVP 범위 준수: 삭제 job을 새로 만들지 않음(MVP 범위 밖 신규 기능 금지 원칙 준수) — 대신 현재 상태(무기한 보존)를 정직하게 기록
- `any` 미사용 확인 방법: `npm run typecheck:api`(strict) 통과로 확인
- 미치환 필수 항목 없음: 해당 없음
- 남은 위험·알려진 한계: interaction_events가 사실상 무기한 보존되므로, 트래픽이 쌓이면 별도 보존 정책(수동 정리 또는 TTL job)이 필요할 수 있다 — 이는 이번 작업의 승인 범위 밖이라 구현하지 않았고 후속 판단으로 남긴다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 예 (AC-1~AC-5)
- 적용되는 자동·수동 검증 전부 통과: 예
- 미해결 차단사항 없음: 예
- `docs/CHECKLIST.md` 갱신 여부와 근거: T24 체크 완료, 근거 링크 연결
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 기록 완료
- 후속 작업 또는 사용자 판단이 필요한 사항: interaction_events 보존 정책(수동/TTL) 필요 여부는 트래픽 관측 후 별도 판단
