# Product UX Writing System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱인토스 UX 라이팅 원칙을 아맞다의 도메인에 맞게 적용해 웹, Android 공유, Chrome 확장과 접근성 문구를 하나의 일관된 제품 목소리로 전환한다.

**Architecture:** 문구는 현재 소유한 page, feature, entity, app 또는 확장 파일에 그대로 둔다. 전역 문구 사전이나 i18n 계층을 만들지 않고, 사용자에게 직접 전달되는 오류만 기존 매핑 경계에서 바꾼다. 화면별 기존 테스트의 문구 기대값을 먼저 갱신하고, 마지막에 사용자 노출 파일만 검사하는 정적 UX Writing 계약 하나를 추가한다.

**Tech Stack:** React 19, TypeScript 6, Vitest, Testing Library, Chrome Extension Manifest V3, Capacitor 8, Markdown, GitHub Wiki

---

## 실행 전 확인

- 작업 이슈: [#87](https://github.com/ppre1ude/hub/issues/87)
- 현재 작업 브랜치: `docs/87-ux-writing-system`
- 구현 시작 전 변경할 브랜치 이름: `feat/87-ux-writing-system`
- 작업 트리: `C:\hub\.worktrees\issue-87`
- 승인 설계: `docs/superpowers/specs/2026-07-28-product-ux-writing-system-design.md`
- 외부 기준: [앱인토스 UX 라이팅 가이드](https://developers-apps-in-toss.toss.im/design/ux-writing.html)
- 기준선: 134개 test files, 874개 tests 통과
- 비목표: 기능 정책, API, 데이터, 레이아웃, 시각적 타이포그래피, i18n 계층 변경

구현을 시작할 때 아직 원격에 push하지 않은 현재 브랜치를 제품 변경 범위에 맞게 이름만 바꾼다.

```powershell
git branch -m feat/87-ux-writing-system
git status --short --branch
```

Expected: `feat/87-ux-writing-system`이며 `origin/main`보다 설계·계획 커밋만 앞선 깨끗한 상태.

테스트와 build를 실행하는 PowerShell 프로세스에는 기존 로컬 공개 설정을 값 출력 없이 주입한다.

```powershell
$envFile = 'C:\hub\.env.local'
Get-Content -Encoding UTF8 -LiteralPath $envFile |
  Where-Object { $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*\s*=' } |
  ForEach-Object {
    $parts = $_ -split '=', 2
    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
```

## 공통 구현 규칙

- 완전한 사용자 문장은 해요체와 마침표를 사용한다.
- 버튼, 필드 라벨, 내비게이션, 짧은 제목에는 마침표를 쓰지 않는다.
- 저장된 대상은 `인사이트`, 대화 속 주소는 `링크`, 입력·검증 대상은 `URL`로 쓴다.
- `원문 URL`, `링크 URL`, 같은 사용자 개념을 가리키는 `분류`는 사용하지 않는다.
- `계속`, `완료`, `확인`은 누른 뒤 결과가 드러나는 행동 문구로 바꾼다.
- 일반 닫기 행동은 `닫기`, 실제 작업 중단은 `Notion 연결 그만두기`처럼 대상을 밝힌다.
- 오류는 발생한 일, 보존된 내용, 다음 행동 순서로 쓴다.
- 사용자가 볼 수 없는 로그, 개발자 예외, AbortError, 코드 주석과 테스트 설명은 고치지 않는다.
- 문구 때문에 작은 넘침이 생길 때만 해당 컴포넌트의 줄바꿈 또는 최소 너비를 조정한다. 레이아웃 재설계가 필요하면 멈추고 별도 판단을 요청한다.

## 파일 구조

### 새 파일

- `docs/ux-writing.md`
  - 앞으로 새 문구에 적용할 아맞다 UX Writing 정본이다.
- `docs/ux-writing-inventory.md`
  - 2026-07-28 전환 당시의 현재 문구, 개정 문구, 판정, 근거, 구현 위치와 검증 기록이다.
- `scripts/ux_writing_contract.test.ts`
  - 사용자 노출 소스만 읽어 고신뢰 금지 패턴을 검사한다.

### 문서 수정

- `CONTEXT.md`
- `docs/development-architecture.md`
- `docs/onboarding.md`
- `docs/retrieve.md`
- `docs/android-capacitor.md`
- `docs/superpowers/specs/2026-07-28-product-ux-writing-system-design.md`

### 제품 문구 수정

- 진입·공통: `src/app`, `src/features/auth`, `src/pages/landing`, `src/pages/login`, `src/widgets/app-navigation`
- 저장 채널: `src/pages/save`, `src/features/android-share`, `src/features/pwa-install`, `src/shared/capacitor/mobile_oauth.ts`, `extension`
- 탐색·관리: `src/pages/home`, `src/pages/library`, `src/features/category-management`, `src/entities/insight/ui`
- 가져오기: `src/features/insight-import`, 사용자에게 출처 위치로 보이는 `server/insight_import/notion_candidate_extractor.ts`

## Task 1: 정본 문서와 전환 인벤토리 작성

**Files:**

- Create: `docs/ux-writing.md`
- Create: `docs/ux-writing-inventory.md`
- Modify: `CONTEXT.md`
- Modify: `docs/development-architecture.md`
- Modify: `docs/onboarding.md`
- Modify: `docs/retrieve.md`
- Modify: `docs/android-capacitor.md`
- Modify: `docs/superpowers/specs/2026-07-28-product-ux-writing-system-design.md`

- [ ] **Step 1: UX Writing 정본 작성**

`docs/ux-writing.md`에 다음 계약을 이 순서로 기록한다.

```markdown
# UX Writing

## 목적

아맞다는 사용자가 저장한 인사이트를 필요한 순간 다시 꺼내 쓰도록 돕는다. 제품 문구는 사용자가 현재 상황과 다음 행동을 바로 이해하게 한다.

## 기준 우선순위

1. 기능, 보안, 개인정보와 법적 의미
2. 아맞다 도메인 언어와 제품 원칙
3. 앱인토스 UX 라이팅 원칙
4. 화면 공간과 접근성 맥락

## 제품 목소리

- 설명, 상태, 질문과 오류는 해요체로 쓴다.
- 능동형, 긍정형, 캐주얼한 경어와 동사 중심 표현을 우선한다.
- `해 주세요`, `돼요`처럼 올바른 띄어쓰기와 준말을 사용한다.
- 완전한 문장은 마침표로 끝내고 제목, 버튼, 라벨에는 마침표를 쓰지 않는다.

## 용어

| 의미               | 표현     |
| ------------------ | -------- |
| 저장한 대상        | 인사이트 |
| 대화 속 주소       | 링크     |
| 입력·검증 대상     | URL      |
| 저장 장소          | 보관함   |
| 정리 기준          | 카테고리 |
| 외부 자료 이전     | 가져오기 |
| 현재 상황으로 발견 | 꺼내보기 |
| 단서로 직접 찾기   | 검색     |
| 가져오기 취소 복구 | 되돌리기 |

`원문 열기`는 외부 페이지를 여는 행동으로 유지할 수 있다. 주소 이름에는 `원문 URL`이나 `링크 URL`을 쓰지 않는다.

## 역할별 규칙

- 버튼은 누른 뒤 일어날 행동이나 결과를 쓴다.
- 일반 다이얼로그의 왼쪽 닫기 행동은 `닫기`로 쓴다.
- 실제 작업 중단은 `Notion 연결 그만두기`처럼 대상을 밝힌다.
- 입력 라벨은 대상을 짧게 쓰고 선택 입력은 `(선택)`으로 통일한다.
- 오류는 발생한 일, 보존된 내용, 다음 행동 순서로 쓴다.

## 상태 기본형

| 상태         | 기본형                                                                              |
| ------------ | ----------------------------------------------------------------------------------- |
| 진행         | 가져올 내용을 확인하고 있어요                                                       |
| 성공         | 인사이트 3개를 보관함에 추가했어요                                                  |
| 오류         | 가져올 내용을 확인하지 못했어요. 입력한 링크는 그대로 두었어요. 다시 시도해 주세요. |
| 초기 빈 상태 | 첫 인사이트를 저장하면 여기에서 다시 찾을 수 있어요                                 |
| 결과 없음    | 이 검색어로 찾은 인사이트가 없어요. 검색어를 줄이거나 다른 단서를 입력해 보세요.    |
| 확인         | 이 가져오기를 되돌릴까요? 이 작업에서 새로 만든 인사이트만 삭제해요.                |

## 접근성

- 보이는 문구와 접근 가능한 이름은 같은 행동과 결과를 뜻해야 한다.
- 진행과 성공은 기존 live region에서 완전한 문장으로 알린다.
- 오류는 기존 alert와 입력 설명 연결을 유지한다.
- 같은 상태를 보이는 문구와 live region에서 중복으로 읽지 않게 한다.

## 적용 범위와 제외

웹, Android 공유, Chrome 확장과 보조기술에 노출되는 문구에 적용한다. 내부 로그, 개발자 예외, 코드 주석, 테스트 설명, 픽스처, 사용자 입력과 외부 서비스 소유 문구는 제외한다.
```

- [ ] **Step 2: 전체 인벤토리 작성**

다음 명령으로 테스트·픽스처를 제외한 후보를 다시 확인한다.

```powershell
rg -n "[가-힣]" src extension server api `
  -g "*.ts" -g "*.tsx" -g "*.html" `
  -g "!*.test.*" -g "!*.spec.*" -g "!**/testing/**"
```

`docs/ux-writing-inventory.md`를 사용자 여정 순서로 작성하고 모든 후보를 `개정`, `유지`, `제외` 중 하나로 판정한다. 열은 아래처럼 고정한다.

```markdown
| 화면·상태 | 역할 | 현재 문구 | 개정 문구 | 판정 | 근거 | 구현 위치 | 검증 |
| --------- | ---- | --------- | --------- | ---- | ---- | --------- | ---- |
```

한 파일의 여러 내부 예외는 `개발자 예외` 한 행으로 묶을 수 있다. 동적 문구는 `인사이트 {count}개를 보관함에 추가했어요`처럼 완전한 문장으로 기록한다. 이후 Task 2~5의 확정 문구 표를 그대로 개정 문구 열에 사용한다.

- [ ] **Step 3: 활성 문서의 직접 충돌 교정**

다음 변경만 적용하고 역사적 계획·QA 기록은 고치지 않는다.

| 파일                        | 현재                         | 개정                              |
| --------------------------- | ---------------------------- | --------------------------------- |
| `CONTEXT.md`                | `원문 URL`                   | 문맥에 따라 `URL` 또는 `외부 URL` |
| `CONTEXT.md`                | `링크 또는 원문 URL`         | `링크 또는 URL`                   |
| `docs/onboarding.md`        | `저장, 분류, 꺼내보기`       | `저장, 카테고리, 꺼내보기`        |
| `docs/onboarding.md`        | `02 분류`                    | `02 카테고리`                     |
| `docs/onboarding.md`        | `링크 URL 입력`              | `URL 입력`                        |
| `docs/onboarding.md`        | `저장 완료 상태`             | `인사이트를 저장했어요 상태`      |
| `docs/retrieve.md`          | `원문 URL이 유효하지 않으면` | `URL이 유효하지 않으면`           |
| `docs/android-capacitor.md` | `` `저장됨` ``               | `` `인사이트를 저장했어요` ``     |
| `docs/android-capacitor.md` | `` `이미 저장됨` ``          | `` `이미 저장한 인사이트예요` ``  |

`CONTEXT.md`와 `docs/development-architecture.md`의 활성 문서 목록에는 `docs/ux-writing.md` 링크를 추가한다. 승인 설계의 문서 상태는 `설계 승인 완료`로 바꾼다.

- [ ] **Step 4: 문서 포맷과 충돌 검사**

```powershell
npx prettier --write CONTEXT.md docs/ux-writing.md docs/ux-writing-inventory.md docs/development-architecture.md docs/onboarding.md docs/retrieve.md docs/android-capacitor.md docs/superpowers/specs/2026-07-28-product-ux-writing-system-design.md
git diff --check
```

Expected: Prettier 완료, whitespace 오류 없음.

- [ ] **Step 5: 정본 문서 커밋**

```powershell
git add CONTEXT.md docs/ux-writing.md docs/ux-writing-inventory.md docs/development-architecture.md docs/onboarding.md docs/retrieve.md docs/android-capacitor.md docs/superpowers/specs/2026-07-28-product-ux-writing-system-design.md
git commit -m "docs: 제품 UX 라이팅 계약과 문구 인벤토리"
```

## Task 2: 랜딩·로그인·앱 공통 문구 전환

**Files:**

- Modify: `src/pages/landing/ui/landing_page.tsx`
- Modify: `src/pages/landing/ui/onboarding_feature_tabs.tsx`
- Modify: `src/pages/login/ui/login_page.tsx`
- Modify: `src/features/auth/model/auth_callback_error.ts`
- Modify: `src/features/auth/model/auth_provider.tsx`
- Modify: `src/features/auth/ui/account_menu.tsx`
- Modify: `src/app/app.tsx`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify only where an existing expectation changes:
  - `src/pages/landing/ui/landing_page.test.tsx`
  - `src/pages/landing/ui/onboarding_feature_tabs.test.tsx`
  - `src/pages/login/ui/login_page.test.tsx`
  - `src/features/auth/model/auth_callback_error.test.ts`
  - `src/features/auth/model/auth_provider.test.tsx`
  - `src/features/auth/ui/account_menu.test.tsx`
  - `src/app/app.test.tsx`
  - `src/app/authenticated_workspace.test.tsx`

- [ ] **Step 1: 가까운 기존 테스트의 기대 문구를 먼저 변경**

새 테스트 사례는 추가하지 않는다. 이미 제목, 버튼, alert 또는 status를 확인하는 기대값만 다음 표에 맞게 바꾼다.

| 현재 문구                                   | 개정 문구                                        |
| ------------------------------------------- | ------------------------------------------------ |
| `저장한 링크를 필요한 순간 다시 꺼내보세요` | `저장한 인사이트를 필요한 순간 다시 꺼내 보세요` |
| `서비스 경험하기`                           | `아맞다 시작하기`                                |
| `02 분류`                                   | `02 카테고리`                                    |
| `링크 URL`                                  | `URL`                                            |
| `저장 완료`                                 | `인사이트를 저장했어요`                          |
| `환영합니다!`                               | `아맞다에 오신 걸 환영해요`                      |
| `로그인하지 못했습니다`                     | `로그인하지 못했어요`                            |
| `Google 로그인 연결 중`                     | `Google에 연결하고 있어요`                       |
| `로그아웃하지 못했습니다`                   | `로그아웃하지 못했어요`                          |
| `로그아웃 처리 중`                          | `로그아웃하고 있어요`                            |
| `로그인 상태 확인 중`                       | `로그인 상태를 확인하고 있어요`                  |

- [ ] **Step 2: 변경한 기대값이 현재 제품 문구에서 실패하는지 확인**

```powershell
npm test -- src/pages/landing/ui/landing_page.test.tsx src/pages/landing/ui/onboarding_feature_tabs.test.tsx src/pages/login/ui/login_page.test.tsx src/features/auth/model/auth_callback_error.test.ts src/features/auth/model/auth_provider.test.tsx src/features/auth/ui/account_menu.test.tsx src/app/app.test.tsx src/app/authenticated_workspace.test.tsx
```

Expected: 바뀐 heading, button, status 또는 alert 문자열에서 FAIL. 동작 관련 실패는 없어야 한다.

- [ ] **Step 3: 진입과 인증 문구 변경**

아래 문구를 정확히 적용한다.

| 위치                        | 개정 문구                                                               |
| --------------------------- | ----------------------------------------------------------------------- |
| 랜딩 hero 접근 이름·제목    | `저장한 인사이트를 필요한 순간 다시 꺼내 보세요`                        |
| 랜딩 주요 행동              | `아맞다 시작하기`                                                       |
| 랜딩 기능 탭                | `01 저장`, `02 카테고리`, `03 꺼내보기`                                 |
| 랜딩 기능 설명              | `발견한 링크를 인사이트로 저장하고 필요한 순간 다시 꺼내 보세요.`       |
| 랜딩 저장 preview 라벨·상태 | `URL`, `인사이트를 저장했어요`                                          |
| 랜딩 의견 본문              | `버그와 개선 의견을 남겨 주세요. 직접 확인하고 다음 개선에 반영할게요.` |
| 로그인 제목                 | `아맞다에 오신 걸 환영해요`                                             |
| 로그인 설명                 | `로그인하면 나만의 보관함과 꺼내보기를 사용할 수 있어요.`               |
| 로그인 로딩                 | `Google에 연결하고 있어요`                                              |
| 로그인 약관                 | `로그인하면 이용약관과 개인정보처리방침에 동의해요.`                    |
| 로그인 취소 오류            | `Google 로그인을 취소했어요. 다시 시도해 주세요.`                       |
| 로그인 일반 오류            | `Google 로그인에 실패했어요. 다시 시도해 주세요.`                       |
| 로그아웃 오류               | `로그아웃하지 못했어요`                                                 |
| 로그아웃 로딩               | `로그아웃하고 있어요`                                                   |

OAuth callback의 `error_description`과 인증 SDK의 원본 `Error.message`는 사용자 문구에 덧붙이지 않는다. 오류 상세를 URL에서 제거하는 기존 정리 동작은 유지하고, 사용자에게는 아래 안전한 매핑만 전달한다.

```ts
function getActionErrorMessage(action: AuthAction) {
  return action === 'sign-in'
    ? 'Google 로그인에 실패했어요. 다시 시도해 주세요.'
    : '로그아웃하지 못했어요. 다시 시도해 주세요.';
}
```

`getActionErrorMessage` 호출부도 `action`만 전달하게 바꾼다. callback URL 정리와 인증 상태 전이는 수정하지 않는다.

- [ ] **Step 4: 앱 공통 경고와 접근성 문구 변경**

| 현재 의미             | 개정 문구                                                                         |
| --------------------- | --------------------------------------------------------------------------------- |
| 손상 카테고리 제외    | `손상된 카테고리를 제외했어요. 나머지 카테고리는 계속 사용할 수 있어요.`          |
| 보관함 읽기 실패      | `보관함을 불러오지 못했어요. 네트워크를 확인하고 새로고침해 주세요.`              |
| 손상 인사이트 제외    | `일부 손상된 인사이트를 제외하고 나머지를 불러왔어요.`                            |
| 보관함 권한 실패      | `다시 로그인한 뒤 보관함을 열어 주세요.`                                          |
| 상세 읽기 실패        | `보관함의 데이터를 확인하지 못했어요. 다시 불러와도 계속되면 문제를 알려 주세요.` |
| 저장 위치 설명        | `이 계정의 보관함에 저장해요`                                                     |
| 저장소 안내 접근 이름 | `보관함 안내`                                                                     |
| 로그인 확인 로딩      | `로그인 상태를 확인하고 있어요`                                                   |

- [ ] **Step 5: 범위 테스트 통과 확인**

Step 2와 같은 명령을 다시 실행한다.

Expected: 지정한 테스트만 모두 PASS. 가져오기, 홈, 보관함의 새 문구를 이 테스트에 추가로 검증하지 않는다.

- [ ] **Step 6: 포맷과 커밋**

```powershell
npx prettier --write "src/pages/landing/ui/*.{ts,tsx}" "src/pages/login/ui/*.{ts,tsx}" "src/features/auth/**/*.{ts,tsx}" "src/app/*.{ts,tsx}" "src/widgets/app-navigation/ui/*.{ts,tsx}"
git add src/pages/landing src/pages/login src/features/auth src/app/app.tsx src/app/authenticated_workspace.tsx src/app/app.test.tsx src/app/authenticated_workspace.test.tsx
git commit -m "feat: 진입과 앱 공통 UX 문구 체계"
```

## Task 3: 웹·Android·Chrome 저장 문구 전환

**Files:**

- Modify: `src/pages/save/ui/save_page.tsx`
- Modify: `src/features/android-share/model/android_share_session.ts`
- Modify: `src/features/android-share/model/use_android_share.ts`
- Modify: `src/features/android-share/ui/android_share_screen.tsx`
- Modify: `src/features/pwa-install/ui/pwa_install_notice.tsx`
- Modify: `src/shared/capacitor/mobile_oauth.ts`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `extension/manifest.ts`
- Modify: `extension/memo.html`
- Modify: `extension/src/background.ts`
- Modify: `extension/src/memo.ts`
- Modify only where an existing expectation changes:
  - `src/pages/save/ui/save_page.test.tsx`
  - `src/features/android-share/model/android_share_session.test.ts`
  - `src/features/android-share/model/use_android_share.test.tsx`
  - `src/features/pwa-install/ui/pwa_install_notice.test.tsx`
  - `src/shared/capacitor/mobile_oauth.test.ts`
  - `src/app/app.test.tsx`
  - `src/app/authenticated_workspace.test.tsx`
  - `src/app/authenticated_workspace_offline.test.tsx`
  - `extension/manifest.test.ts`
  - `extension/src/background.test.ts`
  - `extension/src/memo.test.ts`
  - `extension/src/memo_contract.test.ts`

- [ ] **Step 1: 저장 채널의 기존 기대값을 새 문구로 변경**

새 행동 테스트를 만들지 않는다. 현재 성공, 오류, 입력 보존, 재시도와 복귀를 검증하는 테스트의 문자열만 아래 표에 맞춘다.

| 상태              | 개정 문구                      |
| ----------------- | ------------------------------ |
| 웹 기본 제목      | `URL을 입력하면 바로 저장해요` |
| URL 라벨          | `URL`                          |
| 웹 저장 성공 제목 | `인사이트를 저장했어요`        |
| Android 저장 성공 | `인사이트를 저장했어요`        |
| Android 중복      | `이미 저장한 인사이트예요`     |
| Android 완료 행동 | `원래 앱으로 돌아가기`         |
| Chrome 저장 성공  | `인사이트를 저장했어요`        |
| Chrome 중복       | `이미 저장한 인사이트예요`     |
| Chrome 메모 성공  | `메모를 저장했어요`            |

- [ ] **Step 2: 변경한 기대값이 현재 문구에서 실패하는지 확인**

```powershell
npm test -- src/pages/save/ui/save_page.test.tsx src/features/android-share/model/android_share_session.test.ts src/features/android-share/model/use_android_share.test.tsx src/features/pwa-install/ui/pwa_install_notice.test.tsx src/shared/capacitor/mobile_oauth.test.ts src/app/app.test.tsx src/app/authenticated_workspace.test.tsx src/app/authenticated_workspace_offline.test.tsx extension/manifest.test.ts extension/src/background.test.ts extension/src/memo.test.ts extension/src/memo_contract.test.ts
```

Expected: 문구 기대값에서만 FAIL.

- [ ] **Step 3: 웹 저장과 PWA 문구 변경**

`authenticated_workspace.tsx`의 웹 저장 오류 매핑도 이 채널 범위에서 다음처럼 바꾼다.

```ts
const SAVE_ERROR_MESSAGES = {
  'invalid-url': '올바른 URL을 입력해 주세요.',
  'permission-denied':
    '저장 권한을 확인하지 못했어요. 입력한 URL은 그대로 두었어요. 다시 로그인한 뒤 시도해 주세요.',
  'unsupported-protocol': 'http 또는 https URL만 저장할 수 있어요.',
  'write-failed':
    '보관함에 저장하지 못했어요. 입력한 URL은 그대로 두었어요. 네트워크를 확인하고 다시 시도해 주세요.',
} as const;
```

| 위치                  | 개정 문구                                                                |
| --------------------- | ------------------------------------------------------------------------ |
| 웹 저장 제목          | `URL을 입력하면 바로 저장해요`                                           |
| 웹 저장 설명          | `먼저 인사이트를 저장하고 제목, 메모와 카테고리는 나중에 추가해도 돼요.` |
| URL 라벨              | `URL`                                                                    |
| 공유 제목 placeholder | `예: 다시 읽고 싶은 글`                                                  |
| URL 오류 제목         | `URL을 확인해 주세요`                                                    |
| 저장 진행 버튼        | `저장하고 있어요`                                                        |
| 저장 성공 제목        | `인사이트를 저장했어요`                                                  |
| 저장 성공 본문        | `보관함에 추가했어요. 지금 정리하지 않아도 돼요.`                        |
| 맥락 제목             | `언제 다시 쓰고 싶은가요?`                                               |
| 맥락 설명             | `필요할 때 떠올릴 제목, 메모나 카테고리를 남겨 보세요.`                  |
| 맥락 성공 제목        | `인사이트 정보를 저장했어요`                                             |
| 신규 맥락 행동        | `인사이트 정보 저장하기`                                                 |
| 수정 맥락 행동        | `변경 내용 저장하기`                                                     |
| 맥락 저장 재시도      | `인사이트 정보 다시 저장하기`                                            |
| 맥락 건너뛰기         | `지금은 건너뛰기`                                                        |
| PWA 진행              | `설치하고 있어요`                                                        |
| PWA 보조 행동         | `나중에 설치하기`                                                        |

- [ ] **Step 4: Android 공유 문구 변경**

```ts
const URL_NOT_FOUND_MESSAGE =
  '저장할 링크를 찾지 못했어요. 링크가 포함된 텍스트를 다시 공유해 주세요.';
const UNSUPPORTED_PROTOCOL_MESSAGE = 'http 또는 https 링크만 저장할 수 있어요.';
const AUTHENTICATION_FAILED_MESSAGE =
  '로그인을 완료하지 못했어요. 공유한 링크는 그대로 두었어요. 다시 시도해 주세요.';
const LOST_SHARE_AFTER_AUTH_MESSAGE =
  '로그인은 완료했지만 공유한 링크를 다시 받아야 해요. 원래 앱에서 다시 공유해 주세요.';
const CAPTURE_FAILED_MESSAGE =
  '인사이트를 저장하지 못했어요. 공유한 링크는 그대로 두었어요.';
```

| 위치           | 개정 문구                                                                      |
| -------------- | ------------------------------------------------------------------------------ |
| 로그인 진행    | `Google 로그인을 기다리고 있어요`                                              |
| 저장 진행      | `인사이트를 저장하고 있어요`                                                   |
| 입력 확인 진행 | `공유한 링크를 확인하고 있어요`                                                |
| 앱 복귀 진행   | `원래 앱으로 돌아가고 있어요`                                                  |
| 저장 성공      | `인사이트를 저장했어요`                                                        |
| 중복 성공      | `이미 저장한 인사이트예요`                                                     |
| 완료 행동      | `원래 앱으로 돌아가기`                                                         |
| 메모 오류      | `메모를 저장하지 못했어요. 입력한 메모는 그대로 두었어요. 다시 시도해 주세요.` |

- [ ] **Step 5: Chrome 확장 문구 변경**

| 위치           | 개정 문구                                                                      |
| -------------- | ------------------------------------------------------------------------------ |
| manifest 설명  | `현재 탭을 저장하고 필요할 때 메모를 남겨요.`                                  |
| 알림 성공      | `인사이트를 저장했어요`                                                        |
| 알림 중복      | `이미 저장한 인사이트예요`                                                     |
| 미지원 페이지  | `이 페이지는 저장할 수 없어요`                                                 |
| 로그인 필요    | `로그인이 필요해요`                                                            |
| 저장 실패      | `인사이트를 저장하지 못했어요`                                                 |
| memo eyebrow   | `인사이트를 저장했어요`                                                        |
| 기본 대상 제목 | `저장한 인사이트`                                                              |
| 메모 대상 오류 | `메모를 남길 인사이트를 확인하지 못했어요.`                                    |
| 빈 메모 오류   | `메모를 입력하거나 창을 닫아 주세요.`                                          |
| 메모 저장 진행 | `저장하고 있어요`                                                              |
| 메모 성공      | `메모를 저장했어요`                                                            |
| 메모 실패      | `메모를 저장하지 못했어요. 입력한 메모는 그대로 두었어요. 다시 시도해 주세요.` |
| 메모 재시도    | `메모 다시 저장하기`                                                           |
| 로그인 만료    | `로그인이 만료됐어요. 확장 아이콘에서 다시 로그인해 주세요.`                   |

개발자 예외인 `확장 메모 UI 요소가 없습니다`와 환경 설정 오류는 바꾸지 않는다.

- [ ] **Step 6: 저장 채널 테스트 통과 확인**

Step 2와 같은 명령을 다시 실행한다.

Expected: 지정 테스트 모두 PASS. 각 채널 테스트는 자기 채널 문구만 확인한다.

- [ ] **Step 7: 확장 build와 커밋**

```powershell
npm run build:extension
npx prettier --write "src/pages/save/ui/*.{ts,tsx}" "src/features/android-share/**/*.{ts,tsx}" "src/features/pwa-install/**/*.{ts,tsx}" src/shared/capacitor/mobile_oauth.ts src/app/authenticated_workspace.tsx extension/manifest.ts extension/memo.html "extension/src/*.{ts,css}"
git add src/pages/save src/features/android-share src/features/pwa-install src/shared/capacitor/mobile_oauth.ts src/shared/capacitor/mobile_oauth.test.ts src/app/authenticated_workspace.tsx src/app/app.test.tsx src/app/authenticated_workspace.test.tsx src/app/authenticated_workspace_offline.test.tsx extension
git commit -m "feat: 저장 채널 UX 문구 체계"
```

## Task 4: 홈·보관함·카테고리·인사이트 카드 문구 전환

**Files:**

- Modify: `src/app/model/workspace_seed.ts`
- Modify: `src/pages/home/ui/home_page.tsx`
- Modify: `src/pages/home/ui/retrieve_results.tsx`
- Modify: `src/pages/home/ui/retrieve_search_panel.tsx`
- Modify: `src/pages/library/ui/library_page.tsx`
- Modify: `src/features/category-management/ui/category_manager.tsx`
- Modify: `src/entities/insight/ui/insight_card.tsx`
- Modify only where an existing expectation changes:
  - `src/pages/home/ui/home_page.test.tsx`
  - `src/pages/library/ui/library_page.test.tsx`
  - `src/features/category-management/ui/category_manager.test.tsx`
  - `src/entities/insight/ui/insight_grid.test.tsx`
  - `src/app/authenticated_workspace.test.tsx`

- [ ] **Step 1: 탐색·관리 화면의 기존 기대값 변경**

기존 빈 상태, 결과 없음, 편집, 삭제와 포커스 복귀 테스트에서 문구 기대값만 변경한다. 홈 테스트에 가져오기 문구를 추가하지 않고, 보관함 테스트에 홈 문구를 추가하지 않는다.

- [ ] **Step 2: 현재 제품 문구에서 기대값 실패 확인**

```powershell
npm test -- src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx src/features/category-management/ui/category_manager.test.tsx src/entities/insight/ui/insight_grid.test.tsx src/app/authenticated_workspace.test.tsx
```

Expected: 변경한 문구 기대값에서 FAIL.

- [ ] **Step 3: 홈과 꺼내보기 문구 변경**

| 위치              | 개정 문구                                                             |
| ----------------- | --------------------------------------------------------------------- |
| 입력 라벨         | `지금 꺼내 보고 싶은 상황`                                            |
| 도움말            | `떠오르는 단어나 지금 하는 일을 짧게 적어 보세요.`                    |
| 화면 제목         | `지금 필요한 인사이트를 꺼내 보세요`                                  |
| 로딩              | `꺼내볼 인사이트를 불러오고 있어요`                                   |
| 로딩 실패 설명    | `네트워크와 로그인 상태를 확인한 뒤 다시 불러와 주세요.`              |
| 초기 빈 상태 행동 | `인사이트 저장하기`                                                   |
| 초기 빈 상태 설명 | `첫 인사이트를 저장하면 지금 상황에 맞는 자료를 다시 꺼낼 수 있어요.` |
| 결과 없음 제목    | `“{query}”로 찾은 인사이트가 없어요`                                  |
| 결과 없음 설명    | `검색어를 줄이거나 다른 상황을 입력해 보세요.`                        |

`꺼내보기`는 기능 이름일 때 붙여 쓰고, 동작을 설명하는 `꺼내 보세요`는 띄어 쓴다.

- [ ] **Step 4: 보관함 문구 변경**

| 위치                    | 개정 문구                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------- |
| 소개                    | `카테고리와 검색으로 저장한 인사이트를 빠르게 찾아 보세요.`                        |
| 가져오기 행동           | `인사이트 가져오기`                                                                |
| 검색 placeholder        | `제목, 메모, 카테고리, 도메인이나 URL 검색`                                        |
| 로딩                    | `보관함을 불러오고 있어요`                                                         |
| 오류 설명               | `네트워크와 로그인 상태를 확인한 뒤 다시 불러와 주세요.`                           |
| 초기 빈 제목            | `아직 저장한 인사이트가 없어요`                                                    |
| 초기 빈 설명            | `첫 인사이트를 저장하면 여기에서 다시 찾을 수 있어요.`                             |
| 저장 행동               | `인사이트 저장하기`                                                                |
| 검색 결과 없음 설명     | `이 검색어로 찾은 인사이트가 없어요. 검색어를 줄이거나 다른 단서를 입력해 보세요.` |
| 카테고리 결과 없음 설명 | `이 카테고리에 인사이트가 없어요. 전체 보관함을 확인해 보세요.`                    |

- [ ] **Step 5: 카테고리와 카드 확인 문구 변경**

카테고리 오류 매핑을 다음처럼 바꾼다.

```ts
const CATEGORY_ERROR_MESSAGES = {
  duplicate: '같은 이름의 카테고리가 있어요.',
  'invalid-input': '이름은 1자 이상 50자 이하로 입력해 주세요.',
  'not-found': '카테고리를 찾지 못했어요. 목록을 다시 확인해 주세요.',
  'permission-denied': '카테고리를 변경할 권한이 없어요. 다시 로그인해 주세요.',
  'write-failed':
    '카테고리를 저장하지 못했어요. 입력한 내용은 그대로 두었어요. 다시 시도해 주세요.',
} as const;
```

| 위치                  | 개정 문구                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------- |
| 카테고리 초기 빈 상태 | `아직 만든 카테고리가 없어요.`                                                               |
| 삭제 질문             | `이 카테고리를 삭제할까요?`                                                                  |
| 삭제 영향             | `연결된 인사이트는 삭제하지 않고 미분류로 옮겨요.`                                           |
| 삭제 행동             | `카테고리 삭제하기`                                                                          |
| 생성 행동             | `카테고리 만들기`                                                                            |
| 수정 행동             | `변경 내용 저장하기`                                                                         |
| 일반 취소 행동        | `닫기`                                                                                       |
| 생성 설명             | `이름과 색상을 정해 새 카테고리를 만들어요.`                                                 |
| 삭제 설명             | `삭제하기 전에 연결된 인사이트가 어디로 이동하는지 확인해 주세요.`                           |
| 수정 설명             | `이름이나 색상을 바꾸면 연결된 카드와 필터에도 반영돼요.`                                    |
| 관리 설명             | `카테고리를 만들거나 이름과 색상을 바꿀 수 있어요.`                                          |
| 카드 수정 실패        | `수정 내용을 저장하지 못했어요. 입력한 내용은 그대로 두었어요. 다시 시도하거나 닫아 주세요.` |
| 카드 수정 행동        | `변경 내용 저장하기`                                                                         |
| 카드 삭제 질문        | `“{title}” 인사이트를 삭제할까요?`                                                           |
| 카드 삭제 영향        | `삭제하면 보관함에서 사라지고 되돌릴 수 없어요.`                                             |
| 카드 삭제 실패        | `인사이트를 삭제하지 못했어요. 카드는 그대로 두었어요. 다시 시도하거나 닫아 주세요.`         |
| 카드 삭제 행동        | `인사이트 삭제하기`                                                                          |
| 카드 삭제 재시도      | `다시 삭제하기`                                                                              |
| 카드 일반 취소        | `닫기`                                                                                       |

- [ ] **Step 6: 탐색·관리 테스트 통과 확인**

Step 2와 같은 명령을 다시 실행한다.

Expected: 지정 테스트 모두 PASS. 삭제·편집 포커스와 데이터 동작은 기존과 동일.

- [ ] **Step 7: 포맷과 커밋**

```powershell
npx prettier --write src/app/model/workspace_seed.ts "src/pages/home/ui/*.{ts,tsx}" "src/pages/library/ui/*.{ts,tsx}" "src/features/category-management/ui/*.{ts,tsx}" "src/entities/insight/ui/*.{ts,tsx}"
git add src/app/model/workspace_seed.ts src/pages/home src/pages/library src/features/category-management src/entities/insight/ui src/app/authenticated_workspace.test.tsx
git commit -m "feat: 탐색과 관리 UX 문구 체계"
```

## Task 5: 가져오기 전체 흐름과 정적 문체 계약 전환

**Files:**

- Create: `scripts/ux_writing_contract.test.ts`
- Modify: `src/features/insight-import/ui/insight_import_dialog.tsx`
- Modify: `src/features/insight-import/ui/insight_import_source_selector.tsx`
- Modify: `src/features/insight-import/ui/import_field_mapping.tsx`
- Modify: `src/features/insight-import/ui/import_preview.tsx`
- Modify: `src/features/insight-import/ui/import_history.tsx`
- Modify: `src/features/insight-import/model/use_insight_import.ts`
- Modify: `src/features/insight-import/model/use_notion_import.ts`
- Verify without wording-only edits unless inventory says user-visible:
  - `src/features/insight-import/api/notion_import_api.ts`
  - `src/features/insight-import/model/*_adapter.ts`
  - `server/insight_import/notion_candidate_extractor.ts`
- Modify only where an existing expectation changes:
  - `src/features/insight-import/ui/insight_import_dialog.test.tsx`
  - `src/features/insight-import/ui/import_field_mapping.test.tsx`
  - `src/features/insight-import/model/use_insight_import.test.tsx`
  - `src/features/insight-import/model/use_notion_import.test.tsx`
  - `src/app/authenticated_workspace.test.tsx`

- [ ] **Step 1: 가져오기 테스트 기대값을 새 문구로 변경**

다음 핵심 접근 이름과 행동을 기존 테스트에서 먼저 바꾼다.

| 현재                    | 개정                                       |
| ----------------------- | ------------------------------------------ |
| `보관함 가져오기`       | `인사이트 가져오기`                        |
| `분석하기`              | `가져올 내용 확인하기`                     |
| `분석 중`               | `가져올 내용을 확인하고 있어요`            |
| `계속`                  | `가져올 내용 확인하기`                     |
| `연결 취소`             | `Notion 연결 그만두기`                     |
| `가져오기`              | `인사이트 가져오기`                        |
| `완료`                  | `보관함으로 돌아가기`                      |
| 일반 `취소`             | `닫기`                                     |
| `분류`                  | `카테고리`                                 |
| `가져오기를 완료했어요` | `인사이트 {count}개를 보관함에 추가했어요` |

- [ ] **Step 2: 현재 가져오기 문구에서 테스트 실패 확인**

```powershell
npm test -- src/features/insight-import/ui/insight_import_dialog.test.tsx src/features/insight-import/ui/import_field_mapping.test.tsx src/features/insight-import/model/use_insight_import.test.tsx src/features/insight-import/model/use_notion_import.test.tsx src/app/authenticated_workspace.test.tsx
```

Expected: 새 button, dialog, status, category label 기대값에서 FAIL.

- [ ] **Step 3: 가져오기 단계·행동 문구 변경**

| 위치                | 개정 문구                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 대화상자 제목       | `인사이트 가져오기`                                                                                                                           |
| 대화상자 설명       | `다른 곳에 저장한 링크를 확인한 뒤 보관함으로 가져와요.`                                                                                      |
| 초기 안내           | `가져올 위치를 선택해 주세요.`                                                                                                                |
| 분석 진행           | `가져올 내용을 확인하고 있어요`                                                                                                               |
| 분석 행동           | `가져올 내용 확인하기`                                                                                                                        |
| 가져오기 진행       | `인사이트를 가져오고 있어요`                                                                                                                  |
| 미리보기 주요 행동  | `인사이트 가져오기`                                                                                                                           |
| 필드 연결 다음 행동 | `가져올 내용 확인하기`                                                                                                                        |
| 결과 다음 행동      | `보관함으로 돌아가기`                                                                                                                         |
| 다른 작업 행동      | `다른 링크 가져오기`                                                                                                                          |
| 소스 다시 선택      | `가져올 위치 다시 선택하기`                                                                                                                   |
| 일반 닫기 행동      | `닫기`                                                                                                                                        |
| Notion 중단 행동    | `Notion 연결 그만두기`                                                                                                                        |
| Notion 중단 확인    | `Notion 연결을 그만두고 가져오기 창을 닫을까요?`                                                                                              |
| 파일 도움말         | `CSV, JSON, HTML, Markdown, 텍스트, ZIP을 지원해요. 원본 파일은 서버에 올리지 않아요. 일반 파일은 10 MiB, ZIP은 20 MiB까지 선택할 수 있어요.` |
| Notion 설명         | `Notion에서 가져올 페이지를 직접 선택해요. 읽기 권한만 사용하고 가져오기가 끝나면 연결을 해제해요.`                                           |
| Notion 진행         | `{workspace}에서 가져올 내용을 확인하고 있어요`                                                                                               |
| Notion 진행 수량    | `요청 {requestCount}개를 확인했고 후보 {candidateCount}개를 찾았어요.`                                                                        |

- [ ] **Step 4: 미리보기·결과·기록 문구 변경**

| 위치                | 개정 문구                                                                  |
| ------------------- | -------------------------------------------------------------------------- |
| collection 제목     | `카테고리 연결`                                                            |
| collection 설명     | `가져온 모음을 기존 카테고리나 새 카테고리에 연결할 수 있어요.`            |
| summary 신규        | `새 인사이트`                                                              |
| summary 기존 중복   | `보관함에 있음`                                                            |
| summary 입력 중복   | `입력 안 중복`                                                             |
| 모든 `분류` 라벨    | `카테고리`                                                                 |
| preview 제한        | `처음 50개 항목만 보여요.`                                                 |
| 결과 status         | `인사이트 {createdCount}개를 보관함에 추가했어요`                          |
| Undo 결과           | `인사이트 {deletedCount}개를 보관함에서 삭제했어요.`                       |
| 보존 결과           | `직접 수정한 {preservedCount}개는 그대로 두었어요.`                        |
| Undo 질문           | `이 가져오기를 되돌릴까요?`                                                |
| Undo 영향           | `이 작업에서 새로 만든 인사이트만 삭제해요.`                               |
| Undo 행동           | `가져오기 되돌리기`                                                        |
| 기록 로딩           | `기록을 불러오고 있어요.`                                                  |
| 기록 빈 상태        | `아직 완료한 가져오기가 없어요.`                                           |
| 기록 summary        | `추가 {createdCount}개 · 중복 {duplicateCount}개 · 제외 {excludedCount}개` |
| 기록 삭제 영향      | `인사이트는 유지하고 되돌리기 권한과 기록만 삭제해요.`                     |
| 완료 기록 삭제 영향 | `인사이트는 유지하고 가져오기 기록만 삭제해요.`                            |
| 기록 삭제 행동      | `가져오기 기록 삭제하기`                                                   |

`되돌릴 수 있는 24시간이 지났어요.`는 정확한 만료 안내이므로 유지한다.

- [ ] **Step 5: 사용자에게 직접 전달되는 가져오기 오류 변경**

```ts
const HISTORY_FAILURE_MESSAGE =
  '가져오기 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
const REFRESH_AFTER_COMMIT_FAILURE_MESSAGE =
  '인사이트는 가져왔지만 보관함을 새로고침하지 못했어요. 보관함을 다시 열어 주세요.';
```

| 현재 의미             | 개정 문구                                                                          |
| --------------------- | ---------------------------------------------------------------------------------- |
| 요청 오류             | `가져오기 요청을 확인해 주세요.`                                                   |
| 인증 오류             | `로그인 상태를 확인하지 못했어요. 다시 로그인한 뒤 시도해 주세요.`                 |
| 정보 조회 실패        | `가져오기 정보를 불러오지 못했어요. 다시 시도해 주세요.`                           |
| commit 실패           | `인사이트를 가져오지 못했어요. 확인한 내용은 그대로 두었어요. 다시 시도해 주세요.` |
| 제한 초과             | `가져올 파일의 크기나 항목 수가 제한을 넘었어요.`                                  |
| 인코딩 오류           | `UTF-8 또는 BOM이 있는 UTF-16 텍스트 파일을 선택해 주세요.`                        |
| 손상 파일             | `파일이 손상되어 가져올 수 없어요. 다른 파일을 선택해 주세요.`                     |
| 안전하지 않은 ZIP     | `안전하지 않은 ZIP 파일이에요. 압축을 푼 뒤 지원하는 파일만 선택해 주세요.`        |
| 지원 구조 없음        | `가져올 수 있는 링크 구조를 찾지 못했어요. 다른 파일을 선택해 주세요.`             |
| Notion 승인 실패      | `Notion 연결을 승인하지 않았어요. 다시 연결해 주세요.`                             |
| 연결 정리 예약        | `연결 해제를 다시 시도할게요. 보관함 내용은 바뀌지 않았어요.`                      |
| 가져오기 후 해제 실패 | `인사이트는 가져왔어요. 연결 해제는 자동으로 다시 시도할게요.`                     |

서버 내부 오류인 token 암호화, cleanup, admin store와 Provider 요청 예외 문구는 바꾸지 않는다. `notion_candidate_extractor.ts`의 `페이지 주소`, `URL 속성`, `텍스트 URL 속성`, `링크 미리보기`, `북마크`, `임베드`는 사용자에게 출처 위치를 설명하는 짧은 라벨이므로 유지한다.

- [ ] **Step 6: 가져오기 범위 테스트 통과 확인**

Step 2와 같은 명령을 다시 실행한다.

Expected: 지정 테스트 모두 PASS. 기존 분석, mapping, commit, Undo와 Notion 취소 동작은 동일.

- [ ] **Step 7: 제품 전체 정적 UX Writing 계약의 실패 테스트 작성**

`scripts/ux_writing_contract.test.ts`를 만들고 아래 사용자 노출 파일 목록과 계약을 작성한다. comments, `throw new Error`와 `DOMException`은 사용자 문구가 아니므로 검사 전에 제거한다.

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const USER_FACING_FILES = [
  'src/app/app.tsx',
  'src/app/authenticated_workspace.tsx',
  'src/features/auth/model/auth_callback_error.ts',
  'src/features/auth/model/auth_provider.tsx',
  'src/features/auth/ui/account_menu.tsx',
  'src/pages/landing/ui/landing_page.tsx',
  'src/pages/landing/ui/onboarding_feature_tabs.tsx',
  'src/pages/login/ui/login_page.tsx',
  'src/pages/save/ui/save_page.tsx',
  'src/features/android-share/model/android_share_session.ts',
  'src/features/android-share/model/use_android_share.ts',
  'src/features/android-share/ui/android_share_screen.tsx',
  'src/features/pwa-install/ui/pwa_install_notice.tsx',
  'src/shared/capacitor/mobile_oauth.ts',
  'extension/manifest.ts',
  'extension/memo.html',
  'extension/src/background.ts',
  'extension/src/memo.ts',
  'src/pages/home/ui/home_page.tsx',
  'src/pages/home/ui/retrieve_results.tsx',
  'src/pages/home/ui/retrieve_search_panel.tsx',
  'src/pages/library/ui/library_page.tsx',
  'src/features/category-management/ui/category_manager.tsx',
  'src/entities/insight/ui/insight_card.tsx',
  'src/features/insight-import/ui/insight_import_dialog.tsx',
  'src/features/insight-import/ui/insight_import_source_selector.tsx',
  'src/features/insight-import/ui/import_field_mapping.tsx',
  'src/features/insight-import/ui/import_preview.tsx',
  'src/features/insight-import/ui/import_history.tsx',
  'src/features/insight-import/model/use_insight_import.ts',
  'src/features/insight-import/model/use_notion_import.ts',
] as const;

const FORBIDDEN_PATTERNS = [
  { label: '하십시오체', pattern: /습니다/u },
  { label: '명령형 경어', pattern: /하십시오/u },
  { label: '잘못 붙인 보조 용언', pattern: /해주세요/u },
  { label: '비표준 준말', pattern: /되어요/u },
  { label: '긴 주소 용어', pattern: /원문 URL/u },
  { label: '중복 주소 용어', pattern: /링크 URL/u },
  { label: '카테고리 용어 충돌', pattern: /(?<!미)분류/u },
  { label: '명사형 저장 상태', pattern: /저장됨/u },
  { label: '모호한 다이얼로그 닫기', pattern: />\s*취소\s*</u },
] as const;

function userFacingSource(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '')
    .replace(/throw new Error\([\s\S]*?\);/gu, '')
    .replace(/new DOMException\([\s\S]*?\)/gu, '');
}

function findViolations(source: string) {
  const userCopy = userFacingSource(source);
  return FORBIDDEN_PATTERNS.filter(({ pattern }) => pattern.test(userCopy)).map(
    ({ label }) => label
  );
}

describe('제품 UX Writing 계약', () => {
  it('금지 문체와 모호한 닫기 행동을 찾는다', () => {
    expect(
      findViolations('<button>취소</button> 저장했습니다. 저장됨 링크 URL')
    ).toEqual([
      '하십시오체',
      '중복 주소 용어',
      '명사형 저장 상태',
      '모호한 다이얼로그 닫기',
    ]);
  });

  it('해요체와 구체적인 닫기 행동을 허용한다', () => {
    expect(
      findViolations('<button>닫기</button> 인사이트를 저장했어요.')
    ).toEqual([]);
  });

  it('사용자 노출 파일의 문구를 지킨다', () => {
    const violations = USER_FACING_FILES.flatMap((filePath) => {
      const source = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      return findViolations(source).map(
        (violation) => `${filePath}: ${violation}`
      );
    });

    expect(violations).toEqual([]);
  });
});
```

검사 목록을 디렉터리 glob으로 넓히지 않는다. 내부 예외가 많은 server, config, adapter까지 검사하면 사용자 문구 계약이 개발자 메시지와 섞인다.

- [ ] **Step 8: 정적 계약이 남은 위반을 잡는지 확인**

```powershell
npm test -- scripts/ux_writing_contract.test.ts
```

Expected: 모든 파일이 PASS. 실패하면 해당 파일을 인벤토리와 대조해 사용자 문구만 고친다. 수동형, 부정형과 `없어요`를 새 금지 패턴으로 추가하지 않는다.

- [ ] **Step 9: 가져오기 소스와 테스트를 분리해 커밋**

```powershell
npx prettier --write "src/features/insight-import/**/*.{ts,tsx}" scripts/ux_writing_contract.test.ts
git add src/features/insight-import src/app/authenticated_workspace.test.tsx
git commit -m "feat: 가져오기 UX 문구 체계"
git add scripts/ux_writing_contract.test.ts
git commit -m "test: 제품 UX 라이팅 계약 검증"
```

## Task 6: 인벤토리 대조, 회귀와 대표 시각 QA

**Files:**

- Verify: Task 1~5의 모든 변경 파일
- Modify only if 기록이 실제 코드와 다름: `docs/ux-writing-inventory.md`
- Update after review: GitHub issue `#87`, Project #3
- Post-merge external sync: GitHub Wiki `도메인 언어`

- [ ] **Step 1: 인벤토리와 최종 소스 대조**

```powershell
rg -n "습니다|하십시오|해주세요|되어요|원문 URL|링크 URL|저장됨" src extension server api `
  -g "*.ts" -g "*.tsx" -g "*.html" `
  -g "!*.test.*" -g "!*.spec.*" -g "!**/testing/**"
rg -n "(^|[^미])분류" src extension `
  -g "*.ts" -g "*.tsx" -g "*.html" `
  -g "!*.test.*"
```

각 결과를 `docs/ux-writing-inventory.md`의 `유지` 또는 `제외` 근거와 대조한다. 사용자 노출 문구가 남아 있으면 가장 가까운 기능 파일과 기존 테스트만 수정한다. 내부 로그·예외가 남은 것은 정상이며 정적 계약 검사 목록에 억지로 넣지 않는다.

- [ ] **Step 2: 대상 테스트와 전체 테스트 실행**

```powershell
npm test -- scripts/ux_writing_contract.test.ts src/pages/landing/ui/landing_page.test.tsx src/pages/login/ui/login_page.test.tsx src/pages/save/ui/save_page.test.tsx src/features/android-share/model/android_share_session.test.ts src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx src/features/category-management/ui/category_manager.test.tsx src/entities/insight/ui/insight_grid.test.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx extension/src/background.test.ts extension/src/memo.test.ts
npm test -- --reporter=dot
```

Expected: 대상 테스트 0 failures. 전체는 135개 이상의 test files, 877개 이상의 tests, 0 failures.

- [ ] **Step 3: 포맷, lint, build와 diff 검사**

```powershell
npx prettier --write CONTEXT.md "docs/ux-writing*.md" docs/development-architecture.md docs/onboarding.md docs/retrieve.md docs/android-capacitor.md docs/superpowers/specs/2026-07-28-product-ux-writing-system-design.md
npm run format:check
npm run lint
npm run build
git diff --check
```

Expected: formatting·lint 0 errors, web·extension production build 성공, client bundle secret 검사 성공, whitespace 오류 없음.

- [ ] **Step 4: 대표 화면만 시각 검증**

```powershell
npm run dev
```

인앱 브라우저에서 다음 대표 위험만 확인한다.

- Desktop `1440 × 900`: 랜딩, 로그인, 보관함, 가져오기 결과의 제목·본문·행동 위계
- Tablet `768 × 1024`: 가져오기 필드 연결과 기록의 긴 문구
- Mobile `390 × 844`: 웹 저장 오류, 카드 삭제 확인, 가져오기 footer
- Small Mobile `320 × 568`: 가장 긴 오류와 두 개 행동이 있는 확인 상태
- Chrome 확장 `380 × 430`: 메모 성공과 오류
- Android 공유 대표 화면: 저장 진행, 실패 또는 완료 중 가장 긴 상태

확인 기준:

- 가로 overflow와 잘린 버튼이 없다.
- 버튼만 읽어도 다음 결과를 알 수 있다.
- visible text와 accessible name이 같은 뜻이다.
- status와 alert가 같은 문구를 중복 낭독하지 않는다.
- 문구 변경 때문에 생긴 작은 wrap 문제만 해당 CSS에서 고친다.

- [ ] **Step 5: 최종 문서 기록 커밋**

시각 검증이나 최종 대조로 인벤토리만 달라졌을 때 다음처럼 커밋한다. 변경이 없으면 빈 커밋을 만들지 않는다.

```powershell
git add docs/ux-writing-inventory.md
git commit -m "docs: UX 문구 전환 검증 기록"
```

- [ ] **Step 6: PR과 이슈 검토 상태 준비**

PR 본문에 다음을 기록한다.

- 앱인토스 원칙을 아맞다 용어에 맞게 적용한 범위
- 웹, Android, Chrome 확장, 접근성 문구 전환
- 새 테스트는 정적 계약 1개뿐이며 나머지는 가까운 기존 기대값만 변경
- 전체 test, lint, format, build, 대표 viewport 결과
- 기능, API, 데이터와 레이아웃 변경 없음
- Wiki 용어 동기화는 병합 직후 수행

[#87](https://github.com/ppre1ude/hub/issues/87)에 같은 검증 근거를 댓글로 남기고 Project Status를 `검토 중`으로 바꾼다. PR을 자동 병합하거나 이슈를 닫지 않는다.

- [ ] **Step 7: 병합 직후 GitHub Wiki 핵심 용어 동기화**

코드 PR이 병합되기 전에는 Wiki를 먼저 바꾸지 않는다. 병합 확인 뒤 `hub.wiki.git`을 새 임시 폴더에 clone하고 `도메인-언어.md`의 직접 충돌 세 곳만 바꾼다.

| 현재                                              | 개정                                         |
| ------------------------------------------------- | -------------------------------------------- |
| `현재 MVP에서는 외부 원문 URL을 가집니다.`        | `현재 MVP에서는 외부 URL을 가집니다.`        |
| `그 출처 주소를 링크 또는 원문 URL이라고 씁니다.` | `그 출처 주소를 링크 또는 URL이라고 씁니다.` |
| `그 주소는 링크 또는 원문 URL이라고 씁니다.`      | `그 주소는 링크 또는 URL이라고 씁니다.`      |

```powershell
$wikiRoot = Join-Path ([IO.Path]::GetTempPath()) "hub-wiki-$([guid]::NewGuid().ToString('N'))"
git clone https://github.com/ppre1ude/hub.wiki.git $wikiRoot
git -C $wikiRoot pull --ff-only
git -C $wikiRoot diff --check
git -C $wikiRoot add -- "도메인-언어.md"
git -C $wikiRoot commit -m "제품 UX 라이팅 용어 계약 반영"
git -C $wikiRoot push origin master
```

Expected: Wiki push 성공. 이후 #87에 Wiki commit 근거를 남기고 완료 기준이 모두 충족됐을 때만 이슈를 닫는다.

## 완료 기준

- `docs/ux-writing.md`가 앞으로의 정본으로 연결돼 있다.
- 전환 인벤토리의 모든 후보가 `개정`, `유지`, `제외`로 판정돼 있다.
- 웹, Android 공유, Chrome 확장과 접근성 문구가 같은 용어·문체를 사용한다.
- `URL`과 `링크`, `인사이트`, `보관함`, `카테고리`, `가져오기`, `꺼내보기`, `되돌리기`가 계약대로 쓰인다.
- 모호한 `계속`, `완료`, 일반 닫기 `취소`가 남지 않는다.
- 화면별 기존 테스트와 제품 전체 정적 계약이 통과한다.
- 전체 test, format, lint, web·extension build와 `git diff --check`가 통과한다.
- 대표 화면에서 긴 문구가 잘리거나 접근 가능한 의미가 어긋나지 않는다.
- PR 병합 뒤 GitHub Wiki의 핵심 용어가 동기화돼 있다.
