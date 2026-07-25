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
  ├─ events/{eventId}                        # 성공 지표 이벤트 로그 (4주차)
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
| `goalId` | string? | null | 어느 목표(폴더)에 속하는지 (`goals/{goalId}`). **AI 분해·직접 등록 모두** 목표 단위라 값이 있을 수 있다(3단계-c부터 직접 등록도 목표를 갖는다). 구 낱개 직접 등록은 null |
| `parentQuestId` | string? | null | 재분해로 생긴 자식이면 원본 퀘스트 ID (4주차부터 실제로 쓰인다) |
| `source` | string? | null | **출처** `ai` \| `manual`. 카드 출처 칩(`✨AI`/`✎직접`)의 근거. `null`(구 문서/미지정)이면 읽을 때 goalId로 폴백(있으면 ai, 없으면 manual). 명시값이 있을 때만 문서에 기록한다 |
| `createdAt` | timestamp | 서버 시각 | 생성 시각 |
| `completedAt` | timestamp? | null | **언제 완료했나.** 완료 해제 시 null로 지움 |
| `rewardedAt` | timestamp? | null | **보상을 지급한 시각.** 한번 찍히면 절대 지우지 않는다 |
| `memo` | string? | null | 완료 시 남긴 **인증 메모**(3주차-B). 공백만이면 `null`로 정규화. 상태 전이에서 보존한다 |
| `archived` | bool | false | **보관함으로 옮겨졌는가**(2단계). `true`일 때만 문서에 기록한다(기본값은 필드 생략) |

정렬: `order` → `createdAt`.

#### `archived` — 완료 = 보관함으로 이동 (2단계)

"오늘의 퀘스트 = 할 일, 보관함 = 끝낸 일" 구조를 만드는 **단 하나의 플래그**다. 새 컬렉션·새 문서 구조 없이, 같은 `quests` 컬렉션을 필터 분기만으로 두 화면에 나눠 준다.

- **오늘의 퀘스트** = `archived == false` 그룹뷰(완료 토글 있음). **보관함** = `archived == true` 그룹뷰(완료 토글 없는 보기 전용). 두 화면이 `groupQuestsByGoal`·`GoalGroupSection`을 그대로 공유한다.
- **이동 단위**: 목표(폴더)는 **그 목표의 모든 퀘스트(부모·자식)가 done일 때 통째로**, 직접 등록(`goalId == null`)은 **완료 즉시 낱개로** `archived`가 된다. 무엇을 옮길지는 순수 함수 `resolveArchiveOnComplete()`(`lib/models/quest_group.dart`)가 정한다 — `arrangeQuestTree`·`descendantIds`와 같은 관심사 분리(저장소는 규칙을 모른다).
- **재분해 원본 자동완료**: 어떤 `stuck` 원본의 자식(`descendantIds`)이 **모두** done이면 그 원본도 done으로 민다 — 그래야 "목표 전부 완료"가 성립한다. 이 자동완료는 **보상 없이** `setStatus(done)`으로만 처리한다(자식 완료로 이미 지급됨). 3주차의 "부모 자동 완료는 하지 않는다"에서 2단계에 **정책이 바뀐 부분**이며, 보상 지급 없는 상태 전이라 보상 정책은 그대로다.
- **되돌림 없음** — 단방향 플래그. 보관함에는 완료 토글이 없다.

**쓰기 경로**: `archiveQuests(uid, Set<String> ids)`가 **유일한** 보관 쓰기다. Firestore는 batch로 `{'archived': true}`만 `update`하고, InMemory는 스테이징 후 스트림 **1회** 방출한다(목표 폴더가 "절반만 옮겨진" 중간 상태가 없다). 없는 ID·빈 집합은 멱등하게 통과한다(`deleteQuests`와 같은 계약).

⚠️ **`completeQuest` 지급 트랜잭션은 건드리지 않는다.** 완료·보상이 커밋된 **뒤**, 화면이 자동완료(`setStatus`)와 보관(`archiveQuests`)을 **별도 쓰기**로 부른다. 보관 실패가 지급을 롤백하거나 그 반대가 되면 안 되기 때문이다(계측 로그를 트랜잭션 밖에 두는 것과 같은 원칙). 보관 쓰기가 실패하면 퀘스트는 done인 채 오늘 목록에 남고, 다음 완료·재실행에서 다시 시도된다 — 데이터 손실은 없다.

