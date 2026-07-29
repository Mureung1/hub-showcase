# 🎵 SWIM

> **One Day. One Song. One Memory.**

SWIM은 하루를 대표하는 음악 한 곡과 짧은 감정을 기록하는 **Music Diary SNS**입니다.

사진이나 긴 글 대신 음악으로 하루를 표현하고, 시간이 지나며 나만의 음악 다이어리를 만들어가는 서비스를 목표로 합니다.

---

# 📖 프로젝트 소개

## 프로젝트 개요

기존 SNS는 사진이나 긴 글을 중심으로 기록하는 경우가 많습니다.
SWIM은 **음악을 중심으로 하루를 기록하는 새로운 방식의 SNS**를 제공합니다.

사용자는 하루를 가장 잘 표현하는 노래를 선택하고,
짧은 감정을 함께 기록하여 자신의 Music Card를 생성합니다.

기록은 데이터베이스에 저장되며, 언제든 다시 확인할 수 있습니다.

### MVP 목표

- 이메일 회원가입·로그인·세션 유지
- Spotify 음악 검색과 외부 감상 링크
- 하루 한 곡과 감정 기록 저장·조회
- 닉네임 기반 사용자 검색
- 팔로우·언팔로우
- 팔로잉 음악 피드
- 사용자별 좋아요·좋아요 취소

현재 버전은 위 사용자 흐름과 Monthly Recap 화면까지 포트폴리오로 시연할 수 있습니다. 댓글, 알림, DM과 Spotify 플레이리스트 생성은 포함하지 않습니다.

---

# 🚀 실행 방법

## 1. 프로젝트 클론

```bash
git clone https://github.com/lkslks4511/SWIM.git
cd SWIM
```

## 2. 의존성 설치

```bash
npm install
```

## 3. 환경 변수 설정

Frontend

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

`VITE_SUPABASE_ANON_KEY`는 공개 anon key만 사용합니다. `SUPABASE_SERVICE_ROLE_KEY`는 브라우저 환경변수에 넣지 않습니다.

Backend

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
SPOTIFY_TOKEN_ENCRYPTION_KEY=
APP_FRONTEND_URL=http://localhost:5173
```

`SPOTIFY_TOKEN_ENCRYPTION_KEY`는 `openssl rand -base64 32`처럼 생성한 32바이트 base64 값을 사용합니다. 실제 값과 Service Role Key는 서버 환경에만 두며 브라우저의 `VITE_` 환경변수로 만들지 않습니다. 암호화 키를 바꾸면 기존 Spotify 연결 토큰을 복호화할 수 없으므로 사용자의 재연결이 필요합니다.

Spotify Developer Dashboard에도 `SPOTIFY_REDIRECT_URI`와 완전히 같은 callback URL을 등록해야 합니다.

회원가입 전에 Supabase SQL Editor에서 `server/supabase/profiles.sql`을 실행해 `profiles` 테이블과 Auth 사용자 생성 트리거를 적용합니다. 새 사용자의 닉네임은 Auth 메타데이터에서 전달되며, 트리거가 Auth 사용자와 동일한 ID의 프로필을 한 건 생성합니다.

이후 `server/supabase/follows.sql`, `server/supabase/music_records.sql`, `server/supabase/likes.sql`, `server/supabase/spotify_connections.sql` 순서로 실행합니다. `follows` 테이블이 먼저 있어야 음악 기록의 팔로잉 조회 RLS 정책을 적용할 수 있고, `music_records` 테이블이 있어야 좋아요 외래키를 생성할 수 있습니다. Spotify 연결 테이블은 RLS와 권한 회수로 브라우저 접근을 차단하고 서버 Service Role에서만 사용합니다.

## 4. Backend 실행

```bash
npm run server
```

API는 기본적으로 `http://localhost:3000`에서 실행됩니다. 루트 경로는 API를 제공하지 않으므로 서버 상태는 `GET http://localhost:3000/health`에서 확인합니다.

## 5. Frontend 실행

```bash
npm run dev
```

프런트엔드는 기본적으로 `http://localhost:5173`에서 실행됩니다.

---

# 🛠️ 기술 스택

## Frontend

- React
- TypeScript
- Vite
- CSS

## Backend

- Node.js
- Express.js
- JavaScript ES Modules

## Database

- PostgreSQL
- Supabase Database
- Supabase Auth
- Row Level Security

## External API

- Spotify Web API

## Version Control

- Git
- GitHub

---

# 📌 API 정리

## Music Record API

