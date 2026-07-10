# 사이사이 DB / Supabase 작업 문서

## 1. 목표와 현재 상태

- `supabase/migrations`, `supabase/tests`, `supabase/seed.sql` 골격만 있고 migration, test, DB 연동 코드는 없다.
- Supabase CLI migration으로 빈 프로젝트에 스키마·함수·RLS를 재현한다. DB seed는 `supabase/seed.sql`, Auth 데모 계정은 `scripts/seed-demo.mjs`로 분리한다.
- 프론트는 Express API를 통해 앱 데이터에 접근하며, Express는 사용자 JWT가 적용된 Supabase client로 RLS를 유지한다.
- service role은 seed와 제한된 운영 작업에만 사용한다.

## 2. MVP 데이터 범위

### 테이블

- `profiles`
- `communities`
- `community_memberships`
- `posts`
- `help_requests`
- `comments`
- `group_buys`
- `group_buy_participants`
- `group_buy_messages`

### 제외

- 댓글 수정·삭제, 대댓글 구조
- 결제·송금·정산, 주문, 에스크로 테이블
- 알림, 리뷰·신고, 차단, 관리자 테이블
- 지도 좌표, 지오코딩, 거주 인증 모델
- Storage 업로드 메타데이터와 Realtime 전용 이벤트 테이블

## 3. 공통 규칙

- PK는 UUID, 시각은 `timestamptz`, 금액은 원 단위 양의 정수를 사용한다.
- API 상태는 help `open | resolved`, group buy `open | closed`, community `building | block`으로 제한한다.
- 모든 FK에 `on delete` 동작을 명시하고 조회 조건과 정렬에 맞는 인덱스를 만든다.
- `updated_at`이 있는 테이블에는 공통 trigger를 적용한다.
- DB는 snake_case, Express 응답은 camelCase를 사용한다.
- 예상 1인 부담금은 저장하지 않고 `ceil(total_amount / participant_count)`로 조회 시 계산한다.

## 4. 스키마

### `profiles`

| 컬럼 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | uuid PK/FK | `auth.users.id`, cascade |
| `nickname` | text | not null |
| `avatar_color` | text | null 허용 |
| `housing_type` | text | null 또는 `apartment_officetel`, `house_villa` |
| `address_text` | text | null 허용, 비공개 |
| `onboarding_completed_at` | timestamptz | null 허용 |
| `created_at` | timestamptz | 기본 `now()` |
| `updated_at` | timestamptz | 기본 `now()` |

- 가입 직후 온보딩 필드는 null일 수 있다.
- 다른 사용자는 정확한 주소와 주거 유형을 조회할 수 없다. 공개 사용자 정보는 별도 view 또는 제한된 함수에서 `id`, `nickname`, `avatar_color`만 반환한다.

### `communities`

| 컬럼 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | uuid PK | 기본 UUID |
| `name` | text | not null |
| `type` | text | `building` 또는 `block` |
| `region_label` | text | null 허용 |
| `building_key` | text | null 허용 |
| `block_key` | text | null 허용 |
| `is_active` | boolean | 기본 true |
| `created_at` | timestamptz | 기본 `now()` |

- 건물형은 `building_key`, 블록형은 `block_key`와 `region_label`을 단순 추천에 사용한다.
- 추천은 거주 사실 인증이 아닌 공개 데모용 키워드 매칭이다.

### `community_memberships`

| 컬럼 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | uuid PK | 기본 UUID |
| `community_id` | uuid FK | communities, restrict |
| `user_id` | uuid FK | profiles, cascade |
| `status` | text | `active` 또는 `left` |
| `matched_by` | text | `auto` 또는 `manual` |
| `joined_at` | timestamptz | 기본 `now()` |

- unique(`community_id`, `user_id`)를 둔다.
- 사용자당 `status = 'active'` 행 하나만 허용하는 partial unique index를 둔다.
- 커뮤니티 전환 함수는 기존 active 행을 `left`로 바꾸고 새 행을 active로 만드는 과정을 한 transaction에서 처리한다.

### `posts`

| 컬럼 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | uuid PK | 기본 UUID |
| `community_id` | uuid FK | communities, restrict |
| `author_id` | uuid FK | profiles, restrict |
| `title` | text | not null |
| `body` | text | not null |
| `created_at` | timestamptz | 기본 `now()` |
| `updated_at` | timestamptz | 기본 `now()` |

### `help_requests`

