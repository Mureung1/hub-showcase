# Implementation Plan: 서바이벌 스터디 웹 (Survival Study Web)

## Overview

이 계획은 Next.js App Router Web_Layer를 authoritative core contract와 분리해 구현한다. 초기 작업은 UI shell과 결정적 `MockAdapter`를 사용하여 core와 병렬로 진행하고, 실제 core 함수가 준비된 기능만 `RealCoreAdapter`에 capability 단위로 연결한다. 모든 도메인 쓰기는 Server Action 또는 검증된 Route Handler에서 adapter를 거치며, Web 작업은 DB schema, 트랜잭션 도메인 로직, 정산 계산, RLS, migration, 원격 DB를 변경하지 않는다.

`*`가 붙은 하위 작업은 선택 테스트 작업이다. 구현 작업은 모두 TypeScript/TSX를 사용한다.

## Tasks

- [ ] 1. 공유 Web 도구와 App Router 컴파일 경계를 설정한다
  - `package.json`, `package-lock.json`, `tsconfig.json`, `.env.example`의 단일 Web 소유권 변경을 완료하고 이후 작업에서 해당 파일을 변경하지 않게 한다.
  - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [ ] 1.1 Next.js Web 의존성과 단일 lockfile 변경을 적용한다
    - `package.json`에 Next.js/React, 폼·스키마 검증, 컴포넌트 테스트, 접근성 검사에 필요한 고정 버전 의존성과 `build`, `lint`, `test:web` 단발 실행 스크립트를 추가하고 `package-lock.json`을 한 번 갱신한다.
    - 현재 core의 Drizzle, Vitest, fast-check, Supabase 의존성과 스크립트를 보존한다.
    - _Requirements: 18.2, 18.8, 19.1, 19.8_

  - [ ] 1.2 TypeScript와 환경변수 경계를 확장한다
    - `tsconfig.json`이 App Router TSX/DOM을 포함하면서 기존 `src/db`, `tests`, `drizzle.config.ts` 컴파일 범위를 보존하도록 확장하고 필요하면 `tsconfig.web.json`을 추가한다.
    - `.env.example`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CORE_ADAPTER_MODE`, Payment Provider 키 이름, webhook secret, `CRON_SECRET`, evidence 허용 형식/크기 키를 값 없이 추가한다.
    - _Requirements: 12.8, 12.9, 13.8, 14.5, 16.1, 18.3, 18.4_

  - [ ] 1.3 서버/클라이언트 환경 파서를 구현한다
    - `src/web/config/server-env.ts`, `src/web/config/client-env.ts`, `src/web/config/adapter-mode.ts`를 만들고 server-only secret과 공개 변수를 타입 수준에서 분리한다.
    - production의 `mock|hybrid` mode, 누락된 Cron secret, 활성화된 checkout의 Provider 구성 누락을 startup/config 결과로 거부한다.
    - _Requirements: 12.8, 12.9, 13.8, 14.5, 16.1_

- [ ] 2. CoreAdapter 계약과 결정적 MockAdapter를 구현한다
  - `src/web/adapters/core/**`와 `src/web/dto/**`에 UI가 core 완료 여부와 독립적으로 컴파일되는 경계를 만든다.
  - _Requirements: 3.1, 3.3, 4.1, 5.4, 6.2, 7.1, 8.5, 9.1, 10.1, 11.1, 13.1, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

  - [ ] 2.1 CoreAdapter, DTO, AdapterResult 타입을 작성한다
    - `src/web/adapters/core/core-adapter.ts`, `src/web/adapters/core/types.ts`, `src/web/dto/{challenge,study,payment,wallet,profile,cron}.ts`에 design의 전체 메서드, `AdapterContext`, DTO, core/adapter 오류 구분을 구현한다.
    - core `DomainError` union을 그대로 재현하고 `NOT_IMPLEMENTED`를 adapter-only code로 분리하며 DTO가 Drizzle row type을 import하지 않게 한다.
    - _Requirements: 14.1, 14.2, 14.7, 15.4, 15.5, 18.1_

  - [ ] 2.2 DomainError와 ActionState 매퍼를 구현한다
    - `src/web/errors/domain-error-map.ts`, `src/web/errors/action-state.ts`, `src/web/errors/trace.ts`에 필드 오류, 복구 링크, retry 가능성, HTTP status, trace ID 매핑을 exhaustively 구현한다.
    - 내부 stack/SQL/provider 세부사항이 직렬화된 결과에 포함되지 않게 한다.
    - _Requirements: 2.2, 2.4, 4.3, 4.5, 4.6, 5.6, 6.4, 6.5, 6.6, 8.7, 8.8, 8.9, 15.3, 15.4, 15.5, 15.6, 15.8, 16.6_

  - [ ] 2.3 MockAdapter와 capability registry를 작성한다
    - `src/web/adapters/core/mock-adapter.ts`, `fixtures/*.ts`, `capabilities.ts`, `registry.ts`에 frozen fixture와 capability별 `mock|real|unavailable` 선택을 구현한다.
    - mock 결과에 식별 가능한 source를 추가하고 Auth/Storage/payment/DB import 및 실제 지갑·참가·인증·정산 쓰기를 차단한다.
    - _Requirements: 14.4, 14.5, 14.6, 14.8, 19.1, 19.3_

  - [ ]* 2.4 Adapter 계약과 Mock 격리 테스트를 작성한다
    - `tests/web/adapters/{core-contract,mock-adapter,domain-error-map}.test.ts`에서 모든 메서드의 결정성, exhaustive error mapping, mock 표식, production 거부, DB/네트워크 비호출을 검증한다.
    - _Requirements: 14.4, 14.5, 14.6, 14.7, 14.8, 19.3_

- [ ] 3. App Router shell과 공통 상태 컴포넌트를 구현한다
  - `src/app/**`와 `src/web/components/**`에 route map의 공통 레이아웃과 Server/Client 경계를 만든다.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 15.1, 15.7, 15.8, 17.1, 17.2, 17.3, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10_

  - [ ] 3.1 Root layout, navigation, public/protected route groups를 작성한다
    - `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(public)/layout.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(protected)/layout.tsx`, `src/web/components/server/site-header.tsx`를 구현한다.
    - 세션 DTO에 따라 인증/비인증 링크를 표시하고 `/`를 `/challenges`로 redirect한다.
    - _Requirements: 1.1, 1.2, 1.3, 2.6_

  - [ ] 3.2 loading/error/empty/not-found UI를 작성한다
    - `src/app/loading.tsx`, `src/app/not-found.tsx`, `src/app/global-error.tsx`, route segment별 `loading.tsx`/`error.tsx`, `src/web/components/{loading,empty,error}-state.tsx`를 구현한다.
    - retry, `/challenges` 복귀, live status, trace-safe 메시지를 제공한다.
    - _Requirements: 1.4, 1.5, 3.2, 3.5, 10.3, 10.4, 15.5, 15.8_

  - [ ] 3.3 접근 가능한 반응형 UI primitives를 작성한다
    - `src/web/components/client/{submit-button,dialog,live-status}.tsx`와 공통 form/card/list 스타일을 구현한다.
    - 320px, 200% zoom, reduced motion, keyboard focus, dialog focus restore, non-color status를 CSS와 컴포넌트 계약에 반영한다.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10_

  - [ ]* 3.4 App shell 접근성/상태 테스트를 작성한다
    - `tests/web/app/shell.test.tsx`, `tests/web/accessibility/primitives.test.tsx`에서 내비게이션, loading/error/not-found, keyboard focus, labels, live region을 검사한다.
    - _Requirements: 1.1, 1.4, 1.5, 17.1, 17.2, 17.3, 17.4, 17.10, 19.8_

- [ ] 4. Supabase Auth clients, middleware, 계정 UX를 구현한다
  - `src/web/lib/supabase/**`, `middleware.ts`, auth routes/actions를 구현하고 모든 보호 action에서 세션을 재검증한다.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 16.1, 16.2_

  - [ ] 4.1 Browser/Server/Middleware Supabase client factory를 작성한다
    - `src/web/lib/supabase/browser.ts`, `server.ts`, `middleware-client.ts`, `src/web/auth/session.ts`를 만들고 공개 키와 server cookie context를 분리한다.
    - `requireSession()`이 `AdapterContext.sessionUserId`를 만들고 브라우저 userId를 받지 않게 한다.
    - _Requirements: 2.3, 2.6, 2.8, 14.2, 16.1, 16.2_

  - [ ] 4.2 보호 경로 middleware와 안전한 returnTo를 구현한다
    - `middleware.ts`, `src/web/auth/return-to.ts`에 세션 cookie 갱신, 보호 matcher, 상대 same-origin 복귀 경로 검증, 로그인 redirect를 구현한다.
    - Payment/Cron API는 redirect matcher에서 제외하고 각 handler 검증에 맡긴다.
    - _Requirements: 2.6, 2.7, 16.3_

  - [ ] 4.3 가입·로그인·로그아웃 route와 action을 작성한다
    - `src/app/(auth)/sign-up/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/web/actions/auth-actions.ts`, 관련 Client form을 구현한다.
    - 중복 이메일 field error, 인증 실패 유지, callback session, 원래 경로 복귀, logout 후 `/challenges` 이동을 구현한다.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 15.1, 15.3, 15.7_

  - [ ]* 4.4 Auth와 middleware 테스트를 작성한다
    - `tests/web/auth/{clients,middleware,actions,return-to}.test.ts`에서 가입/로그인/로그아웃, cookie 전달, unsafe returnTo 거부, 보호 경로 복귀, action의 `UNAUTHENTICATED`를 Supabase 대역으로 검증한다.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 19.2, 19.3_

- [ ] 5. 공개 챌린지 탐색과 상세 UI를 MockAdapter로 구현한다
  - 공개 Server Components와 CTA Client island를 작성하며 실제 core read 연결은 Task 13에서 수행한다.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.5, 4.6, 6.1, 6.6_

  - [ ] 5.1 챌린지 목록 route와 카드 컴포넌트를 작성한다
    - `src/app/(public)/challenges/page.tsx`, `loading.tsx`, `error.tsx`, `src/web/components/server/{challenge-list,challenge-card}.tsx`를 구현한다.
    - Official/User 구분, 기간, 비용, 요구 시간, 모집 상태, empty/retry를 fixture로 렌더링한다.
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [ ] 5.2 챌린지 상세 route와 종류별 참가 CTA를 작성한다
    - `src/app/(public)/challenges/[challengeId]/page.tsx`, `not-found.tsx`, `src/web/components/server/challenge-detail.tsx`와 CTA island를 구현한다.
    - 모집 마감 시 컨트롤을 비활성화하고 공식 결제/Point 참가의 오류 복구 링크를 분기한다.
    - _Requirements: 3.3, 3.4, 4.5, 4.6, 6.1, 6.6_

  - [ ]* 5.3 공개 탐색 화면 테스트를 작성한다
    - `tests/web/challenges/discovery.test.tsx`에서 list/detail/loading/empty/error/closed/not-found fixture를 검증한다.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 19.1_

- [ ] 6. User_Challenge 개설과 Point 참가 UX를 구현한다
  - 입력 검증과 server-session adapter 호출을 구현하고 실제 core 연결은 capability 준비 후 Task 13에서 수행한다.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 15.1, 15.2, 15.3, 15.4, 15.6, 15.7_

  - [ ] 6.1 User_Challenge 생성 form schema와 route/action을 작성한다
    - `src/app/(protected)/challenges/new/page.tsx`, `src/web/components/client/create-challenge-form.tsx`, `src/web/validation/challenge.ts`, `src/web/actions/challenge-actions.ts`에 생성 흐름을 구현한다.
    - 필수/범위 오류, core field error, no-cash-field, 성공 상세 redirect를 구현한다.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 15.3_

  - [ ] 6.2 Point 참가 action과 상태 UI를 작성한다
    - `joinUserChallengeAction`과 `src/web/components/client/join-user-challenge-button.tsx`에 wallet 표시, pending 방지, 성공 study 링크, 부족/중복/마감 복구 UI를 구현한다.
    - client payload에는 challenge ID만 포함하고 user ID/잔액은 포함하지 않는다.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 14.2, 15.1, 15.2, 15.4, 15.7, 16.2_

  - [ ]* 6.3 생성·Point 참가 action/component 테스트를 작성한다
    - `tests/web/challenges/{create,join-user}.test.tsx`에서 field validation, session injection, pending, cache revalidation, 성공/error mapping을 MockAdapter로 검증한다.
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.2, 6.3, 6.4, 6.5, 6.6, 19.3_

- [ ] 7. 공식 챌린지 checkout UX와 provider-neutral PaymentAdapter를 구현한다
  - checkout quote/redirect/return UI와 provider transport 경계를 작성하고 domain payment 처리는 Task 13 real adapter가 core 준비 후 연결한다.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 12.1, 12.8, 12.9, 16.1_

  - [ ] 7.1 PaymentAdapter와 server-only provider registry를 작성한다
    - `src/web/adapters/payment/payment-adapter.ts`, `types.ts`, `registry.ts`, `unconfigured-adapter.ts`에 checkout 생성과 raw webhook 검증/정규화 계약을 구현한다.
    - provider secret은 server-only registry에서만 읽고 실제 provider가 없으면 production checkout을 구성 오류로 비활성화한다.
    - _Requirements: 12.1, 12.8, 12.9, 16.1_

  - [ ] 7.2 공식 checkout action과 button을 작성한다
    - `startOfficialCheckoutAction`과 `src/web/components/client/official-checkout-button.tsx`에 quote, Point 할인 표시, session 생성, provider redirect, pending 중복 방지를 구현한다.
    - session 실패는 참가 성공으로 표시하지 않고 입력을 유지해 재시도할 수 있게 한다.
    - _Requirements: 4.1, 4.2, 4.3, 4.7, 4.8, 15.1, 15.6, 15.7_

  - [ ] 7.3 결제 return status page를 작성한다
    - `src/app/(protected)/challenges/[challengeId]/payment/return/page.tsx`에서 query status를 신뢰하지 않고 `CoreAdapter.getPaymentReturnStatus`로 결제/참가 상태를 읽는다.
    - 중복 참가, 모집 마감, 진행 화면 링크를 상태별로 렌더링한다.
    - _Requirements: 4.4, 4.5, 4.6, 16.2_

  - [ ]* 7.4 checkout adapter/UI 테스트를 작성한다
    - `tests/web/payments/{adapter,checkout,return}.test.tsx`에서 미구성, quote, 할인, redirect, duplicate-submit, failure, server-read return을 provider/core 대역으로 검증한다.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 12.1, 12.8, 12.9_

- [ ] 8. Daily_Goal과 Study_Timer workspace를 구현한다
  - 타이머 로컬 상태와 authoritative 누적 시간을 분리하고 실제 core 기록 연결은 Task 13에서 수행한다.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 15.1, 15.2, 15.6, 15.7_

  - [ ] 8.1 Study workspace route와 Daily_Goal action/form을 작성한다
    - `src/app/(protected)/study/[participationId]/page.tsx`, `src/web/components/client/daily-goal-form.tsx`, `src/web/actions/study-actions.ts`에 날짜별 목표 제출과 진행률 렌더링을 구현한다.
    - participant 관계 검증은 CoreAdapter에 위임하고 action identity는 session에서 주입한다.
    - _Requirements: 7.1, 7.6, 16.2_

  - [ ] 8.2 단조 clock 기반 StudyTimer를 작성한다
    - `src/web/components/client/study-timer.tsx`, `src/web/study/clock.ts`, `src/web/study/timer-state.ts`에 `performance.now()` 기반 경과 표시, start/stop, 양의 seconds 1회 제출, pending 상태를 구현한다.
    - 새로고침/절전 복귀 후 서버 확정 누적과 미확정 로컬 세션을 구분하고 실패 duration/clientSessionId를 재시도까지 보존한다.
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 15.6, 15.7_

  - [ ]* 8.3 Goal/Timer 테스트를 작성한다
    - `tests/web/study/{goal,timer}.test.tsx`에서 fake monotonic clock, stop 1회 호출, 실패 보존/재시도, sleep/refresh 표시, 요구 시간 미달 상태를 검증한다.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 9. Evidence Storage 업로드와 생존 인증 UX를 구현한다
  - canonical four-segment key, signed upload/view, retrospective 보존, verification action을 구현한다.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 16.2, 16.5, 16.6, 16.7_

  - [ ] 9.1 Evidence validator와 canonical path builder를 작성한다
    - `src/web/storage/{evidence-path,evidence-validation}.ts`에 `{userId}/{challengeId}/{YYYY-MM-DD}/{fileId}` builder/parser와 MIME/byte validation을 구현한다.
    - UUID file ID를 서버에서 생성하고 원본 filename/path separator를 object key에 사용하지 않는다.
    - _Requirements: 8.1, 8.2, 16.7_

  - [ ] 9.2 Signed upload/view action과 EvidenceUploader를 작성한다
    - `src/web/actions/study-actions.ts`의 `createEvidenceUploadAction`/`createEvidenceViewAction`, `src/web/components/client/evidence-uploader.tsx`를 구현해 `authorizeEvidenceUpload`가 반환한 authoritative owner/challenge/date로 private `evidence` bucket의 짧은 수명 signed target/URL을 만든다.
    - 진행률, 제출 비활성화, 실패 재시도, retrospective 보존을 구현하며 Web 코드에서 Storage policy를 수정하지 않는다.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 16.5, 16.6, 16.7_

  - [ ] 9.3 VerificationForm과 인증 상태 매핑을 작성한다
    - `src/web/components/client/verification-form.tsx`, `submitVerificationAction`, 날짜별 status component에 retrospective/evidence path 제출과 완료 시각을 구현한다.
    - 학습 미달, deadline, not-alive 오류에 timer/status/recovery action을 연결한다.
    - _Requirements: 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 15.2, 15.4_

  - [ ]* 9.4 Storage/Verification 테스트를 작성한다
    - `tests/web/storage/evidence.test.ts`, `tests/web/study/verification.test.tsx`에서 file validation, path segments, server UUID, signed flow, upload failure recovery, core error mapping을 Storage/Core 대역으로 검증한다.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 16.5, 16.7, 19.4_

- [ ] 10. Realtime 진행 현황, Leaderboard, Surprise_Mission UI를 구현한다
  - Realtime payload를 invalidation signal로만 사용하고 server read model을 재조회한다.
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 11.4, 11.5_

  - [ ] 10.1 진행 현황과 Leaderboard Server Components를 작성한다
    - study page progress section, `src/app/(protected)/study/[participationId]/leaderboard/page.tsx`, `src/web/components/server/{progress,leaderboard}.tsx`를 구현한다.
    - survival, streak, remaining period, alive count, rank/display name/status를 DTO에서 렌더링한다.
    - _Requirements: 9.1, 9.2_

  - [ ] 10.2 Realtime subscription/refresh island를 작성한다
    - `src/web/realtime/channel.ts`, `src/web/components/client/{leaderboard-realtime,mission-realtime}.tsx`에 challenge-scoped 구독, debounce server refresh, last refresh, reconnect/offline, cleanup을 구현한다.
    - Realtime 불가 시 같은 read model을 갱신하는 manual refresh를 제공하고 mission 없음이 핵심 인증 UI를 제거하지 않게 한다.
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7, 11.4, 11.5_

  - [ ]* 10.3 Realtime lifecycle 테스트를 작성한다
    - `tests/web/realtime/subscription.test.tsx`에서 subscribe, payload 후 authoritative refresh, debounce, reconnect, manual refresh, unmount unsubscribe를 대역으로 검증한다.
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7, 11.4, 19.5_

- [ ] 11. Wallet, Ledger, Badge, Learning_Report 화면을 구현한다
  - 읽기 전용 Server Components를 작성하고 브라우저 직접 쓰기 컨트롤을 만들지 않는다.
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3_

  - [ ] 11.1 Wallet/Ledger route와 읽기 컴포넌트를 작성한다
    - `src/app/(protected)/wallet/page.tsx`, `src/web/components/server/{wallet-balance,ledger-list}.tsx`에 balance, direction, reason, time, cursor page, empty/retry 상태를 구현한다.
    - wallet/ledger mutation action이나 browser direct-write control을 export하지 않는다.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 11.2 Profile badge와 report route를 작성한다
    - `src/app/(protected)/profile/page.tsx`, `src/app/(protected)/study/[participationId]/report/page.tsx`, badge/report Server Components를 구현한다.
    - badge challenge/awarded time, report content, report pending을 렌더링한다.
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 11.3 Dashboard summary를 작성한다
    - `src/app/(protected)/dashboard/page.tsx`에 참가 챌린지, 다음 Daily_Goal/verification action, wallet/profile 링크를 read DTO로 구성한다.
    - _Requirements: 1.2, 7.1, 9.1, 10.1, 11.1_

  - [ ]* 11.4 Wallet/Profile/Report 테스트를 작성한다
    - `tests/web/account/{wallet,profile,report}.test.tsx`에서 ledger empty/error, no-write controls, badges, report present/pending을 fixture로 검증한다.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3_

- [ ] 12. Payment webhook과 Vercel Cron Route Handlers를 구현한다
  - 검증된 외부 요청만 CoreAdapter에 전달하고 `vercel.json`에 명시적 schedule을 추가한다.
  - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.9, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 16.3, 16.6, 16.8_

  - [ ] 12.1 Provider webhook Route Handler를 작성한다
    - `src/app/api/payments/webhook/[provider]/route.ts`에서 raw bytes 1회 읽기, allowed headers 전달, signature verify/normalize 후 `handlePaymentEvent` 호출을 구현한다.
    - invalid signature는 core 미호출 401, duplicate는 200, retryable failure는 5xx로 응답하고 body/secret을 로그하지 않는다.
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.9, 16.3, 16.6_

  - [ ] 12.2 Cron secret validator와 elimination handler를 작성한다
    - `src/web/cron/authorize.ts`, `src/app/api/cron/eliminations/route.ts`에 constant-time Bearer secret 검증, execution ID, run time 전달, processed count 응답을 구현한다.
    - unauthorized 요청은 CoreAdapter를 호출하지 않는다.
    - _Requirements: 13.1, 13.3, 13.4, 13.6, 13.8, 16.3, 16.8_

  - [ ] 12.3 Settlement Cron handler와 schedules를 작성한다
    - `src/app/api/cron/settlements/route.ts`에 candidate 조회, bounded settlement 호출, `ALREADY_SETTLED` idempotent success, `CONSERVATION_VIOLATED` secret-free log/5xx를 구현한다.
    - `vercel.json`에 elimination `*/10 * * * *`, settlement `5 * * * *` schedule을 추가한다.
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 16.6, 16.8_

  - [ ]* 12.4 Webhook/Cron handler 테스트를 작성한다
    - `tests/web/routes/{payment-webhook,cron-eliminations,cron-settlements}.test.ts`에서 valid/invalid signature, raw body, duplicate, transient error, valid/invalid secret, success/failure/idempotent result와 unauthorized no-call을 검증한다.
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 19.6, 19.7_

- [ ] 13. 준비된 core capability를 RealCoreAdapter에 점진적으로 연결한다
  - 각 하위 작업은 명시된 core 함수가 구현·export·typecheck된 후에만 시작하며, 미준비 capability는 non-production MockAdapter/`NOT_IMPLEMENTED` 상태를 유지한다.
  - _Requirements: 3.1, 3.3, 4.1, 4.4, 5.4, 5.5, 6.2, 6.3, 7.1, 7.4, 8.5, 8.6, 9.1, 9.2, 10.1, 10.2, 11.1, 11.2, 11.4, 13.1, 13.2, 14.1, 14.3, 14.7_

  - [ ] 13.1 공개 challenge read capability를 연결한다
    - core의 official/public-user list와 detail read functions가 준비된 후 `src/web/adapters/core/real/challenge-reads.ts`에 `listPublicChallenges`, `getChallengeDetail` DTO mapping을 구현한다.
    - 공개 User_Challenge read가 core에 없으면 해당 종류만 capability gap으로 유지하고 DB에 직접 접근하지 않는다.
    - _Requirements: 3.1, 3.3, 14.3, 14.7_

  - [ ] 13.2 User_Challenge 생성/Point 참가 capability를 연결한다
    - core `createUserChallenge`와 `joinUserChallenge`가 준비된 후 `real/challenge-writes.ts`에 session context, input mapping, result/error mapping을 구현한다.
    - _Requirements: 5.4, 5.5, 5.6, 6.2, 6.3, 6.4, 6.5, 6.6, 14.2, 14.3_

  - [ ] 13.3 Official payment domain capability를 연결한다
    - core의 quote/payment-status/`handlePaymentWebhook` 또는 동등한 signed-event 처리 capability가 준비된 후 `real/payment.ts`에 quote, return status, normalized event mapping을 구현한다.
    - transport signature/checkout은 PaymentAdapter에 남기고 참가·idempotency는 core 결과를 사용한다.
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 12.4, 12.5, 12.6, 14.3_

  - [ ] 13.4 Goal/Timer/Verification capability를 연결한다
    - core `submitDailyGoal`, `recordTimerSession`, `submitVerification`, study status read, evidence-upload authorization capability가 준비된 후 `real/study.ts`에 DTO, canonical evidence key, session/participant/date authorization, DomainError mapping을 구현한다.
    - core가 four-segment evidence key를 수락하지 않으면 연동을 중단하고 Web에서 RLS/validator를 우회하지 않는다.
    - _Requirements: 7.1, 7.4, 7.6, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 14.3, 16.2_

  - [ ] 13.5 Progress/Leaderboard/Wallet/Profile read capability를 연결한다
    - core wallet/ledger, progress/leaderboard, badge/report/mission read functions가 준비된 후 `real/{account,game}.ts`에 presentation DTO mapping을 구현한다.
    - _Requirements: 9.1, 9.2, 9.4, 10.1, 10.2, 11.1, 11.2, 11.3, 11.4, 14.3_

  - [ ] 13.6 Elimination/Settlement Cron capability를 연결한다
    - core `processDailyEliminations`, settlement candidate read, `settleChallenge`가 준비된 후 `real/cron.ts`에 run time/execution ID와 result mapping을 구현한다.
    - candidate read가 없으면 settlement Cron capability를 unavailable로 유지하고 Web에서 DB query를 작성하지 않는다.
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 13.6, 14.3_

  - [ ]* 13.7 RealCoreAdapter compile/contract tests를 작성한다
    - `tests/web/adapters/real-core-adapter.test.ts`에 fake typed core ports를 주입하여 각 준비 capability의 input/output/error exhaustiveness와 action/route의 direct core import 부재를 검증한다.
    - _Requirements: 14.1, 14.3, 14.7, 19.3_

- [ ] 14. Web 보안·접근성·통합 검증 코드를 완성한다
  - 사용자 흐름을 MockAdapter와 외부 서비스 대역으로 자동 검증하고 Web/Core 책임 경계 위반을 정적 검사한다.
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10, 18.1, 18.5, 18.6, 18.7, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

  - [ ]* 14.1 Web boundary와 secret redaction 검사 코드를 작성한다
    - `tests/web/architecture/boundaries.test.ts` 또는 lint rule로 `src/app/**`, Client Components, actions가 `src/db`, Drizzle schema, service-role/server env를 직접 import하지 못하게 한다.
    - 로그 serializer와 rendered action state에 Authorization/Cookie/webhook body/signed URL/evidence content가 포함되지 않는지 검사한다.
    - _Requirements: 12.9, 13.8, 14.1, 16.1, 16.4, 16.6, 18.1, 18.5, 18.6, 18.7_

  - [ ]* 14.2 핵심 사용자 흐름 browser/component 통합 테스트를 작성한다
    - `tests/web/flows/{discovery-auth-join,create-challenge,study-verification,account}.test.tsx`에 공개 탐색→login return→Point 참가, 생성, goal/timer/upload/verification, leaderboard fallback, wallet/profile/report 흐름을 fixture로 검증한다.
    - _Requirements: 3.1, 4.4, 5.5, 6.3, 7.1, 8.6, 9.7, 10.1, 11.1, 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]* 14.3 핵심 페이지 접근성·반응형 자동 테스트를 작성한다
    - `tests/web/accessibility/pages.test.tsx`에 axe, keyboard navigation, dialog focus restore, live async result, status non-color labels, 320px layout class/overflow 규칙을 검사한다.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10, 19.8_

  - [ ]* 14.4 production configuration과 route smoke tests를 작성한다
    - `tests/web/smoke/{configuration,routes}.test.ts`에서 mock/hybrid production 거부, required env, public/protected route map, auth callback, webhook POST, authenticated Cron GET 외 사용자 도메인 GET mutation 부재를 검증한다.
    - _Requirements: 12.8, 12.9, 13.3, 13.7, 14.5, 16.1, 16.3, 16.8, 18.4_

## Notes

- Web 구현은 `src/db/**`, `drizzle/**`, `supabase/migrations/**`, RLS/Storage policy SQL을 수정하지 않는다.
- Web 작업은 원격 Supabase migration, 원격 DB reset, 원격 데이터 삭제를 실행하지 않는다. DB/RLS 변경 필요는 core contract change로 처리한다.
- `package.json`, `package-lock.json`, `tsconfig.json`, `.env.example`는 Task 1만 수정한다. 충돌 시 core 변경을 먼저 통합하고 Web 변경을 재적용한다.
- Canonical evidence object key는 `{user_id}/{challenge_id}/{YYYY-MM-DD}/{file_id}`이다. core의 3-segment 경로는 folder prefix로 해석하며, core validation/RLS가 호환되기 전에는 실제 Storage 연동을 강행하지 않는다.
- `MockAdapter`는 개발/테스트 전용이며 영속 상태를 변경하지 않는다. production은 완전한 `RealCoreAdapter` capability 검사를 통과해야 한다.
- Test subtask만 `*`로 표시했으며 구현 subtask는 필수다. Web 테스트는 core의 정산·포인트 불변식을 재구현하지 않는다.

## Task Dependency Waves

```json
{
  "waves": [
    {
      "id": 0,
      "name": "single-owner-shared-configuration",
      "tasks": ["1.1", "1.2", "1.3"],
      "dependsOn": [],
      "externalCoreDependencies": []
    },
    {
      "id": 1,
      "name": "parallel-ui-contract-foundation",
      "tasks": ["2.1", "2.2", "2.3", "3.1", "3.2", "3.3", "4.1", "4.2"],
      "dependsOn": ["wave:0"],
      "externalCoreDependencies": []
    },
    {
      "id": 2,
      "name": "mock-adapter-feature-shells",
      "tasks": ["4.3", "5.1", "5.2", "6.1", "6.2", "7.1", "7.2", "7.3", "8.1", "8.2", "9.1", "9.2", "9.3", "10.1", "10.2", "11.1", "11.2", "11.3", "12.1", "12.2", "12.3"],
      "dependsOn": ["wave:1"],
      "externalCoreDependencies": []
    },
    {
      "id": 3,
      "name": "optional-mock-and-boundary-tests",
      "tasks": ["2.4", "3.4", "4.4", "5.3", "6.3", "7.4", "8.3", "9.4", "10.3", "11.4", "12.4", "14.1", "14.2", "14.3", "14.4"],
      "dependsOn": ["wave:2"],
      "externalCoreDependencies": []
    },
    {
      "id": 4,
      "name": "real-public-read-adapter",
      "tasks": ["13.1"],
      "dependsOn": ["wave:2"],
      "externalCoreDependencies": [
        "core:listOpenOfficialChallenges",
        "core:getChallengeDetail",
        "core:publicUserChallengeReadModel"
      ]
    },
    {
      "id": 5,
      "name": "real-challenge-write-adapter",
      "tasks": ["13.2"],
      "dependsOn": ["wave:2"],
      "externalCoreDependencies": [
        "survival-study-challenge task 4.1:createUserChallenge",
        "survival-study-challenge task 4.2:joinUserChallenge"
      ]
    },
    {
      "id": 6,
      "name": "real-payment-domain-adapter",
      "tasks": ["13.3"],
      "dependsOn": ["wave:2"],
      "externalCoreDependencies": [
        "survival-study-challenge task 4.3:handlePaymentWebhook/joinOfficialChallenge",
        "core:officialCheckoutQuote",
        "core:paymentReturnStatus"
      ]
    },
    {
      "id": 7,
      "name": "real-study-adapter",
      "tasks": ["13.4"],
      "dependsOn": ["wave:2"],
      "externalCoreDependencies": [
        "survival-study-challenge task 6.1:submitDailyGoal/recordTimerSession",
        "survival-study-challenge task 6.2:submitVerification",
        "core:authorizeEvidenceUpload",
        "core:evidencePathFourSegmentAcceptance"
      ]
    },
    {
      "id": 8,
      "name": "real-read-model-adapters",
      "tasks": ["13.5"],
      "dependsOn": ["wave:2"],
      "externalCoreDependencies": [
        "survival-study-challenge task 3.1:wallet/ledger reads",
        "survival-study-challenge task 10.1:progress/leaderboard reads",
        "survival-study-challenge task 9.2:badge/report data",
        "survival-study-challenge task 10.2:mission/badge reads"
      ]
    },
    {
      "id": 9,
      "name": "real-cron-adapter",
      "tasks": ["13.6"],
      "dependsOn": ["wave:2"],
      "externalCoreDependencies": [
        "survival-study-challenge task 7.1:processDailyEliminations",
        "survival-study-challenge task 9.1:settleChallenge",
        "core:settlementCandidateRead"
      ]
    },
    {
      "id": 10,
      "name": "real-adapter-contract-verification",
      "tasks": ["13.7"],
      "dependsOn": ["wave:4", "wave:5", "wave:6", "wave:7", "wave:8", "wave:9"],
      "externalCoreDependencies": ["all-enabled-core-capabilities-typecheck"]
    }
  ]
}
```