| 기능 | Method | URL |
|------|--------|-----|
| 내 음악 기록 조회 | GET | `/api/music-records` |
| 내 음악 기록 생성 | POST | `/api/music-records` |
두 요청 모두 다음 인증 헤더가 필요합니다.

```http
Authorization: Bearer <supabase-access-token>
```

### POST Request

```json
{
  "songTitle": "Ditto",
  "artistName": "NewJeans",
  "emotionText": "오늘 하루를 위로받은 기분"
}
```

`userId`는 요청 본문으로 받지 않습니다. 서버가 검증한 access token의 사용자 ID만 `music_records.user_id`로 저장합니다.

### Response

```json
{
  "data": {
    "id": 1,
    "userId": "auth-user-id",
    "songTitle": "Ditto",
    "artistName": "NewJeans",
    "emotionText": "오늘 하루를 위로받은 기분",
    "recordDate": "2026-07-23",
    "liked": false,
    "likeCount": 0,
    "author": {
      "id": "auth-user-id",
      "nickname": "고요한수영",
      "avatarUrl": null
    }
  }
}
```

토큰이 없거나 유효하지 않으면 `401 UNAUTHORIZED`를 반환합니다.

---

## User and Follow API

| 기능 | Method | URL |
|------|--------|-----|
| 다른 사용자 목록·닉네임 검색 | GET | `/api/users?q={nickname}` |
| 공개 프로필 조회 | GET | `/api/users/{nickname}` |
| 공개 음악 다이어리 조회 | GET | `/api/users/{nickname}/music-records?cursor=` |
| 팔로우 | POST | `/api/follows` |
| 언팔로우 | DELETE | `/api/follows/{followingNickname}` |
| 팔로잉 음악 피드 | GET | `/api/feed` |
| 음악 기록 좋아요 | POST | `/api/music-records/{recordId}/likes` |
| 음악 기록 좋아요 취소 | DELETE | `/api/music-records/{recordId}/likes` |
| 함께 기억한 사용자 조회 | GET | `/api/music-records/{recordId}/likes?cursor=` |

위 API는 모두 Supabase access token이 필요합니다. 공개 프로필 응답은 닉네임, 소개, 아바타, 본인 여부와 현재 사용자의 팔로우 상태만 포함하며 Auth UUID와 이메일은 반환하지 않습니다. 팔로우 요청 본문은 다음과 같습니다.

공개 음악 다이어리는 오늘의 기록과 지난 기록을 분리하고 지난 기록을 20건씩 반환합니다. 다음 페이지 커서는 마지막 기록의 날짜·생성 시각·기록 ID를 기준으로 하므로 조회 도중 새 기록이 추가되어도 기존 페이지 경계를 유지합니다. 로그인 사용자는 팔로우 여부와 관계없이 공개 다이어리를 읽을 수 있지만, 음악 기록 생성은 계속 자신의 사용자 ID로만 허용됩니다. 응답에는 작성자의 공개 닉네임과 아바타만 포함되며 Auth UUID와 이메일은 반환하지 않습니다.

검색 결과와 팔로잉 피드에서 작성자의 닉네임·아바타를 선택하면 URL에 `?profile={nickname}`이 반영됩니다. 이 URL은 직접 접근과 새로고침을 지원하며 브라우저 뒤로 가기와 화면의 돌아가기 버튼이 프로필 상태를 함께 갱신합니다. 공개 프로필에서도 팔로우·언팔로우와 음악 기록 좋아요·취소를 사용할 수 있으며 서버가 확정한 상태와 인원수만 화면에 반영합니다.

SWIM은 하루 한 곡을 기록하므로 `(user_id, record_date)` 조합은 중복될 수 없습니다. 같은 날 두 번째 기록을 생성하면 `409 MUSIC_RECORD_ALREADY_EXISTS`를 반환합니다. `music_records.sql` 적용 전에는 아래 조회로 기존 중복 데이터를 확인해야 하며, SQL은 중복 데이터를 자동 삭제하거나 변경하지 않습니다.

```sql
select user_id, record_date, count(*)
from public.music_records
where user_id is not null
group by user_id, record_date
having count(*) > 1;
```

```json
{
  "followingNickname": "잔잔한파도"
}
```

`follower_id`는 요청값으로 받지 않고 서버가 검증한 현재 사용자 ID만 사용합니다. 검색 및 팔로우 API는 Auth UUID를 브라우저에 반환하지 않으며, 공개 닉네임을 서버에서 내부 프로필 ID로 변환합니다. 중복 팔로우와 이미 해제된 관계의 언팔로우는 현재 상태를 반환하는 멱등 요청으로 처리합니다.

