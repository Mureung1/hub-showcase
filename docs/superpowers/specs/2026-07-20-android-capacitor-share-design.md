# Android Capacitor 공유 저장 설계

## 문서 상태

- 대상 이슈: #41
- 상위 이슈: #36
- 승인일: 2026-07-20
- 상태: 구현 설계 승인

## 목표

기존 React·Vite 웹 앱을 Capacitor Android 앱으로 제공하고, Android 공유 시트에서 아맞다를 선택하면 공유된 링크를 기존 운영 캡처 API로 즉시 저장한다. 로그아웃 사용자는 Google 로그인 뒤 처음 공유한 링크 저장을 자동으로 이어간다. 저장 뒤에는 결과와 선택적 한 줄 메모만 표시하고 완료하면 원래 앱으로 돌아간다.

## 확정한 제품 결정

- 앱을 직접 실행하면 기존 홈·보관함·저장 화면 전체를 제공한다.
- Android 앱 셸은 Capacitor를 사용한다.
- 공유 시 로그인되어 있지 않으면 Google 로그인을 진행하고 원래 공유를 자동으로 재개한다.
- 인증 전 공유 URL은 메모리에만 보관한다. 앱 프로세스가 종료되면 URL을 복구하지 않고 재공유를 안내한다.
- 저장 결과는 전체 보관함이 아닌 간단한 전용 화면으로 표시한다.
- 결과 화면의 완료 동작은 공유 Activity를 닫고 원래 앱으로 복귀한다.
- #41의 배포 범위는 Google Play가 포함된 Android 에뮬레이터와 디버그 APK까지다.
- Google Play Console, 운영 서명, 내부 테스트 트랙과 Android App Bundle 배포는 후속 범위다.

## 접근법 비교

### 1. Capacitor와 작은 네이티브 브리지

기존 React 화면, Supabase 인증과 API 계약을 재사용하고 Kotlin은 Android 공유 Intent와 Activity 수명 주기만 처리한다. 웹과 Android의 제품 동작을 같은 TypeScript 경계에서 유지할 수 있어 이 설계가 권장안이다.

### 2. Kotlin·Jetpack Compose 네이티브 앱

Android 플랫폼 통합은 자연스럽지만 화면, 인증, 상태 처리와 API 클라이언트를 별도로 구현해야 한다. 현재 MVP에서는 웹과 네이티브 구현이 빠르게 갈라질 위험이 더 크다.

### 3. PWA 패키징

가장 작지만 #37에서 이미 제공한 Android PWA 공유와 역할이 겹친다. 네이티브 Intent 수명 주기와 원래 앱 복귀를 명확히 제어해야 하는 #41의 목적에도 맞지 않는다.

## 시스템 경계

```text
공유 원본 앱
  → Android ACTION_SEND
  → Kotlin ShareIntent 브리지
  → React Android 공유 컨트롤러
  → Supabase 세션 확인 또는 시스템 브라우저 OAuth
  → Express /api/insights/capture
  → Supabase 사용자 인증·RLS 저장
  → React 저장 결과·선택 메모
  → Kotlin Activity 종료
  → 공유 원본 앱
```

네이티브 계층은 공유 입력 전달과 Activity 종료만 담당한다. URL 검증, 인증 상태, API 오류 매핑과 사용자 결과 상태는 TypeScript 계층에 둔다. 서버는 기존과 같이 Bearer 토큰을 검증하고 사용자별 RLS 경계에서 저장한다.

## 프로젝트 구성

### Capacitor 앱 셸