#### `source` — 출처를 왜 별도 필드로 두나 (goalId 추론의 함정)

예전에는 출처 칩(`✨AI`/`✎직접`)이 **`goalId` 유무 하나로** 판정했다("goalId 있으면 AI"). AI 분해 퀘스트만 목표를 가리키던 시절엔 맞았다. 그런데 **3단계-c에서 직접 등록이 목표(폴더) 단위가 되며** 직접 등록 퀘스트도 `goalId`를 갖게 됐고, 그 추론은 직접 등록을 전부 "AI"로 오표기했다(A0-2 위반). 출처는 goalId와 **별개의 사실**이라 명시 신호로 분리했다.

- **쓰기**: `createQuests(uid, drafts, source:)`가 심는다. AI 분해·재분해는 `ai`, 직접 등록은 `manual`. 기본값은 `ai`(이 경로의 주 사용처가 분해라서)이고, 직접 등록만 `manual`을 명시한다.
- **읽기(하위호환)**: `Quest.effectiveSource`가 유일한 판정처다. 명시값이 있으면 그 값, 없으면(구 문서) `goalId` 폴백 — **필드 없고 goalId 있으면 `ai`, 없으면 `manual`**. 덕분에 구 AI 분해 데이터는 계속 AI로, 구 낱개 직접 등록은 직접으로 보인다(마이그레이션 불필요).
- **직렬화**: 명시값이 있을 때만 문서에 기록한다(`archived`와 같은 원칙 — 기본값은 필드 생략).
- 카드는 `quest.effectiveSource`를, 칩(`QuestSourceChip`)은 `QuestSource`를 받는다. **더는 goalId를 출처 근거로 쓰지 않는다.**

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

#### 계보 삭제 — `deleteQuests(uid, questIds)` (4주차 B-5b)

재분해 원본을 지울 때 그 하위 계보까지 **한 번에** 지운다. 부모만 지우면 자식이 고아로 남기 때문이다.

- **저장소는 트리를 모른다.** 지울 ID 집합은 **화면**이 `descendantIds(quests, rootId)`(`lib/models/quest_group.dart`)로 계산한다 — `arrangeQuestTree()`와 **같은 부모-자식 맵**을 써서 고아·순환 방어를 그대로 물려받는다. 저장소는 "이 ID들을 원자적으로 지운다"만 책임진다(`createQuests`와 대칭). `descendantIds`는 rootId 자신을 포함하지 않으므로 화면이 `{rootId, ...descendants}`로 합쳐 넘긴다.
- **원자성**: Firestore는 batch, InMemory는 스테이징 후 스트림 **1회** 방출. "부모는 지워졌는데 자식은 남은" 중간 상태가 없다. 없는 ID는 무시한다(삭제는 멱등).
- **삭제는 지급된 코인·XP를 회수하지 않는다.** 퀘스트 문서의 `rewardedAt`은 함께 사라지지만, 이미 `users/{uid}`의 `coin`·`xp`에 반영된 값은 건드리지 않는다. 회수는 `completeQuest()` 트랜잭션의 역연산이라 별개 결정이고 이 범위가 아니다 — 계보에 완료된 자식이 섞여 함께 지워질 때도 마찬가지다.
- **완료(보상받음) 퀘스트는 수정·삭제 진입 자체가 없다.** 완료 카드엔 `⋮` 메뉴가 뜨지 않아, 위 "완료된 자식 동반 삭제"는 오직 미완료 부모를 지울 때 그 계보에 완료된 자식이 섞인 경우에만 발생한다.

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

