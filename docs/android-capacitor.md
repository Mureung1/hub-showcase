# Android Capacitor 개발·검증

## 현재 구현 범위

이 프로젝트는 기존 React 웹 앱을 Android에서 실행하기 위해 Capacitor를 사용한다. Capacitor는 JavaScript와 Android Kotlin 코드 사이의 호출 경계를 제공하고, Android Studio가 네이티브 프로젝트를 관리한다. Android 런타임은 API 24 이상을 지원한다는 [Capacitor Android 문서](https://capacitorjs.com/docs/android)를 따른다.

현재 네이티브 구현 범위는 Android 공유 Intent 브리지와 Activity 종료다.

- Kotlin은 ACTION_SEND와 정확히 text/plain인 공유 입력, 메모리 대기열, 재진입 이벤트, Activity 종료만 담당한다.
- React·TypeScript는 URL 의미 검증, 인증, 캡처 API 호출, OAuth, 결과 UI를 담당한다. 이 문서 작성 시점에는 이 후속 연결을 구현하지 않는다.
- Android에서 받은 text는 최대 4096 UTF-16 code units, 선택 title은 최대 500 UTF-16 code units까지만 허용한다. URL 의미 검증은 TypeScript 경계의 책임이다.
- 공유 입력은 프로세스 메모리에만 존재하며 영속 저장하거나 로그에 기록하지 않는다.

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

현재 작업은 OAuth 구현을 추가하지 않는다. 후속 모바일 OAuth 작업에서만 Supabase Redirect URL에 이 정확한 callback URL을 등록하고, 시스템 브라우저 PKCE 흐름과 함께 에뮬레이터에서 검증한다. client secret, access token, refresh token은 환경 변수·문서·APK에 넣지 않는다.

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
- TypeScript 어댑터는 listener 등록 직후와 shareIntentReceived wake-up 알림 수신 시마다 getPendingShare()를 호출해 최신 pending 공유 한 건을 소비해야 한다. 이벤트 payload를 저장 입력으로 사용하지 않는 이 호출 순서는 후속 TypeScript 어댑터의 계약이다.
- finishShare()는 공유 결과 완료 시 현재 Android Activity에 종료를 요청한다.

AndroidSharePluginTest는 길이 제한과 초기/재진입 파싱을 검증한다. MainActivityShareIntentTest는 실제 onNewIntent 재진입이 빈 wake-up 이벤트를 발행한 뒤 pending 슬롯에서 한 번만 소비되는지 검증한다. AndroidSharePluginApiTest는 listener 유무와 관계없는 최신 한 건 교체, 빈 wake-up 이벤트, 실제 getPendingShare()·finishShare()를 검증한다.

## Robolectric와 에뮬레이터 검증

Robolectric는 Capacitor BridgeActivity.load()가 생성하는 Android WebView/ServiceWorker provider를 제공하지 않는다. 이 때문에 MainActivityShareIntentTest의 테스트 전용 Activity는 load()만 대체하고 그 안에서 onNewIntent(intent)를 호출한다. 실제 MainActivity의 초기화 플래그, 초기 대기열, 재진입 라우팅은 실행하지만 WebView·JavaScript bridge의 종단 간 전달은 Robolectric에서 검증하지 않는다.

현재 가능한 가장 가까운 네이티브 검증은 Kotlin 단위 테스트다. PluginCall의 실제 resolve, listener 존재 여부와 무관한 단일 pending 슬롯 교체, 빈 wake-up 이벤트, Activity.finish() 요청을 모두 호출한다. WebView에 등록된 JavaScript listener가 수신하는 종단 간 검증은 Android 에뮬레이터에서 후속 TypeScript 공유 어댑터가 연결된 뒤 수행한다.

에뮬레이터에는 API 24 이상 시스템 이미지를 사용하고, Android System WebView 상태를 확인한다. APK 설치와 초기 공유 Intent 수신은 다음처럼 확인한다.

```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "https://example.com"
```

후속 TypeScript 공유 어댑터가 연결되면 다음을 실제 에뮬레이터에서 기록한다.

1. 앱이 종료된 상태에서 공유한 입력이 getPendingShare()로 한 번만 처리되는지 확인한다.
2. listener가 없는 실행 중 앱에 여러 공유를 보낸 뒤 listener를 등록하고 즉시 getPendingShare()를 호출해 최신 한 건만 받는지 확인한다.
3. listener가 있는 실행 중 앱에 공유한 입력은 빈 shareIntentReceived wake-up 알림을 한 번 수신하고, 알림 처리에서 getPendingShare()를 호출해 한 번만 저장 입력을 받는지 확인한다.
4. 4097자 text, 501자 title, text/html, ACTION_VIEW 입력이 전달되지 않는지 확인한다.
5. finishShare() 뒤 공유 원본 앱으로 돌아가는지 확인한다.

OAuth·캡처·메모 UI는 아직 이 네이티브 작업 범위 밖이므로, 이 시점에는 해당 흐름을 성공으로 기록하지 않는다.

## 문제 해결과 업데이트

- Gradle이 Java 17 이하를 사용하면 새 PowerShell에서 JAVA_HOME을 JDK 21으로 다시 지정하고 java -version을 확인한다.
- SDK를 찾지 못하면 ANDROID_HOME이 Android Studio SDK Manager의 경로와 같은지, platform-tools가 PATH에 있는지 확인한다.
- 웹 변경이 Android에 보이지 않으면 npm run sync:android을 다시 실행한다.
- 공유 Intent가 표시되지 않으면 앱을 재설치한 뒤 매니페스트의 ACTION_SEND와 text/plain 필터를 확인한다.
- Capacitor·Android Gradle Plugin·SDK를 갱신할 때는 먼저 package.json과 Gradle 파일의 호환성을 확인하고, JDK 21 요구 사항, npm run sync:android, testDebugUnitTest, assembleDebug, 에뮬레이터 공유 절차를 다시 검증한다.
