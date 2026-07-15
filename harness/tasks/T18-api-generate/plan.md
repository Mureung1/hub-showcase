# 작업 계획: T18 — 프록시 함수 `/api/generate`

> 상태: 보류
>
> 작성일: 2026-07-15
>
> 최종 갱신일: 2026-07-15
>
> 현재 단계: provider 비종속 서버 기반·자동검증 완료, 선행 게이트 대기
>
> 다음 행동: T17·T25 대표 preflight·R2 `Provisional Go` 뒤 실제 provider client·키 환경변수 어댑터 연결
>
> CHECKLIST 항목: T18

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: 브라우저의 개발용 목 생성기를 실제 AI로 교체할 서버 경계가 없어 provider 키 보호, 요청 취소, 오류 정규화와 남용 제한을 수행할 수 없다.
- 목표 결과: 기존 `GenerationRequest`/`GenerationResponse` 계약을 유지하는 Vercel Node Function 기반을 만들고, 실제 provider 연결 전에도 순수 서버 코어를 fake provider로 검증할 수 있게 한다.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | 루트 `api/generate.ts`는 표준 `Request`/`Response` Vercel 진입점이고, 서버 로직은 `api/_lib/generation/`에서 provider·rate limiter를 주입받는다. | API 타입검사 + 구조 검토 | 필수 |
| AC-2 | POST JSON의 AI 직접입력 요청만 수락하고 잘못된 JSON·카드 요청·계약 위반은 400 `{ error: "invalid_request" }`로 반환한다. | 핸들러 테스트 | 필수 |
| AC-3 | 인스턴스별 메모리 카운터로 클라이언트 키당 60초 10회를 허용하고 초과 요청은 429 `{ error: "rate_limited" }`로 반환한다. IP는 로그·DB에 남기지 않는다. | rate limiter·핸들러 테스트 | 필수 |
| AC-4 | 18초 서버 deadline이 `AbortController`로 provider 호출을 취소하고 외부에는 500 `{ error: "generation_failed" }`로 정규화된다. | fake timer·abort 테스트 | 필수 |
| AC-5 | 출력 토큰 상한을 provider 경계에 전달하고, 일시적 provider 5xx·잘못된 구조만 전체 deadline 안에서 최대 1회 재시도한다. 4xx·429·유해 출력은 재시도하지 않는다. | provider 호출 횟수·옵션 테스트 | 필수 |
| AC-6 | 정상 provider 출력은 공용 validator를 거쳐 `source: "ai"` 후보 3개로 정규화되고, provider/파싱/유해 출력 실패는 외부 500으로 축약된다. | 핸들러 테스트 | 필수 |
| AC-7 | 서비스 코드가 받은 메시지·상황·생성 문구·클라이언트 키를 로그에 직렬화하지 않고 허용된 운영 메타데이터만 기록한다. | 메타데이터 sink 테스트 + 소스 검사 | 필수 |
| AC-8 | 실제 provider client·키 환경변수와 취소·오류 분류 어댑터를 연결하고 preview에서 provider 왕복을 확인한다. 프롬프트·structured output·`stop_reason`은 후속 T19 범위다. | provider adapter 테스트 + preview smoke | 필수 — 이번 코드 우선 단계에서는 보류 |
| AC-9 | `tsconfig.api.json` 타입검사, 관련 테스트, 전체 test/lint/build/diff와 명시적 `any` 0건을 통과한다. | 최종 자동 검증 | 필수 |

## 2. 의존성·정본 확인