```json
{
  "data": {
    "followingNickname": "잔잔한파도",
    "isFollowing": true
  }
}
```

`follows` 테이블의 복합 기본 키는 중복 관계를 방지하고, RLS는 인증 사용자가 자신의 팔로우 관계만 생성하거나 삭제하도록 제한합니다.

`GET /api/feed`는 현재 사용자가 팔로우한 사람들의 음악 기록만 최신순으로 반환합니다. 공개 응답에는 Auth UUID를 포함하지 않으며 작성자의 닉네임과 아바타만 제공합니다. `meta.followingCount`로 팔로우한 사람이 없는 상태와 팔로우한 사람에게 아직 기록이 없는 상태를 구분할 수 있습니다.

음악 기록과 피드 응답의 `liked`는 현재 인증 사용자의 좋아요 상태만 나타내며 `likeCount`는 기록을 기억한 전체 인원수입니다. 원본 좋아요 관계는 반환하지 않습니다. 제한된 DB 집계 함수는 인증 사용자가 읽는 공개 음악 기록의 숫자만 제공하며, `likes` SELECT RLS는 사용자가 자신의 좋아요 행만 직접 읽도록 제한합니다. `(user_id, record_id)` 복합 기본 키는 중복 관계를 막습니다.

좋아요 생성과 취소는 요청 본문에서 사용자 ID를 받지 않고 검증된 access token의 사용자만 사용합니다. 생성은 멱등 UPSERT로 처리하며 같은 요청을 반복해도 관계는 한 건만 유지됩니다. 존재하지 않거나 현재 사용자가 읽을 수 없는 기록은 `404 MUSIC_RECORD_NOT_FOUND`로 응답합니다.

```json
{
  "data": {
    "recordId": "7",
    "liked": true,
    "likeCount": 3
  }
}
```

함께 기억한 사용자 조회는 기본 20명씩 공개 닉네임과 아바타만 반환합니다. `nextCursor`가 있으면 같은 API의 `cursor` 쿼리로 전달해 다음 페이지를 조회합니다. 커서는 공개 닉네임 기준이며 Auth UUID, 이메일, 내부 사용자 식별자는 응답하지 않습니다.

```json
{
  "data": {
    "recordId": "7",
    "likeCount": 21,
    "users": [
      {
        "nickname": "잔잔한파도",
        "avatarUrl": null
      }
    ],
    "nextCursor": "opaque-cursor"
  }
}
```

```json
{
  "data": [
    {
      "id": 7,
      "spotifyTrackId": "spotify-track-id",
      "songTitle": "Ditto",
      "artistName": "NewJeans",
      "albumName": "OMG",
      "albumImageUrl": "https://example.com/album.jpg",
      "externalUrl": "https://open.spotify.com/track/spotify-track-id",
      "emotionText": "오늘을 천천히 흘려보낸 마음",
      "recordDate": "2026-07-27",
      "liked": true,
      "likeCount": 3,
      "author": {
        "nickname": "잔잔한파도",
        "avatarUrl": null
      }
    }
  ],
  "meta": {
    "followingCount": 1
  }
}
```

---

## Monthly Recap API

| 기능 | Method | URL |
|------|--------|-----|
| 로그인 사용자의 월간 기록 집계 | GET | `/api/recaps/monthly?year={YYYY}&month={1-12}` |

Supabase access token이 필요합니다. `year`는 네 자리 연도, `month`는 1부터 12까지의 정수 문자열로 전달합니다. 응답은 해당 사용자의 기록만 사용하며 사용자 ID와 이메일은 포함하지 않습니다. `topArtists`는 기록 횟수 내림차순으로 최대 세 명을 반환하고, 동률은 아티스트 이름 순으로 정렬합니다.

