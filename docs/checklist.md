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
- [x] 등록된 오늘 퀘스트가 Firestore에서 조회되어 표시된다.
      → `questListProvider`(`lib/providers/providers.dart`, `watchQuests` 스트림)를 `QuestListScreen`(`lib/features/quest/quest_list_screen.dart`)이 구독해 `QuestCard` 목록을 렌더한다. 테스트: `test/features/quest_list_screen_test.dart`(여러 퀘스트 표시).
- [x] 조회 로딩·오류·빈 상태가 각각 구분되어 처리된다.
      → `questsAsync.when`으로 loading=SkeletonBox×3 · error=ErrorView(재시도) · empty=EmptyView 3종을 구분 처리. 테스트: `test/features/quest_list_screen_test.dart`(로딩·오류·빈 3종).
- [x] 앱 재실행 후에도 동일 목록이 유지된다.
      → 구조적 보장: Firestore `watchQuests` 재구독으로 동일 데이터가 복원되고 저장 계층은 `fetchQuests`로 확인된다. ⚠️ 리터럴 앱 재시작 테스트는 없고 `watchQuests` 스트림 구조로 보장. 테스트: `test/features/quest_list_screen_test.dart`.

### 직접 퀘스트 등록 기능
- [x] AI 없이 목표명 + 하위 퀘스트 여러 개를 직접 입력해 등록할 수 있다.
      → **[3단계-c 목표(폴더) 단위 재구성]** `QuestCreateScreen`(`lib/features/quest/quest_create_screen.dart`)이 제목 1개 단건 등록에서 **목표명(필수) + 퀘스트 행 여러 개**(제목·난이도·예상보상·행 삭제 + "퀘스트 추가")로 바뀌었다. 저장은 `createGoal(uid, 목표명)` → `createQuests(drafts, goalId:, source: QuestSource.manual)`로 **AI 분해와 공용 저장 경로**를 재사용한다(신규 저장 경로 없음). 등록된 퀘스트들은 같은 goalId로 폴더 묶인다. 계측 `AnalyticsEvent.questRegistered(source: manual, count)`. 라우트 `/quest/new`. 테스트: `test/features/quest_create_screen_test.dart` · `test/features/root_shell_test.dart`.
- [x] 빈 목표명·퀘스트 0개·빈 제목이면 등록이 막힌다.
      → 신규 등록은 목표를 강제한다. `_canSubmit`가 목표명 비었거나 퀘스트 0개거나 각 제목이 비면 등록 버튼을 비활성화하고, 제출 핸들러가 목표명 빈 값을 이중으로 가드한다(중복 탭 방어 포함). 난이도는 SegmentedButton 기본값 normal이라 미선택이 구조적으로 불가. 뮤테이션으로 가드 실효 확인. 테스트: `test/features/quest_create_screen_test.dart`.
- [x] 등록 즉시 목록과 저장소에 반영된다.
      → 등록은 `createGoal` + `createQuests`(batch, 원자적)로 저장하고 목록은 `watchQuests` 스트림으로 즉시 반영된다. 테스트: `test/features/quest_create_screen_test.dart`.
      → **제약(정직 기록)**: 신규 폴더 등록 경로(`QuestDraft`/`createQuests`)가 마감일을 담지 않아 **deadline(마감일) 입력이 제거됐다**. verification 판정상 마감일은 화면 어디에도 표시되지 않던 write-only 필드라 사용자 가시 회귀는 아니지만, 저장 스키마의 유일한 입력구가 사라진 사실은 기록으로 남긴다(향후 마감일 기능 시 재도입 판단). Firestore `createQuests` batch 경로는 자동 테스트 N/A(`fake_cloud_firestore` 미도입) — InMemory와 같은 계약.
      → **검증 증거**: `flutter analyze` No issues found · `flutter test` 691건 전부 통과(재구성 착수 기준선 674건) · verification-agent 9/9 PASS.

### 큰 목표 단위 그룹 조회
- [x] 퀘스트가 `goalId` 기준으로 큰 목표(폴더) 단위로 묶여 표시된다.
      → 순수 함수 `groupQuestsByGoal`(`lib/models/quest_group.dart`)이 묶고, 화면은 `GoalGroupSection`(`lib/features/quest/widgets/goal_group_section.dart`) + `questGroupsProvider`(`lib/providers/providers.dart`)가 렌더한다. 저장소는 `GoalRepository.watchGoals`를 신설(Firestore·InMemory 2구현). 테스트: `test/models/quest_group_test.dart`(10건) · `test/features/quest_list_screen_test.dart`(A0 그룹 6건).
- [x] 그룹 헤더에 목표 라벨과 진행률(완료/전체)이 표시된다.
      → `doneCount/total` 텍스트 + `LinearProgressIndicator`(그린 `primary`). stuck(멈춤)은 완료로 세지 않는다. 테스트: `test/features/quest_list_screen_test.dart`('헤더에 진행률이 표시된다') · `test/models/quest_group_test.dart`(진행률 계산 단언).
- [x] 헤더 탭으로 접기/펼치기가 되고, 기본은 펼침이며 전부 완료된 그룹만 기본 접힘이다.
      → `_isExpanded`가 `putIfAbsent`로 **최초 1회만** 기본값을 확정한다. 매 프레임 재계산하면 마지막 퀘스트를 완료하는 순간 그룹이 눈앞에서 접혀 방금 누른 카드가 사라진다. 테스트: `test/features/quest_list_screen_test.dart`('헤더를 누르면 접히고 다시 누르면 펼쳐진다' · '전부 완료된 그룹은 기본으로 접혀 있다').
- [x] 직접 등록한 퀘스트(`goalId == null`)는 별도 그룹으로 항상 맨 아래에 표시된다.
      → `kDirectQuestGroupLabel`. 테스트: `test/models/quest_group_test.dart`(입력 맨 앞에 둬도 마지막 그룹이 되는 것을 단언).
- [x] 목표 저장소가 실패해도 퀘스트 목록이 오류 화면으로 바뀌지 않고 폴백 라벨로 렌더된다.
      → `questGroupsProvider`가 goal 스트림의 실패를 `valueOrNull ?? []`로 삼키고 quest 스트림만 전파한다. 목표는 라벨용 부가 정보라, 그것 때문에 퀘스트 목록이 통째로 오류가 되면 사용자는 퀘스트를 잃은 걸로 본다. Firestore `_parse`도 깨진 문서 하나만 건너뛴다(quest repo와 같은 규약). 테스트: `test/features/quest_list_screen_test.dart`('★ 목표 저장소가 실패해도 퀘스트는 폴백 라벨로 그대로 보인다').
- [x] AI 분해 진입점이 주요 위계(채운 버튼)로 표시되고 색 역할 규칙을 지킨다.
      → `OutlinedButton` → `FilledButton`(블루 `secondary`, `quest_list_screen.dart:198`). 그린으로 올리지 않은 이유는 수동 등록 FAB가 그린이라 역할이 겹치기 때문. 노랑 미사용은 `test/theme/color_role_test.dart`가 강제. 테스트: `test/features/quest_list_screen_test.dart`('AI 진입점은 채운 버튼이다').
      → **검증 증거**: `flutter analyze` No issues found · `flutter test` 382건 전부 통과 · verification-agent 7/7 PASS.
      → **미검증(정직 기록)**: ① `InMemoryGoalRepository.watchGoals`의 재방출 경로(목록을 연 채 목표가 새로 생성될 때 라벨 갱신)는 단위 테스트가 없다. ② `FirestoreGoalRepository.watchGoals`는 자동 테스트 N/A(실 Firestore 미도입, 유닛 환경 실행 불가) — 코드 리뷰상 `guardStream` + 관대 파싱으로 quest repo와 동일 규약. ③ goal 스트림이 **로딩 중**일 때도 빈 맵으로 떨어져, 첫 프레임에 라벨이 폴백('목표')으로 잠깐 떴다 바뀌는 깜빡임이 가능하다.

### 홈 진행 중 퀘스트 미리보기 · 퀘스트 출처 구분
- [x] 홈 "진행 중인 퀘스트"가 최신 등록순(`createdAt` 내림차순) 상위 3개로 표시된다.
      → `pendingQuestsProvider`(`lib/providers/providers.dart`)가 미완료 필터 후 내림차순 정렬하고, 개수 제한은 화면(`lib/features/home/home_screen.dart`의 `_previewCount = 3`)에서 한다. **provider가 자르지 않는 이유**: 다른 화면이 이 provider를 재사용할 때 조용히 3개만 받게 된다. 로딩 스켈레톤도 3개로 맞춰 전환 시 높이가 튀지 않는다. 테스트: `test/features/home_screen_test.dart` — "3개가 보인다"에 그치지 않고 `getTopLeft().dy`로 실제 배치 순서를 단언하며, 입력 순서를 시각 순서와 어긋나게 섞어 정렬 없는 구현이면 반드시 실패하도록 설계됐다.
