# Android Capacitor Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Android 공유 시트에서 받은 링크를 인증 상태에 맞춰 저장하고, 선택 메모와 원래 앱 복귀까지 제공한다.

**Architecture:** Capacitor Android 셸은 공유 Intent와 Activity 종료만 네이티브 플러그인으로 제공한다. TypeScript는 URL 추출, 메모리 전용 공유 세션, Google OAuth 재개, 기존 캡처·메모 API 호출과 결과 화면을 담당한다. 일반 웹 실행은 Capacitor 런타임 어댑터가 비활성화되어 기존 흐름을 유지한다.

**Tech Stack:** React 19, TypeScript, Vitest, Capacitor 8, Android Kotlin, Gradle, Supabase Auth PKCE, 기존 Express 캡처·메모 API.

---

## 파일 구조

- `capacitor.config.ts`: 앱 ID, 이름, `dist` 웹 디렉터리를 단일 설정으로 관리한다.
- `android/`: Capacitor 생성 Android 프로젝트와 직접 관리하는 공유 Intent 플러그인·테스트를 둔다.
- `src/shared/capacitor/`: 런타임 감지, 네이티브 공유 플러그인, 딥링크·시스템 브라우저 OAuth 어댑터를 둔다.
- `src/features/android-share/model/`: 외부 텍스트에서 URL을 찾고, 인증·캡처·메모 상태를 조정하는 순수 모델을 둔다.
- `src/features/android-share/ui/`: 공유 저장 결과와 복구 행동만 표시하는 화면을 둔다.
- `src/entities/insight/api/`: Android에서도 HTTPS 운영 API를 호출할 수 있도록 캡처·메모 클라이언트 계약을 공유한다.
- `src/app/`: 공유 세션이 있을 때 전용 화면을 우선 렌더링하고, 일반 실행은 현재 워크스페이스를 유지한다.
- `docs/android-capacitor.md`: 설치, sync, Gradle, APK, ADB, OAuth와 에뮬레이터 검증 절차를 기록한다.

### Task 1: Capacitor 셸과 API 원점 구성

**Files:**

- Create: `capacitor.config.ts`
- Modify: `package.json`, `package-lock.json`, `vite.config.ts`, `.env.example`
- Create: `src/shared/capacitor/runtime.ts`, `src/shared/capacitor/index.ts`
- Create tests: `src/shared/capacitor/runtime.test.ts`, `vite.config.test.ts` 보강

- [ ] **Step 1: Capacitor 감지와 Android HTTPS API 원점의 실패 테스트를 작성한다.**

```ts
expect(
  isNativeAndroid({
    isNativePlatform: () => true,
    getPlatform: () => 'android',
  })
).toBe(true);
expect(() =>
  parseApiOrigin({ VITE_CAPACITOR_API_ORIGIN: 'http://example.com' })
).toThrow('HTTPS');
```

- [ ] **Step 2: 단위 테스트가 아직 모듈을 찾지 못해 실패하는지 확인한다.**

Run: `npm test -- src/shared/capacitor/runtime.test.ts`

- [ ] **Step 3: Capacitor 8 패키지와 `com.ppre1ude.amadda` 설정을 추가하고, 웹은 상대 API 경로·Android는 검증된 HTTPS API 원점을 선택하도록 최소 구현한다.**

```ts
export function getInsightApiOrigin() {
  return isNativeAndroid(Capacitor) ? getCapacitorApiOrigin() : '';
}
```

- [ ] **Step 4: 테스트와 웹 빌드를 실행한다.**

Run: `npm test -- src/shared/capacitor/runtime.test.ts vite.config.test.ts && npm run build:web`

- [ ] **Step 5: Android 프로젝트를 생성하고 sync한 뒤 설정만 커밋한다.**

Run: `npx cap add android && npm run build:web && npx cap sync android`

Commit: `chore: Capacitor Android 앱 셸 구성`

### Task 2: Kotlin 공유 Intent 플러그인

**Files:**

- Create: `android/app/src/main/java/com/ppre1ude/amadda/AndroidSharePlugin.kt`
- Create: `android/app/src/test/java/com/ppre1ude/amadda/AndroidSharePluginTest.kt`
- Modify: `android/app/src/main/java/com/ppre1ude/amadda/MainActivity.kt`, `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: `ACTION_SEND`·`text/plain`의 `EXTRA_TEXT`, `EXTRA_TITLE`만 허용하고 ID별 한 번 소비하는 파서 테스트를 작성한다.**

```kotlin
assertThat(parser.enqueue(sendIntent("https://example.com", "제목"))).isTrue()
assertThat(parser.consumePending()).isNotNull()
assertThat(parser.consumePending()).isNull()
```

- [ ] **Step 2: 테스트가 플러그인·파서 구현 부재로 실패하는지 확인한다.**

Run: `./gradlew testDebugUnitTest --tests '*AndroidSharePluginTest'`

- [ ] **Step 3: 메모리 큐만 사용하는 Kotlin 플러그인을 구현한다.**

```kotlin
@PluginMethod
fun getPendingShare(call: PluginCall) = call.resolve(queue.consume()?.toJsObject() ?: JSObject())