**조회 경로**(보관함 화면): `watchAchievements(uid)`가 `orderBy('completedAt', descending: true)`로 **최신순** 스트림을 흘린다. `quests`와 달리 `completedAt` 단일 키라 복합 인덱스가 필요 없어 정렬을 서버에 맡긴다. 목록은 `Achievement.tryParse`로 관대하게 파싱해 깨진 문서만 버린다(`watchQuests`와 같은 계약). ⚠️ `orderBy`는 `completedAt` 필드가 없는 문서를 결과에서 제외하지만, 지급 경로가 항상 서버 시각을 찍으므로 정상 기록은 모두 포함된다. **이미지 바이트는 이 스트림에 실리지 않는다** — 목록에서 사진은 `hasPhoto` 플래그만 쓰고, proof 문서(base64)는 필요한 화면에서만 questId로 따로 읽는다.

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

**조회 경로 (보관함 상세 시트, 3단계-a)**: `QuestRepository.fetchProof(uid, questId)`가 이 문서를 `get`해 `base64` 필드를 돌려준다. **목록에선 읽지 않고 상세를 열 때만** 그 퀘스트 하나를 lazy 조회한다 — 위 "별도 컬렉션인가"의 이유(목록 N번 읽기 방지)와 짝을 이룬다. 문서가 없으면(사진 없이 완료) `null`을 돌려준다(에러 아님), `base64`가 문자열이 아닌 깨진 문서도 `null`로 떨어뜨려 상세 시트가 "사진 없음"을 그린다. 그 밖의 실패는 다른 조회와 동일하게 `AppFailure`로 정규화한다.

**독립 갱신 경로 (보관함 기록 편집, 3단계-b)**: `QuestRepository.updateProof(uid, questId, String? photoBase64)`가 이 문서를 **완료·보상과 무관하게** 단건으로 고친다 — 값이면 `set`으로 교체, `null`이면 `delete`로 제거(퀘스트당 사진 1장이라 재완료 덮어쓰기와 같은 문서를 다룬다). ⚠️ **`completeQuest` 트랜잭션을 절대 타지 않는다**: `rewardedAt`·`coin`·`xp`·난이도·성취 기록을 전혀 건드리지 않는 보상 경제 밖의 부가 정보 쓰기다(보관 쓰기를 지급 트랜잭션 밖에 두는 것과 같은 원칙). 입구에서 `ensureProofWithinLimit()`로 교체 크기를 한 번 더 방어하고(`completeQuest`와 같은 단일 정의처), 실패는 `AppFailure`로 정규화한다.

> **정책 구분**: 완료 퀘스트의 **제목·난이도** 수정은 B-5b가 막았다(오늘의 퀘스트 목록 — 재완료 보상 유효화 차단). 여기 `updateProof`와 상세 시트의 메모 편집은 **보관함 기록**의 메모·사진이고 보상 등급에 영향이 없어 별개로 허용된다. 메모는 `updateQuest`가 반영하는데, `Quest.toJson()`이 `memo == null`이면 필드를 생략하므로 **메모 비우기(=null)가 문서에서 실제로 지워지도록** Firestore `updateQuest`가 `'memo'`를 명시적으로 실어 쓴다(값이 있을 때는 `toJson`과 같은 값이라 무해). 메모(`updateQuest`)와 사진(`updateProof`)은 각각 별도 쓰기라 원자성이 필수가 아니다 — 부가 정보라 부분 반영을 허용하고 실패는 스낵바로 알린다.

### `users/{uid}/events/{eventId}` — 성공 지표 이벤트 로그 (4주차)

`docs/plan.md`의 지표 3개(**도전 시작률 · 재분해 복귀율 · 7일 리텐션**)를 나중에 로그만으로 산출하기 위한 **append-only 이벤트 스트림**. 데이터만 쌓고 지표 화면은 만들지 않는다 — 산출은 `lib/core/analytics/metrics.dart`의 **순수 함수 + 테스트**가 "이렇게 계산된다"를 증명한다. (Firebase Analytics를 쓰지 않는 이유: 네이티브 플러그인이 한글 경로 빌드 이슈를 되살리고, 기존 저장소 추상화 패턴과 어긋난다. 사용자 결정 2026-07-23.)