- [x] `createdAt`이 아직 없는(방금 만든) 퀘스트가 맨 앞에 온다.
      → Firestore `serverTimestamp`는 서버가 확정하기 전까지 로컬 캐시에서 null이다. 즉 **null = 방금 만든 것**이라 최신순에서는 맨 앞으로 보낸다. 목록 화면(`_parse`)은 null을 뒤로 보내는데, 거기는 실행 경로 순서이고 여기는 등록 시각 순서라 기준이 다르다. 테스트: `test/features/home_screen_test.dart`.
- [x] 완료된 퀘스트는 미리보기에서 제외된다(기존 규칙 회귀 없음).
      → 테스트: `test/features/home_screen_test.dart`(완료된 최신 퀘스트 제외 · 전부 완료 시 EmptyView).
- [x] AI가 분해한 퀘스트와 직접 등록한 퀘스트가 시각적으로 구분된다.
      → **[3단계-c 재구성으로 판정 근거 교체]** 예전엔 `goalId` 유무로 출처를 추론했으나, 직접 등록이 목표(폴더) 단위가 되며 직접 등록 퀘스트도 goalId를 갖게 돼 이 방식이 직접 등록을 AI로 오표기하는 회귀(회귀 A)가 났다. 이제 출처는 goalId와 별개의 **명시 필드 `Quest.source`(`enum QuestSource {ai, manual}`, `lib/models/quest_source.dart`)**로 판정한다. `QuestSourceChip`(`lib/core/widgets/quest_source_chip.dart`)이 `quest.effectiveSource`(`source ?? (goalId != null ? ai : manual)` 하위호환 폴백, `lib/models/quest.dart`)로 AI = 블루 / 직접 = 회색 중립을 가른다. 직접 등록이 목표를 갖게 돼도 manual로 저장돼 "직접" 칩으로 표시된다. **구 문서(source 필드 없음)는 폴백으로 기존과 동일하게 보인다**(goalId 있으면 AI, 없으면 직접). `QuestCard`(`lib/core/widgets/quest_card.dart`)가 난이도 pill과 함께 `Wrap`에 담아 홈·목록 양쪽에 자동 반영. 카드 좌측 accent 보더는 **난이도 색 그대로 유지**했다. 뮤테이션(폴백 훼손·판정 뒤집기·`createQuests` source 무시·`isAiGenerated` 뒤집기)으로 실효 확인. 테스트: `test/models/quest_test.dart`(source 그룹) · `test/features/quest_source_chip_test.dart`(회귀 A 그룹) · `test/features/quest_list_screen_test.dart` · `test/features/home_screen_test.dart`.
- [x] 다크 모드에서도 출처 칩의 대비가 유지된다.
      → 라이트는 `secondary` 틴트 + `secondary` 전경이지만, 다크에서 그대로 쓰면 파란 글자가 어두운 카드에 묻혀 `secondaryContainer` + `onSecondaryContainer`로 뒤집었다(색 역할은 블루 유지). 테스트가 전경 휘도 > 배경 휘도 + 0.2를 단언해 강제한다: `test/features/quest_source_chip_test.dart`.
- [x] 색 역할 규칙(노랑 = 코인·보상 전용)을 지킨다.
      → 출처 칩은 블루·회색만 쓴다. `test/theme/color_role_test.dart`를 **무수정**으로 통과한다(allowlist에 새 파일이 추가되지 않았다 — `git diff`가 비어 있음을 확인했다).
- [x] 난이도 pill과 출처 칩이 줄바꿈 가능한 구조에 있어 좁은 폭에서 깨지지 않는다.
      → `Wrap` 사용. **회귀 방어는 구조 단언으로 한다** — 폭 320·240 스모크만으로는 `Row`로 되돌려도 통과해 버려서(두 칩 Row는 가용 폭 176px 아래에서야 넘친다) 방어가 되지 않는다. `Wrap`의 자식이 난이도 pill과 출처 칩인지를 직접 단언하고, 뮤테이션 검사(`Wrap`→`Row`)에서 실제로 실패함을 확인했다. 테스트: `test/features/quest_source_chip_test.dart`.
      → **검증 증거**: `flutter analyze` No issues found · `flutter test` 395건 전부 통과 · verification-agent 9/9 PASS.

### 난이도 뱃지 표시
- [x] 각 퀘스트에 easy/normal/hard 뱃지가 일관된 색/라벨로 표시된다.
      → `DifficultyPill`(`lib/core/widgets/difficulty_pill.dart`, 라벨 쉬움/보통/어려움, 난이도별 색 단일 정의)을 공통 사용. 노랑 규칙은 `test/theme/color_role_test.dart` allowlist로 강제. 테스트: `test/features/quest_list_screen_test.dart`.
- [x] 난이도 변경 시 뱃지가 즉시 갱신된다.
      → 공통 위젯 `DifficultyPill`이 상태 변경에 따라 재빌드된다. 테스트: `test/features/quest_split_screen_test.dart`(난이도 팝업 easy→hard 시 '• 어려움' 갱신).

### 예상 코인·XP 표시
- [x] 쉬움 코인3/XP5, 보통 코인5/XP10, 어려움 코인10/XP20이 정확히 표시된다.
      → `kBaseRewards`(`lib/core/constants/reward_rules.dart`) + `RewardChip`(`lib/core/widgets/reward_chip.dart`). 테스트: `test/features/quest_list_screen_test.dart`(어려움) · `test/features/quest_create_screen_test.dart`(보통) · `test/features/quest_split_screen_test.dart`(쉬움).
- [x] 표시 색상이 코인·보상용 노랑 규칙을 따른다.
      → `RewardChip` 코인=노랑(`reward.coin`)·XP=그린(`primary`), `test/theme/color_role_test.dart`가 allowlist로 노랑 사용을 강제한다.
- [x] 난이도 변경 시 예상 보상 수치가 함께 바뀐다.
      → 난이도 변경 시 `RewardChip` 수치가 `kBaseRewards` 기준으로 갱신된다. 테스트: `test/features/quest_create_screen_test.dart`(난이도 변경 시 코인+10/XP+20 갱신) · `test/features/quest_split_screen_test.dart`.

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
- [x] 보너스·상한·점감 적용 순서가 명확히 정의되어 있다.
      → **점감이 N/A로 빠지면서 순서가 확정됐다.** 정본 순서: ① 난이도별 기본 보상(`kBaseRewards`) → ② + 인증 보너스(`kVerificationBonus`, 메모 또는 사진 시 1회) → ③ 위 합산 **코인**에 하루 상한 절삭 적용(`applyDailyCoinCap`, **XP는 절삭하지 않는다**), 이 결과가 `dailyCoinEarned` 카운터에 누적 → ④ 스트릭 보너스(`streakBonusFor(streak)`, 주차별 점증)는 ③의 **밖에서** 별도 지급(상한 미적용·카운터 미반영). **점증이 붙어도 이 성질은 변하지 않는다** — 금액만 주차에 따라 커질 뿐, 상한 절삭과 `dailyCoinEarned` 누적에서 빠져 있다는 규칙은 그대로다. 상수·순수 함수 정의는 `lib/core/constants/reward_rules.dart` 한 곳이고, 같은 순서가 `docs/firestore-schema.md`에도 기록되어 있다.

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

### 성취 보관함 화면
> 상점 화면처럼 checklist에 항목이 없던 화면이라 신규 섹션으로 승격했다. **사용자 피드백을 받아 achievements 타임라인 → quest 기반 폴더뷰로 재작성**했다("오늘의 퀘스트 = 할 일, 보관함 = 끝낸 일" 구조). verification-agent PASS.
- [x] 완료한 도전이 보관함(`/storage`)에 표시된다.
      → 보관함은 `archivedGroupsProvider`(`archived == true` 퀘스트) 기반 **폴더 그룹뷰**다. 오늘의 퀘스트와 **같은 `groupQuestsByGoal`·`GoalGroupSection`을 재사용**하되 완료 토글 없는 **보기 전용 카드**다(`storage_screen.dart`가 `archivedGroupsProvider` → `groupQuestsByGoal` → `GoalGroupSection`으로 렌더). 화면 `lib/features/storage/storage_screen.dart`는 폴더뷰로 **재작성**됐다. achievements 타임라인 방식(`watchAchievements` 경로)은 삭제하지 않고 **3단계 상세 시트용으로 남겨뒀다**. 테스트: `test/features/storage_screen_test.dart`.
- [x] 완료 수·연속 출석 요약이 표시된다.
      → `storage_screen.dart`의 `_SummaryCard`가 2분할 stat으로 완료 수·연속을 표시한다(폴더뷰 재작성 후에도 유지). 완료 수 = 보관된 퀘스트 총합(`archivedGroupsProvider` 그룹의 자식 합 — 폴더 자식·자동완료 원본 포함), 연속 = `currentUserProvider`의 `user.streak`. 환생 배너는 환생 미구현이라 이 요약으로 대체했다. 테스트: `test/features/storage_screen_test.dart`.
