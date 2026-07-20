# 검증 보고서: T30 — Neon PostgreSQL + Drizzle 데이터 계층

> 상태: 통과
>
> 검증일: 2026-07-20
>
> 관련 계획: [`plan.md`](plan.md)
>
> 검증 대상: T30 최종 미커밋 작업트리

## 1. 변경·범위 요약

- 목표 대비 결과: AC-1~8 통과. 네 테이블 schema·최초 migration·repository·환경 기반 Neon HTTP 연결과 Vercel background metrics sink를 구현하고 실제 Neon 개발 DB migration·네 repository·generate handler 기록/조회/정리를 검증해 T30을 완료했다.
- 변경한 파일: `api/_lib/db/**`, `api/_lib/generation/{metrics,handler.test}.ts`, `api/generate.ts`, `drizzle.config.ts`, `drizzle/**`, `.env.example`, `.gitignore`, 패키지 manifest/lock, AI·아키텍처 문서, T30 하네스·LOG.
- 변경하지 않은 경계: 로그인·사용자/세션 테이블·사용자 흐름·원문/생성문 저장·실 provider·클라이언트 계측·외부 DB 생성.
- 시작 시 기존 변경 보존 여부: 사용자 소유 untracked `.agents/skills/continue-dabnyangi-task/`, T25 설문 CSV, `tmp/`를 변경하지 않았다.
- 허용 범위와 실제 diff 비교 결과: T30 계획의 서버 데이터 계층·설정·테스트·문서 경계 안이다. `src`에는 DB import가 없고 UI·생성 계약은 변경하지 않았다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | schema·migration 구조 테스트와 금지 필드 검색 | 통과 | migration `CREATE TABLE` 정확히 4개, schema 열 이름에 원문·생성문·IP·사용자/세션 ID·hash 없음 |
| AC-2 | migration SQL·Drizzle check | 통과 | UUID PK, 3개 FK, unique/partial unique, 음수·범위·route 경계 check와 조회 index 생성. `npm run db:check` 통과 |
| AC-3 | repository 테스트·API 타입검사·클라이언트 import 검색 | 통과 | 네 typed repository mapper/writer 구현, `src`의 Drizzle·Neon·DB import 0건, API 타입검사 통과 |
| AC-4 | 초과 속성 포함 객체의 repository 기록 테스트 | 통과 | 받은 메시지·상황·후보·client key를 포함한 호출에서도 저장 row는 route/scenario/purpose/status/attempt/latency만 포함 |
| AC-5 | sink·handler 동기/비동기 실패 주입 | 통과 | DB reject와 scheduler throw를 흡수하고 handler는 동일 200 body 반환 |
| AC-6 | 환경 config 테스트·비밀 경계 검색 | 통과 | 서버 `DATABASE_URL`만 읽고 누락 시 no-op. `.env.local` 로드·`.env*` ignore·비밀 없는 `.env.example`, 클라이언트 참조 0건 |
| AC-7 | 전체 자동 게이트 | 통과 | DB·smoke guard 6파일 19개·전체 23파일 215개 테스트, API 타입검사, lint, build, migration check, diff/금지 검색 통과 |
| AC-8 | 실제 Neon migration·smoke test | 통과 | migration 최초 적용·재실행 성공. public 테이블 정확히 4개, 네 repository와 실제 generate handler background sink의 임시 row 기록·조회·역순 삭제 성공 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | `npm test -- scripts/dbSmokeEnvironment.test.ts api/_lib/db --reporter=dot` | 통과 | 6파일 19개 |
| handler 포함 관련 회귀 | `npm test -- scripts/dbSmokeEnvironment.test.ts api/_lib/db api/_lib/generation/handler.test.ts api/_lib/generation/entry.test.ts --reporter=dot` | 통과 | 8파일 42개 |
| 전체 테스트 | `npm test -- --reporter=dot` | 통과 | 23파일 215개. 기존 jsdom `scrollTo` 미구현 로그만 발생 |
| API 타입검사 | `npm run typecheck:api` | 통과 | 오류 0건 |
| 린트 | `npm run lint` | 통과 | oxlint 오류 0건 |
| 빌드 | `npm run build` | 통과 | Vite production build 성공. 기존 lazy CatCanvas 500kB 경고 유지 |
| 변경 형식 | `git diff --check` + T30 untracked trailing whitespace 검색 | 통과 | 공백 오류 0건 |
| migration 검사 | `npm run db:check` | 통과 | Drizzle `Everything's fine` |
| 금지 경계 검사 | 변경 production 코드·migration·`src` import 검색 | 통과 | 명시적 `any`, 금지 DB 열, 클라이언트 DB 의존 0건 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| migration 최초 적용 | Neon 개발 DB | Drizzle journal과 네 public 테이블 생성 | `migrations applied successfully` | 통과 |
| migration 재실행 | 같은 Neon 개발 DB | 이미 적용된 migration을 중복 생성하지 않고 정상 종료 | 재실행 `migrations applied successfully` | 통과 |
| handler·repository 기록·조회·정리 | 같은 Neon 개발 DB | public 테이블이 정확히 네 개이고 generate handler 성공 응답의 background metric과 각 repository row가 일치하며 만든 행만 역순 삭제 | `T30 Neon smoke test passed: handler and four repositories wrote, read, and cleaned metadata rows` | 통과 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: SPEC의 네 테이블·비저장·best-effort·환경 분리 계약을 구현하고 AI_DESIGN·ARCHITECTURE_OVERVIEW의 현재 상태를 동기화했다.
- MVP 범위 준수: 예. 로그인·히스토리·사용자 추적·대시보드·원문 저장을 추가하지 않았다.
- 코드 작업인 경우 `any` 미사용 확인 방법: T30 production TypeScript와 config에서 `\bany\b` 검색 결과 0건.
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: 개발 Neon에서는 통과했지만 Vercel Preview의 `waitUntil()` 실제 실행과 환경별 `DATABASE_URL` 분리는 T31에서 확인해야 한다. provider가 아직 model·prompt version·token 사용량을 제공하지 않아 현재 handler metric write에서는 해당 nullable 열이 비어 있으며 T20 통합에서 채워야 한다. DB URL 누락·초기화 실패는 의도적으로 no-op이므로 별도 배포 상태 점검이 필요하다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 예 — AC-1~8 통과.
- 적용되는 자동·수동 검증 전부 통과: 코드·migration·개발 Neon smoke의 T30 범위 통과. Vercel Preview 통합은 T31 후속이다.
- 미해결 차단사항 없음: T30 범위에는 없음.
- `docs/CHECKLIST.md` 갱신 여부와 근거: 2026-07-20 체크 완료. T18 기반 의존 충족과 AC-1~8 통과를 근거로 한다.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 2026-07-20 T30 코드 우선 기록과 본 계획·검증 링크 추가.
- 후속 작업 또는 사용자 판단이 필요한 사항: T31에서 Vercel Preview `DATABASE_URL`을 설정하고 실제 `waitUntil()` background metric write와 Production 환경 분리를 확인한다.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
