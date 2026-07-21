# DB 스키마

- 정의 파일: [`server/prisma/schema.prisma`](../server/prisma/schema.prisma)
- ORM: Prisma / DB: PostgreSQL (Neon)
- 이 문서는 스키마를 읽기 좋게 정리한 것으로, 실제 정의는 항상 `schema.prisma`가 원본이다. 스키마를 바꾸면 이 문서도 같이 갱신한다.
- id는 기본적으로 전부 `cuid()` 자동 생성 문자열이다 (데모 유저/카테고리 시드값만 예외적으로 고정 문자열 사용).
- 서비스 기획서 전체 기능 범위를 기준으로 설계했고, 지금은 그중 일부(User/Category/Schedule)만 실제 API가 붙어있다. 나머지는 스키마만 만들어둔 상태 — 맨 아래 "현재 API 연동 상태" 표 참고.

## enum

| enum | 값 |
|---|---|
| `Tone` | blue, violet, green, coral |
| `ReactionKind` | sparkle, heart, fire, tear, wow, sleepy |
| `ReportTargetType` | VIDEO_POST, COMMENT, USER |
| `HomeVisitAction` | SNACK, MESSAGE, PHOTO, FURNITURE_USE |
| `NotificationType` | SCHEDULE_REMINDER, TASK_DUE, FRIEND_REACTION, FRIEND_COMMENT, GROUP_INVITE, DODO_DIARY_READY |
| `SubscriptionPlan` | FREE, PLUS |
| `PurchaseKind` | ITEM, SUBSCRIPTION |

## 유저 · 인증

### User
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | cuid |
| email | String @unique | |
| passwordHash | String | |
| name | String | |
| createdAt | DateTime | 기본값 now() |

### RefreshToken
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | |
| tokenHash | String @unique | 원문 저장 안 함, 해시만 저장 |
| expiresAt | DateTime | |
| revokedAt | DateTime? | 무효화 시각 (null이면 유효) |
| createdAt | DateTime | |

인덱스: `userId`

## 친구 · 그룹 · 안전

### Friendship
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | 요청/소유 쪽 |
| friendId | String → User.id | 대상 쪽 |
| createdAt | DateTime | |

제약: `@@unique([userId, friendId])` — 동일 관계 중복 방지, 단방향(owner→target)

### Block
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| blockerId | String → User.id | 차단한 사람 |
| blockedId | String → User.id | 차단당한 사람 |
| createdAt | DateTime | |

제약: `@@unique([blockerId, blockedId])`

### Report
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| reporterId | String → User.id | |
| targetType | ReportTargetType | 영상/댓글/유저 중 무엇을 신고했는지 |
| targetId | String | targetType이 가리키는 레코드 id (다형 참조라 FK 아님) |
| reason | String | |
| createdAt | DateTime | |

인덱스: `[targetType, targetId]`

### ShareGroup
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| ownerId | String → User.id | 그룹은 유저 개인 소유 (공유 소유 아님) |
| name | String | 절친/스터디/가족/커플 등 자유 텍스트 |

제약: `@@unique([ownerId, name])`

### ShareGroupMember
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| groupId | String → ShareGroup.id | |
| friendUserId | String → User.id | 그룹에 속한 친구 |
| createdAt | DateTime | |

제약: `@@unique([groupId, friendUserId])`

## 카테고리 · 공개범위

카테고리 단위로 공개 그룹을 상속시키고, 일정별로 예외를 둘 수 있는 2단 구조.

### Category
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | 데모 시드는 `study`/`exercise`/`appointment`/`personal` 고정값 사용 |
| userId | String → User.id | |
| name | String | |
| color | String | |
| tone | Tone | |
| createdAt | DateTime | |

인덱스: `userId`

### CategoryVisibility
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| categoryId | String → Category.id | |
| shareGroupId | String → ShareGroup.id | 이 카테고리가 기본 공개되는 그룹 |

제약: `@@unique([categoryId, shareGroupId])`

## 일정

### Schedule
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | 모든 일정은 개인 소유 (그룹 소유 없음) |
| categoryId | String → Category.id | |
| title | String | |
| date | Date (`@db.Date`) | |
| time | String? | 없으면 null → 프론트에서 빈 값으로 표시 |
| isAllDay | Boolean | 종일 일정 여부, 기본값 false |
| location | String? | 장소 |
| memo | String? | 메모 |
| recurrenceRule | String? | 반복 규칙 (예: DAILY/WEEKLY, 미정이면 null) |
| reminderMinutesBefore | Int? | 알림 시간(분 전), 없으면 알림 없음 |
| requiresVideoProof | Boolean | 영상 인증 필요 여부, 기본값 false |
| completed | Boolean | 기본값 false |
| visibilityOverride | Boolean | 기본값 false. true면 카테고리 기본 공개설정 대신 아래 예외를 따름 |
| createdAt | DateTime | |

인덱스: `[userId, date]`

