# Android Capacitor 개발·검증

## 현재 구현 범위

이 프로젝트는 기존 React 웹 앱을 Android에서 실행하기 위해 Capacitor를 사용한다. Capacitor는 JavaScript와 Android Kotlin 코드 사이의 호출 경계를 제공하고, Android Studio가 네이티브 프로젝트를 관리한다. Android 런타임은 API 24 이상을 지원한다는 [Capacitor Android 문서](https://capacitorjs.com/docs/android)를 따른다.

현재 구현 범위는 Android 공유 Intent 수신부터 로그인, 링크 저장, 선택 메모와 원래 앱 복귀까지다.

- Kotlin은 ACTION_SEND와 정확히 text/plain인 공유 입력, 메모리 대기열, 재진입 이벤트, Activity 종료만 담당한다.
- React·TypeScript는 첫 HTTP(S) URL 추출, 인증, 캡처·메모 API 호출, 시스템 브라우저 OAuth와 결과 UI를 담당한다.
- Android에서 받은 text는 최대 4096 UTF-16 code units, 선택 title은 최대 500 UTF-16 code units까지만 허용한다. URL 의미 검증은 TypeScript 경계의 책임이다.
- 공유 입력은 프로세스 메모리에만 존재하며 영속 저장하거나 로그에 기록하지 않는다.
- OAuth 중 프로세스 종료를 구분하기 위한 `android-share` 흐름 표식만 앱 저장소에 남기고 콜백·취소 시 지운다. 이 표식에는 URL, 제목, 토큰이 포함되지 않는다.

## JDK와 Android SDK 준비

JDK 21을 사용해야 한다. 프로젝트의 android/app/build.gradle은 jvmToolchain(21)을 선언하고, 설치된 Capacitor Android 8 모듈도 Java 21 source/target compatibility를 선언한다. 이는 [Capacitor 8.4.2 기본 Android 모듈](https://github.com/ionic-team/capacitor/blob/8.4.2/android/capacitor/build.gradle#L66-L67)의 요구 사항이다.

따라서 별도 JDK 자동 다운로드 resolver를 추가하지 않는다. 현재 Capacitor 기본 템플릿과 프로젝트가 이미 Java 21을 강제하므로, 개발자·CI가 명시적으로 JDK 21을 선택하는 편이 재현 가능하고 로컬 Gradle daemon의 JDK 혼동을 피한다.

Windows PowerShell에서는 설치한 JDK 21 경로를 해당 프로세스에만 지정한다. 아래 예시의 경로는 설치 위치에 맞게 바꾼다.

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.10'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
java -version
```

Android Studio의 SDK Manager에서 프로젝트 Gradle 설정이 요구하는 Android SDK Platform과 Build-Tools를 설치한다. SDK 경로와 ADB도 현재 PowerShell 프로세스에만 지정한다.

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:PATH"
adb version
```

Android Studio에서는 저장소의 android/ 디렉터리를 열고 SDK·Gradle 동기화를 완료한다. Capacitor 공식 문서의 npx cap open android 명령으로 열어도 된다.

## 빌드와 동기화

의존성 버전과 Android SDK 버전은 package.json, android/build.gradle, android/variables.gradle을 단일 원천으로 사용한다. 문서에 버전을 별도로 고정하지 않는다.

처음 저장소를 준비할 때는 잠금 파일 기준으로 의존성을 설치한다.

```powershell
npm ci
```

웹 빌드는 공개 값만 포함하는 환경 변수를 요구한다. 실제 Supabase URL·publishable key·Android API 원점을 현재 셸에 넣고, secret key나 access token은 넣지 않는다.

```powershell
$env:VITE_SUPABASE_URL = 'https://<project-ref>.supabase.co'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = '<publishable-key>'
$env:VITE_CAPACITOR_API_ORIGIN = 'https://<api-host>'

npm run build:web
npm run sync:android
```

npm run sync:android은 웹 빌드를 다시 실행하고 dist/를 Android assets로 복사한 뒤 Capacitor 플러그인 설정을 갱신한다. 웹 변경 뒤에는 항상 sync를 다시 실행한다.

Gradle 명령은 JDK 21을 지정한 같은 셸에서 실행한다.

```powershell
Push-Location android
.\gradlew.bat testDebugUnitTest
.\gradlew.bat assembleDebug
Pop-Location
```

디버그 APK는 android/app/build/outputs/apk/debug/app-debug.apk에 생성된다.

## 앱 식별자와 OAuth 복귀 경계

앱 식별자는 capacitor.config.ts의 com.ppre1ude.amadda를 단일 원천으로 사용한다. AndroidManifest.xml은 com.ppre1ude.amadda://auth/callback 딥링크 필터를 이미 등록한다.

Supabase Dashboard의 Authentication > URL Configuration > Redirect URLs에 다음 값을 정확히 등록한다.

```text
com.ppre1ude.amadda://auth/callback
```

Android 런타임은 Supabase가 만든 PKCE URL을 Capacitor Browser로 열고, App 플러그인의 실행 중 `appUrlOpen` 또는 종료 상태 `getLaunchUrl()`로 콜백을 받는다. 콜백의 code는 OAuth를 시작한 것과 같은 Supabase 클라이언트에서 `exchangeCodeForSession()`으로 교환한다. 웹 브라우저는 기존 `window.location.origin` 리다이렉트 흐름을 유지한다.

Google OAuth의 client secret, Supabase access token과 refresh token은 환경 변수·문서·APK에 넣지 않는다. 웹 번들에는 Supabase URL, publishable key와 HTTPS API 원점만 포함한다.

## 직접 관리 파일과 생성 파일

- 직접 관리: capacitor.config.ts, android/app/src/main/AndroidManifest.xml, MainActivity.kt, AndroidSharePlugin.kt, Kotlin 테스트 파일
- Capacitor가 생성·갱신: android/app/src/main/assets/public/, android/app/src/main/assets/capacitor.config.json, 플러그인 연결 생성물

생성 Android 프로젝트의 Gradle 설정을 Capacitor 업그레이드 중 덮어쓸 수 있으므로, 업그레이드 뒤에는 직접 관리 파일과 매니페스트의 공유·딥링크 필터를 다시 확인한다.

## 공유 Intent 브리지 계약

MainActivity는 초기 Intent와 onNewIntent를 같은 파서로 처리한다.

- ACTION_SEND와 MIME type text/plain만 허용한다.
- EXTRA_TEXT는 필수이고 EXTRA_TITLE은 선택이다.
- 최초 실행 공유는 getPendingShare()가 한 번만 소비하는 단일 pending 메모리 슬롯에 넣는다.
- 실행 중 재진입 공유는 먼저 단일 pending 슬롯의 기존 값을 최신 공유로 교체한다. 따라서 같은 id가 이벤트 payload와 pending에 중복 전달되지 않는다.
- 슬롯 교체 뒤 shareIntentReceived를 보존하지 않는 wake-up 알림으로 한 번 발행한다. 이 이벤트 payload는 빈 객체이며 id, text, title을 전달하지 않는다.
- listener 존재 여부를 검사하지 않고 Capacitor retained event도 사용하지 않는다. listener 등록과 이벤트 발행 사이에서 알림이 폐기되어도 최신 pending 공유는 남는다.
- TypeScript 어댑터는 listener 등록 직후와 shareIntentReceived wake-up 알림 수신 시마다 getPendingShare()를 호출해 최신 pending 공유 한 건을 소비한다. 이벤트 payload는 저장 입력으로 사용하지 않는다.
- finishShare()는 공유 결과 완료 시 현재 Android Activity에 종료를 요청한다.

AndroidSharePluginTest는 길이 제한과 초기/재진입 파싱을 검증한다. MainActivityShareIntentTest는 실제 onNewIntent 재진입이 빈 wake-up 이벤트를 발행한 뒤 pending 슬롯에서 한 번만 소비되는지 검증한다. AndroidSharePluginApiTest는 listener 유무와 관계없는 최신 한 건 교체, 빈 wake-up 이벤트, 실제 getPendingShare()·finishShare()를 검증한다.

## Robolectric와 에뮬레이터 검증

Robolectric는 Capacitor BridgeActivity.load()가 생성하는 Android WebView/ServiceWorker provider를 제공하지 않는다. 이 때문에 MainActivityShareIntentTest의 테스트 전용 Activity는 load()만 대체하고 그 안에서 onNewIntent(intent)를 호출한다. 실제 MainActivity의 초기화 플래그, 초기 대기열, 재진입 라우팅은 실행하지만 WebView·JavaScript bridge의 종단 간 전달은 Robolectric에서 검증하지 않는다.

Kotlin 단위 테스트는 PluginCall의 실제 resolve, listener 존재 여부와 무관한 단일 pending 슬롯 교체, 빈 wake-up 이벤트, Activity.finish() 요청을 확인한다. WebView의 JavaScript listener, OAuth, API와 결과 화면을 포함한 종단 간 흐름은 Android 에뮬레이터에서 확인한다.

Android Studio Device Manager에서 API 24 이상이며 Google Play 아이콘이 있는 시스템 이미지로 가상 기기를 만든다. Google 계정 로그인과 Chrome·Android System WebView 업데이트를 마친 뒤 APK를 설치한다.

```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am force-stop com.ppre1ude.amadda
adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT 'https://example.com'
adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT '읽을거리 https://example.com/article'
```

다음 순서로 실제 화면 결과를 기록한다.

1. 앱을 직접 실행해 기존 로그인·홈·보관함·저장 화면이 열리는지 확인한다.
2. 로그아웃 상태에서 URL을 공유하고 시스템 브라우저 Google 로그인 뒤 자동으로 `인사이트를 저장했어요`가 표시되는지 확인한다.
3. 같은 URL을 다시 공유해 `이미 저장한 인사이트예요`가 표시되는지 확인한다.
4. URL이 포함된 일반 문장에서 첫 HTTP(S) 링크가 저장되는지 확인한다.
5. 200자 이내 한 줄 메모를 남기고 완료한 뒤 보관함의 같은 인사이트에 반영되는지 확인한다.
6. Chrome 같은 원본 앱의 공유 메뉴로 아맞다를 열고 완료했을 때 원본 앱으로 돌아가는지 확인한다. ADB가 시작한 ACTION_SEND에는 복귀할 원본 Activity가 없으므로 이 항목은 수동 공유로 확인한다.
7. URL 없는 텍스트와 미지원 프로토콜은 API 호출 없이 재공유 안내를 표시하는지 확인한다.
8. 로그인 브라우저를 닫으면 재시도·복귀가 가능한 오류가 표시되는지 확인한다.
9. 에뮬레이터 네트워크를 끊고 저장을 시도해 입력을 유지한 재시도 오류가 표시되는지 확인한 뒤 네트워크를 복원한다.

크기·MIME·action 경계는 Gradle 단위 테스트에서 확인한다. 필요하면 다음 ADB 입력으로 지원하지 않는 경계가 공유 화면으로 이어지지 않는지 추가 확인한다.

```powershell
adb shell am start -a android.intent.action.SEND -t text/html --es android.intent.extra.TEXT 'https://example.com'
adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT 'ftp://example.com/archive'
adb shell am start -a android.intent.action.VIEW -d 'https://example.com'
```

OAuth 도중 앱 프로세스를 종료한 뒤 콜백으로 복귀하면 로그인 세션만 교환되고 공유 URL은 복원하지 않는다. 이 경우 `로그인은 완료됐지만 링크를 다시 받아야 해요.` 안내가 표시되어야 한다.

## 문제 해결과 업데이트

- Gradle이 Java 17 이하를 사용하면 새 PowerShell에서 JAVA_HOME을 JDK 21으로 다시 지정하고 java -version을 확인한다.
- SDK를 찾지 못하면 ANDROID_HOME이 Android Studio SDK Manager의 경로와 같은지, platform-tools가 PATH에 있는지 확인한다.
- 웹 변경이 Android에 보이지 않으면 npm run sync:android을 다시 실행한다.
- 공유 Intent가 표시되지 않으면 앱을 재설치한 뒤 매니페스트의 ACTION_SEND와 text/plain 필터를 확인한다.
- OAuth가 브라우저에서 끝난 뒤 앱으로 돌아오지 않으면 Supabase Redirect URLs와 매니페스트의 scheme·host·path가 `com.ppre1ude.amadda://auth/callback`과 정확히 같은지 확인한다.
- 로그인 뒤 저장이 실패하면 `VITE_CAPACITOR_API_ORIGIN`이 에뮬레이터에서 접근 가능한 HTTPS 원점인지 확인한다. localhost는 에뮬레이터 자신의 주소이므로 운영 API 검증에 사용하지 않는다.
- Google 로그인 화면이 열리지 않으면 Google Play 시스템 이미지인지, Chrome과 Play 서비스가 활성 상태인지 확인한다.
- Capacitor·Android Gradle Plugin·SDK를 갱신할 때는 먼저 package.json과 Gradle 파일의 호환성을 확인하고, JDK 21 요구 사항, npm run sync:android, testDebugUnitTest, assembleDebug, 에뮬레이터 공유 절차를 다시 검증한다.
