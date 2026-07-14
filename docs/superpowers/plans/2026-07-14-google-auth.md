# Google 로그인 구현 계획

> **For Codex:** 이 계획은 `superpowers:executing-plans`와 `superpowers:test-driven-development` 절차로 순서대로 실행한다.

**목표:** 실제 Supabase 운영 프로젝트의 Google OAuth로 로그인하고, 브라우저에 복원된 세션에 따라 개인 보관함 접근을 제어하며, 현재 세션에서 안전하게 로그아웃할 수 있게 한다.

**구조:** Supabase 공개 설정과 클라이언트 생성은 `shared`에 격리한다. OAuth 명령, 인증 이벤트 구독, 사용자 계정 UI는 `features/auth`가 소유한다. `app`은 인증 상태에 따라 랜딩·로그인·보관함을 조합하고, 기존 로컬 보관함 모델은 이번 이슈에서 변경하지 않는다.

**기술:** React 19, TypeScript, Vite, Supabase JS 2, Vitest, Testing Library

---

## 작업 1: 공개 환경 변수와 Supabase 클라이언트 경계

**파일:**

- 생성: `.env.example`
- 생성(커밋 제외): `.env.local`
- 수정: `.gitignore`
- 수정: `src/vite-env.d.ts`
- 생성: `src/shared/config/supabase_env.ts`
- 생성: `src/shared/config/supabase_env.test.ts`
- 생성: `src/shared/config/index.ts`
- 생성: `src/shared/api/supabase_client.ts`
- 생성: `src/shared/api/supabase_client.test.ts`
- 생성: `src/shared/api/index.ts`

1. URL·publishable key 누락과 잘못된 URL을 거부하고 유효한 공개 설정만 반환하는 실패 테스트를 작성한다.
2. 테스트가 실패하는지 확인한다.
3. 검증기와 지연 생성되는 단일 브라우저 클라이언트를 최소 구현한다.
4. 공개 키만 예시로 문서화하고 실제 프로젝트 값은 무시되는 `.env.local`에 둔다.
5. 관련 테스트와 타입 검사를 통과시킨다.

## 작업 2: Google OAuth와 세션 상태 모델

**파일:**

- 생성: `src/features/auth/api/auth_service.ts`
- 생성: `src/features/auth/api/auth_service.test.ts`
- 생성: `src/features/auth/model/auth_provider.tsx`
- 생성: `src/features/auth/model/auth_provider.test.tsx`
- 생성: `src/features/auth/model/auth_callback_error.ts`
- 생성: `src/features/auth/model/auth_callback_error.test.ts`
- 생성: `src/features/auth/model/auth_context.ts`
- 생성: `src/features/auth/model/auth_types.ts`
- 생성: `src/features/auth/model/use_auth.ts`
- 생성: `src/features/auth/index.ts`

1. Google 공급자와 현재 출처의 복귀 주소를 전달하는지, Supabase 오류를 호출자에게 노출하는지 테스트한다.
2. 현재 세션만 로그아웃하도록 `scope: 'local'`을 전달하는지 테스트한다.
3. `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, 갱신 이벤트가 로딩·로그인·비로그인 상태로 매핑되고 구독이 해제되는지 테스트한다.
4. 실패를 확인한 뒤 인증 서비스와 Provider를 최소 구현한다.
5. 관련 테스트와 타입 검사를 통과시킨다.

## 작업 3: 인증 화면 분기와 실패 복구 UI

**파일:**

- 수정: `src/app/app.tsx`
- 수정: `src/app/app.test.tsx`
- 수정: `src/pages/login/ui/login_page.tsx`
- 수정: `src/pages/login/ui/login_page.test.tsx`

1. 초기 세션 확인 중에는 보관함을 노출하지 않고, 비로그인 사용자는 랜딩·로그인 화면에 머물며, 로그인 사용자는 보관함에 진입하는 실패 테스트를 작성한다.
2. 로그인 버튼은 OAuth 호출만 시작하고 즉시 보관함으로 전환하지 않는지 테스트한다.
3. OAuth 시작 실패나 콜백 오류가 화면에 표시되고 같은 버튼으로 다시 시도 가능한지 테스트한다.
4. 실패를 확인한 뒤 앱 분기와 로그인 상태 UI를 최소 구현한다.
5. 관련 테스트와 타입 검사를 통과시킨다.

## 작업 4: 계정 표시와 로그아웃

**파일:**

- 생성: `src/features/auth/ui/account_menu.tsx`
- 생성: `src/features/auth/ui/account_menu.css`
- 생성: `src/features/auth/ui/account_menu.test.tsx`
- 수정: `src/app/authenticated_workspace.tsx`
- 수정: `src/app/app.tsx`

1. 로그인 사용자 정보, 계정 메뉴 열기·닫기, 로그아웃 호출과 실패 안내 테스트를 작성한다.
2. 실패를 확인한 뒤 토큰 기반의 간결한 계정 메뉴를 구현한다.
3. `AuthenticatedWorkspace`는 앱이 전달한 계정 제어 영역만 렌더링하게 해 인증 기능에 직접 의존하지 않게 한다.
4. 로그아웃 이벤트 뒤 보관함이 사라지고 로그인 전 화면으로 돌아가는지 앱 테스트로 검증한다.

## 작업 5: 통합 검증과 추적 상태 반영

1. `npm test`, `npm run lint`, `npm run build`, `npm run format:check`를 실행한다.
2. 로컬 앱에서 Google OAuth 이동, 운영 Supabase 콜백, 새로고침 세션 유지, 로그아웃을 실제로 확인한다.
3. 번들과 Git diff에 `service_role`, OAuth client secret 또는 서버 전용 값이 없는지 검사한다.
4. #29 완료 기준과 Project 상태를 검증 결과에 맞게 갱신한다.
5. `feat/29-google-auth`에만 커밋하고 원격 동명 브랜치로 푸시한 뒤 PR을 만든다.