```json
{
  "data": {
    "year": 2026,
    "month": 7,
    "recordCount": 3,
    "recordDays": 3,
    "topArtists": [
      {
        "artistName": "NewJeans",
        "recordCount": 2
      }
    ],
    "firstRecord": {
      "id": 1,
      "spotifyTrackId": "spotify-track-id",
      "songTitle": "Ditto",
      "artistName": "NewJeans",
      "albumName": "OMG",
      "albumImageUrl": "https://example.com/album.jpg",
      "externalUrl": "https://open.spotify.com/track/spotify-track-id",
      "emotionText": "조용히 시작한 달",
      "recordDate": "2026-07-01"
    },
    "lastRecord": {
      "id": 3,
      "spotifyTrackId": "spotify-track-id-3",
      "songTitle": "밤편지",
      "artistName": "아이유",
      "albumName": "Palette",
      "albumImageUrl": null,
      "externalUrl": null,
      "emotionText": "한 달을 천천히 닫는 마음",
      "recordDate": "2026-07-31"
    },
    "tracks": [
      {
        "id": 1,
        "spotifyTrackId": "spotify-track-id",
        "songTitle": "Ditto",
        "artistName": "NewJeans",
        "albumName": "OMG",
        "albumImageUrl": "https://example.com/album.jpg",
        "externalUrl": "https://open.spotify.com/track/spotify-track-id",
        "emotionText": "조용히 시작한 달",
        "recordDate": "2026-07-01"
      }
    ]
  }
}
```

기록이 없는 달은 `recordCount`, `recordDays`가 0이고 `topArtists`, `tracks`가 빈 배열이며 첫 기록과 마지막 기록은 `null`입니다. 잘못된 연·월은 `400 INVALID_RECAP_MONTH`로 처리합니다.

로그인 홈의 `한 달의 음악 일기`에서 월을 선택하면 대표 앨범 이미지, 기록 일수, 자주 함께한 아티스트, 첫 음악과 마지막 음악, 날짜순 음악 타임라인을 확인할 수 있습니다. 월 변경 중 이전 요청은 취소하며 로딩, 빈 달, 실패와 재시도 상태를 구분합니다.

## Spotify API

| 기능 | Method | URL | 설명 |
|------|--------|-----|------|
| 노래 검색 | GET | `/api/spotify/search?q={keyword}` | 2자 이상의 Spotify 트랙 검색 |

### Spotify 사용자 계정 연결 API

| 기능 | Method | URL | SWIM 인증 |
|---|---|---|---|
| 연결 URL 생성 | GET | `/api/spotify/connect` | 필요 |
| Spotify callback | GET | `/api/spotify/callback` | 일회용 state |
| 연결 상태 조회 | GET | `/api/spotify/connection` | 필요 |
| 연결 해제 | DELETE | `/api/spotify/connection` | 필요 |

`GET /api/spotify/connect`는 `playlist-modify-private` scope만 요청하는 Spotify authorize URL을 반환합니다. callback은 10분 동안 유효한 일회용 state를 소비하고 성공하면 `APP_FRONTEND_URL?spotify=connected`, 취소나 실패 시 `?spotify=error&reason=...`으로 이동합니다.

Access Token과 Refresh Token은 AES-256-GCM으로 암호화되어 서버 전용 테이블에 저장됩니다. 연결 상태 API에는 표시 이름, scope와 만료 시각만 포함되고 Spotify token과 내부 사용자 ID는 반환하지 않습니다. 만료된 access token은 서버에서 refresh token으로 갱신하며 연결 해제는 저장된 token을 삭제합니다.

### 검색 응답 예시

```json
[
  {
    "spotifyTrackId": "spotify_track_id",
    "title": "Ditto",
    "artistName": "NewJeans",
    "albumName": "OMG",
    "albumImageUrl": "https://...",
    "externalUrl": "https://open.spotify.com/track/..."
  }
]
```

---

# 📂 프로젝트 구조

```
SWIM
├── config                 # Vite·TypeScript 설정
├── docs                   # 아키텍처와 QA 기록
├── server
│   ├── controllers        # HTTP 입력·응답 처리
│   ├── lib                # Supabase 클라이언트
│   ├── middleware         # Bearer 토큰 인증
│   ├── routes             # Express 경로
│   ├── services           # DB·Spotify 로직
│   ├── supabase           # 테이블·RLS SQL
│   ├── app.js
│   └── server.js
├── src
│   ├── components         # React 화면 컴포넌트
│   ├── lib                # 브라우저 Supabase 클라이언트
│   ├── services           # 프런트 API·인증 서비스
│   ├── styles             # 전역 CSS
│   ├── types              # 공유 TypeScript 타입
│   ├── utils              # 날짜 등 유틸리티
│   ├── validation         # 입력 검증
│   └── App.tsx
├── AGENTS.md
└── README.md
```

---

# ✅ 검증과 문서

- [아키텍처와 보안 흐름](docs/architecture.md)
- [통합 QA 실행 기록과 수동 검증 절차](docs/qa-report.md)

자동 검증은 다음 명령으로 실행합니다.

```bash
npm run typecheck
npm test
npm run build
```