- T항목과 의존성 상태 또는 비-T 식별 근거: T3 완료. T17은 Production Branch·공개 접근·preview 검증이 남아 미완료다. T25 대표 source preflight와 COMPETITIVE_VALIDATION R2 `Provisional Go`도 미완료다. 사용자가 2026-07-15 백엔드 구조 수립과 작업 시작을 명시해, 배포·실 provider 연결 없이 로컬 서버 코어만 먼저 만드는 코드 우선 예외로 착수한다. T18 완료 체크는 모든 게이트와 AC-8 통과 전까지 금지한다.
- CHECKLIST 본문이 직접 가리키는 문서·구간: `docs/CHECKLIST.md` T18, `docs/SPEC.md` 2·6장, `docs/AI_DESIGN.md` 2~6장.
- 추가로 확인한 정본: `docs/MVP.md` In 11~12·DoD, `docs/EDGE_CASES.md` 2-1·5-1·5-2, Vercel 공식 Node.js Runtime·Functions API 문서(2026-07-15 확인).
- 이번 작업에서 바꾸지 않는 계약·범위: S0~S3 UI, 템플릿 로컬 라우팅, `GenerationRequest`/`GenerationResponse` 필드, 클라이언트 20초 timeout, T19 프롬프트, T20 모델 선택, T30 DB, RAG·자율 agent loop·런타임 멀티에이전트 제외.

## 3. 작업트리 기준선

- 시작 시 `git status --short` 요약: T25·T28·T29, 정본 문서, 사용자 이미지와 삭제된 기존 공개 에셋 등이 함께 있는 대규모 미커밋 작업트리. 이 작업은 이를 되돌리거나 일괄 정리하지 않는다.
- 기존 변경 중 반드시 보존할 파일·의도: 사용자 제공 이미지, T25 검수 자료·CSV, T28/T29 구현·하네스, 기존 정본 변경 전부.
- 이번 작업이 소유하는 경로: PM=`harness/tasks/T18-api-generate/`, `tsconfig.api.json`, `package.json`의 API 타입검사 스크립트, `docs/CHECKLIST.md`, `docs/LOG.md`; 백엔드/AI=`api/**`; 프론트엔드=읽기 전용 계약 검토. 공용 `src/shared/generation/contracts.ts`는 변경하지 않는다.

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | React 19+TypeScript+Vite 프론트에 Vercel Node Function을 추가한다. provider 키는 서버에만 두고 기존 공용 생성 계약과 `any` 금지를 유지한다. 현재 선행 게이트가 남아 있어 로컬 기반 코드만 먼저 만들고 실제 AI 동작이나 T18 완료를 주장하지 않는다. |
| 구체성 | `api/generate.ts`는 배포 진입점만, `api/_lib/generation/handler.ts`는 HTTP·검증·정규화, `provider.ts`는 취소 신호·토큰 상한·실패 분류, `rateLimiter.ts`는 10회/60초 인메모리 제한, `metrics.ts`는 원문 없는 이벤트만 맡는다. `tsconfig.api.json`은 프론트 빌드 밖 서버 코드를 검사한다. |
| 역할·예시 | PM이 계약·정본·통합을 소유하고 백엔드/AI 담당이 `api/**`를 구현한다. 프론트엔드 담당은 읽기 전용으로 호환성을 확인한다. 예: `{ scenarioId: "professor", purpose: "ask", situation: "면담 시간을 여쭤보고 싶어요" }`는 provider를 거쳐 200 후보 3개, `situationId`가 있는 카드 요청은 API에서 400이다. |
| 단계화 | ① T29 사용자 검증 종료 기록 → ② T18 계약·예외·소유권 동결 → ③ rate limiter/provider/metrics 경계 → ④ 순수 핸들러와 Vercel 어댑터 → ⑤ 정상·오류·취소·재시도·비저장 테스트 → ⑥ API 타입검사·전체 회귀 → ⑦ 미완료 게이트와 T19 인계 기록. |
| 검증 | 정상 200, method/JSON/카드/길이 400, 11번째 429, 18초 abort, 5xx·invalid 구조 1회 재시도, 4xx·provider 429·unsafe 무재시도, 외부 오류 축약, 원문 비로그를 테스트한다. `npm run typecheck:api`, 전체 test/lint/build, `git diff --check`, 명시적 `any` 검색을 기록한다. |