### ScheduleTask
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| scheduleId | String → Schedule.id | 일정에 연결된 세부 할 일 |
| title | String | |
| completed | Boolean | 기본값 false |
| order | Int | 표시 순서, 기본값 0 |

인덱스: `scheduleId`

### ScheduleVisibilityOverride
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| scheduleId | String → Schedule.id | |
| shareGroupId | String → ShareGroup.id | 이 일정만 예외로 공개되는 그룹 |

제약: `@@unique([scheduleId, shareGroupId])`

## 인증 영상 · 반응 · 댓글 · 두두 일기

### VideoPost
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| scheduleId | String → Schedule.id | 어떤 일정 완료 인증인지 |
| userId | String → User.id | |
| storageKey | String | 실제 파일은 Cloudflare R2, DB엔 키만 저장 |
| duration | String? | |
| caption | String? | |
| createdAt | DateTime | |

인덱스: `[userId, createdAt]`

### Reaction
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| videoPostId | String → VideoPost.id | |
| fromUserId | String → User.id | 반응 남긴 사람 |
| kind | ReactionKind | |
| createdAt | DateTime | |

제약: `@@unique([videoPostId, fromUserId, kind])` — 동일 유저가 같은 종류 반응 중복 방지

### Comment
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| videoPostId | String → VideoPost.id | |
| authorId | String → User.id | |
| text | String | |
| createdAt | DateTime | |

인덱스: `[videoPostId, createdAt]`

### DodoDiaryEntry
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | |
| date | Date (`@db.Date`) | 하루 1개 (`@@unique([userId, date])`) |
| representativeVideoPostId | String? → VideoPost.id | 대표 영상. 완료한 일이 없는 날은 null 가능 |
| text | String | 두두 일기 문장 |
| mood | String? | 오늘의 두두 표정/감상 |
| pointsEarned | Int? | 그날 획득한 포인트 요약 |
| createdAt | DateTime | |

## 두두 상태 · 커스터마이징

### DodoState
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String @unique → User.id | 유저당 현재 상태 1개 |
| mood | String | 예: waiting/anxious/celebrating 등 상황별 행동 |
| updatedAt | DateTime | `@updatedAt` |

### DodoAppearance
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String @unique → User.id | 유저당 현재 장착 상태 1개 |
| bodyColor | String | |
| bodyPattern | String? | |
| eyeShape | String | |
| eyeColor | String | |
| eyelidStyle | String? | |
| hatItemId | String? → RoomItem.id | |
| glassesItemId | String? → RoomItem.id | |
| outfitItemId | String? → RoomItem.id | |
| accessoryItemId | String? → RoomItem.id | |
| updatedAt | DateTime | `@updatedAt` |

모자/안경/의상/액세서리는 새 아이템 테이블을 만들지 않고 기존 `RoomItem` 카탈로그를 그대로 참조한다 (`RoomItem.type`으로 종류 구분).

## 친구 상호작용

### HomeVisit
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| visitorId | String → User.id | 방문한 친구 |
| hostId | String → User.id | 마이홈 주인 |
| action | HomeVisitAction | SNACK/MESSAGE/PHOTO/FURNITURE_USE |
| message | String? | MESSAGE일 때 응원 문구 |
| createdAt | DateTime | |

인덱스: `[hostId, createdAt]`

## 위시리스트 · 추억 · 집중 동행 · 공동 홈

### WishlistItem
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| ownerId | String → User.id | |
| shareGroupId | String? → ShareGroup.id | 그룹과 함께 등록한 경우 |
| title | String | |
| resolvedScheduleId | String? @unique → Schedule.id | 룰렛으로 뽑혀 실제 일정이 된 경우 |
| createdAt | DateTime | |

인덱스: `ownerId`

### MemoryScene
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| scheduleId | String @unique → Schedule.id | 일정 하나당 장면 하나 |
| template | String | 장면 템플릿 종류(카페/영화관/여행 등) |
| createdAt | DateTime | |

### MemorySceneParticipant
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| memorySceneId | String → MemoryScene.id | |
| userId | String → User.id | |

제약: `@@unique([memorySceneId, userId])`

### FocusSession
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| hostId | String → User.id | |
| startAt | DateTime | |
| durationMinutes | Int | |
| createdAt | DateTime | |

### FocusSessionParticipant
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| focusSessionId | String → FocusSession.id | |
| userId | String → User.id | |
| completedAt | DateTime? | 참여자별 완료 인증 시각 |
| videoPostId | String? | 완료 인증 영상(있는 경우) |

제약: `@@unique([focusSessionId, userId])`

### SharedHome
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| shareGroupId | String @unique → ShareGroup.id | 그룹당 공동 홈 1개 |
| theme | String | 커플 방/친구 아지트/스터디 도서관/가족 정원 등 |
| gauge | Int | 진행도, 기본값 0 |
| createdAt | DateTime | |

