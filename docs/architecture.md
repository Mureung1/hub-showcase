# SWIM MVP Architecture

## 사용자 흐름

```text
회원가입·로그인
→ Spotify 검색
→ 음악 기록 저장
→ 사용자 검색
→ 팔로우
→ 팔로잉 피드
→ 좋아요·취소
```

## 애플리케이션 구조

```text
React
→ Express Route
→ Controller
→ Service
→ Supabase 또는 Spotify Web API
```

- React는 Supabase Auth로 회원가입, 로그인, 세션 복원과 공개 프로필 조회를 처리합니다.
- 음악 기록, 사용자 검색, 팔로우, 피드, 좋아요는 Bearer token을 Express에 전달합니다.
- Express 인증 미들웨어가 token을 검증하고 요청 사용자를 확정합니다.
- Spotify Client ID와 Secret은 Express 환경변수에만 존재합니다.
- React는 Spotify Web API를 직접 호출하지 않습니다.

## 데이터 모델

| 테이블 | 주요 키 | 역할 |
|---|---|---|
| `profiles` | `id` → `auth.users.id` | 공개 닉네임·소개·아바타 |
| `music_records` | `id`, `user_id` | 사용자의 하루 음악 기록 |
| `follows` | `(follower_id, following_id)` | 사용자 관계 |
| `likes` | `(user_id, record_id)` | 사용자별 음악 기록 좋아요 |

닉네임은 `lower(btrim(nickname))` 기준 고유 인덱스로 공개 식별자의 중복을 방지합니다. API는 사용자 검색·팔로우·피드에서 Auth UUID를 공개하지 않습니다.

## RLS 요약

| 대상 | 허용 범위 |
|---|---|
| `profiles` SELECT | 공개 프로필 조회 |
| `music_records` SELECT | 본인 또는 현재 사용자가 팔로우한 사용자의 기록 |
| `music_records` INSERT | 인증 사용자가 자신의 `user_id`로 생성 |
| `follows` SELECT·INSERT·DELETE | 인증 사용자의 `follower_id` 관계 |
| `likes` SELECT·DELETE | 인증 사용자의 `user_id` 관계 |
| `likes` INSERT | 인증 사용자이며 읽을 수 있는 음악 기록 |

`follower_id`, `likes.user_id`, `music_records.user_id`는 클라이언트 요청값을 신뢰하지 않고 서버가 검증한 인증 사용자 ID를 사용합니다.

전체 좋아요 수는 `get_music_record_like_counts(bigint[])` DB 함수로 집계합니다. 함수는 원본 `likes` 행을 반환하지 않으며, 인증 사용자가 소유하거나 팔로우 관계로 읽을 수 있는 음악 기록만 `record_id`와 `like_count` 형태로 반환합니다. 공개 사용자 목록 함수도 같은 열람 권한을 확인하고 닉네임과 아바타만 반환합니다. 페이지 커서는 고유한 공개 닉네임을 기준으로 구성하며 Auth UUID를 포함하지 않습니다. 두 함수 모두 빈 `search_path`, 스키마 수식 이름을 사용하고 `PUBLIC`과 `anon`의 실행 권한을 회수한 뒤 `authenticated`에만 실행을 허용합니다.

## API

| Method | Path | 인증 |
|---|---|---|
| GET | `/api/spotify/search?q=` | 불필요 |
| GET·POST | `/api/music-records` | 필요 |
| GET | `/api/users?q=` | 필요 |
| POST | `/api/follows` | 필요 |
| DELETE | `/api/follows/{followingNickname}` | 필요 |
| GET | `/api/feed` | 필요 |
| GET | `/api/music-records/{recordId}/likes` | 필요 |
| POST·DELETE | `/api/music-records/{recordId}/likes` | 필요 |

좋아요와 팔로우 생성은 복합 기본 키와 멱등 UPSERT를 함께 사용해 중복 관계를 방지합니다.

## SQL 적용 순서

```text
profiles.sql
→ migrations/20260724_nickname_identity.sql
→ follows.sql
→ music_records.sql
→ likes.sql
```

SQL 적용 전 기존 닉네임의 공백·대소문자 중복 여부를 확인해야 합니다. 마이그레이션은 기존 중복 데이터를 자동 삭제하지 않습니다.
