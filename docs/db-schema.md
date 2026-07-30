# MentorING DB 스키마 초안

> 상태: `supabase/migrations/`에 적용 완료 (테이블, 6절 인덱스, `updated_at` 트리거)  
> 기준: Supabase PostgreSQL + Supabase Auth  
> 최종 수정: 2026-07-23

## 1. 설계 원칙

- 인증 계정은 Supabase가 관리하는 `auth.users`를 사용한다.
- 이메일과 비밀번호는 서비스 테이블에 중복 저장하지 않는다.
- 서비스 공통 사용자 정보는 `profiles`에 저장한다.
- 멘티와 멘토의 역할별 정보는 각각 `mentee_profiles`, `mentor_profiles`로 분리한다.
- 한 번의 신청은 최대 3명의 멘토를 대상으로 하므로 `applications`와 `application_mentors`를 분리한다.
- 사전 질문지는 신청과 항상 1:1이며 문항이 고정되어 있으므로 `applications`에 포함한다.
- 확정된 면담 정보는 `meetings`에서 관리한다.
- DB 테이블과 칼럼은 `snake_case`를 사용한다.
- 상태값은 `pending`, `confirmed`, `completed`, `rejected`만 사용한다.
- 사용하지 않는 로그인 아이디(`username`)와 면담 방식(`method`) 칼럼은 두지 않는다.

## 2. 전체 관계

```text
auth.users
   └── profiles
       ├── mentee_profiles
       │   └── applications
       │       ├── application_mentors ── mentor_profiles
       │       └── meetings ───────────── mentor_profiles
       └── mentor_profiles
```

## 3. 상태값

| 값 | 화면 표시 | 의미 |
|---|---|---|
| `pending` | 대기 | 아직 멘토 응답 또는 최종 확정이 없음 |
| `confirmed` | 확정 | 한 명의 멘토가 수락하여 면담이 확정됨 |
| `completed` | 완료 | 면담이 완료됨 |
| `rejected` | 거절 | 멘토가 거절했거나 모든 대상 멘토가 거절함 |

상태 칼럼에는 다음 CHECK 제약을 공통으로 적용한다.

```sql
check (status in ('pending', 'confirmed', 'completed', 'rejected'))
```

## 4. 테이블 정의

### 4.1 `auth.users`

Supabase Auth가 관리하는 시스템 테이블이다. 애플리케이션 마이그레이션에서 직접 생성하지 않는다.

주요 사용 정보:

- `id`: 사용자 UUID
- `email`: 로그인 이메일
- 암호화된 인증 정보
- 이메일 인증 여부
- 가입 및 마지막 로그인 시각

비밀번호 원문은 어떤 서비스 테이블에도 저장하지 않는다.

### 4.2 `profiles`

모든 사용자의 공통 서비스 정보를 저장한다.