- [x] 빈 상태·로딩·오류가 각각 처리된다.
      → `storage_screen.dart`의 `archivedGroupsProvider.when`이 로딩→`_StorageSkeleton`, 오류→`ErrorView`, 비었을 때→`EmptyView`를 각각 그린다. 스트릭(`currentUserProvider`)은 못 읽으면 0으로 떨어뜨려 폴더뷰는 그대로 보인다. 테스트: `test/features/storage_screen_test.dart`.
- [x] 인증(메모/사진)한 도전은 뱃지로 구분된다.
      → **폴더뷰 재작성 후 목록 카드(`QuestCard`)는 메모/사진 뱃지를 더 이상 그리지 않는다.** 인증 내용(메모 전문·인증 사진)은 이제 카드를 탭해 상세 시트에서 본다(아래 「완료 기록 상세 조회」로 연결). 사진은 여전히 목록에서 미리 읽지 않고 상세를 열 때만 `fetchProof`로 조회한다(proof 문서가 questId당 별도 — 3주차 문서 분리 이유). ⚠️ **항목 문구('뱃지로 구분된다')는 타임라인 시절 표현이라 현행 폴더뷰와 어긋난다 — 문구 재검토 필요**(체크 상태는 임의로 바꾸지 않음). 테스트: `test/features/storage_screen_test.dart`·`test/features/achievement_detail_sheet_test.dart`.

### 완료 기록 상세 조회
> checklist에 항목이 없던 흐름이라 신규 섹션으로 승격했다(3단계-a). 3단계-a는 **보기 전용**이었고(verification-agent 10/10 PASS), **3단계-b에서 메모·사진 편집이 붙어 더는 보기 전용이 아니다**(같은 시트에 "수정" 버튼 → 편집 모드, verification-agent 7/7 PASS). **태그는 다음 조각(3단계-c)** 대기.
- [x] 보관함 카드를 탭하면 완료 당시 정보를 상세로 볼 수 있다.
      → `AchievementDetailSheet`(신규 `lib/features/storage/widgets/achievement_detail_sheet.dart`)가 제목·난이도(`DifficultyPill`)·보상(`RewardChip`)·완료 날짜(KST)·메모 전문·인증 사진을 보여준다. **보기 전용**이라 수정 버튼이 없다. `storage_screen.dart`의 `_openDetail`이 카드 탭에서 `showAchievementDetailSheet`를 연다. 테스트: `test/features/achievement_detail_sheet_test.dart`·`test/features/storage_screen_test.dart`(탭→시트 열림).
- [x] 인증 사진은 목록에서 미리 읽지 않고 상세를 열 때만 조회한다.
      → `fetchProof(uid, questId)` 신설(인터페이스 `lib/repositories/quest_repository.dart` + Firestore·InMemory 2구현). 사진 base64가 `proofDoc/{questId}`에 있어 목록에서 N번 읽으면 비싸다(3주차 문서 분리 이유). 상세 시트가 `loadProof` 클로저로 lazy 조회한다(시트는 저장소·provider를 모름). 없으면 null(에러 아님), 저장소 실패 시 AppFailure, 깨진 base64는 "사진 없음"으로 폴백해 시트가 죽지 않는다. 테스트: `test/repositories/in_memory_quest_repository_test.dart`(fetchProof). ⚠️ Firestore `fetchProof`(특히 깨진 문서 분기)는 `fake_cloud_firestore` 미도입으로 자동 테스트 N/A — InMemory와 같은 계약으로 검증.
- [x] 완료 날짜가 KST 기준으로 표시되고, 사진 로딩·없음·실패가 각각 처리된다.
      → `_formatKstDate`가 `kKstOffset`(단일 정의처)를 인용해 UTC를 KST 벽시계로 변환한다(자정 근처 완료의 하루 어긋남 방지). `_ProofPhoto`의 FutureBuilder가 로딩(스피너)·사진 있음(썸네일)·없음/실패("사진 없음" 플레이스홀더)를 각각 그리고, 조회 실패에도 시트가 생존한다. 테스트: `test/features/achievement_detail_sheet_test.dart`(KST 날짜·사진 3경로·깨진 base64 방어).
- [x] 보관함 상세 시트에서 완료 기록의 메모·사진을 수정할 수 있다. (3단계-b)
      → 보기 전용 시트(3-a)에 "수정" 버튼 → 편집 모드(메모 `TextField` + 사진 교체/제거 + 저장/취소). 같은 시트 안에서 보기↔편집 전환. `lib/features/storage/widgets/achievement_detail_sheet.dart` 확장(`_editing`/`_saving` 상태). 시트는 저장소·uid·image_picker를 직접 모르고 화면(`storage_screen._openDetail`)이 콜백 클로저(`onSaveMemo`/`onSavePhoto`/`pickImage`)로 주입한다(3-a `loadProof`와 같은 경계). 테스트: `test/features/achievement_detail_sheet_test.dart`.
- [x] 인증 사진은 교체와 제거가 모두 되고, 독립 갱신 경로로 저장된다. (3단계-b)
      → `updateProof(uid, questId, base64?)` 신설(인터페이스 `lib/repositories/quest_repository.dart` L207 + Firestore·InMemory 2구현). **값이면 교체, null이면 삭제**. 사진은 `completeQuest` 트랜잭션 안에서만 쓰이던 것을 완료와 무관한 독립 쓰기로 뺐다. 크기 상한 `ensureProofWithinLimit`(700KiB) 재사용. image_picker 압축 파이프라인은 `lib/core/utils/proof_image_picker.dart`로 공용 추출해 완료 시 메모 시트(`quest_memo_sheet.dart`)와 공유. 테스트: `test/repositories/in_memory_quest_repository_test.dart`. ⚠️ Firestore `updateProof`는 `fake_cloud_firestore` 미도입으로 자동 테스트 N/A — InMemory와 같은 계약으로 검증.
- [x] 수정은 보상(코인·XP·난이도)을 건드리지 않는다. (3단계-b)
      → 메모는 `updateQuest`, 사진은 `updateProof`. 둘 다 완료·보상 트랜잭션 밖의 별도 쓰기다. `completeQuest`·`rewardedAt`·지급 이력·코인·XP 전부 불변(verification이 diff로 확인 — `completeQuest` 지급 블록 무변경). 뮤테이션(보상 코인 불변 단언 뒤집기)으로 실패 확인. **정책 구분(중요)**: B-5b "완료 퀘스트 수정 메뉴 숨김"은 **퀘스트 목록에서 제목·난이도를 못 고치게 한 것**(재완료 보상 유효화 차단)이고, 여기는 **보관함 기록의 메모·사진**으로 **보상 경제를 안 건드려** 별개다(`achievement_detail_sheet.dart` 주석에 명시).
- [x] 빈 메모로 저장하면 메모가 실제로 지워진다. (3단계-b)
      → `copyWith(memo: null)`은 null 병합 탓에 메모를 못 지운다. Firestore `updateQuest`가 `'memo'`를 명시적으로 쓰도록(L161) 조정해 비우기를 문서에 반영(값 있을 땐 `toJson`과 같아 무해, B-5b 제목·난이도 수정엔 회귀 없음). 메모(`updateQuest`)와 사진(`updateProof`)은 별도 쓰기라 원자성이 필수가 아니다(부가 정보) — 하나 실패 시 스낵바+편집 유지. 테스트: `test/features/achievement_detail_sheet_test.dart`.
      → **검증 증거(3단계-b 완료 시점)**: `flutter analyze` No issues found · `flutter test` **674건 전부 통과**(3-b 착수 기준선 661건) · `test/theme/color_role_test.dart` 무수정 통과 · verification-agent **7/7 PASS**. 뮤테이션: `updateProof` null 삭제(2건)·취소 시 커밋(1건)·사진 제거 null 미전달(1건)·보상 코인 불변 뒤집기(1건)가 각각 해당 테스트를 실제로 실패시킴.

### 완료 시 보관함 이동
> checklist에 항목이 없던 흐름이라 신규 섹션으로 승격했다("오늘의 퀘스트 = 할 일, 보관함 = 끝낸 일"). verification-agent PASS. **보관함 이동은 단방향**이다(완료 실수 복구는 이번 범위 밖 — 3단계 이후 판단).
- [x] 완료한 퀘스트가 오늘의 퀘스트 목록에서 사라지고 보관함으로 이동한다.
      → `Quest.archived` 플래그 도입. 완료 즉시 이동(단방향). 오늘의 퀘스트는 `archived == false`, 보관함은 `archived == true`, 홈 미리보기도 `archived` 제외. 저장소 `archiveQuests`(원자적, 스트림 1회 방출)를 2구현에 신설(`lib/repositories/quest_repository.dart`). **완료·보상 트랜잭션(`completeQuest`)은 안 건드리고 완료 성공 뒤 별도 쓰기로 처리**(지급 오염 금지 — verification이 diff상 주석만 변경, 지급 로직 무변경 확인). 테스트: `test/models/quest_archive_test.dart` · `test/providers/quest_group_providers_test.dart` · `test/features/quest_list_screen_test.dart`.
