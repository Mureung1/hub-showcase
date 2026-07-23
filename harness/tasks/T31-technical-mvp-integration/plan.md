# 작업 계획: T31 — 기술 MVP 통합 DoD·최종 배포

> 상태: 보류
>
> 작성일: 2026-07-23
>
> 최종 갱신일: 2026-07-23
>
> 현재 단계: API Node 타입 수정 Preview build 통과, 보호된 Preview 합성 생성 재실행 대기
>
> 다음 행동: 사용자가 최신 Preview에서 지정 합성 manual AI 생성 1건을 실행하면 `2026-07-23T09:29:11Z` 이후 DB metadata 행 확인
>
> CHECKLIST 항목: T31

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: 기능별 완료만으로는 카드·guided/manual 생성, 결과 다듬기·복사, Three.js 폴백, server-only 비밀, DB migration·비식별 metric, 운영 static selector가 하나의 배포 버전에서 함께 동작한다고 판정할 수 없다.
- 목표 결과: 현재 기술 MVP의 통합 계약을 같은 SHA 기준으로 재검증하고, T22 외부 가치 검증과 T35 retrieval 운영 승격을 완료 주장에 섞지 않는다.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | 직접 의존 T23·T29·T30·T34가 완료이고 통합 검증 대상 SHA가 고정된다. | CHECKLIST·Git·GitHub deployment 조회 | 필수 |
| AC-2 | template fallback·guided AI·manual AI와 결과 다듬기·복사·접근성 계약이 함께 회귀 없이 통과한다. | 전체·App·generation 관련 테스트와 T23 실기기 증거 | 필수 |
| AC-3 | 단일 Three.js Canvas, 정적 fallback, reduced-motion·WebGL 실패, 모바일 자산/성능 경계가 유지된다. | T29 관련 테스트·build 자산 확인 | 필수 |
| AC-4 | provider·DB 비밀과 서버 모듈이 클라이언트 bundle에 없고 브라우저가 DB에 직접 연결하지 않는다. | import·dist 문자열·bundle 검사 | 필수 |
| AC-5 | migration이 개발 DB에 재현되고 여섯 테이블·generation background sink·interaction 집계가 실제 DB에서 임시 행 생성·조회·정리까지 통과한다. | guarded migrate·DB smoke 2종 | 필수 |
| AC-6 | 현재 통합 SHA의 Vercel Preview에서 실제 `/api/generate`가 성공하고 `waitUntil()` generation metric이 Preview DB에 반영된다. | Preview deployment·API 호출·시간창 DB 조회 | 필수 |
| AC-7 | 운영 `/api/generate`는 Git 정본의 static reviewed example selector만 쓰며 retrieval·자율 agent loop·런타임 멀티에이전트를 호출하지 않는다. | production import graph·소스·retrieval evaluator 확인 | 필수 |
| AC-8 | Production 공개 경로와 server-only 자산 검증이 같은 통합 SHA에서 통과한다. | T23 deployment·HTTP/API 증거 재확인 | 필수 |
| AC-9 | 전체 테스트·프론트/API 타입·템플릿/DB/retrieval drift·lint·build·하네스·diff 검사가 통과한다. | 최종 자동 품질 gate | 필수 |
| AC-10 | T22는 `Pending`, T35는 비운영 상태이며 기술 완료를 사용자 검증·범용 AI 우위로 표현하지 않는다. | CHECKLIST·MVP·검증 문구 대조 | 필수 |

## 2. 의존성·정본 확인

- T항목과 의존성 상태: T23·T29·T30·T34 모두 CHECKLIST와 각 verification에서 완료·통과. T22는 사용자 결정으로 실행하지 않는 후속 외부 가치 검증이며 T31 의존성이 아니다.
- CHECKLIST 본문이 직접 가리키는 문서·구간: `docs/MVP.md` 기술 DoD, `docs/CICD.md` Preview·Production 절차, `docs/SPEC.md` 생성·계측 계약.
- 추가로 확인한 정본: `docs/PLAN.md`, `docs/RETRIEVAL.md`, T23·T24·T29·T30·T34·T35 검증 보고서.
- 이번 작업에서 바꾸지 않는 계약·범위: UI·API·DB schema, 모델·프롬프트·템플릿, retrieval 운영 비활성, T22 기준, Vercel 설정. 결함이 없으면 제품 코드는 변경하지 않는다.

