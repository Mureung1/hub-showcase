# 검증 보고서: T18 — 프록시 함수 `/api/generate`

> 상태: 보류
>
> 검증일: 2026-07-15
>
> 관련 계획: `plan.md`
>
> 검증 대상: 미커밋 작업트리의 T18 서버 기반 코드·테스트·정본

## 1. 변경·범위 요약

- 목표 대비 결과: provider 비종속 `/api/generate` 서버 기반과 자동검증을 완료했다. 실제 provider 연결과 T18 완료는 선행 게이트 뒤로 보류한다.
- 변경한 파일: `api/generate.ts`, `api/_lib/generation/{handler,provider,rateLimiter,metrics}.ts`와 테스트 3개, `tsconfig.api.json`, `package.json` API 타입검사 스크립트, `docs/AI_DESIGN.md`, `docs/CHECKLIST.md`, `docs/LOG.md`, T18 계획·검증 기록.
- 변경하지 않은 경계: 실제 provider·프롬프트·DB·클라이언트 라우팅·배포.
- 시작 시 기존 변경 보존 여부: 보존. 대규모 미커밋 작업트리의 기존 파일을 되돌리거나 일괄 정리하지 않았다.
- 허용 범위와 실제 diff 비교 결과: 신규 서버 기반·API 타입설정·정본/하네스 기록 안에 있다. 공용 생성 계약과 프론트 UI는 변경하지 않았다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | API 타입검사 + 구조 검토 | 통과 | 공식 Vercel 형식의 `{ fetch }` 진입점과 주입형 순수 handler/provider/limiter/metrics 경계, API 타입검사 통과. `/api` 루트 일반 파일은 `generate.ts` 하나이고 테스트·유틸은 함수 변환에서 제외되는 `_lib` 아래에만 위치 |
| AC-2 | 핸들러 테스트 | 통과 | POST JSON 정상 200, GET·content-type·malformed JSON·카드·공용 계약 위반 400, provider 호출 0회 검증 |
| AC-3 | rate limiter·핸들러 테스트 | 통과 | client key별 10회 허용·11번째 429·60초 후 초기화·다른 key 분리 검증. key는 메트릭에 없음 |
| AC-4 | fake timer·abort 테스트 | 통과 | 18,000ms에 동일 `AbortSignal`이 취소되고 공개 500으로 축약됨을 검증 |
| AC-5 | provider 호출 횟수·옵션 테스트 | 통과 | 출력 상한 1024 전달, transient·invalid 구조 1회 재시도, 4xx·provider 429·unsafe 무재시도 검증 |
| AC-6 | 핸들러 테스트 | 통과 | 공용 `createGenerationResponse('ai')`로 tone 정렬·라벨 부여, 내부 실패는 공개 `generation_failed`로 정규화 |
| AC-7 | 메타데이터 sink 테스트 + 소스 검사 | 통과 | 메트릭은 route/scenario/purpose/status/attempt/latency만 허용. 받은 메시지·생성 문구·client key 비직렬화와 sink 실패 비차단 검증 |
| AC-8 | provider adapter 테스트 + preview smoke | 보류 | T17·T25 대표 preflight·R2 `Provisional Go` 뒤 실제 provider client·키 연결. T19는 그 다음 프롬프트/structured output 구현 |
| AC-9 | 전체 자동 검증 | 통과 | API 19개·전체 88개, API 타입검사, lint, build, diff, 명시적 `any`·금지 의존성 검사 통과 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | `npm test -- api` | 통과 | 3파일 19개 통과 |
| API 타입검사 | `npm run typecheck:api` | 통과 | `tsc -p tsconfig.api.json` 오류 0건 |
| 전체 테스트 | `npm test -- --reporter=dot` | 통과 | 11파일 88개 통과. jsdom 기존 `scrollTo` 미구현 경고만 발생 |
| 린트 | `npm run lint` | 통과 | oxlint 오류 0건 |
| 빌드 | `npm run build` | 통과 | main 225.41kB/70.91kB gzip, lazy CatCanvas 882.64kB/234.54kB gzip. 기존 `/paw.png`·500kB 경고만 발생 |
| 변경 형식 | `git diff --check` | 통과 | 공백 오류 0건 |
| 작업별 추가 검증 | 명시적 `any`·원문 로그·런타임 멀티에이전트/RAG·배포 함수 경로 검색 | 통과 | `api` 명시적 `any`·운영 `console` 0건. 운영 메트릭 타입에 원문/생성문/client key 없음. 관련 런타임 의존성 0건. `find api -maxdepth 1 -type f`는 `api/generate.ts`만 반환 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 실 provider `/api/generate` | Vercel preview | 직접입력 요청이 provider 왕복하고 키·원문이 노출되지 않음 | 선행 게이트 뒤 수행 | 보류 — AC-8 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: SPEC의 AI-only·400/429/500·비저장·10회/60초·deadline/재시도 계약과 일치하고, AI_DESIGN의 실제 현재 경로와 서버 기반 구조를 갱신했다.
- MVP 범위 준수: provider 비종속 단일 생성 워크플로 기반만 구현하며 RAG·자율 agent loop·런타임 멀티에이전트를 추가하지 않는다.
- 코드 작업인 경우 `any` 미사용 확인 방법: `api`와 변경 TypeScript에 명시적 `any` 검색.
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: 운영 진입점은 의도적으로 unconfigured provider라 현재 유효 요청도 500을 반환하고 프론트는 계속 목을 사용한다. limiter는 서버리스 인스턴스별 best-effort이며 raw client key는 영구 로그·DB가 아니라 인스턴스 Map의 window counter로만 쓰이고 같은 key의 window 갱신 또는 인스턴스 재활용 때 교체된다. Vercel Fluid Compute 또는 함수 max duration이 18초보다 긴지 T17에서 확인해야 한다. 18초·1024 토큰은 T20 실측 전 잠정값이다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 아니요 — 코드 우선 기반 AC-1~7·9는 통과했지만 AC-8 실 provider 연결이 보류다.
- 적용되는 자동·수동 검증 전부 통과: 현재 적용 가능한 자동 검증은 전부 통과. 실 provider 수동 검증은 보류.
- 미해결 차단사항 없음: 로컬 서버 기반 구현에는 없음. T18 완료에는 선행 게이트가 있다.
- `docs/CHECKLIST.md` 갱신 여부와 근거: 체크박스 미완료 유지.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 2026-07-15 T18 코드 우선 백엔드 기반 기록과 계획·검증 링크 추가.
- 후속 작업 또는 사용자 판단이 필요한 사항: T17·T25 대표 preflight·R2 완료 후 provider adapter/키 연결로 T18을 닫고, 이후 T19 프롬프트 구성과 T20 프론트 HTTP 어댑터를 진행.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
