# 사이사이 DB / Supabase 작업 문서

## 1. 현재 상태

- 목표 스택에는 Supabase(Postgres)가 포함되어 있지만 현재 코드에는 DB 연동이 없다.
- `supabase/` 설정 디렉터리가 없다.
- SQL 스키마와 마이그레이션 파일이 없다.
- Supabase client, ORM, DB 드라이버 의존성이 없다.
- Express 백엔드 코드도 아직 없다.
- 현재 데이터 흐름은 React 소개 화면과 `prototype/`의 localStorage mock 흐름이 전부다.

## 2. 공통 전제

- 도와주세요 상태값은 `open` / `resolved`로 통일한다.
- 공동구매는 목표 인원 도달 시 추가 참여를 차단한다.
- 목표 인원 도달이 자동 마감을 뜻하지는 않는다.
- 커뮤니티 매칭 1차는 시드 데이터와 단순 규칙 기반이다.
- 지도/좌표 기반 nearest block은 후속 고도화로 둔다.
- 채팅 1차는 REST polling과 메시지 테이블로 처리한다.
- Supabase Realtime은 후속으로 둔다.
- 댓글/대댓글은 MVP 1차에서 제외하고 P2 후속으로 둔다.
- 결제/송금, 푸시, 리뷰/신고, 차단, 관리자 테이블은 만들지 않는다.

## 3. Supabase 도입 체크리스트

### Phase 0. 준비

- [ ] Supabase 프로젝트를 생성한다.
- [ ] 환경 변수 규칙을 정한다.
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Supabase CLI migration 사용 여부를 결정한다.
- [ ] 프론트는 anon key + RLS, 서버는 service role 사용 최소화를 원칙으로 한다.
- [ ] 공통 enum/상태값을 문서화한다.
  - help: `open` / `resolved`
  - group buy: `open` / `closed` / `cancelled`
  - community type: `building` / `block`

### Phase 1. 기반 스키마

- [ ] `profiles` 테이블을 만든다.
- [ ] `communities` 테이블을 만든다.
- [ ] `community_memberships` 테이블을 만든다.
- [ ] UUID PK를 사용한다.
- [ ] `created_at`, `updated_at` 공통 규칙을 적용한다.
- [ ] 커뮤니티, 작성자, 상태, 마감 시각에 필요한 인덱스를 추가한다.

### Phase 2. 인증 / 온보딩

- [ ] Supabase Auth 연동 정책을 확정한다.
- [ ] `auth.users` 생성 시 `profiles` row를 생성하는 트리거를 검토한다.
- [ ] 온보딩 전에는 `housing_type`, `address_text`가 null일 수 있게 한다.
- [ ] 온보딩 완료 API에서 `housing_type`, `address_text`를 필수 검증한다.
- [ ] 온보딩 완료 후 커뮤니티 매칭/가입을 허용한다.
- [ ] 사용자당 활성 멤버십은 1개만 허용한다.

### Phase 3. 게시판

- [ ] `posts` 테이블을 만든다.
- [ ] `help_requests` 테이블을 만든다.
- [ ] `help_requests.status`는 `open` / `resolved`만 허용한다.
- [ ] 작성자만 도움 요청을 `resolved` 처리할 수 있게 한다.
- [ ] 댓글/대댓글 테이블은 만들지 않는다.

### Phase 4. 공동구매

- [ ] `group_buys` 테이블을 만든다.
- [ ] `group_buy_participants` 테이블을 만든다.
- [ ] 공동구매 상태는 `open` / `closed` / `cancelled`로 제한한다.
- [ ] 중복 참여를 unique 제약으로 막는다.
- [ ] 참여 허용 조건에 `participant_count < target_count`를 포함한다.
- [ ] 1인 부담 금액은 저장값이 아니라 조회/응답 시 계산값으로 다룬다.

### Phase 5. 참여자 채팅

- [ ] `group_buy_messages` 테이블을 만든다.
- [ ] 해당 공동구매 참여자만 메시지를 읽고 쓸 수 있게 한다.
- [ ] 기본 정렬과 cursor 기준을 정한다.
- [ ] Realtime 전용 테이블이나 이벤트 outbox는 1차에서 만들지 않는다.

### Phase 6. Seed / Migration / Test

