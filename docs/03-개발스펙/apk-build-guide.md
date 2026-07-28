# Mealyze 안드로이드 앱(APK) 빌드 가이드

이 프로젝트의 웹 앱을 **Capacitor**로 감싸 안드로이드 APK로 만드는 방법입니다. 웹 코드는 그대로 두고,
그 빌드 결과(`dist/`)를 앱이 감쌉니다. 웹 버전은 계속 그대로 동작합니다.

---

## 0. 운영 방식 — 현재는 **원격 URL 방식**으로 설정돼 있습니다

이 앱은 지금 **원격 URL 방식**(server URL 방식)으로 구성돼 있습니다. 앱은 껍데기(WebView)만이고,
실제 화면은 **배포된 웹사이트를 통째로 불러옵니다**. 그래서 **웹만 고쳐서 배포(git push)하면 앱에도
자동 반영**되고, APK를 다시 만들 필요가 없습니다.

`capacitor.config.json`에 이미 아래처럼 들어가 있습니다:

```json
"server": {
  "url": "https://hub-iota-seven.vercel.app",
  "cleartext": false,
  "androidScheme": "https",
  "allowNavigation": ["hub-iota-seven.vercel.app", "*.supabase.co"]
}
```

> ⚠️ **가장 먼저 확인할 것 — `server.url`이 본인의 실제 배포 고정 주소인지 확인하세요.**
> 주소가 틀리면 앱이 **흰 화면**만 뜹니다(가장 흔한 실패 원인). Vercel → 프로젝트 → Settings → Domains에서
> 고정 도메인을 확인하고, 다르면 `capacitor.config.json`의 `url`과 `allowNavigation` 첫 항목을 그 주소로
> 바꾼 뒤 `npm run app:sync:config`를 실행하세요. **주소를 바꿨다면 네이버 클라우드 Maps 콘솔의 Web 서비스
> URL과 Supabase Auth의 Redirect URL에도 그 주소를 등록**해야 지도·로그인이 정상 동작합니다.

| 항목 | 원격 URL 방식(현재) |
|---|---|
| 수정 반영 | 웹 `git push` → 앱도 자동 갱신 (APK 재빌드 불필요) |
| 인터넷 | 항상 필요(Mealyze는 어차피 서버 API가 필수라 문제 없음) |
| 첫 로딩 | 네트워크에서 받아오므로 로컬 번들보다 약간 느림 |
| APK 재빌드가 필요한 경우 | 배포 주소 변경 / 앱 이름·아이콘 변경 / 새 권한 추가 시에만 |

**로컬 번들 방식으로 되돌리려면**(스토어 정식 배포 등): `capacitor.config.json`에서 `server` 블록을 지우고,
아래 3번에서 `VITE_API_BASE_URL`을 배포 백엔드 주소로 지정해 `npm run app:sync`로 빌드하세요. 이 방식은
`dist/`를 APK에 함께 넣어 첫 화면이 빠른 대신, 웹을 고칠 때마다 APK를 다시 만들어야 합니다.

> 배포 백엔드 주소 예: `https://mealyze.onrender.com` 또는 `https://mealyze.vercel.app` (본인 배포 주소로 바꾸세요).

---

## 1. 사전 준비 (내 컴퓨터)

- **Android Studio** 설치: https://developer.android.com/studio (설치 시 Android SDK도 함께 설치됨)
- **JDK 17** (보통 Android Studio에 내장된 것으로 충분)
- 이 저장소에서 `npm install` 한 번 실행(Capacitor 패키지가 이미 `package.json`에 있습니다)

> 안드로이드 프로젝트 폴더(`android/`)는 이미 이 저장소에 생성돼 있습니다(`npx cap add android` 완료 상태).
> 권한(인터넷·네트워크 상태·카메라·위치)도 `android/app/src/main/AndroidManifest.xml`에 이미 넣어뒀고,
> 보안을 위해 `android:usesCleartextTraffic="false"`(HTTP 평문 차단)도 켜져 있습니다.

---