| 컬럼 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | uuid PK | 기본 UUID |
| `community_id` | uuid FK | communities, restrict |
| `author_id` | uuid FK | profiles, restrict |
| `title` | text | not null |
| `body` | text | not null |
| `status` | text | 기본 `open`, `open | resolved` |
| `resolved_at` | timestamptz | null 허용 |
| `created_at` | timestamptz | 기본 `now()` |
| `updated_at` | timestamptz | 기본 `now()` |

- 작성자만 `open`에서 `resolved`로 전환한다.
- resolve 함수는 `resolved_at`을 함께 기록하고 재요청을 멱등 처리한다.

### `comments`

| 컬럼 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | uuid PK | 기본 UUID |
| `post_id` | uuid FK | posts, cascade, null 허용 |
| `help_request_id` | uuid FK | help_requests, cascade, null 허용 |
| `author_id` | uuid FK | profiles, restrict |
| `body` | text | not null |
| `created_at` | timestamptz | 기본 `now()` |

- `(post_id is not null) <> (help_request_id is not null)` CHECK로 부모가 정확히 하나임을 보장한다.
- `(post_id, created_at, id)`와 `(help_request_id, created_at, id)` 인덱스를 둔다.
- 수정·삭제 시각, 부모 댓글 ID는 만들지 않는다.
- 부모 리소스의 커뮤니티 멤버만 조회·작성할 수 있다.

### `group_buys`

| 컬럼 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | uuid PK | 기본 UUID |
| `community_id` | uuid FK | communities, restrict |
| `host_id` | uuid FK | profiles, restrict |
| `title` | text | not null |
| `description` | text | not null |
| `image_url` | text | null 허용 |
| `total_amount` | integer | `> 0` |
| `target_count` | integer | `>= 2` |
| `deadline_at` | timestamptz | 생성 시 미래 시각 |
| `pickup_location` | text | not null |
| `distribution_note` | text | null 허용 |
| `status` | text | 기본 `open`, `open | closed` |
| `closed_at` | timestamptz | null 허용 |
| `created_at` | timestamptz | 기본 `now()` |
| `updated_at` | timestamptz | 기본 `now()` |

### `group_buy_participants`

| 컬럼 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | uuid PK | 기본 UUID |
| `group_buy_id` | uuid FK | group_buys, cascade |
| `user_id` | uuid FK | profiles, restrict |
| `role` | text | `host` 또는 `member` |
| `joined_at` | timestamptz | 기본 `now()` |

- unique(`group_buy_id`, `user_id`)로 중복 참여를 막는다.
- 모집 생성 시 host 참여 행을 같은 transaction에서 만든다.
- 앱 역할의 직접 INSERT는 허용하지 않고 `create_group_buy`, `join_group_buy` RPC만 사용한다.

### `group_buy_messages`

| 컬럼 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | uuid PK | 기본 UUID |
| `group_buy_id` | uuid FK | group_buys, cascade |
| `sender_id` | uuid FK | profiles, restrict |
| `body` | text | not null |
| `created_at` | timestamptz | 기본 `now()` |

- `(group_buy_id, created_at, id)` cursor 인덱스를 둔다.
- 참여자만 읽고 작성할 수 있으며 수정·삭제는 허용하지 않는다.

## 5. 함수와 원자성

### `switch_active_community`

- 호출 사용자의 기존 active membership을 `left`로 바꾸고 대상 커뮤니티 membership을 active로 upsert한다.
- 대상 커뮤니티가 비활성이면 실패한다.

### `create_group_buy`

- `auth.uid()`가 활성 커뮤니티 멤버인지 확인한다.
- 입력 제약을 검사하고 `group_buys`와 host participant를 한 transaction에서 만든다.
- host가 참여자 수와 예상 부담금 계산에 포함되게 한다.

### `join_group_buy`

- 대상 `group_buys` 행을 `FOR UPDATE`로 잠근다.
- 호출 사용자가 같은 커뮤니티 active member인지 확인한다.
- `status = 'open'`, `deadline_at > now()`, 미참여, 현재 인원 `< target_count`를 같은 transaction에서 검사한다.
- 조건 충족 시 `member` 참여 행을 추가하고 새 참여 인원과 예상 부담금을 반환한다.
- 동시 요청에서도 목표 인원을 넘지 않게 한다.

### 함수 보안

- 필요한 함수만 `security definer`로 만들고 고정 `search_path`를 설정한다.
- 함수 내부에서 `auth.uid()`와 멤버십·작성자·참여자 조건을 다시 확인한다.
- service role이 아닌 `authenticated` 역할에 필요한 execute 권한만 부여한다.

## 6. RLS 정책