- [x] 목표(폴더)는 그 안의 퀘스트가 전부 완료돼야 통째로 이동하고, goalId 없는 낱개는 완료 즉시 이동한다.
      → 순수 함수 `resolveArchiveOnComplete`(`lib/models/quest_group.dart`)가 판정한다. 목표는 자식이 `every` done일 때만, `goalId` 없는 퀘스트는 낱개로 이동. 고아·순환 방어는 `descendantIds`·`_childrenByParent`를 재사용한다. 뮤테이션(전부완료→일부완료로 느슨히)으로 7건 실패 확인.
      → **[3단계-c 재구성 반영]** 이동 규칙은 **goalId 유무로 갈린다.** 신규 직접 등록은 이제 목표(폴더)를 가지므로 **폴더 규칙**(형제 전부 완료 시 통째 이동)을 탄다. "완료 즉시 낱개 이동"은 이제 **구 goalId-null 데이터(구 낱개 직접 등록)에만** 적용된다 — 신규 직접 등록과 구 낱개의 이동 규칙이 다르다.
- [x] 재분해한 목표는 자식이 모두 완료되면 원본(stuck)도 자동 완료된 뒤 함께 이동한다.
      → 자동완료는 `setStatus(done)`로 **상태만 바꾸고 보상은 없다**(자식 완료로 이미 지급됨, B-5 "자동 완료로 안 누른 지급 금지" 준수). 뮤테이션(`setStatus`→`completeQuest`)으로 원본 `rewardedAt`이 찍혀 실패 확인.
- [x] 목표 전체를 완수하면 축하 연출이 표시된다.
      → `goal_complete_dialog.dart`(신규, `lib/features/quest/widgets/`)가 "축하합니다, 목표를 이루었어요 / 보관함에서 확인해보세요"를 표시. **목표(폴더) 완수 시에만** 뜨고 직접 등록 낱개엔 없다. 레벨업 연출의 시각 언어(그린)를 재사용. 테스트: `test/features/quest_list_screen_test.dart`.

### 중복 완료 방지 처리
- [x] 이미 완료된 퀘스트를 다시 완료해도 **코인·XP가 재지급되지 않는다**.
- [x] 완료 요청 중복(빠른 연타/재시도)에서 지급이 정확히 1회만 발생한다.
      → 가드는 상태나 `completedAt`이 아니라 **`rewardedAt`**이다. 한번 찍히면 지워지지 않으므로 완료 → 해제 → 재완료로도 재지급이 없다(코인 파밍 차단). 연타는 `_pending` + 트랜잭션 재시도 시 `alreadyPaid` 조기 반환으로 1회만 지급. 테스트: `test/features/quest_list_screen_test.dart`의 `★ 완료 → 해제 → 재완료해도 재지급되지 않는다 (파밍 차단)`.
- [x] 중복 시도 시 사용자에게 이미 완료됨이 안내된다.
      → `quest_list_screen.dart`가 `done && reward == null`(이미 보상받은 퀘스트 재완료)일 때 스낵바 '이미 완료한 퀘스트예요'를 노출한다. 완료 해제(done=false)에는 스낵바가 뜨지 않아 오탐을 막는다. 재지급이 없을 때 `completeQuest`가 `null`을 반환하고 축하 연출은 생략된다. 테스트: `test/features/quest_list_screen_test.dart`(재완료→스낵바+연출없음, 완료해제→스낵바 안 뜸).

### 출석/스트릭 체크 및 연속 출석 보너스(7일) 지급
- [x] 일자별 출석이 기록되고 연속 일수가 정확히 계산된다.
      → `recordAttendance`(`lib/repositories/user_repository.dart` + Firestore/InMemory 2구현)와 순수 함수 `applyAttendance`(`lib/core/constants/reward_rules.dart`). 상한과 **같은 KST 날짜 키**를 공유한다. `ensureUser`에 합치지 않고 별도 트랜잭션으로 둔 이유는 `ensureUser`의 계약이 "없으면 만든다"는 멱등인데 출석은 날짜마다 문서를 바꾸는 쓰기라 합치면 멱등성이 깨지기 때문이다. 호출도 `sessionProvider`가 아니라 별도 `attendanceProvider`(`lib/providers/providers.dart`)다 — 출석 쓰기 실패가 세션 실패가 되면 홈·퀘스트가 통째로 오류 화면이 된다. 테스트: `test/repositories/attendance_streak_test.dart`, `test/core/reward_economy_test.dart`.
- [x] 7일 연속 달성 시 보너스가 1회만 지급된다.
      → **금액은 고정이 아니라 주차별로 점증한다.** 순수 함수 `streakBonusFor(streak)`(`lib/core/constants/reward_rules.dart`)가 `주차 × 15코인 / 주차 × 25XP`를 계산한다(주차 = `streak ~/ kStreakBonusDays`). 기존의 **고정 금액 상수는 삭제됐고**, 금액 정의처는 이제 이 순수 함수와 `kStreakBonusPerWeek`(15/25) 한 곳이다.

| 연속 일수 | 코인 | XP |
|---|---|---|
| 7일 (1주) | 15 | 25 |
| 14일 (2주) | 30 | 50 |
| 21일 (3주) | 45 | 75 |
| 28일 (4주) | 60 | 100 |
| 35일 이후 | 60 | 100 (고정) |

      → **4주 상한(`kMaxStreakBonusWeeks = 4`)을 둔 이유**: 하루 코인 상한 70의 목적이 코인 경제 보호인데, 상한 **밖에서** 지급되는 보너스가 무한히 자라면 그 장치가 무력해진다.
      → **지급은 여전히 1회만. 이중 가드** — 날짜 키가 같으면 write 자체가 없고(`isNewDay`), 추가로 `lastBonusKey != todayKey`를 본다. 같은 날 재접속·앱 재실행에도 중복되지 않는다. **이 보너스는 하루 코인 상한과 무관하다**: 카운터에 더하지도, 상한에 걸려 깎이지도 않는다(여러 주를 버틴 보상이 "오늘 이미 70 채웠다"는 이유로 사라지면 스트릭 자체가 무의미해진다).
      → **다이얼로그가 실제 연속 일수를 표시한다.** 14일이면 "14일 연속!"이다. 이전에는 7을 하드코딩해 14일·21일에도 "7일 연속!"이라고 떠서 오래 버틴 사실이 화면에서 사라지던 버그가 있었고, 이를 고쳤다. 근거: `lib/features/home/widgets/streak_bonus_dialog.dart`, 테스트 `test/features/streak_bonus_dialog_test.dart` · `test/features/streak_ui_test.dart`.
      → 테스트: `test/core/reward_economy_test.dart`(`streakBonusFor` 그룹 — 주차별 금액·4주 상한), `test/repositories/attendance_streak_test.dart`(`dailyCoinEarned`=70인 상태에서 전액 지급 · 14일 30/50 지급 시 `dailyCoinEarned` 불변 · 28·35일 고정 · 7일 루프에서 보너스 정확히 1회), `test/features/streak_ui_test.dart`.
      → **검증 증거(A-5 후속 정리 완료 시점, 2026-07-22)**: `flutter analyze` No issues found(0건) · `flutter test` **473건 전부 통과** · verification-agent **PASS** · `test/theme/color_role_test.dart` 무수정 통과. (473 = 470 − 1(중복 테스트 삭제) + 4(가드 계약 2건 · 다이얼로그 재계산 금지 2건). 문서 내 다른 건수는 각기 **다른 시점**의 스위트 기준이다.)
      → 뮤테이션 검증 — 보너스를 상한에 태우면 실패, 4주 상한을 해제하면 3건 실패, 다이얼로그 제목을 다시 7로 하드코딩하면 3건(홈 화면 경로 포함) 실패.
      → **뮤테이션에서 생존했던 갭 2가지를 계약 테스트로 고정했다.** ① **다이얼로그는 지급값을 재계산하지 않고 저장소가 준 값을 그대로 표시한다** — 정책과 다른 금액을 주입해도 화면이 그 주입값을 그대로 보여주는지 확인하는 테스트로 고정. 다이얼로그가 자체 계산을 시작하면 표시액과 실지급액이 조용히 갈라진다. ② **하루 1회 가드(날짜 키 저장 필드)가 계약 테스트로 고정됐다** — 정상 경로에선 `isNewDay`에서 이미 걸러져 도달하지 않지만, 스트릭 보너스는 하루 코인 상한 **밖에서** 나가는 유일한 지급이라 중복되면 상한 장치가 통째로 우회된다. 그래서 도달하지 않는 가드까지 테스트로 못 박았다.
- [x] 하루 걸러 접속 시 스트릭이 올바르게 초기화된다.
      → 연속이 끊기면 0이 아니라 **1**로 초기화된다(오늘은 출석했으니 오늘이 1일째다). 테스트: `test/core/reward_economy_test.dart`, `test/repositories/attendance_streak_test.dart`.