- Capacitor 설정은 저장소 루트의 `capacitor.config.ts`에서 관리한다.
- 앱 ID는 디버그와 후속 배포가 같은 OAuth 복귀 계약을 사용하도록 `com.ppre1ude.amadda`로 고정한다.
- 앱 이름은 `아맞다`다.
- 웹 산출물은 기존 Vite `dist`를 사용한다.
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app`, `@capacitor/browser`는 같은 Capacitor 8 메이저 버전으로 맞춘다.
- 앱을 직접 실행한 경우에는 기존 React 앱을 그대로 렌더링한다.

### Android 네이티브 경계

Android 앱은 `ACTION_SEND`와 `text/plain` Intent Filter를 등록한다. 네이티브 코드는 다음 기능만 외부에 공개한다.

- `getPendingShare()`: 앱이 처음 로드된 뒤 아직 소비하지 않은 공유 입력 한 건을 반환한다.
- `shareIntentReceived`: 이미 실행 중인 앱이 새 공유 Intent를 받으면 웹 계층에 알린다.
- `finishShare()`: 공유 결과 화면의 완료 동작에서 현재 Activity를 종료한다.

공유 입력은 `text`, 선택적 `title`, 일회성 `id`로 구성한다. 최초 실행과 `onNewIntent` 재진입 모두 같은 파서와 큐를 사용하며, 각 `id`는 한 번만 소비한다. 큐는 프로세스 메모리에만 존재한다.

### TypeScript 경계

- `src/shared/capacitor`는 Capacitor 런타임 감지와 네이티브 플러그인 어댑터를 제공한다.
- `src/features/android-share/model`은 공유 세션의 상태 전이와 인증·캡처·메모 조정을 담당한다.
- `src/features/android-share/ui`는 공유 결과 화면을 제공한다.
- 공통 캡처 HTTP 계약은 `src/entities/insight/api`에서 제공하고 Chrome 확장과 Android가 함께 사용한다.
- React 앱의 일반 실행 경로는 Android 공유 기능을 알 필요가 없으며, 공유 세션이 존재할 때만 전용 화면을 우선 렌더링한다.

## URL 추출

공유 MIME type은 `text/plain`만 등록한다. 수신 텍스트 전체가 URL이면 그대로 사용하고, 일반 문장이면 왼쪽에서 오른쪽으로 처음 나타나는 HTTP 또는 HTTPS URL을 사용한다. URL이 없거나 지원하지 않는 프로토콜이면 서버를 호출하지 않는다.

클라이언트 추출은 입력 대상을 찾기 위한 단계다. 정규화, 프로토콜 허용, 중복 판정과 최종 저장 계약은 기존 서버 캡처 서비스가 다시 검증한다.

## 인증 설계

### 로그인된 사용자

공유 컨트롤러는 현재 Supabase 세션에서 유효한 access token을 얻고 즉시 캡처 API를 호출한다. 토큰과 refresh token은 로그에 남기거나 네이티브 브리지로 전달하지 않는다.

### 로그아웃 사용자

1. 공유 URL과 제목을 React 메모리의 pending 상태에 둔다.
2. Capacitor Browser로 시스템 브라우저의 Google OAuth를 시작한다.
3. `com.ppre1ude.amadda://auth/callback` 딥링크로 앱에 돌아온다.
4. Supabase PKCE code를 세션으로 교환한다.
5. 세션이 확인되면 pending 공유를 `android_share`로 자동 캡처한다.
6. pending 공유를 메모리에서 제거한다.

PKCE verifier와 Supabase 세션은 Supabase 클라이언트의 앱 샌드박스 저장소를 사용한다. 공유 URL 자체는 저장하지 않는다. OAuth 도중 앱 프로세스가 종료되면 로그인 세션만 복원될 수 있으며, 결과 화면에서 링크 재공유를 안내한다.

웹 브라우저와 Chrome 확장의 기존 OAuth 경로는 변경하지 않는다. Capacitor 런타임에서만 시스템 브라우저와 모바일 딥링크 어댑터를 선택한다.

## 공유 저장 상태

공유 세션은 다음 상태만 가진다.

- `idle`: 일반 앱 실행
- `received`: 공유 입력을 수신하고 URL을 찾은 상태
- `authenticating`: Google 로그인을 기다리는 상태
- `saving`: 캡처 API를 호출하는 상태
- `saved`: 새 인사이트를 저장한 상태
- `duplicate`: 이미 저장된 인사이트를 찾은 상태
- `editing-memo`: 선택 메모를 입력하는 상태
- `completed`: 원래 앱으로 돌아가기 직전 상태
- `error`: 복구 행동을 보여주는 상태

같은 공유 `id`를 두 번 처리하지 않는다. 저장 성공과 중복은 모두 정상 결과이며 동일한 인사이트 ID를 메모 대상에 사용한다.

## 결과 화면

결과 화면은 기존 디자인 토큰과 `src/shared/ui` 공개 API만 사용한다. 화면에는 다음 요소만 둔다.

- 성공 아이콘과 `저장됨` 또는 `이미 저장됨`
- 저장한 인사이트 제목
- 선택적인 `메모 남기기`
- 메모 입력 시 200자 한 줄 메모와 저장 동작
- `완료` 또는 `원래 앱으로 돌아가기`

터치 대상은 최소 44px이고, 입력에는 보이는 label과 오류 연결을 제공한다. 성공과 오류는 색만으로 표현하지 않는다. 동기화, 메타데이터 수집, 토큰과 서버 내부 상태는 표시하지 않는다.

## 오류 처리

| 상황                         | 사용자 메시지                                  | 복구 동작                               |
| ---------------------------- | ---------------------------------------------- | --------------------------------------- |
| 공유 텍스트에 URL 없음       | `저장할 링크를 찾지 못했어요.`                 | 원래 앱에서 링크를 다시 공유            |
| 지원하지 않는 프로토콜       | `http 또는 https 링크만 저장할 수 있어요.`     | 다른 링크 다시 공유                     |
| Google 로그인 취소·실패      | `로그인을 완료하지 못했어요.`                  | 로그인 다시 시도 또는 원래 앱 복귀      |
| OAuth 중 앱 종료로 공유 유실 | `로그인은 완료됐지만 링크를 다시 받아야 해요.` | 원래 앱에서 다시 공유                   |
| 인증 만료·권한 거부          | `로그인이 필요해요.`                           | 로그인 뒤 저장 재시도                   |
| 네트워크·저장 실패           | `지금은 저장하지 못했어요.`                    | 입력을 유지하고 다시 시도               |
| 메모 저장 실패               | `메모를 저장하지 못했어요.`                    | 링크 저장 결과는 유지하고 메모만 재시도 |

