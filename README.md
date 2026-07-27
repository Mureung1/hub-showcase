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

현재 버전은 위 사용자 흐름을 포트폴리오로 시연하기 위한 MVP입니다. 댓글, 알림, DM, Recap, 플레이리스트 생성은 포함하지 않습니다.

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

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

회원가입 전에 Supabase SQL Editor에서 `server/supabase/profiles.sql`을 실행해 `profiles` 테이블과 Auth 사용자 생성 트리거를 적용합니다. 새 사용자의 닉네임은 Auth 메타데이터에서 전달되며, 트리거가 Auth 사용자와 동일한 ID의 프로필을 한 건 생성합니다.

이후 `server/supabase/follows.sql`, `server/supabase/music_records.sql`, `server/supabase/likes.sql` 순서로 실행합니다. `follows` 테이블이 먼저 있어야 음악 기록의 팔로잉 조회 RLS 정책을 적용할 수 있고, `music_records` 테이블이 있어야 좋아요 외래키를 생성할 수 있습니다. `music_records.user_id` 외래키와 인증 RLS 정책은 기존 익명 기록을 삭제하지 않고 `user_id = null`로 보존하며, 사용자별 앱 조회에서는 제외합니다. 소유자를 확인할 수 있을 때만 별도 SQL로 백필해야 합니다.

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
| 팔로우 | POST | `/api/follows` |
| 언팔로우 | DELETE | `/api/follows/{followingNickname}` |
| 팔로잉 음악 피드 | GET | `/api/feed` |
| 음악 기록 좋아요 | POST | `/api/music-records/{recordId}/likes` |
| 음악 기록 좋아요 취소 | DELETE | `/api/music-records/{recordId}/likes` |
| 함께 기억한 사용자 조회 | GET | `/api/music-records/{recordId}/likes?cursor=` |

위 API는 모두 Supabase access token이 필요합니다. 팔로우 요청 본문은 다음과 같습니다.

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

음악 기록과 피드 응답의 `liked`는 현재 인증 사용자의 좋아요 상태만 나타내며 `likeCount`는 기록을 기억한 전체 인원수입니다. 원본 좋아요 관계는 반환하지 않습니다. 제한된 DB 집계 함수가 본인 또는 팔로잉 기록의 숫자만 제공하며, `likes` SELECT RLS는 사용자가 자신의 좋아요 행만 직접 읽도록 제한합니다. `(user_id, record_id)` 복합 기본 키는 중복 관계를 막습니다.

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

## Spotify API

| 기능 | Method | URL | 설명 |
|------|--------|-----|------|
| 노래 검색 | GET | `/api/spotify/search?q={keyword}` | 2자 이상의 Spotify 트랙 검색 |

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