- [ ] 초기 migration SQL을 작성한다.
- [ ] 건물형/블록형 시드 커뮤니티를 만든다.
- [ ] 데모 사용자와 샘플 데이터를 준비한다.
- [ ] RLS 테스트 시나리오를 작성한다.
- [ ] 목표 인원 도달 후 추가 참여 차단을 테스트한다.
- [ ] help `open` -> `resolved` 전이를 테스트한다.

## 4. ER 개요

```text
auth.users 1--1 profiles
profiles 1--* community_memberships *--1 communities
communities 1--* posts
communities 1--* help_requests
communities 1--* group_buys
profiles 1--* posts
profiles 1--* help_requests
profiles 1--* group_buys (as host)
group_buys 1--* group_buy_participants *--1 profiles
group_buys 1--* group_buy_messages *--1 profiles
```

## 5. 테이블 후보

### `profiles`

사용자 공개 프로필이다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | `auth.users.id`와 동일 |
| `nickname` | text not null | 표시 이름 |
| `avatar_color` | text null | UI용 선택 필드 |
| `housing_type` | text null | `apartment_officetel` / `house_villa` |
| `address_text` | text null | 사용자 입력 주소/건물명 |
| `onboarding_completed_at` | timestamptz null | 온보딩 완료 시각 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

규칙:

- 가입 직후에는 `housing_type`, `address_text`가 null일 수 있다.
- 온보딩 완료 시 두 필드는 애플리케이션 서비스 계층에서 필수 검증한다.
- 커뮤니티 매칭과 가입은 온보딩 완료 상태에서만 허용한다.

### `communities`

건물형/블록형 커뮤니티다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | 커뮤니티 ID |
| `name` | text not null | 커뮤니티명 |
| `type` | text not null | `building` / `block` |
| `region_label` | text null | 생활권 라벨 |
| `building_key` | text null | 건물형 매칭 키 |
| `block_key` | text null | 블록형 매칭 키 |
| `is_active` | boolean default true | 활성 여부 |
| `created_at` | timestamptz | 생성 시각 |

1차에서 제외하는 필드:

- `center_lat`
- `center_lng`
- `radius_m`

좌표 기반 검색용 필드는 지도/주소 API 고도화 때 추가한다.

### `community_memberships`

사용자와 커뮤니티의 소속 관계다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | 멤버십 ID |
| `community_id` | uuid FK | 커뮤니티 ID |
| `user_id` | uuid FK | 사용자 ID |
| `status` | text not null | `active` / `left` |
| `matched_by` | text not null | `auto` / `manual` |
| `joined_at` | timestamptz | 가입 시각 |

제약:

- unique(`community_id`, `user_id`)
- 사용자당 `status = 'active'` 멤버십은 1개만 허용하는 partial unique index 권장

### `posts`

자유게시판 글이다. 1차는 본문 중심이며 댓글은 제외한다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | 게시글 ID |
| `community_id` | uuid FK not null | 커뮤니티 ID |
| `author_id` | uuid FK not null | 작성자 ID |
| `title` | text not null | 제목 |
| `body` | text not null | 본문 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

### `help_requests`

도와주세요 요청이다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | 요청 ID |
| `community_id` | uuid FK not null | 커뮤니티 ID |
| `author_id` | uuid FK not null | 작성자 ID |
| `title` | text not null | 제목 |
| `body` | text not null | 본문 |
| `status` | text not null | `open` / `resolved` |
| `resolved_at` | timestamptz null | 완료 시각 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

규칙:

- 생성 시 기본값은 `open`이다.
- 작성자만 `open`에서 `resolved`로 변경할 수 있다.
- 프론트는 `open`을 진행중, `resolved`를 완료로 표시한다.

### `group_buys`

공동구매 모집이다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | 공동구매 ID |
| `community_id` | uuid FK not null | 커뮤니티 ID |
| `host_id` | uuid FK not null | 모집자 ID |
| `title` | text not null | 상품명 |
| `description` | text not null | 설명 |
| `image_url` | text null | 상품 이미지 |
| `total_amount` | int not null | 총 금액 |
| `target_count` | int not null | 목표 인원 |
| `deadline_at` | timestamptz not null | 마감 시각 |
| `pickup_location` | text not null | 분배 위치 |
| `distribution_note` | text null | 분배 안내 |
| `status` | text not null | `open` / `closed` / `cancelled` |
| `closed_at` | timestamptz null | 마감 시각 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

