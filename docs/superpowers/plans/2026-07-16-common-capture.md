# 공통 캡처 계약 및 서버 저장 경계 구현 계획

> **실행 지침:** 이 계획은 `superpowers:executing-plans` 절차가 아니라 현재 세션에서 테스트 주도로 순차 실행한다.

**목표:** 웹·확장 프로그램·모바일 공유 진입점이 동일하게 호출할 수 있는 공통 캡처 계약을 만들고, 인증·URL 검증·정규화·사용자별 중복 처리를 서버 경계에서 수행한다.

**구조:** 브라우저는 세션 액세스 토큰과 공통 계약만 서버에 전달한다. Express 서버는 토큰으로 사용자를 확인하고, 동일 토큰을 사용하는 Supabase 클라이언트로 RLS를 유지한 채 저장한다. 이미 저장된 URL은 충돌 오류 대신 기존 인사이트를 반환한다. 웹 화면은 이 계약을 사용하는 브라우저 어댑터로 전환한다.

**기술:** TypeScript, Express, Vitest, React, Supabase JavaScript 클라이언트, SQL 마이그레이션

---

## 1. 캡처 도메인 계약과 서버 처리기

**파일:**

- 추가: `src/entities/insight/model/insight_capture.ts`
- 추가: `server/insight_capture_service.ts`
- 추가: `server/insight_capture_service.test.ts`
- 수정: `server/app.ts`
- 수정: `server/app.test.ts`
- 수정: `server/index.ts`

1. 실패하는 서버 테스트로 정상 저장, 중복 재저장, 인증 거부, 잘못된 URL 응답을 정의한다.
2. `url`, 선택 `title`, `source`를 받는 공통 요청·응답 타입과 저장 서비스 인터페이스를 만든다.
3. 서버에서 HTTP/HTTPS 검증과 기존 URL 정규화를 수행한다. 클라이언트가 보낸 사용자 식별자는 신뢰하지 않는다.
4. 세션 토큰으로 사용자를 확인하고, 사용자 토큰 기반 Supabase 쿼리로 RLS를 보존한다.
5. 유니크 충돌 시 기존 레코드를 반환하여 `created: false` 성공으로 처리한다.

## 2. 캡처 데이터 제약과 모델 반영

**파일:**

- 추가: `supabase/migrations/20260716000000_add_capture_contract.sql`
- 수정: `supabase/tests/database/insights_rls.test.sql`
- 수정: `src/entities/insight/model/insight.ts`
- 수정: `src/entities/insight/model/parse_insight.ts`
- 수정: `src/entities/insight/api/supabase_insight_repository.ts`
- 관련 단위 테스트 수정

1. 실패하는 파서·저장소 테스트로 `title_origin` 필수성과 신규 열 매핑을 명시한다.
2. `title_origin` 및 URL·도메인·제목·메모·카테고리 길이 제약을 추가하는 additive 마이그레이션을 작성한다.
3. 인사이트 모델·파서·Supabase 행 변환에 제목 출처를 반영한다.
4. 신규 인사이트의 기본 제목 출처를 캡처 제목이면 `capture`, 없으면 `fallback`으로 설정한다.

## 3. 웹 저장 화면의 공통 계약 전환

**파일:**

- 추가: `src/entities/insight/api/browser_insight_capture_service.ts`
- 추가: `src/entities/insight/api/browser_insight_capture_service.test.ts`
- 수정: `src/features/insight-workspace/model/use_insight_workspace.ts`
- 수정: `src/features/insight-workspace/model/use_insight_workspace.test.tsx`
- 수정: `src/app/authenticated_workspace.tsx`
- 수정: `src/app/authenticated_workspace.test.tsx`

1. 브라우저 어댑터 테스트를 먼저 작성해 세션 없음, 서버 성공, 서버 오류를 검증한다.
2. 현재 로그인 세션의 액세스 토큰으로 `/api/insights/capture`를 호출하는 어댑터를 구현한다.
3. 저장 훅은 직접 UUID를 만들고 DB에 쓰지 않고 캡처 서비스를 호출하도록 바꾼다.
4. 중복 캡처는 오류가 아니라 기존 인사이트를 포함한 `저장됨` 완료 상태가 되는지 UI 테스트를 갱신한다.
5. 기존 수정·삭제 저장소 경로는 변경하지 않는다.

## 4. 검증과 원격 데이터베이스 반영

**파일:** 작업 중 변경된 파일 전체

1. 각 작업 단위마다 해당 Vitest 테스트가 먼저 실패하고 구현 후 통과하는지 확인한다.
2. 전체 `npm test`, `npm run build`, SQL 테스트 또는 Supabase 검증 명령을 실행한다.
3. 연결된 Supabase 프로젝트의 마이그레이션 상태를 확인하고 additive 마이그레이션을 안전하게 반영한다.
4. 이슈 #38의 정상·중복·권한·잘못된 URL 기준을 대조하고, 다음 순서인 #37에서 필요한 모바일 셸·인증 요구사항을 사용자에게 전달한다.