@PluginMethod
fun finishShare(call: PluginCall) { activity.finish(); call.resolve() }
```

- [ ] **Step 4: `onNewIntent`에서 새 입력을 enqueue하고 `shareIntentReceived` 이벤트를 알리며, 매니페스트에는 `ACTION_SEND`·`text/plain` 필터와 `com.ppre1ude.amadda://auth/callback` 딥링크를 등록한다.**

- [ ] **Step 5: Kotlin 테스트와 디버그 빌드를 실행한다.**

Run: `./gradlew testDebugUnitTest --tests '*AndroidSharePluginTest' && ./gradlew assembleDebug`

- [ ] **Step 6: 네이티브 브리지 변경을 커밋한다.**

Commit: `feat: Android 공유 Intent 브리지 추가`

### Task 3: 공유 입력과 메모리 세션 상태

**Files:**

- Create: `src/shared/capacitor/android_share_plugin.ts`, `src/shared/capacitor/android_share_plugin.test.ts`
- Create: `src/features/android-share/model/extract_shared_url.ts`, `src/features/android-share/model/extract_shared_url.test.ts`
- Create: `src/features/android-share/model/android_share_session.ts`, `src/features/android-share/model/android_share_session.test.ts`
- Create: `src/features/android-share/index.ts`

- [ ] **Step 1: 전체 URL, 일반 문장의 첫 HTTP(S) URL, URL 없음, `ftp:` 거부와 중복 ID 소비의 실패 테스트를 작성한다.**

```ts
expect(extractSharedUrl('읽어볼 글 https://example.com/a 다음 링크')).toBe(
  'https://example.com/a'
);
expect(reduceShareSession(received, sameShare).effect).toBe('ignore');
```

- [ ] **Step 2: 테스트가 아직 내보내기를 찾지 못해 실패하는지 확인한다.**

Run: `npm test -- src/features/android-share/model/extract_shared_url.test.ts src/features/android-share/model/android_share_session.test.ts`

- [ ] **Step 3: `idle`, `received`, `authenticating`, `saving`, `saved`, `duplicate`, `editing-memo`, `completed`, `error` 상태와 메모리 전용 pending 입력을 구현한다.**

```ts
type AndroidShareState =
  | { status: 'idle' }
  | { status: 'received'; share: AndroidShareInput; url: string }
  | { status: 'authenticating'; share: AndroidShareInput; url: string }
  | { status: 'saving'; share: AndroidShareInput; url: string }
  | { status: 'saved'; insight: CapturedInsight }
  | { status: 'duplicate'; insight: CapturedInsight }
  | { status: 'editing-memo'; insight: CapturedInsight; memo: string }
  | { status: 'completed' }
  | { status: 'error'; message: string; retry: 'auth' | 'save' | 'share' };
```

- [ ] **Step 4: 웹 구현은 플러그인 호출·이벤트 구독이 모두 no-op임을 포함해 테스트를 통과시킨다.**

- [ ] **Step 5: 관련 TypeScript 테스트를 다시 실행하고 커밋한다.**

Commit: `feat: Android 공유 세션 상태 추가`

### Task 4: 시스템 브라우저 OAuth와 공통 API 클라이언트

**Files:**

- Create: `src/shared/capacitor/mobile_oauth.ts`, `src/shared/capacitor/mobile_oauth.test.ts`
- Modify: `src/shared/api/supabase_client.ts`, `src/features/auth/api/auth_service.ts`, `src/features/auth/model/auth_provider.tsx`
- Modify: `src/entities/insight/api/browser_insight_capture_service.ts`, `src/entities/insight/index.ts`
- Create: `src/entities/insight/api/browser_insight_memo_service.ts`, `src/entities/insight/api/browser_insight_memo_service.test.ts`

- [ ] **Step 1: Android에서는 `skipBrowserRedirect` URL을 시스템 브라우저로 열고, `appUrlOpen`의 PKCE code를 같은 Supabase 클라이언트로 교환하는 실패 테스트를 작성한다.**

```ts
await auth.signInWithGoogle('com.ppre1ude.amadda://auth/callback');
expect(browser.open).toHaveBeenCalledWith({ url: oauthUrl });
await expect(
  auth.completeRedirect('com.ppre1ude.amadda://auth/callback?code=x')
).resolves.toBeUndefined();
```

- [ ] **Step 2: 테스트가 모바일 OAuth 구현 부재로 실패하는지 확인한다.**

Run: `npm test -- src/shared/capacitor/mobile_oauth.test.ts src/features/auth/api/auth_service.test.ts`

- [ ] **Step 3: Android 전용 AuthService 어댑터를 구현하고 웹의 기존 `window.location.origin` 로그인 경로를 변경하지 않는다.**