### SharedHomeLayout
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| sharedHomeId | String → SharedHome.id | |
| itemId | String → RoomItem.id | |
| x | Int | |
| y | Int | |
| placedAt | DateTime | |

제약: `@@unique([sharedHomeId, itemId])`

## 시즌 이벤트

### SeasonEvent
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| title | String | |
| description | String? | |
| startAt | DateTime | |
| endAt | DateTime | |

### SeasonEventParticipation
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| seasonEventId | String → SeasonEvent.id | |
| userId | String → User.id | |
| progress | Int | 기본값 0 |

제약: `@@unique([seasonEventId, userId])`

## 알림

### Notification
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | |
| type | NotificationType | |
| refId | String? | 관련 레코드 id (일정/댓글 등, 다형 참조) |
| read | Boolean | 기본값 false |
| createdAt | DateTime | |

인덱스: `[userId, read]`

### NotificationSetting
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | |
| type | NotificationType | |
| enabled | Boolean | 기본값 true |

제약: `@@unique([userId, type])` — 알림 종류별 on/off. 야간 방해 금지 시간대는 별도 유저 설정으로 추후 추가 예정(아직 컬럼 없음)

## 포인트 · 마이룸 · 수익모델

### PointsLedgerEntry
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | |
| amount | Int | 적립/차감 내역 (원장 방식, 잔액 컬럼 없음 — 합산해서 계산) |
| reason | String | |
| refType | String? | 어떤 행동(영상 인증/반응 등)에서 나온 포인트인지 |
| refId | String? | 그 행동의 레코드 id |
| createdAt | DateTime | |

인덱스: `userId`

### RoomItem
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| name | String | |
| cost | Int | |
| type | String | 가구/두두 모자/의상 등 종류 구분 |

구매 가능한 아이템 카탈로그. 마이룸 가구와 두두 커스터마이징 아이템을 이 한 테이블로 같이 관리한다 (`type`으로 구분).

### UserInventory
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | |
| itemId | String → RoomItem.id | |
| acquiredAt | DateTime | |

제약: `@@unique([userId, itemId])` — 유저가 보유한 아이템

### UserRoomLayout
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | |
| itemId | String → RoomItem.id | |
| x | Int | |
| y | Int | |
| placedAt | DateTime | |

제약: `@@unique([userId, itemId])` — 유저가 마이룸에 배치한 아이템 좌표

### Purchase
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String → User.id | |
| kind | PurchaseKind | ITEM(꾸미기 아이템) / SUBSCRIPTION(구독) |
| refId | String? | 구매한 아이템/구독 플랜 id |
| amount | Int | 결제 금액 |
| currency | String | 기본값 "KRW" |
| provider | String | 결제 대행사 |
| purchasedAt | DateTime | |

실결제(현금) 기록. 인게임 재화인 `PointsLedgerEntry`와는 별개 테이블.

### Subscription
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | String @id | |
| userId | String @unique → User.id | 유저당 구독 상태 1개 |
| plan | SubscriptionPlan | 기본값 FREE |
| startedAt | DateTime | |
| expiresAt | DateTime? | null이면 무기한/미구독 |

## 현재 API 연동 상태

| 테이블 | API 연동 |
|---|---|
| User, Category, Schedule | ✅ 연결됨 (`/api/schedules`, 데모 유저 1명 고정) |
| RefreshToken | ❌ 미연동 — 인증(Task 3)에서 사용 |
| Friendship, Block, Report, ShareGroup, ShareGroupMember, CategoryVisibility, ScheduleVisibilityOverride | ❌ 미연동 — 친구/그룹/안전 기능(Task 6, 4주차)에서 사용 |
| ScheduleTask | ❌ 미연동 — 일정 세부 할 일 UI 붙을 때 사용 |
| VideoPost, Reaction, Comment, DodoDiaryEntry | ❌ 미연동 — 영상 업로드(Task 4)·코멘트(Task 5)·두두 알고리즘(Task 9)에서 사용 |
| DodoState, DodoAppearance | ❌ 미연동 — 두두 행동/커스터마이징(Task 9, P2 Task 14)에서 사용 |
| HomeVisit, WishlistItem, MemoryScene, MemorySceneParticipant, FocusSession, FocusSessionParticipant, SharedHome, SharedHomeLayout | ❌ 미연동 — 놀이 콘텐츠(9.2/9.3 장기 확장 기능)에서 사용 |
| SeasonEvent, SeasonEventParticipation | ❌ 미연동 — 시즌 이벤트(Task 12, P2)에서 사용 |
| Notification, NotificationSetting | ❌ 미연동 — 푸시 알림(Task 10, P2)에서 사용 |
| PointsLedgerEntry, RoomItem, UserInventory, UserRoomLayout | ❌ 미연동 — 포인트/마이홈 꾸미기(Task 14, P2)에서 사용 |
| Purchase, Subscription | ❌ 미연동 — 수익 모델은 백로그 기능 순서에 없음, 장기 확장 시 사용 |