### 하루 코인 획득 상한 처리
- [x] 하루 누적 코인이 상한에 도달하면 초과분이 지급되지 않는다.
      → 순수 함수 `applyDailyCoinCap`(`lib/core/constants/reward_rules.dart`, `kDailyCoinCap = 70`)이 `paidCoin = min(wanted, room)`으로 **부분 지급**한다 — 68코인이 쌓인 상태에서 어려움(10코인)을 완료하면 2코인이 지급된다(0이 아니다). **코인만 절삭하고 XP는 온전히 지급한다**: XP까지 막으면 성장이 멈춰 "오늘은 더 해도 소용없다"가 되기 때문이다. 테스트: `test/core/reward_economy_test.dart`, `test/repositories/daily_coin_cap_test.dart`(경계 2코인 지급 · XP 20 정상 지급 + 레벨 상승).
- [x] 상한 도달 상태가 사용자에게 안내된다.
      → **이중 안내**. 목록 상단 `_DailyCapNotice`(`lib/features/quest/quest_list_screen.dart`)와 완료 다이얼로그의 절삭 사유 표시(`quest_complete_dialog.dart`). 다이얼로그는 저장소가 반환한 **실지급액**을 그대로 보여주므로 절삭이 일어나도 표시와 실지급이 어긋나지 않는다. 테스트: `test/features/daily_coin_cap_ui_test.dart`(도달 시 노출 · 69코인이면 미노출 · 어제 70이면 미노출).
- [x] 날짜가 바뀌면 상한 카운터가 초기화된다(시간대 기준 명확).
      → **KST 자정 기준.** `lib/core/utils/kst_date.dart`가 `toLocal()`이 아니라 고정 `+9h` 오프셋(`kKstOffset`)을 쓴다 — `toLocal()`은 기기·CI 타임존에 따라 경계가 흔들린다. `dailyCoinEarned`는 `FieldValue.increment`가 아니라 **계산값으로 set**한다(increment로는 날짜 리셋을 표현할 수 없다). 자정 배치가 없으므로 만료 판정은 읽는 쪽이 날짜 키 비교로 한다(`app_user.dart`의 `dailyCoinDate == kstDateKey(now)`). 테스트: `test/core/kst_date_test.dart`, `test/repositories/daily_coin_cap_test.dart` — **UTC와 결과가 갈리는 시각을 명시적으로 찍고 입력이 전부 `DateTime.utc(...)`라 실행 머신 타임존과 무관하다.** 뮤테이션 검증 — 오프셋을 0(UTC)으로 되돌리면 5개 테스트가 실패한다.
      → **검증 결과(하루 코인 상한 처리 완료 시점)**: `flutter analyze` No issues found · `flutter test` **455건 전부 통과** · verification-agent **12/12 PASS** · `test/theme/color_role_test.dart` 무수정 통과. ※ 455는 **이 시점의 스위트 기준 건수**다(이후 출석/스트릭 A-5까지 끝난 최신 기준은 473건). 소급 수정하지 않는다 — 어느 시점에 무엇으로 검증했는지가 증거의 핵심이다.
      → **알려진 제약(정직하게)**: ① **Firestore 트랜잭션 경로는 자동 테스트 N/A**다(`fake_cloud_firestore` 미도입). 판정 로직이 InMemory와 같은 순수 함수 하나(`applyDailyCoinCap`/`applyAttendance`)로 수렴하도록 구조를 맞췄고 read-before-write 규칙을 지켰지만, 실제 확인은 에뮬레이터 몫으로 남는다. ② `_DailyCapNotice`는 앱을 켜 둔 채 자정을 넘기면 rebuild 전까지 안내가 남는다(의도된 선택). 실제 지급은 저장소가 매번 날짜를 다시 계산하므로 **안내만 낡을 뿐 코인은 정상 지급**된다.

### 동일·유사 퀘스트 반복 보상 점감(diminishing) 처리
- [ ] 동일/유사 퀘스트 반복 완료 시 보상이 정의된 규칙대로 점감한다.
- [ ] 점감 후에도 음수 보상이 발생하지 않는다(하한 0 또는 최소값).
- [ ] 점감 계산에 대한 단위 테스트가 통과한다.
      → **N/A (사용자 결정, 2026-07-22)**: 점감을 구현하지 않기로 했다. 반복 완료로 인한 보상 남용은 **하루 코인 상한(70) 하나로 막는다.** 같은 퀘스트의 재완료는 이미 `rewardedAt` 가드가 영구 차단하므로(위 「중복 완료 방지 처리」), 점감이 실제로 대상으로 삼는 것은 "비슷한 퀘스트를 새로 만들어 반복 등록하는" 경우뿐이다. 이를 제목 유사도로 판정하면 오탐 시 사용자가 이유를 모른 채 보상을 잃는다. 데모 단계에서는 상한만으로 충분하다고 판단했다. **코드에 점감 구현은 존재하지 않는다**(검증에서 grep으로 확인 — `lib/`에서 '점감'은 `reward_rules.dart`의 "구현하지 않는다" 주석 1건뿐). 위 3항목은 구현 대상이 아니므로 체크하지 않고 미체크로 남긴다.

---

## 4주차 — 캐릭터 성장 및 통합 검증

### 현재 레벨 및 XP 표시
- [x] 현재 레벨과 XP가 저장값과 일치하게 표시된다.
- [x] 데이터 로딩 중/오류 상태가 처리된다.
      → `CharacterCard`가 `Level ${user.level} · ${stage.name}`, `XP ${user.xp} / ${user.xpForNextLevel}`(MAX 도달 시 'MAX')를 렌더한다(`lib/features/home/widgets/character_card.dart`). 홈은 `userAsync.when`으로 로딩=`_HomeSkeleton`, 오류=`ErrorView`를 처리하고 신규 유저는 `AppUser` 기본값(Lv1)으로 커버된다(`lib/features/home/home_screen.dart`). **주의: `user.xp` 의미가 "누적 XP"에서 "현재 레벨 내 잔여 XP"로 바뀌었다.** 테스트 `test/features/home_screen_test.dart`.

### 경험치 프로그레스 바
- [x] 진행률이 `현재XP / 다음레벨필요XP`에 맞게 렌더된다.
- [x] 경계값(0%, 100%)에서 시각적으로 깨지지 않는다.
      → `_XpBar(progress: user.levelProgress)`, `levelProgress = (xp / xpForNextLevel).clamp(0.0, 1.0)`(MAX면 1 반환)(`lib/models/app_user.dart`, `lib/features/home/widgets/character_card.dart`). 경계 0%/100% 테스트 `test/models/app_user_test.dart`.

### 캐릭터 기본 렌더링
- [x] 캐릭터가 정상 렌더된다 — **도트아트 자산 완성 전에는 이모지 목업 렌더도 PASS 조건**이며, 자산 로드 실패 시 대체 표시(이모지)가 나온다.
      → `_CharacterStage(emoji: stage.emoji)`가 진화 단계별 이모지를 목업으로 렌더한다(도트아트 자산 전까지 PASS 조건, `lib/features/home/widgets/character_card.dart`). 테스트 `test/features/home_screen_test.dart`.
- [x] 장착(equipped) 아이템이 캐릭터에 반영된다.
      → B-6로 해소. `character_card.dart`가 `AppUser.equipped`를 읽어 `background` 슬롯=배경 틴트, `aura` 슬롯=오라 이모지로 반영한다(캐릭터가 이모지 목업이라 이 둘로 표현). 고아 방어: `itemById`가 null이거나 슬롯이 어긋나면 장착 없음으로 렌더(깨진 장착이 카드를 안 죽인다, `lib/core/constants/shop_items.dart`). `equipped`가 user 문서에 영속되고 홈이 `watchUser` 구독이라 재실행 후 유지는 구조로 보장. 테스트 `test/features/character_card_equip_test.dart`(오라 미반영 뮤테이션이 실패시킴).

### 레벨업 처리
- [x] XP가 임계값 도달 시 레벨이 오르고 남은 XP가 이월된다.
- [x] 한 번에 여러 레벨 상승하는 경우도 정확히 계산된다.
- [x] 레벨업 결과가 영속 저장되고 재실행 후 유지된다.
      → `applyXpGain`(`lib/core/constants/growth_rules.dart`)이 `while (lv < kMaxLevel && x >= stageOf(lv).xpPerLevel)` 루프로 다단계 상승·잔여 XP 이월·MAX 상한을 한곳에서 처리하고, `completeQuest` 트랜잭션에서 적용되어 level·xp가 영속 저장된다(재실행 후 유지). 테스트 `test/core/growth_rules_test.dart`(13종) + `test/repositories/in_memory_quest_repository_test.dart`(완료→레벨 반영).

### 진화 단계 변경 처리
- [x] 정의된 레벨 도달 시 진화 단계가 바뀌고 캐릭터 외형이 갱신된다.
- [x] 진화 조건 미달 시 단계가 바뀌지 않는다.
      → `stageOf(level)`(`lib/core/constants/growth_rules.dart`)이 레벨 구간→진화 단계를 매핑한다. 레벨이 오르면 `stage`가 자동 변경되어 `CharacterCard`가 `stage.emoji`/`stage.name`을 다시 렌더하고, 조건 미달이면 단계가 유지된다. 테스트 `test/core/growth_rules_test.dart`(알 Lv9→참새 경계 전환). 레벨업·진화 **연출(애니메이션)**은 이번 범위 아님(홈 자동 반영만).