| 필드 | 타입 | 설명 |
|------|------|------|
| `type` | string | **필수.** 이벤트 종류 6종 중 하나. 모르는 값이면 파싱에서 버린다 |
| `at` | timestamp | **필수.** 서버 시각(`FieldValue.serverTimestamp`)으로 확정. 경계에서 `DateTime`으로 정규화 |
| `params` | map | 부가 스냅샷. **지표 계산에는 쓰이지 않는다**(디버깅·확장용) |

**이벤트 6종과 발생 지점:**

| `type` | 발생 지점 | `params` |
|--------|-----------|----------|
| `signup` | `ensureUser`가 문서를 **최초 생성**할 때 1회 | — |
| `appOpen` | 세션 시작, **KST 날짜당 1회**(`recordAttendance`의 `isNewDay` 재사용) | `dateKey` |
| `questRegistered` | `createQuest`(직접)·`createQuests`(AI 분해). **재분해 제외** | `count`, `source`(`ai`\|`manual`) |
| `questCompleted` | `completeQuest`가 **실제 지급**할 때. 재완료(`reward==null`)는 제외 | `questId` |
| `questStuck` | `setStatus`로 `stuck` 표시 | `questId` |
| `questRedecomposed` | `parentQuestId`가 달린 재분해 자식 등록 | `parentQuestId`, `count` |

**로그 실패는 기능을 막지 않는다(경계).** 계측은 부가 기능이라 `log`는 **어떤 실패도 위로 던지지 않는다**(Firestore 구현은 `try/catch`로 삼키고, InMemory는 `failWith`가 있어도 던지지 않는다). 그리고 로그는 **완료·등록 트랜잭션/batch 안에 넣지 않는다** — 로그 실패가 지급·등록을 롤백시키거나, 지급이 실패했는데 로그만 남아 지표가 오염되면 안 되기 때문이다. 그래서 **성공한 뒤** 화면/notifier 계층(`core/analytics/analytics_logger.dart`의 `logEvent` 확장)에서 별도로 부른다. 조회 `fetchEvents`는 반대로 실패를 드러낸다(산출·테스트용).

**파싱 정책**은 `achievements`와 같다 — 목록은 관대하게(`tryParse`로 깨진 문서만 버림), 단건은 `type`·`at`이 없으면 엄격하게 버린다(둘이 없으면 어떤 지표에도 기여할 수 없다).

### `users/{uid}/inventory/{itemId}` — 4주차

보유 아이템. 문서 **ID = itemId**라 아이템당 문서 1개이고, 재구매해도 같은 문서를 덮어써 중복 보유가 생기지 않는다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `itemId` | string | 아이템 ID (문서 ID와 동일, 조회 편의) |
| `acquiredAt` | timestamp | 구매 시각 (서버 시각) |

**구매 트랜잭션 계약** (`UserRepository.purchaseItem`, `firestore_user_repository.dart`):
사용자 문서를 읽어 `coin >= price`를 확인하고, 통과하면 **한 트랜잭션에서** `coin`을 `FieldValue.increment(-price)`로 차감하면서 이 문서를 만든다. "코인만 빠지고 아이템 없는" 중간 상태는 불가능하다.
- **잔액 부족** → write 없이 `AppFailure`(트랜잭션 중단). 코인을 한 푼도 깎지 않는다.
- **이미 보유**(문서 존재) → 재결제 없이 반환(멱등). `completeQuest`의 `rewardedAt` 재지급 금지와 같은 정신 — 두 기기 동시 구매도 트랜잭션 안에서 존재 여부를 읽어 한 번만 결제한다.

아이템 **카탈로그는 Firestore가 아니라 코드 상수**(`lib/core/constants/shop_items.dart`, `kShopItems`)다. 운영 중 변경이 없는 MVP라 콘솔 수동 입력·테스트 사각지대를 피한다(`reward_rules`·`growth_rules`와 같은 관례). 슬롯은 2개(`background` 틴트 · `aura` 이모지)이며 `equipped` 맵의 키가 된다.

### `items/{itemId}` — 4주차 (미사용)

공개 아이템 카탈로그 경로. **현재 쓰지 않는다** — 위처럼 카탈로그를 코드 상수로 두기로 했다. 콘솔 관리형 카탈로그가 필요해지는 날을 위해 경로만 남겨 둔다.

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