| 칼럼 | 타입 | NULL | 키/기본값 | 설명 |
|---|---|---:|---|---|
| `id` | `uuid` | 불가 | PK, FK → `auth.users.id` | 사용자 ID |
| `role` | `text` | 불가 | CHECK (`mentee`, `mentor`) | 사용자 역할 |
| `name` | `text` | 불가 |  | 이름 |
| `nickname` | `text` | 불가 |  | 서비스 표시 닉네임 |
| `mentor_list_onboarded_at` | `timestamptz` | 가능 |  | 멘티 온보딩 코치마크(멘토 목록 6스텝) 열람 완료 시각 |
| `questionnaire_onboarded_at` | `timestamptz` | 가능 |  | 멘티 온보딩 코치마크(사전 질문지 1스텝) 열람 완료 시각 |
| `created_at` | `timestamptz` | 불가 | `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | 불가 | `now()` | 수정 시각 |

제약 및 규칙:

- `id`는 `auth.users.id`와 같아야 한다.
- `auth.users` 삭제 시 함께 삭제되도록 `ON DELETE CASCADE`를 사용한다.
- 로그인은 이메일로 처리하므로 `username` 칼럼은 사용하지 않는다.
- `mentor_list_onboarded_at`/`questionnaire_onboarded_at`은 멘티 역할에만 의미가 있으며, 멘토 프로필에서는 항상 `NULL`로 둔다. 아직 온보딩을 보지 않았으면 `NULL`, 완료하면 완료 시각이 저장된다.

### 4.3 `mentee_profiles`

멘티에게만 필요한 학적 정보를 저장한다.

| 칼럼 | 타입 | NULL | 키/기본값 | 설명 |
|---|---|---:|---|---|
| `user_id` | `uuid` | 불가 | PK, FK → `profiles.id` | 멘티 사용자 ID |
| `school` | `text` | 불가 |  | 소속 학교 |
| `major` | `text` | 불가 |  | 전공 |
| `grade` | `text` | 불가 |  | 학년 (`1`, `2`, `3`, `4`, `5+`) |
| `enrollment_status` | `text` | 불가 | CHECK | 재학 상태 |
| `updated_at` | `timestamptz` | 불가 | `now()` | 수정 시각 |

`enrollment_status` 허용값:

- `enrolled`: 재학
- `leave`: 휴학
- `graduated`: 졸업
- `other`: 기타

### 4.4 `mentor_profiles`

멘티가 조회하는 멘토의 전체 프로필을 저장한다.

| 칼럼 | 타입 | NULL | 키/기본값 | 설명 |
|---|---|---:|---|---|
| `user_id` | `uuid` | 불가 | PK, FK → `profiles.id` | 멘토 사용자 ID |
| `school` | `text` | 불가 |  | 소속 학교 |
| `major` | `text` | 불가 |  | 전공 |
| `academic_status` | `text` | 불가 |  | 석사·박사 등의 학적 |
| `program` | `text` | 불가 |  | 학과 및 과정 |
| `lab` | `text` | 불가 |  | 소속 연구실 |
| `introduction` | `text` | 불가 |  | 한 줄 소개 |
| `detailed_introduction` | `text` | 불가 |  | 상세 소개 |
| `research_fields` | `text[]` | 불가 | `'{}'` | 연구 키워드 목록 |
| `counseling_fields` | `text[]` | 불가 | `'{}'` | 상담 분야 목록 |
| `career_highlights` | `text[]` | 불가 | `'{}'` | 주요 이력 목록 |
| `international_activities` | `text[]` | 불가 | `'{}'` | 해외 활동 목록 |
| `available_time` | `text` | 불가 |  | 멘토가 입력한 면담 가능 시간 |
| `created_at` | `timestamptz` | 불가 | `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | 불가 | `now()` | 수정 시각 |

MVP에서는 반복 항목을 PostgreSQL 배열로 저장한다. `career_highlights`와 `international_activities`는 각각 1개 이상 5개 이하의 항목을 저장하며, 다음과 같이 `mentor_profiles` 테이블의 CHECK 제약으로 배열 길이를 검증한다. 항목별 관리나 통계 기능이 필요해지면 별도 테이블로 분리한다.

```sql
constraint career_highlights_length check (
  coalesce(array_length(career_highlights, 1), 0) between 1 and 5
),
constraint international_activities_length check (
  coalesce(array_length(international_activities, 1), 0) between 1 and 5
)
```

### 4.5 `applications`

멘티가 작성한 사전 질문지와 신청 전체 상태를 저장한다.

| 칼럼 | 타입 | NULL | 키/기본값 | 설명 |
|---|---|---:|---|---|
| `id` | `uuid` | 불가 | PK, `gen_random_uuid()` | 신청 ID |
| `mentee_id` | `uuid` | 불가 | FK → `mentee_profiles.user_id` | 신청 멘티 |
| `introduction` | `text` | 불가 |  | 자기소개 답변 |
| `concern` | `text` | 불가 |  | 현재 가장 큰 고민 |
| `goal` | `text` | 불가 |  | 면담에서 얻고 싶은 것 |
| `preferred_time` | `text` | 불가 |  | 희망 면담 시간 |
| `status` | `text` | 불가 | `pending`, CHECK | 신청 전체 상태 |
| `accepted_mentor_id` | `uuid` | 가능 | FK → `mentor_profiles.user_id` | 최종 수락 멘토 |
| `created_at` | `timestamptz` | 불가 | `now()` | 신청 시각 |
| `updated_at` | `timestamptz` | 불가 | `now()` | 수정 시각 |

제약 및 규칙:

- 생성 시 `status`는 `pending`, `accepted_mentor_id`는 `NULL`이다.
- `confirmed` 또는 `completed` 상태에서는 `accepted_mentor_id`가 반드시 존재해야 한다.
- `accepted_mentor_id`는 같은 신청의 `application_mentors`에 포함된 멘토여야 한다.

#### `create_application_with_mentors` DB 함수

`applications`와 `application_mentors` 생성을 하나의 트랜잭션으로 묶기 위한 Postgres 함수다 (`supabase/migrations/20260722010000_create_application_with_mentors_rpc.sql`).

```sql
create or replace function create_application_with_mentors(
  p_mentee_id uuid,
  p_introduction text,
  p_concern text,
  p_goal text,
  p_preferred_time text,
  p_mentor_ids uuid[]
) returns applications
language plpgsql
```