### 코인 잔액 표시
- [x] 코인 잔액이 저장값과 일치하고 지급/사용 후 즉시 갱신된다.
- [x] 노랑 색 규칙을 따른다.
      → `_CoinBanner(coin: user.coin)`(`lib/features/home/widgets/character_card.dart`). coin은 `completeQuest`에서 `FieldValue.increment`로 누적되고, 홈은 `watchUser` 스트림 구독이라 지급 커밋 즉시 갱신된다. 코인 배너는 노랑 허용 위젯이며 `test/theme/color_role_test.dart`가 허용 목록 밖 노랑을 FAIL 처리한다.

### 상점 화면 기본 레이아웃(최소 치장 아이템 1종)
- [x] 최소 1종의 치장 아이템과 가격이 표시된다.
      → `lib/features/shop/shop_screen.dart`(신규, `/shop` 라우트가 실제 화면 — `lib/router.dart`). 아이템 카탈로그는 **코드 상수** `lib/core/constants/shop_items.dart`(배경 3 + 오라 2 = 5종, 가격 10/30/50/40/60). MVP라 Firestore items 컬렉션이 아닌 코드 상수 채택(`reward_rules`·`growth_rules`와 같은 관례, 콘솔 수동 입력·테스트 사각지대 회피 / 운영 중 변경은 코드 배포 필요). 테스트 `test/core/shop_items_test.dart`·`test/features/shop_screen_test.dart`.
- [x] 보유 코인 부족 시 구매 버튼이 비활성 또는 안내가 표시된다.
      → 5상태 버튼 분기(미보유+충분→구매 / 미보유+부족→비활성 "코인이 부족해요" / 보유+미장착→장착 / 보유+장착중→"장착 중"+해제). `shop_screen.dart` 부족 분기는 `onPressed: null`+안내 텍스트. 테스트 `test/features/shop_screen_test.dart`.

### 코인으로 치장 아이템 구매 및 적용
- [x] 구매 시 코인이 정확히 차감되고 `inventory`에 아이템이 추가된다.
      → `purchaseItem(uid, itemId, price)` 신설(저장소 2구현 — `lib/repositories/firestore/firestore_user_repository.dart`·`lib/repositories/memory/in_memory_user_repository.dart`). `inventoryItem` 경로 추가, `inventoryProvider` 스트림. 테스트 `test/repositories/purchase_item_test.dart`.
- [x] 구매·차감이 트랜잭션으로 처리되어 코인만 빠지고 아이템이 없는 상태가 발생하지 않는다.
      → Firestore `runTransaction`(read-before-write): coin 확인 → 차감 + inventory 문서 생성 원자적. **잔액 부족이면 write 없이 AppFailure**(코인 불변 + inventory 미추가), InMemory도 동일 판정. 뮤테이션(잔액 부족 가드 제거)으로 2건 실패 확인. Firestore 트랜잭션 경로 자동 테스트는 N/A(`fake_cloud_firestore` 미도입) — InMemory와 동일 계약으로 맞추고 실제 확인은 에뮬레이터 몫(기존 `completeQuest`와 같은 한계).
- [x] 이미 보유한 아이템 중복 구매가 막히거나 정의된 규칙대로 처리된다.
      → 이미 보유면 코인 재차감 없이 조용히 통과(멱등, `rewardedAt` 가드와 같은 정신). 재구매 차단 근거는 읽어 온 inventory 문서(ID=itemId) 존재 여부. 뮤테이션(중복 가드 제거)으로 코인이 2회 차감돼 1건 실패 확인.
- [x] 장착 시 캐릭터에 반영되고 재실행 후에도 유지된다.
      → `character_card.dart`가 `AppUser.equipped`를 읽어 `background` 슬롯=배경 틴트, `aura` 슬롯=오라 이모지로 반영(캐릭터가 이모지 목업이라 이 둘로 표현, 도트아트 자산 나오면 교체 예정). `equipped`가 user 문서에 영속되고 홈이 `watchUser` 구독이라 재실행 후 유지는 구조로 보장. 고아 방어: `itemById`가 null이거나 슬롯이 어긋나면 장착 없음으로 렌더. 뮤테이션(오라 미반영)으로 실패 확인. 테스트 `test/features/character_card_equip_test.dart`·`test/repositories/purchase_item_test.dart`.

### 프로필(MY) 화면
- [x] 프로필 화면에 완료 통계가 표시된다.
      → `lib/features/profile/profile_screen.dart`(신규 — `/profile` 라우트가 placeholder에서 실제 `ProfileScreen`으로 교체됨, `lib/router.dart:92`). 완료한 도전 수는 `achievementsProvider`의 `.length`(보관함과 같은 소스라 두 화면의 "해낸 도전 수"가 어긋나지 않음), 현재 연속 출석은 `user.streak`(0이면 "아직 없음"), 가입일은 `createdAt`을 KST `yyyy년 M월 d일`로 렌더(null이면 통째 생략). 로딩(`_StatsSkeleton`)·오류(`ErrorView`+재시도)·빈(완료 0을 EmptyView가 아니라 "0"으로) 5상태 처리. 완료 수는 achievements 스트림과 연동돼 기록이 늘면 증가한다. 노랑 규칙 준수(스트릭이 요약 통계라 그린/중립, `color_role_test` 무수정 통과). 테스트: `test/features/profile_screen_test.dart`(11건, 완료 수 상수화·스트릭 상수화 뮤테이션이 실패시킴).
- [x] 설정에 계정 연동 자리가 준비돼 있다(실제 OAuth는 향후).
      → `_SettingsSection`이 "Google 계정 연동"을 **준비 중** 배지로 두고 탭 시 "계정 연동은 곧 지원돼요." 스낵바로 안내(홈 환생 버튼이 "4주차에 열려요"로 정직하게 비활성인 것과 같은 방식). **로그아웃 버튼은 두지 않았다** — 익명 로그인이라 로그아웃하면 진행상황이 소실되기 때문(테스트가 버튼 부재를 회귀 방어로 못박음, 로그아웃 버튼 추가 뮤테이션 1건·탭 안내 제거 뮤테이션 1건 실패 확인). 테스트: `test/features/profile_screen_test.dart`.

> **향후 계획(미구현)**: OAuth 계정 연동은 아직 구현하지 않았다. 이번 프로필은 진입점 **자리만** 준비했고, `AuthRepository`에 연동 메서드는 없다. 검증이 끝나면 익명↔Google 계정 연동(및 그때 signOut UI 재판단)을 추가할 계획이다.
>
> **검증 증거**: `flutter analyze` No issues found · `flutter test` **702건 전부 통과**(프로필 착수 기준선 691건) · `test/theme/color_role_test.dart` 무수정 통과 · verification-agent PASS. 변경 범위는 프로필+라우터+테스트로 한정.

### 퀘스트 완료 연출
- [x] 완료 시 애니메이션/피드백이 재생되고 실제 상태 변화와 동기화된다.
      → `quest_complete_dialog.dart`가 트로피 scale/fade 등장 + 코인·XP 카운트업(0→실지급액) 애니메이션. 표시값은 저장소가 준 실지급액 그대로다(난이도 재계산 아님, 절삭돼도 정확). 완료 후 `user.level`이 저장소에 반영됨을 UI 테스트가 단언. 뮤테이션(카운트업 최종값 0 고정)으로 5건 실패 확인. 테스트: `test/features/growth_dialogs_test.dart` · `test/features/quest_list_screen_test.dart`
- [x] 연출 도중 화면 이탈·중복 완료가 안전하게 처리된다.
      → 완료 트랜잭션이 다이얼로그 **전에** 끝나므로 연출은 순수 표시용(탭하면 즉시 종료해도 보상은 이미 지급). 순차 연출(완료→레벨업→진화) 각 사이 `mounted` 체크로 화면 이탈 크래시 방지. `_pending`·`_completing` 잠금이 중복 완료를 막는다. 재완료(result==null)면 어떤 연출도 뜨지 않고 "이미 완료" 스낵바 경로 유지.

### 보상 획득 연출
- [x] 지급된 코인·XP 값이 연출에 정확히 반영된다.
      → 카운트업 최종값이 저장소가 준 실지급 Reward(`.coin`/`.xp`). `cutCoin`도 저장소가 계산해 실어 주고 화면은 `result.cutCoin`을 그대로 표시(재계산 제거). 하루 상한 절삭이 일어나도 표시=실지급이 어긋나지 않는다. 테스트: `test/features/daily_coin_cap_ui_test.dart`(reward.coin=2, cutCoin=8) · `growth_dialogs_test.dart`
- [x] 연출 생략(빠른 진행) 시에도 보상은 정상 지급된다.
      → 지급은 `completeQuest` 트랜잭션에서 끝나고 다이얼로그는 그 뒤에 뜬다. 탭 조기 종료는 애니메이션만 끝으로 점프시킬 뿐 지급에 관여하지 않는다. 구조로 보장.

