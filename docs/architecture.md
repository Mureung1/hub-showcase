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
→ Monthly Recap
→ Spotify 사용자 계정 연결
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
- 공개 프로필 선택은 `?profile={nickname}` URL과 React state를 동기화하며 별도 라우팅 라이브러리 없이 직접 접근·새로고침·뒤로 가기를 지원합니다.
- 음악 기록, 사용자 검색, 팔로우, 피드, 좋아요는 Bearer token을 Express에 전달합니다.
- Express 인증 미들웨어가 token을 검증하고 요청 사용자를 확정합니다.
- Spotify Client ID와 Secret은 Express 환경변수에만 존재합니다.
- Spotify 사용자 token은 서버에서 AES-256-GCM으로 암호화하며 브라우저와 일반 Supabase 사용자는 읽을 수 없습니다.
- React는 Spotify Web API를 직접 호출하지 않습니다.

## 데이터 모델

| 테이블 | 주요 키 | 역할 |
|---|---|---|
| `profiles` | `id` → `auth.users.id` | 공개 닉네임·소개·아바타 |
| `music_records` | `id`, `user_id` | 사용자의 하루 음악 기록 |
| `follows` | `(follower_id, following_id)` | 사용자 관계 |
| `likes` | `(user_id, record_id)` | 사용자별 음악 기록 좋아요 |
| `spotify_oauth_states` | `state_hash` | 10분 유효 일회용 OAuth state |
| `spotify_connections` | `user_id` | 암호화된 Spotify 사용자 token |

닉네임은 `lower(btrim(nickname))` 기준 고유 인덱스로 공개 식별자의 중복을 방지합니다. API는 사용자 검색·팔로우·피드에서 Auth UUID를 공개하지 않습니다.
음악 기록은 `(user_id, record_date)` 부분 고유 인덱스로 인증 사용자당 하루 한 건만 허용합니다. 공개 다이어리의 지난 기록은 `record_date`, `created_at`, `id` 내림차순 keyset cursor로 페이지를 나눕니다.

## RLS 요약

| 대상 | 허용 범위 |
|---|---|
| `profiles` SELECT | 공개 프로필 조회 |
| `music_records` SELECT | 인증 사용자의 공개 음악 다이어리 |
| `music_records` INSERT | 인증 사용자가 자신의 `user_id`로 생성 |
| `follows` SELECT·INSERT·DELETE | 인증 사용자의 `follower_id` 관계 |
| `likes` SELECT·DELETE | 인증 사용자의 `user_id` 관계 |
| `likes` INSERT | 인증 사용자이며 읽을 수 있는 음악 기록 |
| Spotify OAuth 테이블 | Service Role 전용, anon·authenticated 권한 회수 |

`follower_id`, `likes.user_id`, `music_records.user_id`는 클라이언트 요청값을 신뢰하지 않고 서버가 검증한 인증 사용자 ID를 사용합니다.

전체 좋아요 수는 `get_music_record_like_counts(bigint[])` DB 함수로 집계합니다. 함수는 원본 `likes` 행을 반환하지 않으며, 인증된 사용자가 읽는 공개 음악 기록의 `record_id`와 `like_count`만 반환합니다. 공개 사용자 목록 함수도 인증 여부를 확인하고 닉네임과 아바타만 반환합니다. 페이지 커서는 고유한 공개 닉네임을 기준으로 구성하며 Auth UUID를 포함하지 않습니다. 두 함수 모두 빈 `search_path`, 스키마 수식 이름을 사용하고 `PUBLIC`과 `anon`의 실행 권한을 회수한 뒤 `authenticated`에만 실행을 허용합니다.

## API

| Method | Path | 인증 |
|---|---|---|
| GET | `/api/spotify/search?q=` | 불필요 |
| GET | `/api/spotify/connect` | 필요 |
| GET | `/api/spotify/callback` | 일회용 state |
| GET·DELETE | `/api/spotify/connection` | 필요 |
| GET·POST | `/api/music-records` | 필요 |
| GET | `/api/users?q=` | 필요 |
| GET | `/api/users/{nickname}` | 필요 |
| GET | `/api/users/{nickname}/music-records?cursor=` | 필요 |
| POST | `/api/follows` | 필요 |
| DELETE | `/api/follows/{followingNickname}` | 필요 |
| GET | `/api/feed` | 필요 |
| GET | `/api/recaps/monthly?year=&month=` | 필요 |
| GET | `/api/music-records/{recordId}/likes` | 필요 |
| POST·DELETE | `/api/music-records/{recordId}/likes` | 필요 |

좋아요와 팔로우 생성은 복합 기본 키와 멱등 UPSERT를 함께 사용해 중복 관계를 방지합니다.
공개 프로필의 팔로우와 좋아요도 기존 API를 재사용하며 성공 응답 이후에만 홈·검색·피드 상태를 갱신합니다.
월간 Recap은 인증 사용자 ID와 `record_date`의 월 시작·다음 달 시작 경계로 본인 기록만 조회합니다. 집계 응답에는 사용자 ID나 이메일을 포함하지 않으며 DB 스키마 변경 없이 기존 음악 기록을 사용합니다.
React의 `MonthlyRecap`은 현재 월을 기본값으로 요청하고 월 변경 시 진행 중인 요청을 취소합니다. API 응답을 별도 중복 저장하지 않고 한 화면 상태에서 대표 앨범, 요약, 첫·마지막 기록과 타임라인으로 표현합니다.

Spotify 검색은 기존 Client Credentials를 유지합니다. 사용자 계정 연결만 Authorization Code Flow를 사용하며 `playlist-modify-private` 최소 scope를 요청합니다. connect 단계에서 난수 state의 SHA-256 해시만 저장하고 callback에서 한 번 삭제해 재사용을 막습니다. callback 이후 token은 서버 전용 암호화 키로 보호하며 만료 1분 전부터 refresh합니다.

## SQL 적용 순서

```text
profiles.sql
→ migrations/20260724_nickname_identity.sql
→ follows.sql
→ music_records.sql
→ likes.sql
→ spotify_connections.sql
```

SQL 적용 전 기존 닉네임의 공백·대소문자 중복 여부를 확인해야 합니다. 마이그레이션은 기존 중복 데이터를 자동 삭제하지 않습니다.
