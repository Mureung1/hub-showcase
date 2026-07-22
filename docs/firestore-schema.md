# Firestore 스키마

> 경로의 정본은 코드의 `lib/core/constants/firestore_paths.dart`다. 이 문서는 그 구조와 **왜 그렇게 했는지**를 설명한다.

프로젝트: `one-step-16073` · 리전: `asia-northeast3`(서울) · 인증: **익명 로그인**

## 컬렉션 구조

```
users/{uid}                                # 사용자
  ├─ goals/{goalId}                         # 사용자가 입력한 큰 목표 (2주차)
  ├─ quests/{questId}                       # 퀘스트
  ├─ achievements/{achievementId}           # 성취 기록 (3주차)
  ├─ proofs/{questId}                        # 인증 사진 base64 (3주차)
  └─ inventory/{itemId}                     # 보유 아이템 (4주차)

items/{itemId}                              # 공개 아이템 카탈로그 (4주차, 읽기 전용)
```

### 왜 하위 컬렉션인가

루트에 `quests` 컬렉션을 두면 문서마다 `ownerId` 필드가 필요하고, 조회할 때마다 복합 인덱스가 필요하며, 보안 규칙에서 문서별 소유권을 검사해야 한다.
하위 컬렉션으로 두면 소유권이 **경로 자체에 인코딩**되므로 보안 규칙이 한 줄로 끝나고(`request.auth.uid == uid`), 쿼리에 인덱스가 필요 없다.

## 문서 필드

### `users/{uid}`

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `xp` | int | 0 | 현재 레벨에서 쌓은 경험치 |
| `level` | int | 1 | 레벨 (최대 50 → 환생 가능) |
| `coin` | int | 0 | 보유 코인 |
| `rebirth` | int | 0 | 환생 횟수 |
| `equipped` | map<string,string> | `{}` | 슬롯 → 아이템 ID (예: `{"background": "arcane_library"}`) |
| `createdAt` | timestamp | 서버 시각 | 최초 접속 시각 |
| `dailyCoinDate` | string? | null | 하루 코인 카운터가 가리키는 **KST 날짜 키**(`yyyy-MM-dd`) |
| `dailyCoinEarned` | int | 0 | 그 날짜에 **퀘스트로** 받은 코인 누적. 상한 판정의 근거 |
| `attendanceDate` | string? | null | 마지막 출석일 (KST 날짜 키) |
| `streak` | int | 0 | 연속 출석 일수. 끊기면 0이 아니라 **1**부터 다시 센다 |
| `streakBonusDate` | string? | null | 마지막으로 연속 출석 보너스를 지급한 날. 하루 1회 가드 |

#### 보상 경제 — 하루 코인 상한과 출석 스트릭 (3주차)

**적용 순서가 정본이다.**

1. 난이도별 기본 보상 (`kBaseRewards`)
2. \+ 인증 보너스 (`kVerificationBonus`, 메모 **또는** 사진이면 1회) — 여기까지가 `questReward()`
3. 위 합산 **코인**에 하루 상한(`kDailyCoinCap` = 70) 절삭 (`applyDailyCoinCap()`) → 이 결과가 `dailyCoinEarned`에 누적
4. 연속 출석 보너스(`streakBonusFor(streak)`)는 **3의 밖에서** 별도 지급 — 상한 미적용, 카운터 미반영
   - 주차별 점증: 7일 15/25 · 14일 30/50 · 21일 45/75 · 28일 이후 60/100 (`kMaxStreakBonusWeeks` = 4에서 상한)
   - 상한을 두는 이유: 상한 **밖에서** 나가는 보너스가 무한히 자라면 하루 코인 상한이 무력해진다

- **부분 지급한다.** 68코인 쌓인 상태에서 어려움(10코인)을 완료하면 **2코인**을 준다(0이 아니다).
- **코인만 절삭한다. XP는 상한이 없다.** XP까지 막으면 성장이 멈춰 "오늘은 더 해도 소용없다"가 된다.
- **반복 보상 점감은 구현하지 않는다.** 반복 문제는 상한 하나로 막는다(사용자 결정, 2026-07-22).

**왜 날짜 키가 문자열이고, 왜 KST인가**: Firestore는 시각을 UTC로 저장한다. UTC 자정을 하루 경계로 쓰면 한국 사용자에게 하루가 **오전 9시에 리셋**된다. 그래서 `lib/core/utils/kst_date.dart`의 `kstDateKey()`가 고정 오프셋(+9)으로 `yyyy-MM-dd` 문자열을 만들고, 이 값을 그대로 저장한다. 문자열이라 콘솔에서 읽히고, 읽는 쪽 타임존 해석이 끼어들 여지가 없다.