- [ ] **Step 4: 캡처와 메모 요청이 Android에서만 HTTPS API 원점을 앞에 붙이고 Bearer 토큰을 네이티브 계층이나 로그로 넘기지 않도록 구현한다.**

- [ ] **Step 5: 인증·캡처·메모 단위 테스트와 기존 Chrome 확장 API 테스트를 실행한다.**

Run: `npm test -- src/shared/capacitor/mobile_oauth.test.ts src/features/auth src/entities/insight/api/browser_insight_capture_service.test.ts src/entities/insight/api/browser_insight_memo_service.test.ts extension/src/api/extension_api.test.ts`

- [ ] **Step 6: OAuth·공통 API 변경을 커밋한다.**

Commit: `feat: Android OAuth와 캡처 API 연결`

### Task 5: 공유 결과 화면과 앱 조합

**Files:**

- Create: `src/features/android-share/ui/android_share_page.tsx`, `src/features/android-share/ui/android_share_page.css`, `src/features/android-share/ui/android_share_page.test.tsx`
- Create: `src/features/android-share/model/use_android_share_session.ts`, `src/features/android-share/model/use_android_share_session.test.tsx`
- Modify: `src/app/app.tsx`, `src/app/app.test.tsx`, `src/app/authenticated_workspace.tsx`

- [ ] **Step 1: 저장 성공, 중복, 메모 저장 실패, URL 없음, 인증 취소, 네트워크 실패와 완료 시 `finishShare` 호출의 컴포넌트 테스트를 작성한다.**

```tsx
await user.click(screen.getByRole('button', { name: '완료' }));
expect(plugin.finishShare).toHaveBeenCalledTimes(1);
expect(screen.getByText('이미 저장됨')).toBeVisible();
```

- [ ] **Step 2: 테스트가 훅·전용 화면 부재로 실패하는지 확인한다.**

Run: `npm test -- src/features/android-share/ui/android_share_page.test.tsx src/features/android-share/model/use_android_share_session.test.tsx src/app/app.test.tsx`

- [ ] **Step 3: 공유 상태가 있을 때만 전용 화면을 최우선 렌더링하고, 저장 결과에는 제목·200자 한 줄 메모·완료만 표시하도록 최소 구현한다.**

- [ ] **Step 4: 기존 웹 로그인·홈·보관함·저장 통합 테스트와 Android 공유 화면 테스트를 실행한다.**

Run: `npm test -- src/app/app.test.tsx src/app/authenticated_workspace.test.tsx src/features/android-share`

- [ ] **Step 5: UI·앱 조합 변경을 커밋한다.**

Commit: `feat: Android 공유 저장 결과 화면 추가`

### Task 6: 문서화와 Android 검증

**Files:**

- Create: `docs/android-capacitor.md`
- Modify: `.env.example`, `README.md` (필요한 경우에만 Android 개발 진입점 링크)

- [ ] **Step 1: 설치, `build:web`, `cap sync`, Gradle 테스트, APK, ADB 공유, 딥링크와 Supabase Redirect URL 절차를 문서화한다.**

```text
npm run build:web
npx cap sync android
cd android; ./gradlew testDebugUnitTest assembleDebug
adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "https://example.com"
```

- [ ] **Step 2: 문서 포맷 검사와 TypeScript·Kotlin 전체 검증을 실행한다.**

Run: `npm run format:check && npm test && npm run lint && npm run build && cd android && ./gradlew testDebugUnitTest assembleDebug`

- [ ] **Step 3: Google Play 포함 Android 에뮬레이터에서 직접 실행, 로그인, URL 공유, 일반 텍스트 공유, 중복, 메모, 완료 복귀와 오류 경로를 기록한다.**

- [ ] **Step 4: 최종 diff를 확인한 뒤 문서와 검증 변경을 커밋한다.**

Commit: `docs: Android Capacitor 검증 절차 정리`

## 검증 매핑

- 공유 Intent 최초 실행·재진입·일회성 소비: Kotlin 단위 테스트
- URL 추출, 메모리 유실, 인증 재개, 캡처·메모 오류: TypeScript 단위·훅 테스트
- 일반 웹 회귀: `App`, 인증, 워크스페이스, Chrome 확장 API 테스트
- 생성물: Gradle `testDebugUnitTest`, `assembleDebug`, `npm run build`
- 기기 통합: Google Play Android 에뮬레이터 ADB 공유와 시스템 브라우저 Google OAuth

## 범위 확인

- 포함: Capacitor Android 셸, `text/plain` 공유, PKCE 시스템 브라우저 OAuth, 메모리 전용 pending 공유, 캡처·메모, 디버그 APK, 문서화.
- 제외: Google Play Console, 운영 서명·AAB, iOS, 파일·여러 URL 공유, 인증 전 URL 영속화와 오프라인 동기화.
