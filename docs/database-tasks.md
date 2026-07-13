# 사이사이 DB / Supabase 작업 문서

## 1. 목표와 현재 상태

- `supabase/migrations`, `supabase/tests`, `supabase/seed.sql` 골격만 있고 migration과 DB 테스트는 없다.
- 빈 Supabase 프로젝트에 schema, 함수, trigger와 RLS를 migration으로 재현한다.
- Express는 사용자 JWT가 적용된 Supabase client로 접근하고 service role은 seed/test에만 사용한다.
- 주소 원문과 좌표는 커뮤니티 키 계산에만 사용하고 DB에 저장하지 않는다.

## 2. MVP 데이터 범위

### Must 테이블

- `profiles`
- `communities`
- `community_memberships`
- `posts`
- `help_requests`
- `comments`
- `conversations`
- `conversation_members`
- `messages`
- `group_buys`
- `group_buy_participants`

### Won't 테이블

- 결제·송금·정산·주문·에스크로
- 알림, 리뷰·신고, 차단, 관리자
- Storage 업로드, Realtime 이벤트, 읽음 상태
- 나의 활동 전용 집계, 주소·좌표·거주 인증

## 3. 공통 규칙

- PK는 UUID, 시각은 `timestamptz`, 금액은 원 단위 양의 integer를 사용한다.
- 상태는 help `open | resolved`, group buy `recruiting | confirmed`, conversation `help_direct | group_buy`, community `building | h3`로 제한한다.
- 모든 FK에 `on delete`를 명시하고 조회·정렬 조건에 맞는 인덱스를 만든다.
- `updated_at`이 있는 테이블에는 공통 trigger를 적용한다.
- DB는 snake_case, Express는 camelCase를 사용한다.
- 예상 부담금과 만료 상태는 저장하지 않고 조회 시 계산한다.

## 4. 스키마

### `profiles`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `id` | uuid PK/FK | `auth.users.id`, cascade |
| `nickname` | text | null 또는 2~20자 |
| `housing_type` | text | null 또는 `apartment_officetel | house_villa` |
| `onboarding_completed_at` | timestamptz | null 허용 |
| `created_at` | timestamptz | 기본 `now()` |
| `updated_at` | timestamptz | 기본 `now()` |

- auth 사용자 생성 trigger가 nickname null profile을 만든다.
- 주소 원문, 좌표, H3 cell을 profile에 저장하지 않는다.

### `communities`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `id` | uuid PK | 기본 UUID |
| `name` | text | not null |
| `type` | text | `building | h3` |
| `region_label` | text | not null |
| `community_key_hash` | text | unique, not null |
| `h3_index` | text | h3형만 값, unique |
| `h3_resolution` | smallint | h3형은 9 |
| `is_active` | boolean | 기본 true |
| `created_at` | timestamptz | 기본 `now()` |

- building형 key hash는 서버가 `roadAddressName|buildingName|apartmentDong`을 정규화 후 SHA-256으로 계산한다.
- h3형 key hash는 `h3:r9:<h3_index>` 문자열의 SHA-256이다.
- building형은 h3 필드가 null, h3형은 h3 필드가 not null인 CHECK를 둔다.

### `community_memberships`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `id` | uuid PK | 기본 UUID |
| `community_id` | uuid FK | communities, restrict |
| `user_id` | uuid FK | profiles, cascade |
| `status` | text | `active | left` |
| `joined_at` | timestamptz | 기본 `now()` |
| `left_at` | timestamptz | null 허용 |

- unique(`community_id`, `user_id`)를 둔다.
- 사용자당 `status = 'active'` 행 하나만 허용하는 partial unique index를 둔다.
- 앱에는 커뮤니티 변경 UI가 없지만 onboarding RPC는 기존 active 행을 left로 바꾸는 원자성을 보장한다.

### `posts`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `id` | uuid PK | 기본 UUID |
| `community_id` | uuid FK | communities, restrict |
| `author_id` | uuid FK | profiles, restrict |
| `title` | text | 2~80자 |
| `body` | text | 1~2,000자 |
| `created_at` | timestamptz | 기본 `now()` |