**자정에 카운터를 미는 배치는 없다**(서버가 없다). 대신 **읽는 쪽**이 `dailyCoinDate`를 오늘과 비교해 만료를 판정한다(`AppUser.coinEarnedToday()`). `dailyCoinEarned`가 `FieldValue.increment`가 아니라 **계산값 set**인 것도 같은 이유다 — increment로는 날짜가 바뀔 때의 리셋을 표현할 수 없다.

**출석은 `recordAttendance()`가 별도 트랜잭션으로 기록한다.** 기준은 "퀘스트를 완료했다"가 아니라 **"앱을 열었다"**이므로 세션 준비 직후(`attendanceProvider`)에 1회 호출된다. `ensureUser()`에 합치지 않은 이유는 그 메서드의 계약이 **멱등한 생성**이기 때문이다 — 날짜마다 문서를 바꾸는 쓰기를 합치면 그 멱등성이 깨진다. 같은 날 다시 불리면 날짜 키가 같아 아무것도 쓰지 않으므로 앱 재실행으로 보너스가 두 번 나가지 않는다.

계산(날짜 키·상한 절삭·스트릭 판정)은 전부 **순수 함수**(`kst_date.dart`, `reward_rules.dart`)에 있고 두 저장소 구현이 그것만 호출한다. `applyXpGain`·`normalizeMemo`와 같은 이유 — 각자 계산하면 갈라지고, 그 차이는 InMemory만 보는 테스트에서 안 잡힌다.

**문서가 없어도 앱은 정상 동작한다.** `UserRepository.watchUser`가 문서 부재 시 `AppUser.initial(uid)`(Lv.1 / XP 0 / 코인 0)을 흘리기 때문에, 신규 사용자도 특수 분기 없이 홈 화면이 렌더된다.
문서 자체는 `ensureUser(uid)`가 최초 접속 시 `set(merge: true)`로 만든다(멱등 — 여러 번 불려도 기존 값을 밀어내지 않는다).

`AppUser.fromJson`은 **어떤 입력에도 예외를 던지지 않는다.** 사용자 문서가 깨져 있다고 홈 화면이 죽으면 안 되기 때문이다.

### `users/{uid}/goals/{goalId}` — 사용자가 입력한 큰 목표 (2주차)

| 필드 | 타입 | 설명 |
|------|------|------|
| `text` | string | **필수.** 원문 (예: "공모전 지원하기") |
| `createdAt` | timestamp | 생성 시각 |

**왜 별도 문서인가**: 개별 퀘스트를 재분해하려면 **원본 목표의 맥락이 필수**다. "공모전 지원하기"라는 맥락 없이 "지원서 초안 쓰기"만 AI에 던지면 엉뚱한 결과가 나온다.

### `users/{uid}/quests/{questId}`

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `title` | string | **필수** | 퀘스트 제목. 없거나 공백이면 파싱 실패 |
| `difficulty` | string | `normal` | `easy` \| `normal` \| `hard` |
| **`status`** | string | `todo` | **`todo` \| `done` \| `stuck`** |
| `done` | bool | false | `status`의 파생값. 하위호환 + 콘솔 가독성을 위해 함께 쓴다 |
| `order` | int | 0 | 목록 정렬 순서 = AI 분해 결과의 **실행 경로 순서** |
| `deadline` | timestamp? | null | 마감일 (선택) |
| `goalId` | string? | null | 어느 목표에서 분해됐는지 (`goals/{goalId}`). 직접 등록이면 null |
| `parentQuestId` | string? | null | 재분해로 생긴 자식이면 원본 퀘스트 ID (4주차부터 실제로 쓰인다) |
| `createdAt` | timestamp | 서버 시각 | 생성 시각 |
| `completedAt` | timestamp? | null | **언제 완료했나.** 완료 해제 시 null로 지움 |
| `rewardedAt` | timestamp? | null | **보상을 지급한 시각.** 한번 찍히면 절대 지우지 않는다 |
| `memo` | string? | null | 완료 시 남긴 **인증 메모**(3주차-B). 공백만이면 `null`로 정규화. 상태 전이에서 보존한다 |

정렬: `order` → `createdAt`.

#### `completedAt`과 `rewardedAt`을 왜 나눴나