체크 제약 후보:

- `total_amount > 0`
- `target_count >= 2`
- `deadline_at > created_at`

### `group_buy_participants`

공동구매 참여자 관계다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | 참여 ID |
| `group_buy_id` | uuid FK not null | 공동구매 ID |
| `user_id` | uuid FK not null | 사용자 ID |
| `role` | text not null | `host` / `member` |
| `joined_at` | timestamptz | 참여 시각 |

제약:

- unique(`group_buy_id`, `user_id`)
- 모집 생성 시 host를 참여자로 자동 insert한다.
- 참여 인원은 별도 컬럼보다 `count(*)` 계산을 권장한다.

### `group_buy_messages`

공동구매 참여자 채팅 메시지다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | uuid PK | 메시지 ID |
| `group_buy_id` | uuid FK not null | 공동구매 ID |
| `sender_id` | uuid FK not null | 보낸 사용자 ID |
| `body` | text not null | 메시지 본문 |
| `created_at` | timestamptz | 생성 시각 |

규칙:

- 참여자만 읽고 쓸 수 있다.
- 기본 정렬은 대화형 `created_at asc` 또는 최신 페이지 `created_at desc` 중 API에서 고정한다.
- 페이지네이션은 `limit + cursor(created_at, id)`를 권장한다.
- Supabase Realtime publication/channel 설계는 후속이다.

## 6. 커뮤니티 매칭 모델

### 주거 유형

| 값 | 의미 | 매칭 방식 |
| --- | --- | --- |
| `apartment_officetel` | 아파트/오피스텔 | 건물형 |
| `house_villa` | 주택/빌라 | 블록형 |

온보딩 전에는 `profiles.housing_type`이 null일 수 있다.

### 커뮤니티 타입

| 값 | 의미 |
| --- | --- |
| `building` | 같은 건물, 동, 단지 |
| `block` | 골목, 생활권, 원룸 밀집 블록 |

### 1차 매칭

- 시드 데이터와 단순 규칙 기반으로 추천한다.
- 건물형은 `building_key`, `name`, `address_text` 부분 일치를 사용한다.
- 블록형은 `block_key`, `region_label`, `name` 키워드 매칭을 사용한다.
- 후보가 없으면 자동 생성을 남발하지 않고 시드 보강 대상으로 본다.
- 지도 API, 지오코딩, 좌표 기반 nearest block은 후속으로 둔다.

## 7. 공동구매 계산 / 상태 규칙

### 1인 부담 금액

```text
share = ceil(total_amount / max(participant_count, 1))
```

규칙:

- 금액 단위는 원 정수다.
- host도 참여자에 포함한다.
- 표시는 올림(`ceil`)으로 통일한다.
- stale 값 방지를 위해 DB에 고정 저장하지 않고 조회 시 계산하는 것을 권장한다.

### 상태

| 값 | 의미 |
| --- | --- |
| `open` | 모집중 |
| `closed` | 모집 마감 |
| `cancelled` | 모집 취소 |

### 참여 허용 조건

아래를 모두 만족해야 참여 insert를 허용한다.

1. `group_buys.status = 'open'`
2. `deadline_at > now()`
3. 요청 사용자가 같은 커뮤니티 active member
4. 아직 참여자가 아님
5. `participant_count < target_count`

목표 인원 도달 후에도 상태가 `open`일 수 있지만 추가 참여는 차단한다. 모집자는 별도 수동 마감으로 `closed` 처리할 수 있다.

### 상태 전이

| 현재 | 이벤트 | 다음 | 조건 |
| --- | --- | --- | --- |
| - | 모집 생성 | `open` | host 자동 참여 |
| `open` | 참여 | `open` | 참여 허용 조건 충족 |
| `open` | 모집자 마감 | `closed` | host only |
| `open` | 모집자 취소 | `cancelled` | host only |
| `closed` | 참여 | 불가 | - |
| `cancelled` | 참여 | 불가 | - |

## 8. RLS / 권한 초안

### 권한 원칙

- 핵심 데이터는 커뮤니티 멤버십 스코프를 따른다.
- 공동구매 채팅은 해당 모집 참여자 스코프를 따른다.
- service role은 서버 관리 작업에만 제한적으로 사용한다.