### 레벨업·진화 연출
- [x] 레벨업 시 연출이 뜨고 다단계 상승도 정확히 표시된다.
      → `completeQuest` 반환을 `Reward?` → `CompleteResult?`로 확장해(레벨/진화 변화를 실어) 화면이 완료 시점에 레벨업 여부를 안다. `level_up_dialog.dart`가 `Lv.{from} → Lv.{to}`를 표시하고, 다단계 상승(1→6 등)도 from→to로 자연 표현된다. 그린 계열(성장·완료), `streak_bonus_dialog` 시각 언어 재사용. **레벨업이 없으면 연출이 뜨지 않는다**(뮤테이션 leveledUp=>true로 2건 실패 확인). 테스트: `test/features/growth_dialogs_test.dart` · `test/features/quest_list_screen_test.dart`
- [x] 진화 단계 도달 시 진화 연출이 뜨고, 진화 없으면 뜨지 않는다.
      → 진화 경계(Lv9 알→Lv10 참새 등)를 넘으면 `evolve_dialog.dart`가 이전→새 단계 이모지 전환 강조 + "{단계}로 진화했어요"를 표시한다. 완료→(레벨업)→(진화) 순차. **진화가 없으면 연출이 뜨지 않는다**(뮤테이션 evolved=>true로 5건 실패 확인 — 같은 단계 내 상승·다단계도 오탐 없음). 이모지 목업 전제 유지.

> **제약(정직)**: Firestore `completeQuest` 트랜잭션 경로는 자동 테스트 N/A(`fake_cloud_firestore` 미도입). InMemory와 동일 계약으로 맞췄고 반환 타입 확장(`Reward?`→`CompleteResult?`)이 지급·가드 로직을 건드리지 않았음을 diff 리뷰로 확인 — 기존 `completeQuest`와 같은 한계이며 이번 변경이 새 결함을 도입한 게 아니다. 캐릭터·진화 연출은 이모지 목업 전제(도트아트 자산 나오면 교체).

### 멈춘 퀘스트 재분해 기능
> plan.md **기능 A의 마지막 요구사항**이자 성공 지표 「재분해 복귀율」의 근거다.

- [x] 멈춤 상태 퀘스트를 더 작은 퀘스트로 재분해할 수 있다.
      → 카드 우측 `⋮` 메뉴(`lib/core/widgets/quest_actions_menu.dart`)로 멈춤 표시/해제하고, **멈춤 카드에서만** 재분해로 진입한다
      (「재분해 복귀율」의 분모가 `stuck`이라 `done` 카드에는 메뉴가 없다).
      재분해는 기존 AI 분해 화면(`quest_split_screen.dart`)을 **재사용**한다 — 폴백·재생성 방어가 이미 거기 다 있어 새로 만들지 않았다.
      개수 상한은 `kMaxRedecomposeDrafts`(**3**)로 큰 목표 분해의 5개와 다르다. **깊이 2(자식의 자식)는 재분해할 수 없다**(`QuestNode.canRedecompose`).
      테스트: `test/features/quest_redecompose_test.dart` · `test/models/quest_group_test.dart`
- [x] 재분해 결과가 기존 진행 상태를 근거로 생성되고, 원본과의 연결이 유지된다.
      → `parentQuestId` **쓰기 경로를 신설**했다(이전에는 모델에 필드만 있고 넘길 방법이 없었다).
      `QuestDraft.toQuest`와 `createQuests`에 추가하고 Firestore·InMemory 2구현에 반영했으며, `createQuests`의 **원자성(batch) 계약은 유지**했다.
      자식은 원본의 `goalId`를 상속해 같은 목표 폴더에 남는다. 프롬프트에는 원본 목표(goal) 맥락을 함께 넘긴다 —
      맥락 없이 퀘스트 제목만 던지면 엉뚱한 결과가 나온다. **원본은 `stuck` 상태로 그대로 둔다**(연결이 사라지면 지표를 계산할 수 없다).
      목록에서는 `arrangeQuestTree`(순수 함수)가 자식을 부모 바로 뒤에 두고 깊이만큼 들여쓴다.
      테스트: `test/features/quest_redecompose_test.dart`(계보 저장 · **편집 후 계보 유지** · **「다시 나누기」 후 계보 유지**) ·
      `test/repositories/in_memory_quest_repository_test.dart`
- [x] 재분해 실패 시 기존 퀘스트가 보존된다.
      → 등록 전까지 아무것도 쓰지 않는다. AI 실패 시 템플릿으로 폴백하고 원본은 불변, 등록 실패 시 스낵바만 뜨고 화면·원본이 유지된다.
      테스트: `test/features/quest_redecompose_test.dart`(AI 실패 폴백 · 등록 실패 시 원본 보존)

**설계 결정**
- **부모(stuck)를 자동 완료 처리하지 않는다.** 자식을 다 끝내도 원본이 멈춤인 한 그룹 진행률이 100%가 되지 않는다.
  완료는 보상 지급 트랜잭션(`completeQuest`)을 타는 경로라, 자식 완료를 근거로 부모를 자동 완료시키면 **사용자가 누르지 않은 지급**이 발생한다.
  그건 보상 정책 변경이므로 별개 결정이다. 사용자가 원본을 직접 완료 체크하면 해소된다.
- **고아 자식(부모를 못 찾는 자식)을 숨기지 않는다.** 부모를 삭제하면 실제로 도달 가능한 경로이며,
  목표 문서를 못 찾아도 퀘스트를 숨기지 않는 것과 같은 원칙이다 — 데이터를 잃은 것처럼 보이면 안 된다.
- 멈춤 pill은 **중립 회색**이다. 빨강은 어려움 난이도, 블루는 AI 출처, 노랑은 코인·보상·스트릭 전용이라 남는 색 역할이 없고,
  "진행이 꺼진 상태"는 채도를 빼는 쪽이 의미와 맞다.

**검증 증거**
- `flutter analyze` No issues found · `flutter test` **499건 전부 통과**(B-5 착수 시점 기선 473건) · `test/theme/color_role_test.dart` 무수정 통과.
- verification-agent 판정 **FAIL → 테스트 2건 보강 후 해소**. FAIL 사유는 동작 결함이 아니라 **검증 공백**이었다 —
  이 기능의 유일한 계보 불변식(`target` 보존)이 어떤 테스트로도 검증되지 않아, 상태 전이 헬퍼 7곳과 `regenerateAll`에서 `target`을 `null`로 바꿔도 497건이 전부 통과했다.
  그 상태에서 사용자가 초안 제목을 고치거나 「다시 나누기」를 누른 뒤 등록하면 `confirm`이 큰 목표 분기로 떨어져 새 Goal을 만들고 `parentQuestId` 없이 저장된다(원본 연결 단절).
- 뮤테이션 검증: 자식 정렬 파괴 5건 실패 · 깊이 가드 해제 2건 실패 · `parentQuestId` null 2건 실패 ·
  `stuck`이 보상을 건드리는지 확인하는 `rewardedAt` 가드 뮤테이션 6건 실패 ·
  **계보 보존 뮤테이션 2종(편집 경로 · 「다시 나누기」 경로)이 각각 해당 테스트를 정확히 실패시킴**.

**남은 제약(미해소)**
- Firestore 구현의 batch 원자성은 자동 테스트 **N/A**(`fake_cloud_firestore` 미도입). InMemory 쪽은 "여러 개를 등록해도 스트림이 1회만 방출"로 부분 반영 부재를 관찰 가능하게 못 박았다.
- `lib/router.dart`의 split 라우트 배선 자체는 테스트가 복제 분기를 써서 **한 번도 실행되지 않는다.** `extra` 유실 시 큰 목표 분해로 안전하게 떨어지는 표현식이지만 자동 검증은 없다.
- 에뮬레이터 실기기 확인(멈춤 → 재분해 → 등록 → 재실행 유지)은 **아직 하지 않았다.**
- `arrangeQuestTree`의 순환 참조 방어는 앱 쓰기 경로로 도달 불가하다(구조적으로 트리다). 비용이 O(n) 한 번이고 중복 ID 방어를 겸해 유지하기로 했다.

### 등록된 퀘스트 수정·삭제
> 실기기 확인 후 사용자 요청으로 구현한 백로그 출신 기능(그룹뷰·출처 칩과 같은 계열). B-5 재분해 때 카드 `⋮` 메뉴를 만들며 "제목 수정·삭제는 별개 기능"이라 뺐던 것을 이제 연결했다. verification-agent **12/12 PASS**.

- [x] 미완료 카드의 `⋮` 메뉴에서 제목·난이도를 수정할 수 있다.
      → `quest_edit_dialog.dart`(신규, `lib/features/quest/widgets/`)가 제목 TextField + 난이도 SegmentedButton + 예상 보상 미리보기를 제공하고, 난이도를 바꾸면 미리보기가 갱신된다.
      저장은 `Quest.copyWith` → `updateQuest`(저장소에 이미 있었으나 화면에서 아무도 안 쓰던 메서드를 이제 연결했다). 빈 제목은 거부하고(저장 버튼 비활성 + validator),
      길이 상한 60자는 등록 화면(`quest_create_screen.dart`)과 동일하다. 상태·지급 이력·순서는 보존한다(제목·난이도만 변경).
      테스트: `test/features/quest_list_screen_test.dart`
