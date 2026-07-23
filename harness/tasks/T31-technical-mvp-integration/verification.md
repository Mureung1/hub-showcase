# 검증 보고서: T31 — 기술 MVP 통합 DoD·최종 배포

> 상태: 보류
>
> 검증일: 2026-07-23
>
> 관련 계획: [`plan.md`](plan.md)
>
> 검증 대상: HEAD·Production `b9d6b2563d666b57a39894d74c106090dc301329` + 미커밋 T31 문서 작업트리

## 1. 변경·범위 요약

- 목표 대비 결과: 직접 의존·통합 회귀·Three.js 폴백·server-only 비밀·개발 DB migration/smoke·운영 static selector·Production 생성은 통과했다. 현재 통합 SHA의 Vercel Preview가 없어 실제 Preview `/api/generate`의 `waitUntil()` DB 반영을 확인하지 못했으므로 T31은 미완료다.
- 변경한 파일: T31 `plan.md`, `verification.md`, T31 관련 `docs/LOG.md`, T23 완료 상태의 `docs/PLAN.md`.
- 변경하지 않은 경계: 제품 코드·API·DB schema·Vercel 설정·T22·T35 운영 상태.
- 시작 시 기존 변경 보존 여부: ORCH-2·T22/T23 변경과 사용자 소유 미추적 파일을 보존한다.
- 허용 범위와 실제 diff 비교 결과: 제품 코드·API·DB schema·배포 설정을 변경하지 않고 T31 검증 기록과 T23 일정 상태 동기화에 한정했다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | CHECKLIST·Git·deployment | 통과 | T23·T29·T30·T34 완료. HEAD·Production SHA `b9d6b2563d666b57a39894d74c106090dc301329` |
| AC-2 | 통합 회귀 | 통과 | 전체 44파일 375테스트, App·Cat·생성/계측 계약 집중 9파일 173테스트. T23 사용자 실기기 네 시나리오 통과 증거 재사용 |
| AC-3 | Cat stage 회귀·build | 통과 | CatStage 포함 집중 회귀 통과. 단일 Canvas·WebGL/reduced-motion/저사양 fallback은 T29 계약을 유지하고 lazy CatCanvas는 882.64kB/234.53kB gzip |
| AC-4 | import·dist 비밀 검사 | 통과 | `src`의 Neon·Drizzle·DB/provider key 참조 0건, `dist`의 세 key marker·Neon·Drizzle marker 0건. browser는 서버 DB module을 import하지 않음 |
| AC-5 | guarded 개발 DB 검증 | 통과 | migration 재적용 성공. core smoke가 여섯 테이블과 generate background sink의 임시 행 기록·조회·정리를 통과했고 interaction smoke가 4건 집계·정리를 통과 |
| AC-6 | Preview API·DB | 부분 통과 | 최초 Preview AI 생성 뒤 DB 0건. TS2591 원인을 root Node types로 수정한 `4d44c40` Preview build success. 최신 배포의 사용자 로그인 생성·DB write 재검증 대기 |
| AC-7 | static selector·agent 부재 | 통과 | production import는 `api/generate`→Gemini provider→`buildPromptWithReviewedExamples`→Git `seedExamples`이며 retrieval import 0건. agent/tool loop import 0건. evaluator는 `productionEligible=false` |
| AC-8 | Production 통합 SHA | 통과 | Production `5564774983` state `success`, HEAD와 같은 `b9d6b25…`. T23 HTML·asset·guided/manual 증거에 더해 합성 manual 요청이 HTTP 200·AI tone 1/2/3 반환 |
| AC-9 | 전체 자동 gate | 통과 | 테스트·프론트/API 타입·templates·DB·retrieval artifacts/eval·lint·build 통과. 문서 갱신 뒤 harness 25폴더·diff도 재통과 |
| AC-10 | 정본 주장 경계 | 통과 | T22 `Pending`·사용자 검증/범용 AI 우위 주장 금지, T35 미완료·운영 비활성 상태 유지 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | App·Cat·generation/interaction 계약·sink 9파일 | 통과 | 173테스트. 기존 jsdom `scrollTo` 미구현 로그만 비차단 |
| 전체 테스트 | `npm test` | 통과 | 44파일 375테스트 |
| API 타입검사 | `npm run typecheck:api` | 통과 | 오류 없음 |
| 템플릿 | `npm run templates:check` | 통과 | generated artifact drift 없음 |
| DB schema | `npm run db:check` | 통과 | Drizzle `Everything's fine` |
| retrieval | `npm run retrieval:eval`·`npm run retrieval:coverage:review:check` | 통과 | 8/48 covered, activation-ready 0/48, `productionEligible=false`; 블라인드 검수지 96세트/288후보 current |
| 개발 DB migration | `npm run db:migrate` | 통과 | additive migration 재실행 성공 |
| 개발 DB core | guarded `npm run db:smoke` | 통과 | 여섯 public table과 generation sink 임시 metadata 행 기록·조회·정리 |
| 개발 DB interaction | guarded `npm run db:smoke:interaction` | 통과 | 합성 4건의 route/scenario/event 집계 일치 후 자체 정리 |
| Production 생성 | 합성 `manual_ai(friend/initiate/decline)` 1건 + 개발 DB 시간창 조회 | 부분 통과 | HTTP 200·`source=ai`·tone 1/2/3. 개발 DB 새 행 0건이라 Production DB가 다른지 write가 실패했는지 판정 불가; Preview 증거로 사용하지 않음 |
| 린트 | `npm run lint` | 통과 | oxlint 오류 없음 |
| 빌드 | `npm run build` | 통과 | `tsc -b`·Vite 통과. 기존 CatCanvas 500kB 경고만 비차단 |
| 비밀·import·`any` | 대상 `rg` 검사 | 통과 | client/bundle DB·key·retrieval/agent production import·명시적 `any` 0건 |
| 하네스·변경 형식 | `npm run harness:check`·`git diff --check` | 통과 | 25개 작업 폴더 정합성·공백 오류 없음 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 모바일·카카오톡 통합 흐름 | Production 320×568·375×667·모바일·카카오톡 | T23 네 시나리오 통과 | 사용자가 2026-07-23 모두 통과 확인 | 통과 — T23 증거 재사용 |
| 현재 tree Preview build | Vercel Preview | 제품 tree 불변·build success | `76bcea5`와 부모의 tree SHA `ea335bc…` 일치, Vercel status success | 통과 |
| 현재 tree Preview generate | 보호된 Vercel Preview | manual AI 세 후보 표시 | 사용자가 지정 합성 흐름 완료 확인 | 통과 — 사용자 보고 |
| 현재 tree Preview background write | 개발 DB `generation_runs` | 응답 뒤 metadata-only 행 생성 | 조건 필터와 같은 시각 이후 전체 조회 모두 0건 | 실패 — Preview DB 환경 확인 필요 |
| Node 타입 수정 Preview build | Vercel Preview `4d44c40` | `process` TS2591 없이 배포 | Vercel status success 2026-07-23T09:25:26Z | 통과 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: CHECKLIST·MVP·CICD·SPEC의 T31 Preview runtime gate를 개발 DB smoke나 Production API 성공으로 대체하지 않았다.
- MVP 범위 준수: 새 기능 없이 통합 검증만 수행.
- 코드 작업인 경우 `any` 미사용 확인 방법: 제품 코드 변경 없음. lint·대상 검색·build로 재확인한다.
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: Preview `DATABASE_URL` 추가 뒤 재배포에서 드러난 Node 타입 결함은 수정 Preview build 성공으로 해소했다. 최신 배포의 AI 생성과 DB write는 보호된 URL에서 사용자가 다시 실행해야 한다. 기존 CatCanvas 500kB 경고와 jsdom `scrollTo` 로그는 기능 실패 없이 유지된다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 아니요 — AC-6 최신 배포 runtime 재검증 대기.
- 적용되는 자동·수동 검증 전부 통과: 아니요 — 수정 Preview build는 통과했고 사용자 생성·DB write가 남았다.
- 미해결 차단사항 없음: 아니요 — 보호된 최신 Preview에서 사용자 생성 1회 필요.
- `docs/CHECKLIST.md` 갱신 여부와 근거: 미갱신.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 내부 통과 범위와 Preview 보류를 기록한다.
- 후속 작업 또는 사용자 판단이 필요한 사항: 최신 branch Preview에서 같은 합성 생성 1건을 실행하고 `2026-07-23T09:29:11Z` 이후 metadata 행을 재조회한다.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