한 필드가 "언제 완료했나"와 "보상 줬나"를 겸하면 두 의미의 **수명이 충돌한다.** 완료 해제는 완료 시각을 지워야 자연스럽지만, 지급 이력까지 지워지면 **완료 → 해제 → 재완료로 코인을 무한 파밍**할 수 있다.

그래서 의미를 쪼갰다:

- `completedAt` — 완료할 때마다 갱신되고, 완료 해제 시 지워진다.
- `rewardedAt` — **최초 지급 때 한 번만** 찍히고 어떤 상태 전이에서도 보존된다. `completeQuest()` 트랜잭션의 재지급 가드는 **오직 이 필드**만 본다(`Quest.isRewarded`).

⚠️ **하위호환**: 이 필드 도입 전에 저장된 문서에는 값이 없다(null) → "미지급"으로 취급돼 보상이 한 번 더 지급될 수 있다. 데모 단계에서 수용하기로 한 알려진 손실이며, 마이그레이션은 하지 않는다.

#### 진행 상태가 왜 3상태인가

`plan.md` 기능 A가 명시적으로 요구한다:

> "각 퀘스트의 진행 상태(완료·미완료·**멈춤**)를 영속 저장해, 앱을 다시 열어도 어디까지 했고 **어디서 멈췄는지** 기억한다."

그리고 핵심 성공 지표 「**재분해 복귀율** — 멈춘 퀘스트를 더 작게 나눈 뒤 다시 실행한 비율」의 **분모가 `stuck` 상태다.** 이 상태가 없으면 지표를 계산할 근거 자체가 없다. `parentQuestId`가 분자(재분해로 생겨난 자식)를 제공한다.

#### `parentQuestId` — 재분해 계보 (4주차 B-5)

`createQuests(uid, drafts, goalId:, parentQuestId:)`가 **유일한 쓰기 경로**다. 멈춘 퀘스트를 재분해해 등록할 때만 값이 들어가고, 그 batch 안의 자식 전부가 같은 원본 ID를 갖는다.

- **원본은 지우지도 상태를 바꾸지도 않는다.** 자식으로 대체하면 「재분해 복귀율」의 **분모(stuck 원본)**가 사라진다. 원본은 `stuck` 그대로 남고 자식이 그 아래에 중첩된다.
- **자식은 원본의 `goalId`를 상속한다.** 같은 목표 폴더 안에 남아야 "이 목표를 어디까지 걸어왔나"가 깨지지 않는다. 직접 등록한 퀘스트를 재분해하면 원본과 같이 `goalId`가 null이다.
- **깊이 제한 2단계.** `Quest`에는 `redecomposeCount`가 없다(그건 저장 전 초안 세션 전용 값이다). 저장된 퀘스트의 깊이는 `parentQuestId` 체인이 유일한 근거이며, `arrangeQuestTree()`(`lib/models/quest_group.dart`)가 계산해 **자식의 자식은 더 나눌 수 없게** 막는다(`kMaxRedecomposeCount` = 2와 같은 기준). 무한 중첩은 목록 표시가 감당하지 못한다.
- **고아 자식은 숨기지 않는다.** 부모 문서를 못 찾는 자식은 깊이 0의 뿌리로 올려 그린다 — 목표 문서를 못 찾아도 퀘스트를 숨기지 않는 것과 같은 원칙이다. 순환 참조(a→b→a)에도 목록이 멈추지 않고 항목을 잃지 않는다.
- **부모 자동 완료는 하지 않는다.** 자식을 전부 끝내도 `stuck` 부모는 `doneCount`에 들어가지 않아 그룹 진행률이 100%가 되지 않는다. 자동 완료는 곧 `completeQuest()` 트랜잭션(= 보상 지급)을 사용자가 누르지 않았는데 태우는 일이라, 보상 정책 변경으로 따로 결정할 문제다.

**하위호환**: `status` 도입 전 문서는 `done: true/false`만 갖고 있다. `Quest.fromJson`은 `status`가 없으면 `done`으로 폴백하므로 **마이그레이션 없이 기존 문서가 그대로 읽힌다.**

#### 파싱 경로가 3개다 (의도된 비대칭)