예상하지 못한 오류는 안전한 `write-failed` 결과로 매핑하고 상세 오류, 토큰과 응답 본문을 사용자에게 노출하지 않는다.

## 보안 경계

- 클라이언트에는 Supabase URL과 publishable key만 포함한다.
- service role key, Google client secret과 Supabase access token을 문서·로그·APK 리소스에 기록하지 않는다.
- 캡처와 메모는 기존 Express API에 Bearer 토큰을 보내며 서버 인증과 RLS를 우회하지 않는다.
- Android에서 받은 외부 텍스트는 신뢰하지 않고 길이와 URL을 검증한다.
- 공유 URL은 인증 전 디스크, Preferences와 로그에 저장하지 않는다.
- OAuth는 시스템 브라우저와 PKCE를 사용하고 WebView 안에서 Google 로그인 화면을 열지 않는다.
- 프로덕션 배포 전에는 운영 서명 인증서와 검증된 Android App Link 도입 여부를 별도로 검토한다.

## 검증 전략

### TypeScript

- URL 전체와 일반 문장 속 첫 URL 추출
- URL 없음과 미지원 프로토콜 거부
- 최초 공유와 실행 중 재공유의 일회성 처리
- 로그인 세션이 있으면 즉시 캡처
- 로그아웃이면 OAuth 뒤 pending 공유 자동 재개
- 인증 도중 메모리 유실 안내
- 새 저장과 중복 저장의 결과·메모 대상 유지
- 캡처·메모 실패의 안전한 메시지와 재시도
- Android가 아닌 브라우저에서 기존 앱 흐름 유지

### Kotlin·Gradle

- `ACTION_SEND`와 `text/plain` 입력 파싱
- 다른 action과 MIME type 무시
- `EXTRA_TEXT`, `EXTRA_TITLE` 전달
- 최초 Intent와 `onNewIntent`의 일회성 소비
- Android 단위 테스트와 `assembleDebug`

### 에뮬레이터

- Google Play 포함 Android 가상 기기에 디버그 APK 설치
- 앱 직접 실행 후 기존 로그인·홈·보관함·저장 확인
- ADB `ACTION_SEND`로 URL과 URL 포함 일반 텍스트 공유
- 로그아웃 공유 → 시스템 브라우저 Google 로그인 → 자동 저장
- 저장됨·중복·메모·완료 후 원래 앱 복귀 확인
- URL 없음, 로그인 취소와 네트워크 실패 확인

## Capacitor 구현 문서

`docs/android-capacitor.md`를 구현과 함께 작성하고 다음 내용을 포함한다.

- Capacitor의 역할과 채택 이유
- React·TypeScript와 Android·Kotlin의 책임 경계
- Android Studio, SDK, JDK, ADB와 Google Play 에뮬레이터 준비
- 패키지 설치, 웹 빌드, `cap sync`, Gradle 테스트와 APK 생성 명령
- 생성 파일과 직접 관리 파일의 구분
- 앱 ID, 딥링크, Supabase Redirect URL과 환경 변수 설정
- 공유 Intent 브리지와 상태 흐름
- 에뮬레이터 공유·OAuth·메모 검증 절차
- 빌드, ADB, 딥링크와 OAuth 문제 해결
- Capacitor·Android SDK 버전 갱신 체크리스트

문서는 명령을 복사해 실행할 수 있는 순서로 작성한다. 버전은 `package.json`과 Gradle 설정을 단일 원천으로 삼고 문서에 중복 고정하지 않는다.

## 구현 순서

1. Capacitor 패키지와 Android 프로젝트 구성
2. Android 빌드·테스트 명령과 구현 문서 골격 추가
3. 공유 Intent 브리지와 Kotlin 단위 테스트
4. TypeScript 공유 플러그인 어댑터와 상태 컨트롤러
5. Capacitor 전용 Supabase OAuth·딥링크 연결
6. 저장 결과·선택 메모 UI
7. 공통 캡처 API 재사용과 Chrome 확장 회귀 검증
8. Android Studio·SDK·Google Play 에뮬레이터 준비
9. Gradle 테스트, 디버그 APK와 에뮬레이터 통합 검증
10. 구현 문서 명령과 문제 해결 절차 최종 검증

## 제외 범위

- Google Play Console과 내부 테스트 트랙
- 운영 keystore, App Bundle 서명과 스토어 제출
- iOS 앱과 Share Extension
- 오프라인 캡처와 나중에 동기화
- 인증 전 공유 URL 영속화
- 이미지·동영상·파일 공유
- 여러 URL 동시 저장

## 완료 판단

#41은 자동 테스트와 Android Gradle 빌드가 통과하고, Google Play 에뮬레이터에서 앱 직접 실행과 공유·로그인·저장·메모·복귀 흐름을 확인하며, `docs/android-capacitor.md`의 절차로 같은 결과를 재현할 수 있을 때 완료한다. Google Play 배포와 실제 Android 기기 검증은 #41 완료를 막지 않는다.