### `help_requests`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `id` | uuid PK | 기본 UUID |
| `community_id` | uuid FK | communities, restrict |
| `author_id` | uuid FK | profiles, restrict |
| `title` | text | 2~80자 |
| `body` | text | 1~2,000자 |
| `status` | text | 기본 `open`, `open | resolved` |
| `resolved_at` | timestamptz | null 허용 |
| `created_at` | timestamptz | 기본 `now()` |

- 작성자만 resolve 함수로 상태를 변경한다.
- `resolved`와 `resolved_at not null`의 일치 CHECK를 둔다.

### `comments`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `id` | uuid PK | 기본 UUID |
| `post_id` | uuid FK | posts, cascade, null 허용 |
| `help_request_id` | uuid FK | help_requests, cascade, null 허용 |
| `author_id` | uuid FK | profiles, restrict |
| `body` | text | 1~500자 |
| `created_at` | timestamptz | 기본 `now()` |

- 부모가 posts/help_requests 중 정확히 하나인 CHECK를 둔다.
- resolved help request에는 새 comment를 삽입할 수 없다.

### `conversations`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `id` | uuid PK | 기본 UUID |
| `type` | text | `help_direct | group_buy` |
| `community_id` | uuid FK | communities, restrict |
| `help_request_id` | uuid FK | help_requests, cascade, null 허용 |
| `group_buy_id` | uuid FK | group_buys, cascade, null 허용 |
| `direct_participant_id` | uuid FK | profiles, restrict, null 허용 |
| `created_by` | uuid FK | profiles, restrict |
| `created_at` | timestamptz | 기본 `now()` |

- help_direct는 help_request_id와 direct_participant_id만 값이 있다.
- group_buy는 group_buy_id만 값이 있다.
- unique(`help_request_id`, `direct_participant_id`)로 도움 방 중복을 막는다.
- unique(`group_buy_id`)로 공동구매 방 중복을 막는다.

### `conversation_members`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `conversation_id` | uuid FK | conversations, cascade |
| `user_id` | uuid FK | profiles, restrict |
| `role` | text | `owner | member` |
| `joined_at` | timestamptz | 기본 `now()` |

- PK는 (`conversation_id`, `user_id`)다.
- help_direct는 도움 작성자와 선택 댓글 작성자 두 명만 가진다.
- group_buy는 확정 시점의 모든 참여자를 가진다.

### `messages`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `id` | uuid PK | 기본 UUID |
| `conversation_id` | uuid FK | conversations, cascade |
| `sender_id` | uuid FK | profiles, restrict |
| `body` | text | 1~1,000자 |
| `created_at` | timestamptz | 기본 `now()` |

- (`conversation_id`, `created_at`, `id`) cursor index를 둔다.
- 수정·삭제·읽음 컬럼은 만들지 않는다.

### `group_buys`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `id` | uuid PK | 기본 UUID |
| `community_id` | uuid FK | communities, restrict |
| `host_id` | uuid FK | profiles, restrict |
| `title` | text | 2~80자 |
| `description` | text | 1~2,000자 |
| `total_amount` | integer | 1~100,000,000 |
| `target_count` | integer | 2~50 |
| `deadline_at` | timestamptz | 생성 시 현재+10분~30일 |
| `pickup_location` | text | 2~100자 |
| `status` | text | 기본 `recruiting`, `recruiting | confirmed` |
| `confirmed_at` | timestamptz | null 허용 |
| `created_at` | timestamptz | 기본 `now()` |

- confirmed 상태와 confirmed_at not null의 일치 CHECK를 둔다.
- image_url, closed_at, cancelled_at, payment 필드는 만들지 않는다.

### `group_buy_participants`

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `group_buy_id` | uuid FK | group_buys, cascade |
| `user_id` | uuid FK | profiles, restrict |
| `role` | text | `host | member` |
| `joined_at` | timestamptz | 기본 `now()` |

- PK는 (`group_buy_id`, `user_id`)다.
- 직접 INSERT를 허용하지 않고 create/join RPC만 사용한다.

## 5. 원자적 함수

### `complete_onboarding`

- `auth.uid()` profile의 nickname과 housing_type을 갱신한다.
- community_key_hash로 active community를 upsert한다.
- 기존 active membership을 left로 바꾸고 대상 membership을 active로 upsert한다.
- onboarding_completed_at을 기록하고 community를 반환한다.

### `resolve_help_request`

- 호출자가 작성자인지 확인한다.
- open이면 resolved와 resolved_at을 기록한다.
- 이미 resolved면 현재 행을 반환한다.