`applications` 한 건을 insert한 뒤, `p_mentor_ids` 배열을 순회하며 `application_mentors`를 `pending` 상태로 insert하고 생성된 `applications` 행을 반환한다. 멘토 수(1~3), 중복 여부, 멘토 존재 여부, 질문지 필수값 검증은 이 함수가 아니라 호출하는 애플리케이션 계층에서 미리 끝낸다.

### 4.6 `application_mentors`

하나의 신청과 최대 3명의 대상 멘토를 연결한다.

| 칼럼 | 타입 | NULL | 키/기본값 | 설명 |
|---|---|---:|---|---|
| `application_id` | `uuid` | 불가 | PK, FK → `applications.id` | 신청 ID |
| `mentor_id` | `uuid` | 불가 | PK, FK → `mentor_profiles.user_id` | 대상 멘토 ID |
| `status` | `text` | 불가 | `pending`, CHECK | 해당 멘토의 응답 상태 |
| `responded_at` | `timestamptz` | 가능 |  | 수락 또는 거절 시각 |
| `created_at` | `timestamptz` | 불가 | `now()` | 전달 시각 |

기본키는 `(application_id, mentor_id)` 복합키로 사용한다.

제약 및 규칙:

- 동일 신청과 멘토 조합은 중복될 수 없다 (`(application_id, mentor_id)` 복합 PK가 DB 레벨의 중복 방지 역할도 겸한다).
- 신청 하나에는 1명 이상 3명 이하의 멘토만 연결한다.
- 최대 3명 제한, 중복 여부, 멘토 존재 여부는 **애플리케이션 계층**(`server/src/services/applications.service.js`의 `validateMentorIds`)에서 신청 생성 RPC를 호출하기 전에 검사한다. DB 함수(`create_application_with_mentors`, 4.5절 참고)는 원자적 저장만 책임지며 이 값들을 자체적으로 검증하지 않는다.
- 한 멘토가 수락하면 해당 행을 `confirmed`로 변경하고 나머지 `pending` 행은 `rejected`로 변경한다.

### 4.7 `meetings`

수락 후 확정된 면담의 시간과 장소를 저장한다.

| 칼럼 | 타입 | NULL | 키/기본값 | 설명 |
|---|---|---:|---|---|
| `id` | `uuid` | 불가 | PK, `gen_random_uuid()` | 면담 ID |
| `application_id` | `uuid` | 불가 | UNIQUE, FK → `applications.id` | 신청 ID |
| `mentor_id` | `uuid` | 불가 | FK → `mentor_profiles.user_id` | 확정 멘토 ID |
| `scheduled_at` | `timestamptz` | 가능 |  | 확정 면담 일시 |
| `place` | `text` | 가능 |  | 장소 또는 온라인 링크 |
| `completed_at` | `timestamptz` | 가능 |  | 완료 처리 시각 |
| `created_at` | `timestamptz` | 불가 | `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | 불가 | `now()` | 수정 시각 |

제약 및 규칙:

- 신청 하나에는 면담 하나만 존재한다.
- `mentor_id`는 해당 신청의 `accepted_mentor_id`와 같아야 한다.
- 면담 방식은 별도로 관리하지 않으므로 `method` 칼럼을 두지 않는다.
- 온라인 면담은 `place`에 Google Meet 또는 Zoom 링크를 저장한다.
- 신청 수락 시점에 `scheduled_at`, `place`가 빈 값(`NULL`)인 상태로 행이 자동 생성되며, 이후 확정 멘토가 값을 채운다.

### 4.8 `message_read_states`

사용자별로 신청(채팅방)의 마지막 메세지 읽음 시각을 저장한다. 안 읽은 메세지 수 계산에 사용한다.

| 칼럼 | 타입 | NULL | 키/기본값 | 설명 |
|---|---|---:|---|---|
| `application_id` | `uuid` | 불가 | PK, FK → `applications.id` | 신청 ID |
| `user_id` | `uuid` | 불가 | PK, FK → `profiles.id` | 사용자 ID |
| `last_read_at` | `timestamptz` | 불가 | `now()` | 마지막으로 메세지를 읽은 시각 |

기본키는 `(application_id, user_id)` 복합키로 사용한다.

제약 및 규칙:

- 참여자(신청 멘티 또는 확정 멘토)만 본인 명의로 행을 생성·조회·갱신할 수 있다.
- 행이 없는 사용자는 아직 채팅방을 읽은 적이 없는 것으로 간주한다(`get_unread_message_counts` 함수 참고).

#### `get_unread_message_counts` DB 함수

사용자가 참여 중인 신청별 안 읽은 메세지 수를 계산하는 Postgres 함수다 (`supabase/migrations/20260725000000_create_message_read_states.sql`).

```sql
create or replace function get_unread_message_counts(p_user_id uuid)
returns table (application_id uuid, unread_count bigint)
language sql
stable
```

사용자가 멘티 또는 확정 멘토로 참여 중인 각 신청에 대해, 본인이 보내지 않았고 `message_read_states.last_read_at`(없으면 `epoch`) 이후에 생성된 메세지 수를 센다.

## 5. 관계와 삭제 정책

| 부모 | 자식 | 관계 | 삭제 정책 |
|---|---|---|---|
| `auth.users` | `profiles` | 1:1 | CASCADE |
| `profiles` | `mentee_profiles` | 1:0..1 | CASCADE |
| `profiles` | `mentor_profiles` | 1:0..1 | CASCADE |
| `mentee_profiles` | `applications` | 1:N | RESTRICT 권장 |
| `applications` | `application_mentors` | 1:N | CASCADE |
| `mentor_profiles` | `application_mentors` | 1:N | RESTRICT 권장 |
| `mentor_profiles` | `applications.accepted_mentor_id` | 1:N | 기본(NO ACTION) |
| `applications` | `meetings` | 1:0..1 | CASCADE |
| `mentor_profiles` | `meetings.mentor_id` | 1:N | RESTRICT |
| `applications` | `message_read_states` | 1:N | CASCADE |
| `profiles` | `message_read_states.user_id` | 1:N | CASCADE |

신청 이력이 있는 사용자는 즉시 물리 삭제하기보다 비활성화 또는 익명화 정책을 검토한다.

## 6. 권장 인덱스

```sql
create index idx_profiles_role on profiles (role);
create index idx_mentor_profiles_major on mentor_profiles (major);
create index idx_mentor_profiles_academic_status on mentor_profiles (academic_status);
create index idx_mentor_profiles_research_fields on mentor_profiles using gin (research_fields);
create index idx_mentor_profiles_counseling_fields on mentor_profiles using gin (counseling_fields);
create index idx_applications_mentee_status_created_at
  on applications (mentee_id, status, created_at desc);