### 헬퍼 함수 후보

- `is_community_member(community_id, auth.uid())`
- `is_group_buy_participant(group_buy_id, auth.uid())`
- `is_group_buy_host(group_buy_id, auth.uid())`
- `group_buy_participant_count(group_buy_id)`

### 테이블별 정책

#### `profiles`

- SELECT: 인증 사용자 또는 같은 커뮤니티 멤버
- INSERT: 본인 row만
- UPDATE: 본인 row만

#### `communities`

- SELECT: 인증 사용자 읽기 허용
- INSERT/UPDATE: 1차는 서버/시드 중심

#### `community_memberships`

- SELECT: 본인 + 같은 커뮤니티 멤버
- INSERT: 본인 가입만
- UPDATE: 본인 탈퇴/전환만

#### `posts`, `help_requests`

- SELECT: 같은 커뮤니티 멤버
- INSERT: 같은 커뮤니티 멤버 + `author_id = auth.uid()`
- UPDATE: 작성자 본인
- DELETE: 1차 비허용 또는 작성자만

#### `group_buys`

- SELECT: 같은 커뮤니티 멤버
- INSERT: 같은 커뮤니티 멤버 + `host_id = auth.uid()`
- UPDATE: host만
- DELETE: 1차 비허용

#### `group_buy_participants`

- SELECT: 같은 커뮤니티 멤버 읽기 허용
- INSERT: 본인 참여 + 참여 허용 조건 충족
- DELETE: 1차 비허용

#### `group_buy_messages`

- SELECT/INSERT: 해당 group buy 참여자만
- UPDATE/DELETE: 1차 비허용

## 9. Migration 단위

1. `0001_init_profiles_communities.sql`
2. `0002_posts_help_requests.sql`
3. `0003_group_buys.sql`
4. `0004_group_buy_messages.sql`
5. `0005_rls_policies.sql`
6. `0006_seed_communities_and_demo.sql`

공통 규칙:

- FK on delete 정책을 명시한다.
- enum은 check constraint 또는 Postgres enum 중 하나로 통일한다.
- `updated_at` 트리거를 공통 적용한다.

## 10. Seed 데이터

- 사용자 4명:
  - 민지
  - 준호
  - 서연
  - 하늘
- 커뮤니티 2개 이상:
  - 건물형: `햇살원룸 3동`
  - 블록형: `대학가 후문 원룸 블록`
- 자유게시판 글 2개 이상
- 도와주세요 글 2개 이상
  - `open` 1개
  - `resolved` 1개
- 공동구매 3개
  - 모집중/미달
  - 모집중/목표 인원 도달
  - 마감
- 공동구매 메시지 샘플 소량

## 11. 검증 시나리오

- [ ] 다른 커뮤니티 게시글이 조회되지 않는다.
- [ ] 비참여자가 공동구매 채팅을 읽지 못한다.
- [ ] 중복 참여 insert가 실패한다.
- [ ] `participant_count == target_count`이면 추가 참여가 실패한다.
- [ ] host가 아닌 사용자의 마감 update가 실패한다.
- [ ] help `open` -> `resolved`는 작성자만 가능하다.
- [ ] 1인 부담 금액이 참여 인원 변경 후 재계산된다.
- [ ] active membership이 2개 이상 생기지 않는다.
- [ ] 온보딩 전 `housing_type`, `address_text`가 null인 프로필 생성이 가능하다.
- [ ] 온보딩 완료 API는 두 필드가 없으면 거부한다.

## 12. 완료 기준

- migration으로 빈 Supabase 프로젝트에 스키마를 재현할 수 있다.
- seed로 데모 시나리오를 재현할 수 있다.
- RLS로 커뮤니티/참여자 경계를 강제한다.
- 목표 인원 도달 후 추가 참여가 DB/API 레벨에서 차단된다.
- help 상태값이 `open` / `resolved`로 일관된다.
- 댓글/결제/알림/신고/차단/관리자 테이블이 없다.
- Realtime 의존 없이 메시지 테이블과 REST API로 채팅 1차 구현이 가능하다.

## 13. 후속 과제

- 댓글/대댓글 테이블
- 지도/좌표 기반 nearest block 매칭
- Supabase Realtime 채팅
- 알림 테이블
- 신고/차단/관리자 모델
- 결제/정산 모델