## 2. 앱 아이콘·스플래시 설정 (선택, 권장)

로고 이미지로 앱 아이콘과 스플래시를 한 번에 생성합니다.

```bash
npm install -D @capacitor/assets
# 1024x1024 아이콘 원본을 assets/icon.png 로 두고(예: branding/apk logo.png 를 1024로 리사이즈 —
# public/이 아니라 branding/에 있다. public/은 그대로 빌드에 포함되므로, 빌드에 안 쓰이는 원본
# 마케팅 이미지를 public/에 두면 배포마다 불필요하게 ~20MB가 함께 나간다),
# 스플래시 배경용 assets/splash.png(2732x2732 권장)도 두면 좋습니다.
npx @capacitor/assets generate --android
```

이러면 `android/app/src/main/res/`의 각 해상도 아이콘이 자동으로 채워집니다. 하지 않으면 기본 Capacitor 아이콘이 쓰입니다.

---

## 3. 앱에 설정 반영(동기화)

**원격 URL 방식(현재)** — `capacitor.config.json`만 고쳤다면 웹 빌드 없이 설정만 반영하면 됩니다:

```bash
npm run app:sync:config   # = cap sync android (config·플러그인만 반영, 웹 빌드 생략)
```

앱이 배포 사이트를 통째로 로드하므로, 웹 화면을 바꾸고 싶을 땐 여기서 다시 빌드할 필요 없이
**웹을 배포(git push)** 하기만 하면 됩니다.

**로컬 번들 방식으로 되돌린 경우**라면 배포 백엔드 주소를 넣어 빌드해야 `/api` 호출이 그 서버로 나갑니다:

```bash
# Windows PowerShell
$env:VITE_API_BASE_URL="https://<배포주소>"; npm run app:sync
# macOS/Linux
VITE_API_BASE_URL="https://<배포주소>" npm run app:sync
```

`app:sync`는 `vite build`(웹 빌드) → `cap sync android`(그 결과를 안드로이드 프로젝트로 복사 + 플러그인 반영)를 한 번에 합니다.

---

## 4. Android Studio에서 열고 실행

```bash
npm run app:open   # = cap open android
```

Android Studio가 열리면:
1. Gradle 동기화가 끝날 때까지 기다립니다(첫 실행은 몇 분 걸릴 수 있음).
2. 상단에서 **에뮬레이터** 또는 USB로 연결한 **실기기**를 선택하고 ▶(Run)을 누릅니다.
3. 앱이 설치·실행됩니다.

> ⚠️ 카메라 촬영은 **에뮬레이터로는 테스트가 어렵습니다** — 실기기로 확인하세요.

---

## 5. 서명된 릴리스 APK 만들기 (배포용)

배포/설치 링크 공유용 서명 APK는 keystore가 필요합니다.

```bash
# 1) keystore 생성(최초 1회) — 비밀번호와 이 .jks 파일은 안전하게 보관하세요.
#    분실하면 같은 앱으로 업데이트할 수 없습니다(신규 앱으로 올려야 함).
keytool -genkey -v -keystore mealyze-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mealyze
```

2. Android Studio → **Build → Generate Signed Bundle / APK → APK** → 위 keystore 선택 → **release** →
   Finish. 생성된 APK 경로가 안내됩니다(`android/app/release/app-release.apk`).
3. 그 APK 파일을 안드로이드 기기에 옮겨 설치(출처를 알 수 없는 앱 허용 필요)하거나, Play Store에
   올리려면 개발자 계정($25, 심사 필요)이 필요합니다.

> keystore(`*.jks`)는 저장소에 커밋하지 마세요 — 이미 `android/.gitignore`에서 제외 옵션을 안내하고
> 있으며, 필요하면 그 줄의 주석을 해제하세요.

---

## 6. 웹뷰에서 알아둘 점 (이미 반영된 것)