- 모든 핵심 테이블에 RLS를 활성화하고 기본 거부를 유지한다.
- `profiles`: 본인은 전체 필드 조회·수정, 타 사용자는 공개 프로필 view/함수만 사용한다.
- `communities`: 인증 사용자는 활성 커뮤니티 목록을 읽을 수 있고 쓰기는 seed/운영에 한정한다.
- `community_memberships`: 본인과 같은 커뮤니티의 최소 관계만 읽으며 변경은 전환 함수로 제한한다.
- `posts`, `help_requests`: 같은 커뮤니티 active member만 SELECT/INSERT; author는 `auth.uid()`와 같아야 한다.
- `comments`: 부모 게시글 또는 도움 요청과 같은 커뮤니티 active member만 SELECT/INSERT한다.
- `group_buys`: 같은 커뮤니티 active member만 SELECT; 생성은 RPC, 마감은 host만 허용한다.
- `group_buy_participants`: 해당 공동구매의 커뮤니티 멤버만 SELECT; INSERT는 RPC 외 직접 허용하지 않는다.
- `group_buy_messages`: 해당 공동구매 참여자만 SELECT/INSERT하고 sender는 `auth.uid()`와 같아야 한다.

RLS 테스트는 anon key + 각 데모 사용자 JWT로 실행한다. service role 테스트만으로 권한을 검증하지 않는다.

## 7. Migration과 seed

### Migration 순서

1. `0001_profiles_communities.sql`: 공통 함수, profiles, communities, memberships
2. `0002_posts_help_comments.sql`: posts, help_requests, comments
3. `0003_group_buys.sql`: group buys, participants, 원자적 RPC
4. `0004_group_buy_messages.sql`: messages와 cursor index
5. `0005_rls_policies.sql`: helper와 전체 RLS 정책
6. `0006_demo_views.sql`: 공개 프로필과 필요한 읽기 view/function

- schema, 함수, trigger, RLS만 migration에 둔다.
- DB 구현 시작 시 `supabase init`으로 `supabase/config.toml`을 생성하고 저장소에 포함한다.
- Supabase CLI로 로컬 `db reset`과 운영 프로젝트 `db push`가 가능해야 한다.

### Seed와 DB 테스트

- `supabase/seed.sql`에는 Auth 생성이 필요 없는 DB 전용 기준 데이터를 둔다.
- `scripts/seed-demo.mjs`가 service role로 Auth 데모 계정과 사용자별 샘플 데이터를 멱등 생성한다.
- `supabase/tests/`에는 RLS, RPC, 제약 조건 SQL 테스트를 둔다.
- 비밀번호는 커밋하지 않고 seed 실행 환경 변수에서 받는다.
- 계정은 최소 3명이며 서로 다른 작성자·모집자·참여자 역할을 재현한다.
- 건물형·블록형 커뮤니티를 각 1개 이상 만든다.
- 댓글이 있는 게시글과 도움 요청을 만들고 도움 상태는 `open`, `resolved`를 모두 포함한다.
- 공동구매는 모집중/미달, 모집중/정원 도달, 마감 상태를 포함하고 참여자 채팅을 준비한다.

## 8. 검증 시나리오와 완료 기준

- [ ] migration으로 빈 로컬/원격 Supabase 프로젝트를 재현할 수 있다.
- [ ] seed를 반복 실행해도 중복 계정과 데이터가 생기지 않는다.
- [ ] 사용자는 active membership을 두 개 가질 수 없다.
- [ ] 정확한 주소를 다른 사용자가 읽을 수 없다.
- [ ] 다른 커뮤니티의 게시글·댓글·도움 요청·공동구매가 조회되지 않는다.
- [ ] 댓글은 게시글 또는 도움 요청 중 정확히 한 부모만 가진다.
- [ ] 도움 요청 작성자만 `open`에서 `resolved`로 전환한다.
- [ ] 공동구매 생성과 host 참여가 함께 성공하거나 함께 실패한다.
- [ ] 중복 참여, 정원 도달, 기한 만료, 마감 후 참여가 실패한다.
- [ ] 동시 참여 요청에도 `participant_count <= target_count`가 유지된다.
- [ ] host 외 사용자는 모집을 마감할 수 없다.
- [ ] 비참여자는 채팅을 읽거나 작성할 수 없다.
- [ ] 예상 부담금이 참여 인원 변경 후 재계산된다.
- [ ] 결제·알림·신고·차단·관리자 관련 제외 기능의 불필요한 테이블이 없다.
- [ ] MVP 댓글 테이블은 목록·작성만 지원하며 수정·삭제·대댓글 구조가 없다.