## 5. 변경 경계와 위험

- 허용된 변경: `api/`의 provider 비종속 서버 기반, fake provider 테스트, API 전용 TypeScript 설정·스크립트, T18/T29 진행 기록.
- 명시적으로 제외한 변경: provider SDK 설치·실 API 호출·키 등록, 프롬프트/few-shot, 모델 선택, DB/Drizzle, 클라이언트 목→실 API 전환, 배포·커밋·푸시, RAG·제품 런타임 멀티에이전트.
- 구조·계약·의존성 승인이 필요한 지점: 공용 요청/응답 필드 변경, 새 런타임·서버 프레임워크, 실제 provider 또는 DB 패키지 추가, 클라이언트 라우팅 변경은 별도 승인·선행 게이트가 필요하다.
- 예상 위험과 대응: Vercel 인메모리 limiter는 인스턴스별 best-effort임을 유지하고 분산 저장소는 추가하지 않는다. 서버 deadline은 20초 클라이언트보다 짧은 18초로 두며, 출력 상한 1024는 provider 실측 전 잠정값으로 T20에서 재검증한다. 원문은 메트릭 타입에 들어갈 수 없도록 허용 필드만 구성한다. 진입점의 provider는 명시적 미연결 대역으로 두어 실제 AI가 연결된 것처럼 보이지 않게 한다.

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-15 | 승인됨 → 진행 중 | 백엔드 구조를 설계하고 작업 시작. T17·T25/R2 미완료이므로 배포·provider 연결 없이 서버 기반 코드만 먼저 진행하고 T18 완료는 보류 | 사용자 “검증완료했습니다. 다음작업합니다 백엔드 구조를짜고 백엔드 작업을 시작하세요.” |

범위나 완료조건이 바뀌면 구현을 중단하고 이 표와 관련 항목을 갱신한 뒤 재승인받는다.

## 7. 진행·인계

- 마지막으로 끝낸 단계: `api/` 서버 기반, Vercel fetch 진입점, fake provider 테스트, API 타입검사와 전체 회귀검증.
- 현재 작업 중인 단계: 없음 — 코드 우선 기반 범위 완료, T18 전체는 선행 게이트로 보류.
- 다음 행동: 선행 게이트 뒤 실제 provider client·키 환경변수와 취소·오류 분류 어댑터 연결.
- 보류 사유와 재개 조건: 실제 provider 연결·T18 완료는 T17 완료, T25 대표 preflight, R2 `Provisional Go`, provider 정책 재확인 후 재개한다. 그 뒤 T19가 프롬프트·structured output·`stop_reason`을 구현한다.

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-15 | Express 없이 Vercel Node Function의 Web `Request`/`Response` 형식과 주입 가능한 순수 코어를 채택 | Vercel 공식 문서가 루트 `/api` TypeScript와 fetch Web Standard export를 지원; 새 서버 프레임워크 불필요 |
| 2026-07-15 | 공개 오류는 SPEC의 400/429/500 세 종류만 유지하고 내부 timeout·invalid·unsafe는 500으로 축약 | 내부 원인을 사용자에게 노출하지 않는 `docs/SPEC.md` 2장 준수 |
| 2026-07-15 | `api/generate.ts`와 generation handler/provider/rate limiter/metrics 경계, 테스트 19개 구현 | 백엔드/AI 담당 단독 `api/**` 소유 후 PM 통합 |
| 2026-07-15 | 프론트 계약 읽기 전용 검토에서 현 단계 UI 변경 불필요 판정 | 카드 경로 API 0회·직접입력 AI-only·입력 보존 호환. T20에 HTTP 어댑터만 추가 |
| 2026-07-15 | API 19개·전체 88개 테스트, API 타입검사, lint, build, diff와 금지 의존성/원문 로그 검사 통과 | 실 provider 미연결이므로 T18 완료 체크는 보류 |