create index idx_application_mentors_mentor_status_created_at
  on application_mentors (mentor_id, status, created_at desc);
create index idx_meetings_mentor_scheduled_at
  on meetings (mentor_id, scheduled_at);
```

`updated_at`이 있는 테이블(`profiles`, `mentee_profiles`, `mentor_profiles`, `applications`, `meetings`)에는 `BEFORE UPDATE` 트리거(`set_updated_at`)를 걸어 수정 시 자동 갱신한다. `application_mentors`는 `updated_at` 칼럼이 없으므로 트리거를 걸지 않는다.

## 7. 트랜잭션 규칙

### 신청 생성

1. 로그인 사용자가 멘티인지 확인한다.
2. 멘토 ID가 1개 이상 3개 이하인지 확인한다.
3. 모든 멘토가 실제 멘토 계정인지 확인한다.
4. `applications` 한 건을 생성한다.
5. `application_mentors`를 선택 멘토 수만큼 생성한다.
6. 전체 작업을 하나의 트랜잭션으로 처리한다.

### 신청 수락

1. 로그인 멘토가 해당 신청의 대상인지 확인한다.
2. 신청이 아직 `pending`인지 잠금 후 확인한다.
3. `applications.status`를 `confirmed`로 변경한다.
4. `accepted_mentor_id`에 수락 멘토를 저장한다.
5. 수락 멘토의 연결 상태를 `confirmed`로 변경한다.
6. 나머지 대상 멘토의 `pending` 상태를 `rejected`로 변경한다.
7. 전체 작업을 하나의 트랜잭션으로 처리한다.

### 신청 거절

1. 로그인 멘토의 연결 상태를 `rejected`로 변경한다.
2. 모든 대상 멘토가 `rejected`이면 신청 전체 상태도 `rejected`로 변경한다.

### 면담 완료

1. 확정 멘토 또는 정책상 허용된 사용자인지 확인한다.
2. `applications.status`와 수락 멘토의 연결 상태를 `completed`로 변경한다.
3. `meetings.completed_at`을 기록한다.

## 8. MVP 이후 테이블

다음 기능은 현재 스키마에서 제외한다.

- `favorites`: 찜한 멘토
- `reviews`: 면담 리뷰
- `point_transactions`: 포인트 적립·사용 내역
- `products`: 포인트 상품
- `reward_requests`: 상품권 신청
- `no_show_reports`: 노쇼 신고와 패널티
- `email_notifications`: 이메일 발송 내역
