# Supabase 인사이트 저장 구현 계획

> **실행 규칙:** 각 작업은 실패 테스트 작성 → 최소 구현 → 테스트 통과 → 리팩터링 순서로 진행한다.

**목표:** 로그인한 사용자의 인사이트 CRUD를 Supabase와 연결하고 RLS로 사용자 데이터를 격리한다.

**구조:** `entities/insight`가 비동기 저장소 포트와 Supabase 어댑터를 소유한다. `app` 계층은 인증 사용자 ID와 브라우저 Supabase 클라이언트를 조합해 저장소를 주입한다. UI는 앱 훅의 비동기 상태만 사용한다.

**기술:** React 19, TypeScript, Supabase JS 2, PostgreSQL migration/RLS, Vitest, Testing Library

---

## 작업 1: Supabase 프로젝트 파일과 보안 스키마

**파일**

- 수정: `.gitignore`
- 생성: `supabase/config.toml`
- 생성: `supabase/migrations/<timestamp>_create_insights.sql`
- 생성: `supabase/tests/insights_rls.test.sql`

1. migration에 필요한 테이블·제약·정책을 검증하는 실패 테스트를 작성한다.
2. `insights` 테이블, 갱신 트리거, 고유 제약과 CRUD RLS를 migration에 구현한다.
3. Supabase 로컬 테스트 환경이 사용 가능하면 SQL 테스트를 실행한다.
4. 연결된 프로젝트에 migration을 적용하고 migration 목록을 확인한다.

## 작업 2: 비동기 인사이트 저장소 계약

**파일**

- 수정: `src/entities/insight/model/insight_repository.ts`
- 수정: `src/entities/insight/model/insight.ts`
- 수정: `src/entities/insight/index.ts`
- 수정: `src/entities/insight/model/local_storage_insight_repository.ts`
- 수정: `src/entities/insight/model/local_storage_insight_repository.test.ts`

1. `list/create/update/delete` 계약과 결과 타입 테스트를 작성한다.
2. 로컬 구현을 같은 비동기 CRUD 계약으로 변환해 테스트 대역과 기존 기능을 보존한다.
3. 전체 배열 덮어쓰기 호출이 남지 않았는지 검색한다.

## 작업 3: Supabase 저장소 어댑터

**파일**

- 생성: `src/entities/insight/api/supabase_insight_repository.ts`
- 생성: `src/entities/insight/api/supabase_insight_repository.test.ts`
- 수정: `src/entities/insight/index.ts`

1. 행 변환, 사용자 조건, 정상 CRUD, 중복, 권한, 원격 실패 테스트를 먼저 작성한다.
2. Supabase 쿼리를 어댑터 내부에 구현한다.
3. PostgreSQL 오류 코드를 도메인 결과로 안전하게 변환한다.

## 작업 4: 인증 사용자와 원격 저장소 조합

**파일**

- 수정: `src/app/app.tsx`
- 수정: `src/app/authenticated_workspace.tsx`
- 수정: `src/app/model/create_browser_insight_repository.ts`
- 수정: `src/app/app.test.tsx`
- 수정: `src/app/authenticated_workspace.test.tsx`

1. 로그인 사용자 ID로 원격 저장소가 생성되는 조합 테스트를 작성한다.
2. 기본 저장소를 Supabase 저장소로 교체하고 테스트 주입 경계는 유지한다.
3. 화면이나 페이지가 Supabase SDK를 직접 가져오지 않는지 확인한다.

## 작업 5: 비동기 작업 공간 상태

**파일**

- 수정: `src/app/model/use_insight_workspace.ts`
- 수정: `src/app/model/use_insight_workspace.test.tsx`
- 수정: `src/app/authenticated_workspace.tsx`
- 수정: `src/pages/save/ui/save_page.tsx`
- 수정: 관련 테스트

1. 최초 로딩, 재마운트 복원, 생성·수정·삭제 성공과 실패 테스트를 작성한다.
2. 원격 성공 후 상태 반영, 진행 중 중복 동작 방지, 실패 시 입력·기존 데이터 보존을 구현한다.
3. 기존 저장·보관함·검색 흐름 회귀 테스트를 갱신한다.

## 작업 6: 최종 검증과 추적 상태

1. `npm test`를 실행한다.
2. `npm run lint`를 실행한다.
3. `npm run build`를 실행한다.
4. `npx supabase migration list --linked`로 적용 상태를 확인한다.
5. #30 완료 기준별 근거를 정리하고 Project 상태를 검토 단계에 맞춘다.