- **외부 링크 처리(2중 안전장치)**: (1) 네이버 지도 상세·광고 링크는 `src/lib/externalLink.js`가
  네이티브에선 시스템 브라우저(@capacitor/browser)로 엽니다. (2) 그 외 예기치 못한 외부 이동도
  `capacitor.config.json`의 `server.allowNavigation`(우리 배포 도메인 + `*.supabase.co`만 허용) 밖이면
  Capacitor가 자동으로 시스템 브라우저로 내보냅니다 — 앱 WebView가 낯선 사이트로 끌려가지 않습니다(보안).
- **카메라·위치 권한(네이티브 코드 불필요)**: `AndroidManifest.xml`에 `CAMERA`/`ACCESS_FINE_LOCATION`/
  `ACCESS_COARSE_LOCATION`을 넣어뒀고, 사진 분석의 `<input type=file accept=image/*>`와 주변 식당의
  `navigator.geolocation`은 **Capacitor 기본 브릿지(`BridgeWebChromeClient`)가 이미 처리**합니다
  (`onShowFileChooser`/`onGeolocationPermissionsShowPrompt`/`onPermissionRequest`). 첫 사용 시 안드로이드가
  권한을 물어봅니다. 그래서 `MainActivity`는 커스텀 WebChromeClient 없이 순정 `BridgeActivity` 그대로입니다.
- **상단 상태바/하단 제스처 바 겹침**: 헤더는 `env(safe-area-inset-top)`, 하단 탭바는
  `env(safe-area-inset-bottom)`으로 안전영역을 이미 확보합니다.
- **뒤로가기 버튼**: `src/lib/useAndroidBackButton.js`(App.jsx에서 호출)가 하위 화면에선 이전 화면으로,
  첫 화면(분석 홈)에선 앱을 종료하도록 처리합니다. 웹에선 `Capacitor.isNativePlatform()`이 false라 no-op입니다.
  > 이 핸들러는 **웹 코드**라서, 배포된 사이트에 반영(git push)돼야 앱에도 적용됩니다(원격 URL 방식 특성).
- **로그인**: **아이디 + 비밀번호** 한 가지입니다. 소셜 로그인(구글 OAuth)은 임베디드 웹뷰를 구글이 막는
  제약이 있어 3주차에 완전히 제거했습니다 — 지금은 순수 서버 API 호출이라 앱에서 그대로 동작하고,
  세션은 웹뷰의 localStorage에 남아 앱을 껐다 켜도 유지됩니다.
- **CSV 내보내기**: `src/lib/fileExport.js`가 네이티브에서는 `@capacitor/filesystem`으로 공용
  `Documents` 폴더에 저장한 뒤 `@capacitor/share`로 공유 시트를 띄웁니다(웹뷰가 `<a download>` blob
  다운로드를 처리하지 못하는 제약을 우회). 웹/모바일 웹은 기존대로 blob 다운로드입니다.

---

## 7. 빌드 후 실기기 테스트 체크리스트

- [ ] 앱 실행 → 홈(분석) 화면이 뜸(**흰 화면이면 `server.url`이 틀렸거나 그 주소가 아직 배포 전** — 0번 참고)
- [ ] 상단 로고가 보임(웹 변경 사항은 배포된 사이트 기준으로 보임)
- [ ] 사진 촬영/갤러리 선택으로 음식 분석이 됨(실기기 — 에뮬레이터는 카메라 테스트 어려움)
- [ ] "내 주변에서 찾기" → 위치 권한 허용 후 지도·식당이 뜸
- [ ] 식당 카드의 "네이버 지도에서 보기" → 시스템 브라우저로 열림
- [ ] 로그인: **아이디/비밀번호**로 가입 → 즉시 홈 진입 → 앱 종료 후 재실행 시 로그인 유지
- [ ] CSV 내보내기 → 저장 완료 토스트 + 공유 시트 → 파일 앱에서 확인 → 같은 파일 다시 가져오기
- [ ] 하단 탭바가 제스처 바에 가리지 않음, 상단이 상태바에 가리지 않음
- [ ] 뒤로가기 버튼: 하위 화면 → 이전 화면, 홈에서 → 앱 종료
