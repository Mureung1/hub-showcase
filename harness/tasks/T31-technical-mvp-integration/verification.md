# 검증 보고서: T31 — 기술 MVP 통합 DoD·최종 배포

> 상태: 통과
>
> 검증일: 2026-07-24
>
> 관련 계획: [`plan.md`](plan.md)
>
> 검증 대상: Preview·Production `beb6cdad6edf6564b262d923c1ea2a07642ad521`

## 1. 변경·범위 요약

- 목표 대비 결과: same-origin HTTP 클라이언트와 Production 선택 경계·정직한 입력 안내를 포함한 `beb6cda`가 Preview와 Production에 배포됐다. 같은 SHA에서 UI→API 세 후보, public bundle, 실제 Production API 입력 반영, Preview·Production `generation_runs` metadata write가 모두 통과해 T31을 완료한다.
- 변경한 파일: `src/shared/generation/apiGenerator.ts`와 테스트, `MessageFlow.tsx`·`App.test.tsx`, generation barrel, T31 plan/verification, `docs/LOG.md`.
- 변경하지 않은 경계: 서버 `/api/generate` 계약·provider·프롬프트·DB schema·Vercel 설정·T22·T35 운영 상태.
- 시작 시 기존 변경 보존 여부: ORCH-2·T22/T23 변경과 사용자 소유 미추적 파일을 보존한다.
- 허용 범위와 실제 diff 비교 결과: 승인된 브라우저 HTTP 연결·개발/test mock 분리·안내·테스트와 T31 기록에 한정했다. 새 route·입력 형식·의존성·서버/DB 변경은 없다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | CHECKLIST·Git·deployment | 통과 | T23·T29·T30·T34 완료. HEAD·Preview·Production·`origin/N166_진현지`가 모두 `beb6cdad6edf6564b262d923c1ea2a07642ad521` |
| AC-2 | 통합 회귀 | 통과 | 전체 45파일 386테스트. HTTP client+App 집중 2파일 93테스트에서 exact 자연어 전달·세 톤 표시·기존 route 회귀 통과 |
| AC-3 | Cat stage 회귀·build | 통과 | CatStage 포함 집중 회귀 통과. 단일 Canvas·WebGL/reduced-motion/저사양 fallback은 T29 계약을 유지하고 lazy CatCanvas는 882.64kB/234.53kB gzip |
| AC-4 | import·dist 비밀 검사 | 통과 | `src`의 Neon·Drizzle·DB/provider key 참조 0건, `dist`의 세 key marker·Neon·Drizzle marker 0건. browser는 서버 DB module을 import하지 않음 |
| AC-5 | guarded 개발 DB 검증 | 통과 | migration 재적용 성공. core smoke가 여섯 테이블과 generate background sink의 임시 행 기록·조회·정리를 통과했고 interaction smoke가 4건 집계·정리를 통과 |
| AC-6 | Preview API·DB | 통과 | Preview deployment `5582284113`, SHA `beb6cda`, state `success`. UI→API 세 후보 생성 뒤 `2026-07-24T01:20:58.411Z` `friend/initiate/decline` metadata 행이 `status=success`로 기록됨 |
| AC-7 | static selector·agent 부재 | 통과 | production import는 `api/generate`→Gemini provider→`buildPromptWithReviewedExamples`→Git `seedExamples`이며 retrieval import 0건. agent/tool loop import 0건. evaluator는 `productionEligible=false` |
| AC-8 | Production 통합 SHA | 통과 | Production deployment `5582330653`, SHA `beb6cda`, state `success`. 공개 `/` HTTP 200, 실제 API 세 후보와 `2026-07-24T01:28:13.759Z` metadata 성공 행 확인 |
| AC-9 | 전체 자동 gate | 통과 | 45파일 386테스트, 프론트/API 타입, templates, DB, retrieval artifacts/eval, lint, build, harness, diff 통과 |
| AC-10 | 정본 주장 경계 | 통과 | T22 `Pending`·사용자 검증/범용 AI 우위 주장 금지, T35 미완료·운영 비활성 상태 유지 |
| AC-11 | 배포 UI→API | 통과 | 동일 SHA Preview UI 생성 통과. 공개 main bundle은 로컬 검증본과 SHA-256이 같고 `/api/generate`·Gemini 안내를 포함하며 mock 안내·대표 mock 후보는 없음. 지정 자연어가 Production AI 세 후보에 그대로 반영됨 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | `apiGenerator.test.ts`·`App.test.tsx` | 통과 | 2파일 93테스트. exact 자연어 request, 200/400/429/500/network/invalid 응답, template API 0회와 UI 후보 표시 |
| 전체 테스트 | `npm test` | 통과 | 45파일 386테스트 |
| API 타입검사 | `npm run typecheck:api` | 통과 | 오류 없음 |
| 템플릿 | `npm run templates:check` | 통과 | generated artifact drift 없음 |
| DB schema | `npm run db:check` | 통과 | Drizzle `Everything's fine` |
| retrieval | `npm run retrieval:eval`·`npm run retrieval:coverage:review:check` | 통과 | 8/48 covered, activation-ready 0/48, `productionEligible=false`; 블라인드 검수지 96세트/288후보 current |
| 개발 DB migration | `npm run db:migrate` | 통과 | additive migration 재실행 성공 |
| 개발 DB core | guarded `npm run db:smoke` | 통과 | 여섯 public table과 generation sink 임시 metadata 행 기록·조회·정리 |
| 개발 DB interaction | guarded `npm run db:smoke:interaction` | 통과 | 합성 4건의 route/scenario/event 집계 일치 후 자체 정리 |
| Production API 직접 생성 | `manual_ai(friend/initiate/apologize)` exact 사용자 입력 | 통과 | `"약속을 미뤄야겠다 그리고 정중하게 사과하고싶다"`가 HTTP 200·AI tone 1/2/3에 약속 연기·사과로 반영됨 |
| Preview 배포·DB 기록 | deployment `5582284113` + 시간창 metadata 조회 | 통과 | SHA `beb6cda`, state `success`. `2026-07-24T01:20:58.411Z`, `friend/initiate/decline`, `status=success`, latency 1277ms, attempt 1 |
| Production 배포 | deployment `5582330653` + 공개 `/` | 통과 | SHA `beb6cda`, state `success`; `https://dabnyang.vercel.app/` HTTP 200 |
| Production DB 기록 | 지정 합성 요청 + 시간창 metadata 조회 | 통과 | `2026-07-24T01:28:13.759Z`, `friend/initiate/apologize`, `status=success`, latency 1458ms, attempt 1. 원문·생성문은 조회하지 않음 |
| 린트 | `npm run lint` | 통과 | oxlint 오류 없음 |
| 빌드 | `npm run build` | 통과 | `tsc -b`·Vite 통과. 기존 CatCanvas 500kB 경고만 비차단 |
| Production bundle | 공개·로컬 asset SHA-256 및 marker 검사 | 통과 | main `index-Bo0zVbG7.js` 양쪽 SHA-256 `3ec66fd2cab9a03158b843319e8afe4e577973f84adc05d4e4b7764d4f8cd731`; `/api/generate`·Gemini 안내 포함, stale mock 안내와 대표 mock 후보 문장 0건 |
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
| 현재 Production 화면 | `f690a74…` 배포 + 사용자 보고·소스 대조 | 자연어가 실제 AI에 전달 | 화면은 `generateWithMock()`만 호출하고 고정 예시를 표시 | 실패 — 사용자 입력 문제가 아니라 UI 미연결 |
| 동일 입력 API 직접 호출 | 공개 Production `/api/generate` | 약속 연기·사과 반영 세 후보 | HTTP 200·AI tone 1/2/3 | 통과 — 서버/provider 정상 |
| UI→API 수정 build | 로컬 Production build | same-origin API marker, mock 후보 제거 | `/api/generate` 포함·대표 mock 문구 0건 | 통과 — 아래 동일 SHA 배포에서 재확인 |
| UI→API 수정 Preview | deployment `5582284113`, SHA `beb6cda` | manual AI 세 후보와 DB metadata | UI 세 후보 및 `01:20:58.411Z` `status=success` 행 | 통과 |
| 최종 Production 공개 경로 | deployment `5582330653`, SHA `beb6cda` | 검증 bundle·실제 API·DB가 같은 배포에서 동작 | 공개 asset hash 일치, 지정 입력 반영 AI 세 후보, `01:28:13.759Z` `status=success` 행 | 통과 |
| 최종 Production 클릭 재현 | 공개 도메인 | mock 안내 없이 same-origin API 사용 | 연결 가능한 Browser backend가 `[]`여서 독립 클릭은 미실행. 동일 SHA Preview UI 통과와 공개 bundle 바이트 일치·API/DB 성공으로 배포 차이를 대조 | 통과 — 증거 한계 기록 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: CHECKLIST·MVP·CICD·SPEC의 T31 Preview runtime gate를 개발 DB smoke나 Production API 성공으로 대체하지 않았다.
- MVP 범위 준수: 정본에 이미 요구된 guided/manual AI route를 실제 HTTP에 연결했다. 새 입력 형식·route·provider·기능은 추가하지 않았다.
- 코드 작업인 경우 `any` 미사용 확인 방법: 신규 HTTP client·UI·테스트 대상 검색, TypeScript build, oxlint로 재확인했다.
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: 연결 가능한 Browser backend가 없어 공개 도메인의 클릭·network panel을 이 세션에서 독립 재현하지 못했다. 대신 동일 SHA Preview UI 통과, 공개·로컬 bundle SHA-256 일치, Production API 입력 반영과 DB write를 결합해 배포 차이를 검증했다. 기존 CatCanvas 500kB 경고와 jsdom `scrollTo` 로그는 기능 실패 없이 유지된다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 예 — AC-1~AC-11 통과.
- 적용되는 자동·수동 검증 전부 통과: 예 — 기존 T23 실기기, 동일 SHA Preview UI, 최종 Production bundle·API·DB와 전체 자동 gate를 결합했다.
- 미해결 차단사항 없음: 예.
- `docs/CHECKLIST.md` 갱신 여부와 근거: T31 완료 체크. Preview·Production 동일 SHA의 실제 AI·background metric과 최종 품질 gate 통과.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: `beb6cda` Preview·Production deployment와 공개 runtime·DB metadata 근거를 기록한다.
- 후속 작업 또는 사용자 판단이 필요한 사항: T31 범위에는 없음. T22는 `Pending`, T35는 비운영 상태를 유지한다.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