- [x] 완료(보상받은) 퀘스트는 수정·삭제 메뉴가 없다.
      → done 카드는 `⋮` 자체가 뜨지 않는다(`_menuActionsFor`가 done이면 빈 목록 반환). 재완료로 난이도를 올려 추가 보상을 노리는 유효화를 막는 회귀 방어선이다.
      테스트로 못 박혀 있고, 뮤테이션(완료 카드에 메뉴가 뜨게 함)으로 실제 실패가 확인됐다.
- [x] 퀘스트를 삭제할 수 있고, 재분해 원본은 하위 계보까지 함께 삭제된다.
      → 삭제할 ID 집합(대상 + 하위 전체)은 순수 함수 `descendantIds`(`lib/models/quest_group.dart`)가 계산한다. `arrangeQuestTree`와 계보 계산 헬퍼(`_isRoot`·`_childrenByParent`)를
      **실제로 공유**해(복제 아님) 고아·순환·자기참조 방어를 그대로 물려받는다. 저장소는 `deleteQuests(uid, ids)` 배치 삭제로 원자적으로 지운다
      (Firestore batch, InMemory 스테이징 후 스트림 1회 방출, 없는 ID 무시). 저장소는 트리를 모르고 화면이 계보를 계산해 넘긴다(관심사 분리).
      테스트: `test/models/quest_group_test.dart`(`descendantIds` 8건) · `test/repositories/in_memory_quest_repository_test.dart`(`deleteQuests` 5건) · `test/features/quest_list_screen_test.dart`
- [x] 삭제 전 확인 다이얼로그가 뜨고, 자식이 있으면 함께 삭제됨을 경고한다.
      → `quest_delete_dialog.dart`(신규, `lib/features/quest/widgets/`). 자식 없는 퀘스트도 오탭 방지 확인을 항상 거치고, 자식 있는 부모는 "하위 퀘스트 N개도 함께 삭제돼요"로 경고를 강화한다
      (N은 계보 계산 결과). 삭제 버튼은 error 색. 취소하면 아무것도 지워지지 않는다(뮤테이션으로 확인됨). 테스트: `test/features/quest_list_screen_test.dart`

**설계 결정**
- **삭제는 지급된 코인·XP를 회수하지 않는다.** 퀘스트 문서의 `rewardedAt`은 함께 사라지지만, 사용자 문서에 이미 반영된 coin·xp는 건드리지 않는다.
  회수는 완료 트랜잭션의 역연산이라 별개 결정이고 이번 범위가 아니다. 완료 카드는 메뉴가 없어 애초에 삭제 진입이 안 되므로, 이 상황은 "완료된 자식이 부모와 함께 지워질 때"만 발생한다.

**검증 증거**
- `flutter analyze` No issues found · `flutter test` **519건 전부 통과**(B-5b 착수 기준선 499건) · `test/theme/color_role_test.dart` 무수정 통과 · verification-agent **12/12 PASS**.
- 뮤테이션 6종(개발자 2 + 검증자 4: `descendantIds` 비재귀 · `updateQuest` 난이도 누락 · 완료 카드 메뉴 노출 · 삭제 시 자식 누락 · 삭제 확인 제거 등)이 각각 해당 테스트를 실제로 실패시킴.
- 검증 절차상 사고와 복구: 검증 중 뮤테이션 원복에 `git checkout`을 써서 미커밋 상태였던 구현 파일 2개가 지워졌으나, `quest_group.dart`는 백업에서 완전 복원, `quest_list_screen.dart`는 재구성 후 원본과 동일함을 대조 확인했다. 현재 파일은 온전하다.

**남은 제약(미해소)**
- Firestore `updateQuest`·`deleteQuests` 경로는 자동 테스트 **N/A**(`fake_cloud_firestore` 미도입). InMemory와 계약을 맞췄고 batch 멱등성을 코드 리뷰로 확인했지만 실제 확인은 에뮬레이터 몫이다.

### 전체 사용자 흐름 통합 테스트
- [x] 목표 입력 → AI 분해 → 수정 → 등록 → 완료 → 보상 → 캐릭터 성장 전 과정이 한 번에 통과하는 시나리오 테스트가 존재한다.
- [x] 중간 실패(AI 실패·네트워크 오류) 시에도 흐름이 폴백으로 이어진다.
- [x] 앱 재실행 후 진행 상태가 정확히 복원된다.

**검증 증거 (E-1)**
- 산출물: `test/integration/user_flow_test.dart`(신규) — 실제 라우터(`createRouter` + `MaterialApp.router`) 위에서 탭 이동·버튼 클릭으로 관통하는 end-to-end 통합 테스트 4건. lib 코드 무변경(통합 테스트만).
- 테스트 ①: 퀘스트 탭 → "AI로 목표 나누기" → 목표 입력 → 분해(`FakeQuestDecomposer.success`) → 결과 제목 수정 → 등록(폴더로 묶임) → 완료(메모 건너뛰기) → 보상 다이얼로그 → 레벨업 연출(Lv1→2) → 저장소·홈 탭에서 코인·XP·레벨 반영까지 한 테스트로 관통. 각 단계 상태 전이를 저장소·화면 양쪽에서 단언.
- 테스트 ②: AI 분해 timeout → 템플릿 폴백 배너 + 폴백 퀘스트가 등록까지 이어짐. 테스트 ②-b: 완료 시 네트워크 오류 → 스낵바 + 상태·잔액 롤백(트랜잭션 원자성).
- 테스트 ③: 같은 InMemory 인스턴스를 유지한 채 새 ProviderScope + 라우터로 재-pump → 등록 퀘스트가 목록에 복원됨을 단언.
- 뮤테이션 3종(보상 적립 무력화 · 편집 반영 무력화 · 폴백 무력화)이 각각 정확한 테스트를 실패시켜 자명 통과가 아님을 확증.
- `flutter analyze` No issues found · `flutter test` **706건 전부 통과**(E-1 착수 기준선 702건) · `test/theme/color_role_test.dart` 무수정 통과 · verification-agent **PASS 3/3**.

**한계(정직 기록)**
- 테스트 ③은 리터럴 프로세스 재시작이 아니라 "저장소 유지 + 위젯트리 재-pump"의 구조적 보장이다. 실제 프로세스 재시작/실백엔드 영속은 이 테스트가 증명하지 못한다(InMemory 특성상 설계 한계). 테스트 주석에도 명시됨.

**관찰(백로그성, 차단 아님)**
- 등록 성공 스낵바(4초 자동 해제)가 뒤이어 열리는 완료 메모 시트의 "건너뛰기"를 순간적으로 가릴 수 있다. 통합 테스트에서만 드러난 계층 간 상호작용이며 lib 결함은 아니다(스낵바 4초 후 소멸, 완료를 영구 차단하지 않음). 향후 UX 다듬기 후보.

### AI 분해 결과 품질 테스트
- [ ] 대표 목표 입력 세트에 대해 실행 가능한 마이크로 퀘스트가 생성되는지 표본 검증한다.
- [ ] 난이도 분류가 상식적으로 타당한지 검토 기준이 있다.
- [ ] 유효하지 않은 결과 비율이 허용 임계 이하이다.

### 도전 시작률 이벤트 로그 정의
- [x] 퀘스트 등록·첫 완료 이벤트가 로그로 기록된다.
- [x] 로그로 도전 시작률(등록→첫 완료 비율)을 계산할 수 있다.

### 재분해 복귀율 이벤트 로그 정의
- [x] 멈춤·재분해·재실행 이벤트가 로그로 기록된다.
- [x] 로그로 재분해 복귀율을 계산할 수 있다.

### 7일 리텐션 측정 항목 정의
- [x] 가입일·접속일 이벤트가 기록되어 D7 리텐션 산출이 가능하다.

### 오류 메시지 및 빈 화면 처리
- [ ] 주요 화면(홈·퀘스트·상점)의 오류/빈 상태가 각각 사용자 친화적으로 표시된다.
- [ ] 네트워크 단절 상황에서 앱이 크래시하지 않는다.
- [ ] **알려진 결함(미수정)**: `RewardChip`(`lib/core/widgets/reward_chip.dart`)이 큰 텍스트 배율(2.0)에서 오버플로한다. `Row`가 `mainAxisSize.min`인데 유연 위젯이 없어, 접근성 글꼴을 키운 사용자에게는 폭 320(일반적인 소형 단말)에서도 오버플로 줄무늬가 뜬다. A0-2 이전부터 있던 결함이며, 보상 표시는 노랑 허용 위젯이라 수정 시 색 역할 규칙(`test/theme/color_role_test.dart` allowlist)까지 함께 봐야 한다.

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