## 3. 작업트리 기준선

- 시작 시 `git status --short` 요약: ORCH-2·T22/T23 문서·하네스 변경이 미커밋이며 제품 `src/`·`api/`는 현재 HEAD와 같다. 사용자 소유 CSV·`tmp/`·`continue-dabnyangi-task` 초안은 미추적 상태다.
- 기존 변경 중 반드시 보존할 파일·의도: 승인된 task-first 마이그레이션과 T22 분리, T23 완료 기록, 사용자 소유 미추적 파일, 로컬 전용 CI 파일.
- 이번 작업이 소유하는 경로: `harness/tasks/T31-technical-mvp-integration/`, T31 관련 `docs/LOG.md`, 승인된 Vercel API 타입 수정 `tsconfig.json`, 완료 시 `docs/CHECKLIST.md`·`docs/PLAN.md`.
- 검증 대상 기준선: 로컬 HEAD와 Production deployment `5564774983`은 모두 `b9d6b2563d666b57a39894d74c106090dc301329`. 최신 같은-SHA Preview는 조회 시점에 없다.

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | React+TypeScript/Vite, Vercel serverless, Neon+Drizzle, Gemini 단일 structured-output workflow를 검증한다. 새 라이브러리·기능·`any`·런타임 멀티에이전트를 추가하지 않는다. |
| 구체성 | 제품 코드는 결함 발견 전 변경하지 않는다. T31 plan/verification과 LOG에 통합 AC별 증거를 연결하고, 모든 AC가 통과할 때만 CHECKLIST·PLAN을 완료 갱신한다. |
| 역할·예시 | 개인정보 없는 `guided_ai(groupwork/schedule/ask_availability)` 또는 `manual_ai(professor/initiate/ask)` 요청 1건이 tone 1·2·3을 반환하고, `generation_runs`에는 route·scenario·status·latency 같은 메타데이터만 새 행으로 남아야 한다. template fallback은 API 0회다. |
| 단계화 | ① 의존·SHA 동결 ② 통합 테스트·타입·drift ③ 개발 DB migration·두 smoke ④ dist 비밀·static selector·agent 부재 ⑤ 현재 SHA Preview API·background write ⑥ Production·정본·최종 gate 순서다. |
| 검증 | 전체 테스트, API 타입, templates/DB/retrieval 검사, lint/build/harness/diff와 guarded 개발 DB smoke를 실행한다. 같은 SHA Preview가 없거나 실제 background write를 확인하지 못하면 T31을 완료하지 않고 재개 조건을 명시한다. |

## 5. 변경 경계와 위험

- 허용된 변경: T31 계획·검증·LOG, Vercel API 함수가 Node `process` 타입을 인식하도록 하는 루트 `tsconfig.json` 최소 수정, 모든 완료조건 통과 시 CHECKLIST·PLAN 상태 갱신.
- 명시적으로 제외한 변경: 새 기능·리팩토링, T22 결과 생성, T35 approved 승격·운영 retrieval 연결, Vercel 설정 변경, 커밋·push·새 배포.
- 구조·계약·의존성 승인이 필요한 지점: 통합 검증에서 UI/API/DB/배포 구조 변경이 필요하면 중단하고 별도 제안한다.
- 예상 위험과 대응: 현재 SHA의 Preview가 없으며 새 Preview는 커밋·push 또는 배포 권한이 필요하다. 승인 범위 밖 외부 변경은 하지 않고 내부 검증을 끝낸 뒤 AC-6만 명확한 재개 조건으로 남긴다. DB smoke는 `DB_SMOKE_CONFIRM=t30-development-write`와 production guard를 사용해 개발 DB 임시 행만 만들고 자체 정리한다.

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-23 | 승인됨 | T22를 후속 검증으로 분리하고 T31 기술 트랙 진행 | 사용자 “승인 진행” |
| 2026-07-23 | 승인됨 | T23 수동 확인 뒤 다음 항목 진행 | 사용자 “모두 통과로 확인완료했습니다. 다음으로 진행” |
| 2026-07-23 | 승인됨 | 현재 HEAD의 비프로덕션 branch push와 Preview 최종 검증 | 사용자 “승인” |
| 2026-07-23 | 승인됨 | 루트 tsconfig Node 타입 수정·검증·Preview 재배포 | 사용자 “승인” |