| 경로 | 정책 | 이유 |
|------|------|------|
| `AppUser.fromJson` | **절대 throw 안 함** | 사용자 문서가 깨져도 홈 화면이 죽으면 안 된다 |
| `Quest.fromJson` | `id`·`title` 없으면 throw, 나머지는 관대 | 저장 문서를 읽는 경로. 제목 없는 퀘스트는 의미가 없지만, 난이도가 이상하다고 목록을 죽일 수는 없다 |
| **`QuestDraft.parseStrict`** | **엄격. 조금이라도 이상하면 항목을 버림** | **AI 응답 전용.** 난이도가 곧 보상 등급(코인 3/5/10)이라, AI가 `"매우어려움"`을 뱉었을 때 조용히 `normal`로 떨어뜨리면 **사용자가 받을 보상이 왜곡된다** |

```dart
// 저장 문서: 깨진 문서 하나가 목록 전체를 죽이지 않는다
final quests = raw.map(Quest.tryParse).whereType<Quest>().toList();

// AI 응답: 불량 항목은 버리고 나머지만 살린다
final drafts = QuestDraft.parseList(aiJson['quests']);
```

#### 일괄 등록의 순서 보장

`createQuests()`는 기존 퀘스트 개수를 세어 `order`에 **오프셋을 더한다.** 이걸 안 하면 AI가 뱉은 `order: 0..4`가 기존 퀘스트의 `0..2`와 겹쳐 목록 순서가 뒤엉킨다. **마이크로 퀘스트는 순서가 곧 실행 경로**라 순서가 섞이면 분해의 의미가 사라진다.

### `users/{uid}/achievements/{achievementId}` — 3주차

완료·인증 기록.

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `questId` | string | `''` | 어느 퀘스트의 기록인지. 퀘스트가 지워지면 끊어진 참조가 되지만 기록은 유효하다 |
| `questTitle` | string | `''` | **완료 시점 제목의 스냅샷.** 원본이 바뀌거나 지워져도 보관함에 남아야 한다 |
| `coin` · `xp` | int | 0 | **실제 지급액**(인증 보너스 포함). 기록 합계 = 잔액 |
| `memo` | string? | null | 남긴 인증 메모. 건너뛰었으면 없음 |
| `verified` | bool | false | 인증(메모 **또는** 사진)이 성립해 보너스를 받았는가. **`memo` 유무로 유추하지 않는다** — 사진만으로도 성립한다 |
| `hasPhoto` | bool | false | 이 완료에 인증 **사진**이 딸렸는가. 이미지 바이트는 여기 없고 `proofs/{questId}`에 있다. 목록에서 사진 유무 뱃지 등에 쓴다 |
| `completedAt` | timestamp | 서버 시각 | 지급 시각 |
| `photoUrl` | string? | — | (구) Storage 업로드 URL 자리. **미사용** — 사진은 base64로 `proofs/{questId}`에 저장한다 |

**기록은 보상이 실제 지급된 순간에만 생성된다** — `completeQuest()` 트랜잭션 안에서 퀘스트·사용자 문서와 함께 쓰이므로 "보상은 줬는데 기록이 없는" 불일치가 없다. 재완료(`rewardedAt`이 이미 있는 경우)는 기록을 남기지 않으므로 **기록 개수 = 지급 횟수**다.

파싱은 `Quest.fromJson`처럼 관대하다(`id`만 필수). 기록 하나가 깨져도 보관함 전체가 죽으면 안 된다.

#### 인증 보너스

`completeQuest(uid, questId, memo:)`의 `memo`가 **공백이 아니면 인증 성립** → 기본 보상 + `kVerificationBonus`(코인 3 · XP 3)를 **합산 지급**한다(예: 보통 5/10 → 8/13). 판정은 `normalizeMemo()` 한 곳에서만 한다(두 저장소 구현이 갈리지 않게).

메모를 **완료 전 시트**에서 받는 이유: 지급액이 메모 유무에 달려 있으므로, 메모를 쥔 채 한 번만 호출해야 완료·보상·보너스·기록이 **한 트랜잭션**에 담긴다. 완료 후에 받으면 보너스가 두 번째 트랜잭션이 되어 중복 지급 가드가 하나 더 필요해진다. 보너스도 `rewardedAt` 가드 아래라 **퀘스트당 평생 1회**다.

### `users/{uid}/proofs/{questId}` — 인증 사진 (3주차)

압축 썸네일을 **base64 문자열**로 담는다. 문서 ID가 `questId`라 **퀘스트당 사진 1장**이고, 재완료 시 같은 문서를 자연스럽게 덮어쓴다.

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `questId` | string | — | 어느 퀘스트의 인증 사진인지 (문서 ID와 같은 값, 조회 편의용 중복 저장) |
| `base64` | string | — | 압축 썸네일의 base64. 가로 `800`px · 품질 `50`으로 압축한다 |
| `createdAt` | timestamp | 서버 시각 | 저장 시각 |

