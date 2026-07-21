# Mealyze 안드로이드 앱(APK) 빌드 가이드

이 프로젝트의 웹 앱을 **Capacitor**로 감싸 안드로이드 APK로 만드는 방법입니다. 웹 코드는 그대로 두고,
그 빌드 결과(`dist/`)를 앱이 감쌉니다. 웹 버전은 계속 그대로 동작합니다.

---

## 0. 두 가지 운영 방식 (먼저 결정)

| 방식 | 동작 | 장점 | 단점 | 추천 |
|---|---|---|---|---|
| **로컬 번들 모드**(기본) | `dist/`를 APK에 함께 넣고, `/api` 호출만 배포 백엔드로 보냄 | 첫 화면이 빠름, 오프라인에서 UI는 뜸 | 웹을 고칠 때마다 APK를 다시 빌드해야 함 | 스토어 정식 배포 시 |
| **원격 URL 모드** | 앱이 배포된 웹사이트를 그대로 로드 | **웹만 다시 배포하면 앱도 자동 갱신**(APK 재빌드 불필요), 설정이 가장 단순 | 항상 네트워크 필요 | **웹을 자주 고치는 지금 단계에 추천** |

- **원격 URL 모드로 하려면**: `capacitor.config.json`의 `android` 위에 아래를 추가하세요.
  ```json
  "server": { "url": "https://<배포주소>", "cleartext": false },
  ```
  이러면 아래 5번의 `VITE_API_BASE_URL` 설정은 필요 없습니다(앱이 배포 사이트를 통째로 로드하므로 `/api`도 그 사이트로 나갑니다).
- **로컬 번들 모드로 하려면**: `server.url`을 넣지 말고, 아래 5번에서 `VITE_API_BASE_URL`을 배포 백엔드 주소로 지정해 빌드하세요.

> 배포 백엔드 주소 예: `https://mealyze.onrender.com` 또는 `https://mealyze.vercel.app` (본인 배포 주소로 바꾸세요).

---

## 1. 사전 준비 (내 컴퓨터)

- **Android Studio** 설치: https://developer.android.com/studio (설치 시 Android SDK도 함께 설치됨)
- **JDK 17** (보통 Android Studio에 내장된 것으로 충분)
- 이 저장소에서 `npm install` 한 번 실행(Capacitor 패키지가 이미 `package.json`에 있습니다)

> 안드로이드 프로젝트 폴더(`android/`)는 이미 이 저장소에 생성돼 있습니다(`npx cap add android` 완료 상태).
> 권한(카메라·위치)도 `android/app/src/main/AndroidManifest.xml`에 이미 넣어뒀습니다.

---

## 2. 앱 아이콘·스플래시 설정 (선택, 권장)

로고 이미지로 앱 아이콘과 스플래시를 한 번에 생성합니다.

```bash
npm install -D @capacitor/assets
# 1024x1024 아이콘 원본을 assets/icon.png 로 두고(예: public/apk logo.png 를 1024로 리사이즈),
# 스플래시 배경용 assets/splash.png(2732x2732 권장)도 두면 좋습니다.
npx @capacitor/assets generate --android
```

이러면 `android/app/src/main/res/`의 각 해상도 아이콘이 자동으로 채워집니다. 하지 않으면 기본 Capacitor 아이콘이 쓰입니다.

---

## 3. 웹 빌드 → 앱 동기화

**로컬 번들 모드**라면 배포 백엔드 주소를 넣어 빌드해야 `/api` 호출이 그 서버로 나갑니다:

```bash
# Windows PowerShell
$env:VITE_API_BASE_URL="https://<배포주소>"; npm run app:sync
# macOS/Linux
VITE_API_BASE_URL="https://<배포주소>" npm run app:sync
```

**원격 URL 모드**라면 그냥:

```bash
npm run app:sync
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

- **외부 링크**(네이버 지도 상세, 광고 링크): 웹뷰 안에서 열려 갇히지 않도록 `src/lib/externalLink.js`가
  네이티브에선 시스템 브라우저(@capacitor/browser)로 엽니다. (웹에선 기존처럼 새 탭)
- **카메라·위치 권한**: `AndroidManifest.xml`에 `CAMERA`/`ACCESS_FINE_LOCATION`을 넣어뒀습니다. 사진 분석의
  `<input type=file>`와 주변 식당의 `navigator.geolocation`은 Capacitor 웹뷰가 기본 처리하며, 첫 사용 시
  안드로이드가 권한을 물어봅니다.
- **상단 상태바/하단 제스처 바 겹침**: 헤더는 `env(safe-area-inset-top)`, 하단 탭바는
  `env(safe-area-inset-bottom)`으로 안전영역을 이미 확보합니다.
- **뒤로가기 버튼**: `@capacitor/app`이 설치돼 있어 기본 뒤로가기가 동작합니다(웹 히스토리 기준).

### 아직 남은 제약

- **CSV 내보내기/게스트 백업 다운로드**(`csv.js`/`guestBackup.js`의 `<a download>` blob)는 안드로이드
  웹뷰에서 파일 다운로드가 기본 동작하지 않습니다. 앱에서 이 기능이 필요하면 `@capacitor/filesystem`으로
  파일을 저장하고 공유 시트로 내보내는 처리를 추가해야 합니다(현재는 웹 전용 기능으로 간주).

---

## 7. 빌드 후 실기기 테스트 체크리스트

- [ ] 앱 실행 → 홈(분석) 화면이 뜨고 상단 로고가 보임
- [ ] 사진 촬영/갤러리 선택으로 음식 분석이 됨(실기기)
- [ ] "내 주변에서 찾기" → 위치 권한 허용 후 지도·식당이 뜸
- [ ] 식당 카드의 "네이버 지도에서 보기" → 시스템 브라우저로 열림
- [ ] 로그인(구글/이메일) 동작 — 웹뷰에서 구글 로그인이 막히면 시스템 브라우저 기반으로 전환 필요
- [ ] 하단 탭바가 제스처 바에 가리지 않음, 상단이 상태바에 가리지 않음
- [ ] 뒤로가기 버튼이 자연스럽게 동작