범위나 완료조건이 바뀌면 구현을 중단하고 이 표와 관련 항목을 갱신한 뒤 재승인받는다.

## 7. 진행·인계

- 마지막으로 끝낸 단계: 전체 44파일 375테스트, 집중 9파일 173테스트, 타입·drift·lint·build, 개발 DB migration·두 smoke, Production 생성·SHA와 static selector 경계를 확인했다.
- 현재 작업 중인 단계: 없음. 수정 Preview build가 성공했다.
- 다음 행동: 사용자가 최신 branch alias에서 지정 `friend/initiate/decline` manual AI 생성을 1회 실행한다. 완료 보고 뒤 `2026-07-23T09:29:11Z` 이후 metadata 행을 조회한다.
- 보류 사유와 재개 조건: Vercel Authentication 보호로 자동 요청은 불가능하다. 사용자 로그인 생성 완료 시 재개한다.

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-23 | T31 착수 | 직접 의존 T23·T29·T30·T34 완료 |
| 2026-07-23 | PM 단독 실행 | 하나의 통합 상태를 순차 검증하며 독립 writer·비중첩 산출물이 없음 |
| 2026-07-23 | Preview 기준선 확인 | 최신 Preview는 `c13f209…`, 현재 통합 SHA는 `b9d6b25…`로 다름 |
| 2026-07-23 | 내부·개발 DB gate 통과 | 44파일 375테스트, 집중 9파일 173테스트, 타입·drift·lint·build, migration·두 smoke 통과 |
| 2026-07-23 | Production 보조 확인 | 실제 생성은 HTTP 200·AI tone 1/2/3. 로컬 개발 DB의 새 행은 0건이라 Production DB 분리와 기록 실패를 구분할 수 없음 |
| 2026-07-23 | AC-6에서 보류 | 같은 SHA Preview가 없고 승인 없는 branch push·배포는 수행하지 않음 |
| 2026-07-23 | AC-6 재개 | 사용자가 `codex/t31-preview-check` 비프로덕션 branch push를 승인 |
| 2026-07-23 | 임시 branch push 완료 | 원격 branch는 `b9d6b25…`를 가리키지만 새 Preview deployment·Vercel status는 생성되지 않음 |
| 2026-07-23 | AC-6 재보류 | 동일 SHA 중복 배포 생략. 빈 배포 트리거 커밋 또는 로그인된 Vercel 재배포 필요 |
| 2026-07-23 | 빈 trigger commit 승인·push | `76bcea5 chore: Preview 검증 트리거`; 부모와 tree SHA `ea335bc…`가 같아 제품 파일 변경 0건 |
| 2026-07-23 | Preview build 성공 | Vercel status success(2026-07-23T06:58:05Z), branch alias 확인 |
| 2026-07-23 | 보호 gate에서 보류 | Preview가 Vercel SSO로 302. bypass 환경변수·Browser backend가 없어 사용자 로그인 실행 필요 |
| 2026-07-23 | Preview 생성 UI 통과 | 사용자가 지정한 `friend/initiate/decline` manual AI 세 후보 생성을 완료했다고 보고 |
| 2026-07-23 | `waitUntil()` 행 미관찰 | `2026-07-23T07:00:36Z` 이후 조건 행과 전체 `generation_runs`가 모두 0건. AC-6 보완 필요 |
| 2026-07-23 | 재배포 빌드 결함 확인 | `api/generate.ts`·`api/interaction.ts`의 `process`가 TS2591. `@types/node`·API 전용 config는 있으나 Vercel이 읽는 root config에는 Node 타입이 없음 |
| 2026-07-23 | Node 타입 최소 수정 | 루트 `tsconfig.json`에 `types: ["node"]` 추가. 전체 44파일 375테스트·API 타입·lint·build 통과 |
| 2026-07-23 | 수정 Preview 배포 성공 | `4d44c40 fix: Vercel API Node 타입 인식`, `tsconfig.json` 1파일만 포함. Vercel status success(2026-07-23T09:25:26Z) |