**왜 Storage가 아니라 Firestore base64인가**: Storage는 Blaze(유료) 플랜이 필요하다. 데모 단계에선 이를 피하려고 압축 썸네일을 base64로 Firestore에 담는다. 대신 Firestore 문서 **1 MiB 하드 리밋**을 지켜야 한다 — base64는 원본을 ~33% 부풀리므로, ① 픽업 시 압축(수십 KB)하고 ② 저장 직전 `700 KiB`(안전선, `kMaxProofBase64Bytes`) 초과분을 **화면·저장소 양쪽에서** 거부한다. 정책 상수는 `lib/core/constants/proof_rules.dart`, 크기 방어는 `ensureProofWithinLimit()` 한 곳에서만 판정한다.

**왜 별도 컬렉션인가**: 이미지 바이트를 quest·achievement 문서에 넣으면 목록을 조회할 때마다 수십 KB가 딸려와 읽기 비용이 폭증한다. 사진은 필요한 화면에서만 이 문서를 읽는다. achievement에는 **유무 플래그(`hasPhoto`)만** 둔다.

**원자성**: proof 문서 쓰기는 `completeQuest()`의 **같은 트랜잭션**에 들어가고, 보상이 실제 지급되는 경로에서만 실행된다(재완료는 쓰지 않는다). proof ref의 ID는 트랜잭션 밖에서 `.doc(proofDoc(...))`로 만든다(read가 아니므로 read-before-write 규칙과 무관 — achievementRef와 같은 패턴).

### `users/{uid}/inventory/{itemId}` — 4주차

보유 아이템. `itemId`, `acquiredAt`, `equipped`.

### `items/{itemId}` — 4주차

공개 아이템 카탈로그. 인증 사용자는 읽기만 가능하고, 쓰기는 콘솔에서만 한다.

## 보안 규칙

`firestore.rules` — 기본은 **전부 거부**. 사용자는 자기 문서와 그 하위 컬렉션만 읽고 쓴다. 익명 로그인도 정식 인증이라 `request.auth.uid`가 존재한다.

```
match /users/{uid} {
  allow read, create, update: if isOwner(uid);
  allow delete: if false;              // 사용자 문서 삭제는 앱에서 하지 않는다
  match /{document=**} { allow read, write: if isOwner(uid); }
}
```

`storage.rules` — 인증 사진은 `users/{uid}/proofs/`에만, 5MB 이하 이미지만.

배포:

```bash
firebase deploy --only firestore:rules --project one-step-16073
firebase deploy --only storage --project one-step-16073   # Storage 활성화 후
```

## 코드 경계

`Timestamp`는 **모델에 도달하지 않는다.** `lib/repositories/firestore/firestore_codec.dart`의 `decodeDoc()`이 경계에서 `Timestamp → DateTime`으로 바꾼다. 덕분에 `lib/models/`는 Firebase에 의존하지 않는 순수 Dart로 남고, 모델 테스트가 Flutter 바인딩 없이 돈다.

`FirebaseException`도 **저장소 밖으로 나가지 않는다.** `mapFirebaseError()`가 전부 `AppFailure`(Network / Permission / NotFound / Parse / Unknown)로 정규화한다. 화면은 Firebase를 몰라도 되고, 테스트는 `InMemoryQuestRepository(failWith: NetworkFailure())` 한 줄로 실패 경로를 재현할 수 있다.

## 오프라인 동작

`Firebase.initializeApp()`은 네트워크가 필요 없다(로컬 설정만 읽는다). 오프라인에서 실제로 터지는 건 **최초 익명 로그인**과 **캐시에 없는 읽기**다. 그래서 세 곳에서 막는다:

1. `FirebaseBootstrap.initialize()` — 초기화 실패 시 크래시 대신 재시도 가능한 오류 화면
2. Firestore 로컬 캐시 활성화(`persistenceEnabled: true`) — 캐시된 데이터로 계속 렌더, 쓰기는 큐에 쌓였다가 동기화
3. `FirebaseAuthRepository.signInAnonymously()` — 캐시된 세션이 있으면 네트워크를 아예 건드리지 않는다

따라서 **한 번이라도 로그인한 뒤에는 오프라인에서도 앱이 정상 동작한다.** 네트워크 없는 최초 실행만 오류 화면이 뜨고, 그때도 크래시가 아니다.