### `create_help_conversation`

- 요청이 open이고 호출자가 작성자인지 확인한다.
- participant가 해당 요청 댓글 작성자이자 같은 커뮤니티 active member인지 확인한다.
- conversation과 두 membership을 생성하며 기존 조합이면 기존 방을 반환한다.

### `create_group_buy`

- 호출자의 active community를 확인한다.
- group_buys와 host participant를 한 transaction에서 만든다.

### `join_group_buy`

- 대상 모집을 `FOR UPDATE`로 잠근다.
- 같은 커뮤니티, recruiting, 미만료, 미참여, 현재 인원 < 목표 인원을 검사한다.
- member 행을 추가하고 새 participant count와 예상 부담금을 반환한다.

### `confirm_group_buy`

- 대상 모집을 `FOR UPDATE`로 잠근다.
- host, recruiting, 미만료, 현재 인원 = 목표 인원을 검사한다.
- confirmed와 confirmed_at을 기록한다.
- group_buy conversation 한 개와 현재 참여자의 conversation_members를 만든다.
- 이미 confirmed면 기존 conversation과 현재 모집 정보를 반환한다.

### 함수 보안

- 필요한 함수만 `security definer`로 만들고 고정 `search_path`를 설정한다.
- 모든 함수 내부에서 `auth.uid()`와 active community·작성자·참여자 조건을 다시 확인한다.
- authenticated 역할에 필요한 execute 권한만 부여한다.

## 6. RLS 정책

- 모든 핵심 테이블에 RLS를 활성화하고 기본 거부한다.
- profiles: 본인만 전체 조회·수정, 타 사용자는 공개 프로필 함수의 id/nickname만 조회
- communities: 인증 사용자는 자신의 active community만 조회
- memberships: 본인 active membership만 직접 조회, 변경은 RPC만 허용
- posts/help/comments/group_buys: 같은 active community 멤버만 조회·작성
- help resolve: 함수만 허용
- conversations/members/messages: conversation member만 조회
- messages insert: sender_id = auth.uid(), conversation member, resolved help가 아님
- group participants: 같은 모집 community 멤버는 조회, insert는 RPC만 허용

service role 테스트만으로 권한을 검증하지 않고 사용자 JWT A/B/C로 성공·차단을 확인한다.

## 7. Migration 순서

1. `0001_profiles_communities.sql`: profile trigger, communities, memberships, onboarding RPC
2. `0002_posts_help_comments.sql`: posts, help_requests, comments, resolve 함수
3. `0003_group_buys.sql`: group buys, participants, create/join RPC
4. `0004_conversations.sql`: conversations, members, messages, 도움 conversation 함수, confirm group buy RPC
5. `0005_rls_policies.sql`: helper와 전체 RLS
6. `0006_public_views.sql`: 공개 프로필과 API 조회 함수

- migration은 schema, 함수, trigger, RLS만 포함한다.
- `supabase/seed.sql`은 Auth 없이 실행할 기준 community 데이터만 포함한다.
- Auth test 사용자는 seed 스크립트에서 환경 변수로 생성하며 비밀번호를 커밋하지 않는다.

## 8. DB 검증 완료 조건

- profile trigger가 신규 Auth 사용자의 빈 profile을 만든다.
- 동일 building key와 동일 H3 cell은 각각 동일 community를 반환한다.
- 사용자당 active membership이 하나다.
- 주소 원문과 좌표 컬럼이 존재하지 않는다.
- 다른 community의 모든 리소스가 JWT 사용자에게 보이지 않는다.
- 도움 작성자만 resolve하고 resolved 요청에 쓰기할 수 없다.
- 댓글을 작성하지 않은 상대와 help conversation을 만들 수 없다.
- conversation 비멤버가 messages를 읽거나 쓸 수 없다.
- 그룹 생성과 host 참여가 함께 성공하거나 함께 실패한다.
- 동시 참여 요청에도 participant count가 target count를 넘지 않는다.
- 목표 미달, 기한 경과, 비host 확정이 실패한다.
- 확정과 conversation/member 생성이 함께 성공하거나 함께 실패한다.
- 재확정에 conversation이 중복 생성되지 않는다.
- 예상 부담금이 참여 후 다시 계산된다.
