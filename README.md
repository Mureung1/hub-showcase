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

- Spotify에서 음악 검색
- 오늘의 음악 선택
- 감정 한 줄 작성
- 음악 기록 저장
- 저장된 기록 조회
- 새로고침 후에도 데이터 유지

※ 현재 버전은 핵심 기능을 검증하기 위한 **Demo Version**이며,
사용자 인증(Login)은 제외하고 개발을 진행하고 있습니다.

---

# 🚀 실행 방법

## 1. 프로젝트 클론

```bash
git clone https://github.com/lkslks4511/SWIM.git
cd SWIM
```

## 2. Frontend 실행

```bash
npm install
npm run dev
```

## 3. Backend 실행

```bash
cd server
npm install
npm run dev
```

## 4. 환경 변수 설정

Frontend

```env
VITE_API_URL=http://localhost:3000
```

Backend

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

---

# 🛠️ 기술 스택

## Frontend

- React
- Vite
- JavaScript
- CSS

## Backend

- Express.js
- Node.js

## Database

- Supabase

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
| 음악 기록 조회 | GET | `/api/music-records` |
| 음악 기록 생성 | POST | `/api/music-records` |

### POST Request

```json
{
  "songTitle": "Ditto",
  "artistName": "NewJeans",
  "emotionText": "오늘 하루를 위로받은 기분"
}
```

---

## Spotify API

| 기능 | Method | URL | 설명 |
|------|--------|-----|------|
| 노래 검색 | GET | `/api/spotify/tracks/search?keyword=` | Spotify 노래 검색 |
| 트랙 상세 조회 | GET | `/api/spotify/tracks/{trackId}` | 특정 노래 조회 |

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
├── src
│   ├── components
│   ├── pages
│   ├── hooks
│   └── api
│
├── server
│   ├── routes
│   ├── services
│   └── app.js
│
└── README.md
```

---

# 🌊 앞으로 구현 예정

- Spotify 음악 검색 연동
- Music Card UI 개선
- Spotify OAuth 로그인
- 사용자 프로필
- 피드 기능
- Music Diary
- Recap 기능
- Playlist Export