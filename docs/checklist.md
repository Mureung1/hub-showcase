# One-Step 개발 · 검증 체크리스트

> 각 기능 아래 세부 검증 항목은 verification-agent가 **코드와 테스트 결과를 근거로 PASS/FAIL을 판정**할 수 있도록 구체적으로 기술한다.
> 판정 규칙: 세부 항목이 **모두 PASS여야 해당 기능 PASS**. 하나라도 미충족·미검증이면 FAIL(또는 N/A 사유 명시).

---

## 1주차 — 프로젝트 기반 및 핵심 화면

> **진행 상황(2026-07-14): 1주차 완료.**
> 앱이 안드로이드 에뮬레이터(Pixel 6)에서 **실제 Firebase에 붙어** 실행되고, 홈·퀘스트 목록·퀘스트 등록 흐름이 끝까지 동작한다.
> 강제 종료 후 콜드 스타트에도 세션과 퀘스트가 유지된다.
> `flutter analyze` error·warning 0건, `flutter test` **전부 통과**.
>
> **SubAgent 교차 검증(verification / checklist / planning) 후 아래를 보강했다:**
> - `Quest`를 3상태(`todo`/`done`/**`stuck`**)로 확장 + `goalId`·`parentQuestId` 추가.
>   plan.md가 "진행 상태(완료·미완료·**멈춤**) 영속 저장"을 명시하고, 성공지표 「재분해 복귀율」의 분모가 `stuck`이다. 기존 `done` 문서는 하위호환으로 그대로 읽힌다.
> - **AI 응답 전용 엄격 파서**(`QuestDraft.parseStrict`) 분리. 기존엔 `Difficulty.fromName`(엄격)이 선언만 되고 프로덕션에서 호출되지 않아, AI가 이상한 난이도를 뱉으면 조용히 `normal`로 떨어져 **보상이 왜곡**됐다.
> - `ensureUser`를 **트랜잭션**으로. read-then-write라 경쟁 시 지급된 코인·XP를 0으로 되돌릴 수 있었다(3주차 보상 지급과 충돌).
> - `createQuests`에 `order` 오프셋. AI 분해 결과가 기존 퀘스트와 순서가 겹쳤다.
> - **셸·라우터 테스트 신규**(테스트 0개였다). 탭 재선택 루트 복귀·등록 후 화면 닫힘이 이제 자동 검증된다.
>
> 남은 항목 3개와 사유:
> - **iOS 빌드** — Windows 환경이라 검증 불가(N/A). 4주차에 CI로 증거 확보.
> - **브랜치 전략 문서** — 사용자 요청으로 생략(SKIP).
> - **Storage** — Blaze 요금제 필요. 3주차 사진 첨부 시점에 재판단(보류).

### 프로젝트 저장소 및 브랜치 전략 설정
- [ ] `main` 보호 및 기능 브랜치 네이밍 규칙이 문서(README 또는 CONTRIBUTING)에 명시되어 있다.
      → **SKIP**: 사용자 요청으로 브랜치 전략 문서를 작성하지 않음. GitHub 브랜치 보호는 레포 설정(Settings → Branches)이라 코드로 켤 수 없다.
- [x] `.gitignore`에 `build/`, `.dart_tool/`, `*.g.dart`(생성 파일), Firebase 비공개 키가 포함되어 원본 기획 `.docx`가 추적되지 않는다.
- [x] `git clone` 직후 `flutter pub get`이 오류 없이 완료된다. → Flutter 프로젝트가 레포 루트에 있어 추가 `cd` 없이 성공.

### Flutter 프로젝트 초기 구성
- [x] `flutter run`이 에러 없이 앱을 실행하고 첫 화면이 렌더된다. → 안드로이드 에뮬레이터에서 홈 화면(Lv.1 · 알 · XP 0/5 · 코인 0) 렌더 확인.
- [x] `flutter analyze` 결과 error 0건이다(warning은 사유 기록). → warning도 0건.
- [x] Android 빌드 성공 (`flutter build apk --debug` → `app-debug.apk`).
- [ ] iOS 빌드 → **N/A**: 개발 환경이 Windows 11이라 iOS 빌드 검증 불가(Xcode·CocoaPods는 macOS 전용). `ios/` 타깃은 생성·구성되어 있음. 4주차에 GitHub Actions `macos-latest`에서 `flutter build ios --no-codesign`으로 증거 확보 예정.
      > **주의**: 레포 경로에 한글이 있어(`D:\부트캠프\...`) Gradle이 빌드를 거부했다. `android.overridePathCheck=true` + `kotlin.incremental=false`(Kotlin 증분 캐시가 한글 경로에서 깨짐)로 해결. 네이티브/CMake 플러그인 도입 시 재발하면 레포를 ASCII 경로로 옮길 것.

### Firebase 프로젝트 연동

프로젝트 `one-step-16073` · 리전 `asia-northeast3` · 익명 로그인. 스키마·경계 설계는 `docs/firestore-schema.md`.

- [x] `Firebase.initializeApp()`이 앱 시작 시 성공하고, 실패 시 사용자에게 오류 화면을 보여준다.
      → 개발 중 실제로 초기화가 실패한 적이 있는데(pigeon 코덱 불일치) 크래시 없이 오류 화면으로 넘어갔다. 우연히 얻은 실증.
- [x] **Auth·Firestore·FCM** 3개 서비스 초기화 코드가 존재하고 콘솔에 프로젝트가 연결되어 있다.
      → `FirebaseBootstrap._warmUpServices()`. FCM 토큰 조회는 첫 프레임을 막지 않도록 await하지 않는다.
      > 알림 **권한 요청**은 부트스트랩에서 뺐다. 앱을 켜자마자 맥락 없이 푸시 권한을 물으면 거절률만 올라간다. 필요한 시점에 `requestNotificationPermission()`을 부른다.
- [ ] **Storage** 서비스가 콘솔에 연결되어 있다.
      → **보류**: Storage는 Blaze(종량제) 요금제가 필요한데 사용자가 결정을 미뤘다. 버킷이 프로비저닝되지 않았다.
      `FirebaseStorage.instance`는 lazy 게터라 버킷이 없어도 예외를 던지지 않는다 — **즉 초기화 코드가 도는 것은 Storage 연결의 증거가 아니다.**
      `storage.rules`는 작성해 뒀고 배포만 남았다. 3주차 사진 첨부 시점에 재판단한다.
      미도입 시 인증 보너스는 메모만으로도 성립한다(plan.md: "사진 **또는** 메모").
- [x] 네트워크가 없는 상태에서 초기화가 앱을 크래시시키지 않고 오류를 처리한다.
      → 3중 방어: ① 초기화 실패 시 오류 화면 ② Firestore 로컬 캐시(`persistenceEnabled`) ③ 캐시된 세션이 있으면 로그인이 네트워크를 건드리지 않음.
- [x] 익명 또는 테스트 계정으로 로그인/세션 유지가 동작한다.
      → 앱 강제 종료(`am force-stop`) 후 콜드 스타트에도 같은 uid로 이전 퀘스트가 그대로 보인다.

> **주의: Firebase 패키지 버전을 올리지 말 것.** `firebase_auth` 6.5.3+ 계열은 어떤 배포판에도 없는 `FirebasePlugin` 클래스를 상속해 빌드가 깨진다(상류의 조기 배포). `firebase_core`를 4.10.0에, `firebase_core_platform_interface`를 7.0.1(네이티브와 pigeon 필드 수가 맞는 버전)에 고정했다. 사유는 `pubspec.yaml` 주석 참고.
>
> **참고**: `google-services.json` / `firebase_options.dart`는 **비밀이 아니다.** 클라이언트 설정이고 어차피 APK에 담겨 배포된다. 보안은 이 파일을 숨겨서가 아니라 `firestore.rules`로 강제한다. 진짜 비밀인 서비스 계정 키는 `.gitignore`의 `*serviceAccount*.json`이 막는다.

### 공통 테마, 색상, 폰트 설정
- [x] 그린 `#006e2f`, 블루 `#0058be`, 노랑 `#ef9900`이 테마 상수로 정의되어 있다. → `lib/core/theme/app_colors.dart`, `reward_colors.dart`.
- [x] 노랑이 코인·보상 이외의 UI 요소에 사용되지 않는다(코드 검색으로 확인 가능).
      → **테스트로 강제**: `test/theme/color_role_test.dart`가 `lib/**`를 스캔해 허용 목록(reward_colors·app_theme·coin_pill·reward_chip·difficulty_pill·character_card) 밖의 노랑 사용을 FAIL 처리. 노랑은 `ColorScheme`에 넣지 않고 `RewardTheme` 확장으로만 노출한다.
      > 합의된 예외: `difficulty_pill.dart`(보통 난이도 pill의 노랑 틴트) — 난이도가 곧 보상 등급이므로 허용.
- [x] 폰트 Sora, 아이콘 Material Symbols, 12px 라운드가 공통 테마에 반영되어 있다. → Sora 가변폰트 번들(`assets/fonts/Sora-Variable.ttf`), `material_symbols_icons`, `AppRadius.md = 12`.
- [x] 다크/라이트 대비가 텍스트 가독성을 해치지 않는다. → `test/theme/contrast_test.dart`가 WCAG AA 4.5:1을 라이트·다크 양쪽에서 검증.

### 하단 내비게이션 구성
- [x] 흰 탭바 + 활성 탭 그린 표시가 디자인대로 렌더된다. → 에뮬레이터 스크린샷 + `test/features/root_shell_test.dart`(5탭 렌더 검증).
- [x] 각 탭 전환 시 화면이 올바르게 바뀌고 현재 탭 상태가 유지된다.
      → `StatefulShellRoute.indexedStack`(탭마다 별도 Navigator). 테스트가 **탭을 오갔다 돌아와도 등록 화면의 입력 내용까지 살아 있음**을 단언한다.
- [x] 탭 재선택 시 스크롤 초기화 또는 루트 복귀가 의도대로 동작한다.
      → `goBranch(initialLocation: true)` + `TabScrollRegistry`. 테스트가 하위 라우트에서 같은 탭 재선택 시 루트 복귀를 단언한다.

### 홈/캐릭터 화면 기본 레이아웃
- [x] 레벨·XP·코인 표시 영역이 데이터 바인딩되어 실제 값이 출력된다.
- [x] 데이터 로딩 중 스켈레톤/로더가 표시된다.
- [x] 데이터가 비어 있는 신규 사용자도 기본값(Lv.1, XP 0, 코인 0)으로 정상 렌더된다.
      → `test/features/home_screen_test.dart` 5개 통과. 캐릭터는 이모지 목업(🥚)으로 렌더(도트아트 자산 대기).

### 퀘스트 목록 화면 기본 레이아웃
- [x] 퀘스트가 0개일 때 빈 상태(empty state) 안내가 표시된다.
- [x] 퀘스트가 여러 개일 때 목록이 스크롤되고 각 항목에 제목·난이도가 보인다.
- [x] 로딩·오류 상태가 각각 구분되어 표시된다. → 로딩=스켈레톤, 오류=에러색+경고아이콘+재시도. `test/features/quest_list_screen_test.dart` 7개 통과.

### 퀘스트 등록 화면 구성
- [x] 제목 미입력 시 등록 버튼이 비활성 또는 오류 메시지가 노출된다. → 둘 다 구현(버튼 비활성 + validator).
- [x] 난이도(쉬움·보통·어려움)를 선택할 수 있고 기본값이 지정된다. → `SegmentedButton`, 기본값 보통.
- [x] 등록 성공 시 목록에 즉시 반영되고 **화면이 닫힌다**.
      → `test/features/root_shell_test.dart`가 실제 라우터 위에서 등록 → 화면 닫힘 → 목록 반영을 단언한다.
      (기존 위젯 테스트는 화면을 `home:`으로 띄워 `canPop()==false`라 **pop 분기를 한 번도 실행하지 않았다.**)

### 사용자·퀘스트 데이터 모델 정의
- [x] `users`(xp·level·coin·rebirth·equipped), `quests`(제목·난이도·마감·**status**) 필드가 모델 클래스로 정의되어 있다.
      → `Quest`는 `bool done`이 아니라 **3상태 `QuestStatus`**(todo/done/**stuck**)를 쓴다. plan.md 요구사항이자 「재분해 복귀율」 지표의 근거다.
      `goalId`(원본 목표) · `parentQuestId`(재분해 자식)로 재분해 추적이 가능하다.
- [x] JSON ↔ 모델 직렬화/역직렬화가 왕복 손실 없이 동작한다.
- [x] 필드 누락·타입 불일치 시 파싱이 예외를 던지거나 기본값으로 안전 처리한다.
      → **3개 파싱 경로가 목적별로 다르다:**
      ① `AppUser.fromJson` — 절대 throw하지 않음(홈 화면이 깨진 문서로 죽으면 안 됨).
      ② `Quest.fromJson` — 저장 문서용. `id`·`title` 누락 시 `FormatException`, 나머지는 관대. `status`가 없는 구버전 문서는 `done`으로 폴백(**하위호환**).
      ③ `QuestDraft.parseStrict` — **AI 응답 전용. 엄격.** 난이도가 조금이라도 이상하면 그 항목을 버린다. 난이도 = 보상 등급이라 조용한 폴백은 보상 경제를 왜곡한다.

### Firestore 컬렉션 구조 정의
- [x] `users`, `quests`, `achievements`, `inventory` 컬렉션 경로 규칙이 문서화되어 있다.
      → `lib/core/constants/firestore_paths.dart` + `docs/firestore-schema.md`. 사용자 하위 컬렉션 구조라 소유권이 경로에 인코딩되고, 보안 규칙이 한 줄로 끝나며 복합 인덱스가 필요 없다.
- [x] 문서 읽기/쓰기 보안 규칙(rules)이 인증 사용자로 제한되어 있다.
      → `firestore.rules` 배포 완료. 기본 전부 거부(default deny), 사용자는 자기 문서와 하위 컬렉션만 접근.
- [x] 신규 사용자 최초 접속 시 `users` 문서가 자동 생성된다.
      → `ensureUser()`가 `set(merge: true)`로 멱등 생성. 앱 재실행 시 기존 값을 덮어쓰지 않는다.

---

## 2주차 — AI 도전 분해 엔진

### 큰 목표 입력 컴포넌트
- [x] 목표 텍스트를 입력·수정할 수 있고 최대 길이 제한이 있다.
      → `quest_split_screen.dart` TextField(maxLength:60)로 입력·수정 가능, 60자 초과 자동 잘림. 테스트: `test/features/quest_split_screen_test.dart`(60자 잘림). verification-agent 2회 PASS + 전체 209 테스트 통과 + analyze 0건.
- [x] 빈 값 또는 공백만 입력 시 분해 요청이 막히고 안내 메시지가 뜬다.
      → 공백-only 시 errorText "공백만으로는 분해할 수 없어요" 노출 + 버튼 비활성(이중 방어). 테스트: `test/features/quest_split_screen_test.dart`(공백 안내).
- [x] 과도하게 긴 입력·특수문자 입력에서 크래시 없이 처리된다.
      → 과길이는 maxLength로 잘리고 특수문자도 크래시 없이 분해됨. 테스트: `test/features/quest_split_screen_test.dart`(특수문자 분해).

### AI 분해 요청 버튼 및 로딩 상태
- [x] 요청 중 버튼이 비활성화되고 로딩 인디케이터가 표시된다.
      → 요청 중 버튼 비활성 + 로딩 인디케이터 노출. 테스트: `test/features/quest_split_screen_test.dart`("분해 중 로딩 인디케이터+중복 실행 차단"). verification-agent 2회 PASS + 전체 209 테스트 통과 + analyze 0건.
- [x] 요청 중 중복 클릭이 무시되어 요청이 한 번만 나간다.
      → `_submit` early-return으로 중복 클릭 무시. 테스트: `test/features/quest_split_screen_test.dart`(중복 실행 차단).
- [x] 로딩 색상·아이콘이 AI 정보용 블루 규칙을 따른다.
      → 로딩 인디케이터가 블루(secondary) 규칙 사용. 테스트: `test/features/quest_split_screen_test.dart`.

### LLM 프롬프트 초안 작성
→ 실제 Gemini Flash 연동(`RemoteQuestDecomposer`) 구현으로 해소. 프롬프트는 `lib/repositories/decompose/gemini_prompt.dart`가 정본. 실 키 1회 실증(스모크)은 사용자 몫(`--dart-define=GEMINI_API_KEY=…`).
- [x] 프롬프트가 난이도(쉬움·보통·어려움) 분류와 JSON 출력 형식을 명시적으로 지시한다.
      → `gemini_prompt.dart`가 난이도 easy/normal/hard 분류(규칙 문구) + JSON 배열 출력 형식(`_schemaInstruction`)을 명시 지시하고, `remote_quest_decomposer.dart`의 `responseSchema`(difficulty enum)로 구조화 출력까지 강제한다. 테스트: `test/repositories/gemini_prompt_test.dart`(난이도 어휘·JSON 배열 출력).
- [x] 프롬프트에 목표가 안전하게 삽입되어 인젝션/이스케이프 문제가 없다.
      → `_safeGoal`이 목표를 `jsonEncode`로 JSON 리터럴 이스케이프해 삽입, 지시문 위장(개행·따옴표)을 데이터로 가둔다. 테스트: `test/repositories/gemini_prompt_test.dart`(인젝션 시도 이스케이프).
- [x] 프롬프트 버전이 코드에 상수/설정으로 관리되어 재현 가능하다.
      → `kPromptVersion` 상수(`gemini_prompt.dart`)로 버전 관리. 테스트: `test/repositories/gemini_prompt_test.dart`(버전 상수 비어있지 않음).
      → 검증 경계: 프롬프트 문구·이스케이프·버전은 유닛 테스트로 결정적 확인됨. 단 **실제 Gemini 엔드포인트/모델(gemini-2.0-flash) 수용 여부는 실 키 스모크 전까지 미실증**(MockClient는 네트워크 미호출).

### 마이크로 퀘스트 JSON 스키마 정의
- [x] 스키마에 `title`, `difficulty`(easy/normal/hard), 순서 필드 등 필수 키가 정의되어 있다.
      → `QuestDraft.parseStrict`/`parseList`(`lib/models/quest_draft.dart`)가 필수 키(title/difficulty/order) + 난이도 enum 스키마를 정의한다. 테스트: `test/models/quest_draft_test.dart`. verification-agent 2회 PASS + 전체 209 테스트 통과 + analyze 0건.
- [x] 스키마 검증기가 필수 필드 누락·잘못된 난이도 값을 거부한다.
      → `parseStrict`가 필수 키 누락·잘못된 난이도 값을 거부한다. 테스트: `test/models/quest_draft_test.dart`.
- [x] 스키마에 맞는 유효 응답은 통과하고 모델 리스트로 변환된다.
      → 유효 응답을 `parseList`가 모델 리스트로 변환한다. 테스트: `test/models/quest_draft_test.dart`.
      → 경계: 스키마·객체 검증기는 완성·테스트됨(실제 AI와 무관한 계약). 단, LLM 텍스트 문자열→객체 디코드(코드펜스 제거·jsonDecode)는 별개 조각으로 실제 LLM 연동(RemoteQuestDecomposer) 시 추가된다.

### AI 응답 파싱 및 예외 처리
→ `RemoteQuestDecomposer`(`lib/repositories/decompose/remote_quest_decomposer.dart`)로 코드펜스 파싱·타임아웃까지 완성. 모든 실패는 `AppFailure`로 정규화 → 상위 `DecomposeNotifier`가 템플릿 폴백. 전 경로 `MockClient`로 결정적 검증(네트워크 미호출). 실 키 1회 실증(스모크)은 사용자 몫(`--dart-define`).
- [x] 정상 JSON 응답이 퀘스트 리스트로 정확히 파싱된다.
      → `_generate`→`_extractText`→`_parseDrafts`→`QuestDraft.parseList`로 draft 리스트 변환. 테스트: `test/repositories/remote_quest_decomposer_test.dart`(정상 JSON 배열 → draft 리스트, order 연속).
- [x] **JSON 파싱 오류**(깨진 JSON, 코드펜스 포함 등) 시 예외를 잡아 폴백으로 넘어간다.
      → `_stripCodeFence`가 ```json/``` 코드펜스 제거 후 `jsonDecode`, 실패 시 `ParseFailure` → 상위 폴백. 테스트: `test/repositories/remote_quest_decomposer_test.dart`(코드펜스 벗겨 파싱, 언어태그 없는 펜스, 깨진 JSON → ParseFailure).
- [x] **필수 필드 누락** 응답을 감지해 해당 항목을 제외하거나 폴백 처리한다.
      → `QuestDraft.parseList`가 title 누락·오염 난이도 항목을 제외하고 정상만 살린다. 전부 불량이면 `_parseDrafts`가 `ParseFailure`로 승격(0개를 성공으로 오해 금지). 테스트: `test/repositories/remote_quest_decomposer_test.dart`(오염/불량 제외, 전부 불량 → ParseFailure).
- [x] **응답 지연(타임아웃)** 시 지정 시간 후 요청을 중단하고 오류/폴백을 노출한다.
      → POST에 `.timeout(timeout)`(기본 20초) → `TimeoutException` → `NetworkFailure` → 상위 폴백. 테스트: `test/repositories/remote_quest_decomposer_test.dart`(응답 지연이 timeout 초과 → NetworkFailure).
- [x] **API 실패**(4xx/5xx, 네트워크 오류) 시 앱이 크래시하지 않고 오류 메시지를 보여준다.
      → 4xx/5xx → `UnknownFailure('HTTP …')`, `SocketException`/`http.ClientException` → `NetworkFailure`, 후보 없는 200 → `UnknownFailure`. 크래시 없이 전부 `AppFailure`로 상위 폴백. 테스트: `test/repositories/remote_quest_decomposer_test.dart`(HTTP 400/500, Socket/ClientException, 후보 없음).
      → 검증 경계: 파싱·에러 매핑 7종은 MockClient로 결정적 확인됨(네트워크 미호출). **실제 Gemini 응답 포맷/에러 코드 수용 여부는 실 키 스모크 전까지 미실증**.

### 분해 결과 목록 컴포넌트
- [x] 분해된 각 퀘스트의 제목과 난이도 뱃지가 표시된다.
      → `QuestDraftCard`(`lib/features/quest/widgets/quest_draft_card.dart`)가 제목 + DifficultyPill을 표시한다. 테스트: `test/features/quest_draft_card_test.dart` + `test/features/quest_split_screen_test.dart`. verification-agent 2회 PASS + 전체 209 테스트 통과 + analyze 0건.
- [x] 결과가 0개일 때(모두 폴백 실패 등) 안내와 재시도 수단이 제공된다.
      → 0개 시 EmptyView + "다시 시도" 노출. 테스트: `test/features/quest_split_screen_test.dart`.
- [x] 목록 항목이 많아도 스크롤·렌더가 정상 동작한다.
      → ListView 기반 스크롤 렌더. 테스트: `test/features/quest_split_screen_test.dart`.

### 퀘스트 제목 수정 기능
- [x] 제목을 수정하면 화면과 내부 상태가 즉시 갱신된다.
      → `DecomposeNotifier.editTitle`이 상태를 즉시 갱신한다. 테스트: `test/features/decompose_notifier_test.dart` + `test/features/quest_split_screen_test.dart`. verification-agent 2회 PASS + 전체 209 테스트 통과 + analyze 0건.
- [x] 빈 제목으로 수정 시 저장이 막히거나 이전 값이 유지된다.
      → `editTitle`이 빈 제목을 거부하고 이전 값을 유지, 다이얼로그 저장 버튼도 비활성. 테스트: notifier + widget.
- [x] 수정 결과가 일괄 등록 시 반영된다.
      → 편집분이 `confirm()`의 drafts로 등록된다. 테스트: notifier + widget.

### 퀘스트 삭제 기능
- [x] 개별 퀘스트 삭제 시 목록에서 즉시 제거된다.
      → `DecomposeNotifier.remove`가 대상을 즉시 제거한다. 테스트: `test/features/decompose_notifier_test.dart` + `test/features/quest_split_screen_test.dart`. verification-agent 2회 PASS + 전체 209 테스트 통과 + analyze 0건.
- [x] 삭제 후 남은 항목의 순서/인덱스가 깨지지 않는다.
      → `remove`가 order를 0..n으로 재인덱싱한다. 테스트: notifier.
- [x] 전체 삭제 후 빈 상태가 정상 표시된다.
      → 전체 삭제 후 EmptyView 표시. 테스트: widget.

### 개별 또는 전체 재생성 기능
- [x] 개별 항목 재분해 요청이 해당 항목만 새 결과로 교체한다.
      → `DecomposeNotifier.redecomposeOne(localId)`이 대상 index를 하위 초안들(1→여러)로 splice하고 전체 order를 0..m 연속 재번호하며 형제 항목을 보존한다(원본 goalText 맥락 전달). 실패(timeout/empty)·중복 탭(single-flight `regeneratingItemId`) 시 원본 보존. 카드의 🔄는 블루 secondary만 사용. 테스트: `test/features/decompose_notifier_test.dart`(redecomposeOne 8종: 성공 교체·형제 보존·order 연속·localId 유일·실패 보존·single-flight·미발견·null) · `test/features/quest_split_screen_test.dart`(🔄 노출·성공 카드 증가·실패 스낵바+원본 유지·재분해 중 스피너).
- [x] 전체 재생성 시 기존 목록을 대체하며 로딩·중복요청 방지가 동작한다.
      → `DecomposeNotifier.regenerateAll()`이 `isRegenerating` 플래그로 중복요청을 막고, 화면 "다시 나누기" 버튼으로 기존 목록을 새 결과로 대체한다. 테스트: `test/features/decompose_notifier_test.dart`(regenerateAll 그룹) · `test/features/quest_split_screen_test.dart`(재생성 위젯 테스트).
- [x] 재생성 실패 시 기존 결과가 보존된다(데이터 유실 없음).
      → `regenerateAll`이 AppFailure·빈결과 시 기존 `drafts`를 보존한다(템플릿 폴백하지 않음). 테스트: `test/features/decompose_notifier_test.dart`(재생성 실패 시 drafts 보존). 커밋 25cfe40.

### 난이도 수동 변경 기능
- [x] 사용자가 난이도를 easy/normal/hard로 바꾸면 예상 보상 표시도 함께 갱신된다.
      → `DecomposeNotifier.changeDifficulty`(easy/normal/hard)로 RewardChip 수치가 갱신된다. 테스트: `test/features/decompose_notifier_test.dart` + `test/features/quest_split_screen_test.dart`. verification-agent 2회 PASS + 전체 209 테스트 통과 + analyze 0건.
- [x] 허용되지 않은 값으로 설정할 수 없다.
      → Difficulty enum이라 허용값만 설정 가능. 테스트: notifier.
- [x] 변경 결과가 등록·저장 시 유지된다.
      → 변경분이 등록 시 유지된다. 테스트: notifier + widget.

### 분해 결과 일괄 등록 기능
- [x] 확정 결과가 `quests` 컬렉션에 일괄 저장되고 오늘의 퀘스트 목록에 나타난다.
      → `DecomposeNotifier.confirm()`이 `createQuests(uid, drafts, goalId)` 원자적 batch로 저장하고, 성공 시 `context.pop()`으로 목록에 복귀(stream 자동 갱신)한다. 테스트: `test/features/decompose_notifier_test.dart`(confirm 성공) · `test/features/quest_split_screen_test.dart`(등록 성공: pop+저장+스낵바).
- [x] 등록 중 오류 발생 시 부분 저장으로 인한 데이터 불일치가 없다(원자성 또는 롤백).
      → `createQuests`가 batch라 부분 저장이 불가능하다. goal 저장 후 quests 실패 시 남는 orphan goal은 어떤 quest도 가리키지 않아 무해. goal/quest 실패 양쪽 테스트로 drafts 보존 + quests 미저장을 검증. 테스트: `test/features/decompose_notifier_test.dart`.
- [x] 등록 후 앱을 재실행해도 저장된 퀘스트가 그대로 유지된다.
      → 아키텍처로 보장: Firestore `batch.commit`이 영속 기록하고 `fetchQuests`/`watchQuests`가 Firestore를 단일 진실원으로 조회한다. in-memory 테스트로 "저장→재조회 존재"를 검증(프로세스 재시작 리터럴 재현 테스트는 없음).

### AI 응답 실패 시 템플릿 폴백
- [x] JSON 오류·필드 누락·타임아웃·API 실패 각 경우에 대표 도전 유형 **템플릿 퀘스트**가 대신 제공된다.
      → `DecomposeNotifier._fallback` + `templateFor`(`lib/repositories/decompose/quest_templates.dart`)가 empty/timeout/serverError/brokenJson에 템플릿을 제공한다. 테스트: `test/features/decompose_notifier_test.dart`(폴백 그룹). verification-agent 2회 PASS + 전체 209 테스트 통과 + analyze 0건.
- [x] 폴백으로 생성된 퀘스트도 정상적으로 수정·삭제·등록이 가능하다.
      → 폴백 퀘스트도 편집·삭제·등록 동일 경로로 처리된다. 테스트: notifier + widget.
- [x] 폴백 발생 사실이 사용자에게(또는 로그로) 구분 가능하게 표시된다.
      → `_FallbackBanner`(source==template)로 폴백 사실을 구분 표시한다. 테스트: widget(폴백 배너).

### 잘못된 응답 및 지연 상황 테스트
- [x] 깨진 JSON·필드 누락·타임아웃·서버 오류를 모의(mock)한 테스트 케이스가 존재하고 통과한다.
      → `test/repositories/fake_quest_decomposer_test.dart` + `test/features/decompose_notifier_test.dart`(폴백 그룹)이 각 실패를 모의·통과. verification-agent 2회 PASS + 전체 209 테스트 통과 + analyze 0건.
- [x] 위 모든 실패 경로에서 앱이 크래시하지 않고 사용자 흐름이 이어진다.
      → 실패 경로 모두 크래시 없이 폴백/안내로 이어진다. 테스트: notifier + widget.
- [x] 실패 후 재시도가 정상 동작한다.
      → `regenerateAll`/`redecomposeOne`/EmptyView "다시 시도"로 재시도 동작. 테스트: notifier + widget.

---

## 3주차 — 퀘스트 실행 및 보상 루프

### 오늘의 퀘스트 목록 조회
- [ ] 등록된 오늘 퀘스트가 Firestore에서 조회되어 표시된다.
- [ ] 조회 로딩·오류·빈 상태가 각각 구분되어 처리된다.
- [ ] 앱 재실행 후에도 동일 목록이 유지된다.

### 직접 퀘스트 등록 기능
- [ ] AI 없이 제목·난이도를 직접 입력해 등록할 수 있다.
- [ ] 빈 제목·난이도 미선택 시 등록이 막힌다.
- [ ] 등록 즉시 목록과 저장소에 반영된다.

### 난이도 뱃지 표시
- [ ] 각 퀘스트에 easy/normal/hard 뱃지가 일관된 색/라벨로 표시된다.
- [ ] 난이도 변경 시 뱃지가 즉시 갱신된다.

### 예상 코인·XP 표시
- [ ] 쉬움 코인3/XP5, 보통 코인5/XP10, 어려움 코인10/XP20이 정확히 표시된다.
- [ ] 표시 색상이 코인·보상용 노랑 규칙을 따른다.
- [ ] 난이도 변경 시 예상 보상 수치가 함께 바뀐다.

### 퀘스트 완료 체크 기능
- [x] 완료 체크 시 상태가 done으로 바뀌고 화면에 반영된다.
- [x] 완료 처리 중 로딩 표시가 있고 중복 탭이 무시된다.
- [x] 완료 실패(네트워크 오류) 시 상태가 롤백되고 오류가 안내된다.
      → `QuestListScreen._toggle`(`_completing` 진행 표시 · `_pending` 중복 탭 잠금)과 `completeQuest`. 실패는 `AppFailure`를 잡아 스낵바로 안내하고, 트랜잭션이 커밋되지 않아 상태·잔액이 함께 불변이다. 테스트: `test/features/quest_list_screen_test.dart`.

### 완료 확인 화면
- [x] 완료 시 획득한 코인·XP가 확인 화면/연출로 표시된다.
- [x] 확인 화면 표시 값이 실제 지급 값과 일치한다.
      → `QuestCompleteDialog`(트로피 + 퀘스트명 + 코인·XP, 인증 보너스 시 함께 표시). **지급한 쪽이 반환한 `Reward`를 그대로 표시**하고 난이도에서 역산하지 않아, 보너스가 붙어도 표시와 실지급이 어긋나지 않는다.

### 난이도별 보상 계산 로직
- [x] `계산(easy)=코인3·XP5`, `계산(normal)=코인5·XP10`, `계산(hard)=코인10·XP20` 단위 테스트가 통과한다.
- [x] 알 수 없는 난이도 입력 시 안전한 기본값 또는 예외 처리가 된다.
      → `rewardFor`(`lib/core/constants/reward_rules.dart`). 테스트: `test/core/reward_rules_test.dart`, `test/models/quest_test.dart`. `Difficulty`가 enum이라 알 수 없는 값 자체가 타입 수준에서 불가능하다.
- [ ] 보너스·상한·점감 적용 순서가 명확히 정의되어 있다.
      → **보류**: 인증 보너스(`kVerificationBonus`)만 구현됐고 **하루 코인 상한·반복 보상 점감이 미구현**이라 셋의 적용 순서를 정의할 대상이 없다. 상한·점감(chunk C) 구현 시 함께 판정한다.

### Firestore 트랜잭션 기반 코인·XP 지급
- [x] 코인·XP 지급이 **트랜잭션으로 원자적**으로 처리되어 부분 반영이 없다.
- [x] 동시 완료 요청에서도 잔액이 정확히 누적된다(경쟁 상태 안전).
- [x] 트랜잭션 실패 시 사용자 잔액과 퀘스트 상태가 모두 변경되지 않는다.
- [x] 지급 성공 후 홈/캐릭터 화면의 코인·XP가 즉시 갱신된다.
      → `FirestoreQuestRepository.completeQuest`의 `runTransaction` 하나에 퀘스트 상태·메모·코인·XP·성취 기록이 모두 담긴다. read-before-write를 지키고 잔액은 `FieldValue.increment`라 동시 요청에서도 누적이 정확하다. 홈은 `watchUser` 스트림 구독이라 커밋 즉시 갱신된다.

### 완료 상태 저장
- [x] 완료 상태가 Firestore에 영속 저장되고 앱 재실행 후에도 done으로 표시된다.
- [x] 저장 실패 시 재시도 또는 오류 처리가 된다.
      → `status`·`completedAt`·`rewardedAt`이 문서에 영속되고 목록은 `watchQuests`로 다시 읽으므로 재실행 후에도 done이 유지된다(구조적 근거). 저장 실패는 `AppFailure` → 스낵바.

### 사진 첨부 기능
- [x] 사진 선택·업로드가 동작하고 진행/완료 상태가 표시된다.
- [x] 업로드 실패(용량 초과·네트워크 오류) 시 오류가 안내되고 완료는 사진 없이도 가능하다.
- [x] 잘못된 파일 형식이 거부된다.
      → **Storage 우회 구현**: 1주차·본 섹션에서 보류했던 이유(Blaze 요금제 미결정으로 Storage 버킷 미프로비저닝)는 지금도 유효하다 — Storage 자체는 여전히 안 붙였다. 대신 **Firestore base64 우회**로 사진 인증을 구현했다. 압축 썸네일을 base64로 만들어 성취·퀘스트 문서가 아니라 **별도 문서 `users/{uid}/proofs/{questId}`** 에 담는다(목록 조회 때 이미지 바이트가 딸려와 읽기 비용이 폭증하는 것을 막으려 문서를 분리). plan.md의 "사진 **또는** 메모" 요건은 이제 메모뿐 아니라 사진으로도 성립한다.
      → **선택·업로드·상태 표시**: `image_picker`로 갤러리 픽업 시 압축(가로 `kProofMaxWidth` 800px · 품질 `kProofImageQuality` 50)해 수십 KB로 줄인다. 첨부 중에는 스피너(`CircularProgressIndicator`), 첨부 후에는 썸네일 미리보기 + 제거(×) 버튼을 보인다. 저장은 완료 트랜잭션에 포함된다. `lib/features/quest/widgets/quest_memo_sheet.dart`, `lib/repositories/firestore/firestore_quest_repository.dart`(proof 문서 쓰기), 정책 단일 진실원 `lib/core/constants/proof_rules.dart`.
      → **실패 안내·사진 없이 완료**: 크기 상한 `kMaxProofBase64Bytes`(700 KiB, Firestore 1 MiB 문서 리밋에서 물러선 값)를 **화면·저장소 이중 방어**한다 — 화면은 초과 시 `kProofTooLargeMessage`('사진이 너무 커요…') 스낵바로 첨부를 거부하고, 저장소는 `ensureProofWithinLimit`가 초과분에 `AppFailure`를 던진다(`firestore_quest_repository.dart:188`). 네트워크 오류는 기존 `completeQuest` → `AppFailure` → 스낵바 경로를 탄다. 인증은 "메모 또는 사진"이라 사진 없이도(둘 다 없어도) 완료가 성립한다. 테스트 `test/repositories/in_memory_quest_repository_test.dart`(크기 초과 거부 시 proof 미저장·상태/잔액 불변 라인 629~660, 사진 없이 완료 라인 614~620).
      → **형식 거부**: `image_picker`의 `pickImage`가 이미지 타입만 반환하므로 비이미지 파일은 애초에 선택 자체가 불가능하다(형식 거부가 플랫폼 레벨에서 자연 충족). **별도의 형식 검증 코드는 두지 않았다** — 필요가 없어서다. 코드로 방어하는 것은 형식이 아니라 크기(위 이중 방어)다.

### 메모 작성 기능
- [x] 메모를 입력·저장할 수 있고 재실행 후에도 유지된다.
- [x] 빈 메모는 선택 사항으로 허용되고 보너스 조건에서 제외된다.
- [x] 과도한 길이 입력이 안전하게 잘리거나 제한된다.
      → `quest_memo_sheet.dart`의 시트에서 입력 → `quests/{id}.memo`에 영속. 공백만인 메모는 `normalizeMemo`가 null로 만들어 인증이 성립하지 않는다(정의는 이 함수 한 곳). 길이는 **UI 입력 단계(`TextField(maxLength: kMaxMemoLength)`)와 저장소 레벨 절단 양쪽**에서 제한된다. `normalizeMemo`가 `kMaxMemoLength(200)`로 `String.characters.take`(그래프임 기준 절단이라 이모지·조합형 한글이 안전하게 유지됨) 처리하고, UI와 저장소가 같은 상수를 인용해 단일 진실원을 유지한다. 테스트: `test/repositories/normalize_memo_test.dart`(9건).

### 인증 첨부 시 보너스 보상 지급
- [x] 사진 또는 메모 인증 시 정의된 보너스 코인·XP가 추가 지급된다.
- [x] 인증 없이 완료 시 보너스가 지급되지 않는다.
- [x] 보너스 지급도 트랜잭션에 포함되어 중복·부분 지급이 없다.
      → 메모 인증 시 `kVerificationBonus`(+3/+3)를 기본 보상에 합산 지급(보통 5/10 → 8/13). 보너스도 기본 보상과 **같은 트랜잭션·같은 `rewardedAt` 가드** 아래라 중복·부분 지급이 없다. 사진 인증도 위 「사진 첨부 기능」대로 Firestore base64 우회로 구현되어, plan.md의 "사진 **또는** 메모" 요건을 사진·메모 어느 쪽으로도 충족한다(보너스 조건은 인증 유무이므로 경로와 무관하게 동일 적용).

### 성취 기록 저장
- [x] 완료·인증 시 `achievements`에 기록이 저장된다.
- [x] 기록에 퀘스트·시각·지급 보상이 포함되어 후속 검증이 가능하다.
- [x] 저장 실패 시 오류 처리되고 보상 지급과 정합성이 유지된다.
      → `users/{uid}/achievements`에 **최초 지급 시에만** 1건(questId·questTitle·coin·xp·memo·verified·completedAt). 보상 지급과 같은 트랜잭션이라 "보상은 줬는데 기록이 없다"가 불가능하고, 재완료 시 기록도 중복되지 않는다. 모델 `lib/models/achievement.dart`, 테스트 `test/models/achievement_test.dart`.

### 중복 완료 방지 처리
- [x] 이미 완료된 퀘스트를 다시 완료해도 **코인·XP가 재지급되지 않는다**.
- [x] 완료 요청 중복(빠른 연타/재시도)에서 지급이 정확히 1회만 발생한다.
      → 가드는 상태나 `completedAt`이 아니라 **`rewardedAt`**이다. 한번 찍히면 지워지지 않으므로 완료 → 해제 → 재완료로도 재지급이 없다(코인 파밍 차단). 연타는 `_pending` + 트랜잭션 재시도 시 `alreadyPaid` 조기 반환으로 1회만 지급. 테스트: `test/features/quest_list_screen_test.dart`의 `★ 완료 → 해제 → 재완료해도 재지급되지 않는다 (파밍 차단)`.
- [x] 중복 시도 시 사용자에게 이미 완료됨이 안내된다.
      → `quest_list_screen.dart`가 `done && reward == null`(이미 보상받은 퀘스트 재완료)일 때 스낵바 '이미 완료한 퀘스트예요'를 노출한다. 완료 해제(done=false)에는 스낵바가 뜨지 않아 오탐을 막는다. 재지급이 없을 때 `completeQuest`가 `null`을 반환하고 축하 연출은 생략된다. 테스트: `test/features/quest_list_screen_test.dart`(재완료→스낵바+연출없음, 완료해제→스낵바 안 뜸).

### 출석/스트릭 체크 및 연속 출석 보너스(7일) 지급
- [ ] 일자별 출석이 기록되고 연속 일수가 정확히 계산된다.
- [ ] 7일 연속 달성 시 보너스가 1회만 지급된다.
- [ ] 하루 걸러 접속 시 스트릭이 올바르게 초기화된다.
      → **미착수**: chunk C 예정.

### 하루 코인 획득 상한 처리
- [ ] 하루 누적 코인이 상한에 도달하면 초과분이 지급되지 않는다.
- [ ] 상한 도달 상태가 사용자에게 안내된다.
- [ ] 날짜가 바뀌면 상한 카운터가 초기화된다(시간대 기준 명확).
      → **미착수**: chunk C 예정. 「난이도별 보상 계산 로직」의 적용 순서 항목이 이것과 아래 점감에 물려 있다.

### 동일·유사 퀘스트 반복 보상 점감(diminishing) 처리
- [ ] 동일/유사 퀘스트 반복 완료 시 보상이 정의된 규칙대로 점감한다.
- [ ] 점감 후에도 음수 보상이 발생하지 않는다(하한 0 또는 최소값).
- [ ] 점감 계산에 대한 단위 테스트가 통과한다.
      → **미착수**: chunk C 예정.

---

## 4주차 — 캐릭터 성장 및 통합 검증

### 현재 레벨 및 XP 표시
- [ ] 현재 레벨과 XP가 저장값과 일치하게 표시된다.
- [ ] 데이터 로딩 중/오류 상태가 처리된다.

### 경험치 프로그레스 바
- [ ] 진행률이 `현재XP / 다음레벨필요XP`에 맞게 렌더된다.
- [ ] 경계값(0%, 100%)에서 시각적으로 깨지지 않는다.

### 캐릭터 기본 렌더링
- [ ] 캐릭터가 정상 렌더된다 — **도트아트 자산 완성 전에는 이모지 목업 렌더도 PASS 조건**이며, 자산 로드 실패 시 대체 표시(이모지)가 나온다.
- [ ] 장착(equipped) 아이템이 캐릭터에 반영된다.

### 레벨업 처리
- [ ] XP가 임계값 도달 시 레벨이 오르고 남은 XP가 이월된다.
- [ ] 한 번에 여러 레벨 상승하는 경우도 정확히 계산된다.
- [ ] 레벨업 결과가 영속 저장되고 재실행 후 유지된다.

### 진화 단계 변경 처리
- [ ] 정의된 레벨 도달 시 진화 단계가 바뀌고 캐릭터 외형이 갱신된다.
- [ ] 진화 조건 미달 시 단계가 바뀌지 않는다.

### 코인 잔액 표시
- [ ] 코인 잔액이 저장값과 일치하고 지급/사용 후 즉시 갱신된다.
- [ ] 노랑 색 규칙을 따른다.

### 상점 화면 기본 레이아웃(최소 치장 아이템 1종)
- [ ] 최소 1종의 치장 아이템과 가격이 표시된다.
- [ ] 보유 코인 부족 시 구매 버튼이 비활성 또는 안내가 표시된다.

### 코인으로 치장 아이템 구매 및 적용
- [ ] 구매 시 코인이 정확히 차감되고 `inventory`에 아이템이 추가된다.
- [ ] 구매·차감이 트랜잭션으로 처리되어 코인만 빠지고 아이템이 없는 상태가 발생하지 않는다.
- [ ] 이미 보유한 아이템 중복 구매가 막히거나 정의된 규칙대로 처리된다.
- [ ] 장착 시 캐릭터에 반영되고 재실행 후에도 유지된다.

### 퀘스트 완료 연출
- [ ] 완료 시 애니메이션/피드백이 재생되고 실제 상태 변화와 동기화된다.
- [ ] 연출 도중 화면 이탈·중복 완료가 안전하게 처리된다.

### 보상 획득 연출
- [ ] 지급된 코인·XP 값이 연출에 정확히 반영된다.
- [ ] 연출 생략(빠른 진행) 시에도 보상은 정상 지급된다.

### 멈춘 퀘스트 재분해 기능
- [ ] 멈춤 상태 퀘스트를 더 작은 퀘스트로 재분해할 수 있다.
- [ ] 재분해 결과가 기존 진행 상태를 근거로 생성되고, 원본과의 연결이 유지된다.
- [ ] 재분해 실패 시 기존 퀘스트가 보존된다.

### 전체 사용자 흐름 통합 테스트
- [ ] 목표 입력 → AI 분해 → 수정 → 등록 → 완료 → 보상 → 캐릭터 성장 전 과정이 한 번에 통과하는 시나리오 테스트가 존재한다.
- [ ] 중간 실패(AI 실패·네트워크 오류) 시에도 흐름이 폴백으로 이어진다.
- [ ] 앱 재실행 후 진행 상태가 정확히 복원된다.

### AI 분해 결과 품질 테스트
- [ ] 대표 목표 입력 세트에 대해 실행 가능한 마이크로 퀘스트가 생성되는지 표본 검증한다.
- [ ] 난이도 분류가 상식적으로 타당한지 검토 기준이 있다.
- [ ] 유효하지 않은 결과 비율이 허용 임계 이하이다.

### 도전 시작률 이벤트 로그 정의
- [ ] 퀘스트 등록·첫 완료 이벤트가 로그로 기록된다.
- [ ] 로그로 도전 시작률(등록→첫 완료 비율)을 계산할 수 있다.

### 재분해 복귀율 이벤트 로그 정의
- [ ] 멈춤·재분해·재실행 이벤트가 로그로 기록된다.
- [ ] 로그로 재분해 복귀율을 계산할 수 있다.

### 7일 리텐션 측정 항목 정의
- [ ] 가입일·접속일 이벤트가 기록되어 D7 리텐션 산출이 가능하다.

### 오류 메시지 및 빈 화면 처리
- [ ] 주요 화면(홈·퀘스트·상점)의 오류/빈 상태가 각각 사용자 친화적으로 표시된다.
- [ ] 네트워크 단절 상황에서 앱이 크래시하지 않는다.

### 최종 QA 및 버그 수정
- [ ] `flutter analyze` error 0건, 알려진 크래시 0건이다.
- [ ] 회귀 테스트가 통과한다.

### 데모 시나리오 작성
- [ ] 발표용 시나리오가 문서화되어 있고 실제 앱에서 재현된다.

### 발표용 테스트 데이터 준비
- [ ] 데모 계정·샘플 퀘스트·보상 상태가 사전 세팅되어 재실행에도 유지된다.

---

## 최종 통합 검증 기준

> 전체 사용자 흐름이 끝에서 끝까지 동작하는지 확인하는 최종 판정 기준. 각 항목은 실제 앱 실행 또는 통합 테스트 결과로 PASS/FAIL을 판정한다.

- [ ] 사용자가 큰 목표를 입력하면 AI가 마이크로 퀘스트와 난이도를 생성한다.
- [ ] 사용자가 분해 결과를 수정·삭제·재생성할 수 있다.
- [ ] 확정한 결과가 퀘스트 목록에 정상 등록되고 재실행 후에도 유지된다.
- [ ] 퀘스트 완료 시 난이도에 맞는 코인과 XP가 (트랜잭션으로, 중복 없이) 지급된다.
- [ ] 완료 결과가 캐릭터 성장(레벨·XP·진화)에 반영된다.
- [ ] AI 실패 시에도 템플릿으로 퀘스트를 등록할 수 있다.
- [ ] 사용자가 막힌 퀘스트를 더 작게 재분해해 다시 실행할 수 있다.
