# SWIM Project Agent Guide

## 1. 프로젝트 개요

SWIM은 사용자가 하루를 대표하는 음악 한 곡과 짧은 감정을 기록하고, 다른 사용자의 음악 기록을 팔로잉 피드에서 확인하는 음악 기반 SNS입니다.

서비스의 핵심은 음악 추천이나 스트리밍이 아니라 다음 경험입니다.

> 음악으로 하루를 기록하고, 음악을 통해 사람을 알아가는 것

Spotify는 음악 검색과 외부 감상 링크 제공을 위한 도구로 사용합니다.  
SWIM 내부에서는 음악을 직접 재생하지 않습니다.

---

## 2. 프로젝트 목표

현재 목표는 제한된 기간 안에 포트폴리오로 시연할 수 있는 SNS MVP를 완성하는 것입니다.

우선순위는 다음과 같습니다.

1. 실제로 실행되는 핵심 사용자 흐름
2. 안정적인 데이터 저장과 조회
3. 이해하기 쉬운 프로젝트 구조
4. 일관된 사용자 경험
5. 설명 가능한 코드와 문서

기능 수를 무리하게 늘리거나 과도하게 설계하지 않습니다.

---

## 3. 기술 스택

### Frontend

- React
- TypeScript
- Vite
- CSS

### Backend

- Node.js
- Express
- REST API

### Database and Authentication

- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security

### External API

- Spotify Web API
- Client Credentials Flow

### Version Control

- Git
- GitHub
- Feature Branch
- Git Worktree when parallel work is required

---

## 4. 핵심 사용자 흐름

SWIM의 최종 MVP 흐름은 다음과 같습니다.

```text
회원가입 또는 로그인
→ 프로필 생성
→ Spotify 음악 검색
→ 음악 선택
→ 감정 한 줄 작성
→ 음악 기록 저장
→ 내 음악 다이어리 확인
→ 다른 사용자 확인
→ 팔로우 또는 언팔로우
→ 팔로잉 사용자의 음악 기록을 피드에서 확인
→ Spotify에서 음악 감상
```

기능을 구현할 때는 개별 화면보다 이 흐름이 실제로 연결되는지를 우선합니다.

---

## 5. MVP 범위

### 반드시 구현해야 하는 기능

- 이메일 기반 회원가입
- 로그인 및 로그아웃
- 로그인 세션 유지
- 사용자 프로필
- Spotify 음악 검색
- 검색 결과 목록
- 음악 선택 상태
- 감정 한 줄 작성
- 음악 기록 생성
- 음악 기록 조회
- 앨범 이미지 표시
- Spotify 외부 링크
- 사용자 목록 또는 검색
- 팔로우
- 언팔로우
- 팔로잉 기반 피드

### 이번 MVP에서 제외하는 기능

- 댓글
- 좋아요
- 알림
- DM
- 실시간 채팅
- Spotify 플레이리스트 생성
- 주간 또는 월간 Recap
- 복잡한 추천 알고리즘
- 관리자 페이지
- 과도한 애니메이션

제외된 기능을 요청 없이 추가하지 않습니다.

---

## 6. 현재 데이터 모델 방향

### profiles

사용자의 공개 프로필을 저장합니다.

주요 필드 예시:

```text
id
nickname
bio
avatar_url
created_at
```

`profiles.id`는 Supabase Auth의 사용자 ID와 연결합니다.

### music_records

사용자의 음악 기록을 저장합니다.

주요 필드 예시:

```text
id
user_id
spotify_track_id
song_title
artist_name
album_name
album_image_url
external_url
emotion_text
record_date
created_at
```

### follows

사용자 간 팔로우 관계를 저장합니다.

주요 필드 예시:

```text
follower_id
following_id
created_at
```

팔로우 관계의 의미는 다음과 같습니다.

```text
follower_id  = 팔로우한 사용자
following_id = 팔로우당한 사용자
```

자기 자신을 팔로우하거나 같은 사용자를 중복으로 팔로우할 수 없어야 합니다.

---

## 7. Spotify 연동 원칙

React에서 Spotify Web API를 직접 호출하지 않습니다.

반드시 다음 구조를 유지합니다.

```text
React
→ Express
→ Spotify Web API
```

Spotify Client ID와 Client Secret은 백엔드 환경변수로만 관리합니다.

다음 정보를 Git에 커밋하지 않습니다.

```text
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SUPABASE_SERVICE_ROLE_KEY
기타 비밀 키
```

Spotify 검색 응답은 프론트엔드에서 사용하기 쉬운 형태로 변환해서 반환합니다.

응답 예시:

```json
[
  {
    "spotifyTrackId": "spotify-track-id",
    "title": "Song title",
    "artistName": "Artist",
    "albumName": "Album",
    "albumImageUrl": "https://...",
    "externalUrl": "https://open.spotify.com/..."
  }
]
```

---

## 8. 인증 원칙

SWIM 사용자 인증은 Supabase Auth를 사용합니다.

Spotify 음악 검색 인증과 SWIM 사용자 인증을 혼동하지 않습니다.

```text
SWIM 회원가입과 로그인
→ Supabase Auth

Spotify 음악 검색
→ Express의 Spotify Client Credentials
```

로그인 기능의 완료 기준은 단순히 로그인 화면이 표시되는 것이 아닙니다.

다음 흐름이 실제로 동작해야 합니다.

```text
회원가입
→ 로그인
→ 세션 유지
→ 프로필 확인
→ 로그인한 사용자의 ID로 음악 기록 저장
→ 내 기록 조회
→ 로그아웃
```

---

## 9. RLS 원칙

Supabase Row Level Security를 임의로 비활성화하지 않습니다.

인증 기능이 적용된 이후에는 다음 원칙을 지킵니다.

- 인증된 사용자만 음악 기록을 생성할 수 있습니다.
- 사용자는 자신의 `user_id`로만 기록을 생성할 수 있습니다.
- 자신의 기록만 수정하거나 삭제할 수 있습니다.
- 팔로우 생성 시 `follower_id`는 현재 로그인한 사용자여야 합니다.
- Service Role Key를 브라우저에 노출하지 않습니다.
- 모든 접근을 허용하는 임시 정책을 완료 상태로 남기지 않습니다.

RLS 변경 시 허용되는 사용자와 작업을 명확히 설명합니다.

---

## 10. 프론트엔드 개발 원칙

### 컴포넌트

각 컴포넌트는 하나의 명확한 책임을 갖습니다.

예상 컴포넌트 예시:

```text
AuthForm
ProfileCard
MusicSearch
MusicSearchDropdown
MusicSearchItem
SelectedTrackCard
MusicRecordForm
MusicRecordCard
UserCard
FollowButton
FollowingFeed
```

현재 구조가 다르다면 기존 구조를 우선 확인하고 불필요하게 전체를 재구성하지 않습니다.

### 상태 관리

- 필요한 상태만 만듭니다.
- 같은 데이터를 여러 상태에 중복 저장하지 않습니다.
- 서버 데이터를 수정한 뒤 화면 상태도 갱신합니다.
- 로딩, 오류, 빈 결과 상태를 처리합니다.
- 선택한 음악과 저장된 음악 기록을 구분합니다.

### useEffect

`useEffect`는 필요한 경우에만 사용합니다.

다음과 같은 무한 요청 구조를 만들지 않습니다.

```tsx
useEffect(() => {
  fetchMusicRecords();
}, [musicRecords]);
```

초기 조회만 필요한 경우 적절한 의존성 배열을 사용합니다.

```tsx
useEffect(() => {
  fetchMusicRecords();
}, []);
```

의존성 배열을 수정할 때는 왜 해당 값이 필요한지 확인합니다.

---

## 11. 백엔드 개발 원칙

현재 프로젝트 구조를 먼저 확인하되, 가능한 경우 다음 책임을 유지합니다.

```text
Route
→ Controller
→ Service
→ External API or Database
```

### Route

- URL과 HTTP 메서드를 정의합니다.
- 복잡한 비즈니스 로직을 작성하지 않습니다.

### Controller

- 요청값을 검증합니다.
- Service를 호출합니다.
- HTTP 응답을 반환합니다.

### Service

- Spotify 호출
- 데이터 변환
- 음악 기록 처리
- 피드 조회 등 핵심 로직을 담당합니다.

### 오류 처리

- 실패 원인을 숨기지 않습니다.
- 적절한 HTTP 상태 코드를 반환합니다.
- 사용자에게 내부 비밀 정보나 전체 스택 트레이스를 노출하지 않습니다.
- 빈 오류 메시지만 출력하지 않습니다.

---

## 12. API 원칙

API를 추가하거나 변경하기 전에 다음을 확인합니다.

- 요청값
- 응답값
- 인증 필요 여부
- 오류 응답
- 영향을 받는 프론트엔드 코드
- 영향을 받는 DB 구조

예상 API 예시:

```text
GET    /api/spotify/search?q=
GET    /api/music-records
POST   /api/music-records
GET    /api/users
POST   /api/follows
DELETE /api/follows/:followingId
GET    /api/feed
```

실제 프로젝트에 이미 다른 경로가 있다면 임의로 중복 API를 만들지 말고 기존 경로를 확인합니다.

---

## 13. 디자인 원칙

SWIM의 디자인 방향은 다음과 같습니다.

- 음악 다이어리
- 차분하고 감성적인 분위기
- 불필요한 장식 최소화
- 검정, 흰색, 중립 색상 중심
- 대표 포인트 컬러: `#3E7FA3`
- 앨범 이미지와 감정 기록이 중심
- 데스크톱 웹 우선
- 카드 기반 인터페이스

Spotify의 화면을 그대로 복제하지 않습니다.  
SWIM 고유의 음악 다이어리 경험을 유지합니다.

---

## 14. 작업 시작 절차

모든 Agent는 코드를 수정하기 전에 다음을 수행합니다.

1. 프로젝트 루트의 `AGENTS.md`를 읽습니다.
2. `README.md`를 읽습니다.
3. `package.json`과 실행 스크립트를 확인합니다.
4. 현재 디렉터리 구조를 확인합니다.
5. 현재 Git 브랜치와 변경 파일을 확인합니다.
6. 관련된 기존 코드를 읽습니다.
7. 이미 구현된 기능과 아직 구현되지 않은 기능을 구분합니다.
8. 수정 대상 파일과 구현 계획을 먼저 정리합니다.

파일명이나 구조를 추측해서 구현하지 않습니다.

---

## 15. 작업 범위 원칙

요청받은 작업에 필요한 범위만 수정합니다.

금지 사항:

- 요청되지 않은 대규모 리팩토링
- 프로젝트 전체 폴더 구조 변경
- 기존 코드를 이유 없이 새 라이브러리로 교체
- 동작 중인 기능 삭제
- 이름만 다른 중복 컴포넌트 생성
- 이름만 다른 중복 API 생성
- 테스트 통과만을 위한 임시 코드
- 무관한 파일 포맷 변경
- 비밀 키 커밋

DB 또는 다른 영역의 변경이 필요하지만 현재 Agent의 책임 범위를 벗어난다면, 임의로 변경하지 말고 필요한 변경사항을 명확하게 보고합니다.

---

## 16. Agent 역할 분리

### Planner Agent

담당:

- 요구사항 정리
- 기능 우선순위
- 작업 분할
- 완료 기준
- Agent 작업 순서

원칙:

- 요청받지 않으면 제품 코드를 직접 구현하지 않습니다.
- 이번 주 내 MVP 완성을 최우선으로 판단합니다.

### Frontend Agent

담당:

- React
- TypeScript
- UI
- 상태 관리
- CSS
- 사용자 흐름

금지:

- Supabase 테이블과 RLS를 임의로 변경하지 않습니다.
- Express API 계약을 임의로 변경하지 않습니다.

필요한 API나 DB 변경은 요청사항으로 보고합니다.

### Backend Agent

담당:

- Express
- REST API
- Spotify API
- 데이터 변환
- 오류 처리

금지:

- React UI와 CSS를 임의로 변경하지 않습니다.
- Supabase 스키마를 임의로 변경하지 않습니다.

### Database Agent

담당:

- PostgreSQL
- Supabase
- SQL
- RLS
- 인덱스
- 데이터 관계
- 마이그레이션 SQL

금지:

- React와 Express 구현을 임의로 수정하지 않습니다.
- 기존 데이터를 삭제하는 SQL을 확인 없이 실행하지 않습니다.

### Integration Agent

담당:

- Frontend, Backend, Database 연결
- 인증 사용자 ID 전달
- 음악 선택 결과 저장
- 팔로우와 피드 연결
- API 계약 불일치 해결

Integration Agent는 필요한 최소 범위에서 여러 영역을 수정할 수 있지만, 변경 이유와 영향 범위를 반드시 보고합니다.

### QA Agent

담당:

- 실행 검증
- API 검증
- 사용자 흐름 검증
- 회귀 오류 확인
- 콘솔 및 서버 오류 확인
- 보안 설정 확인

원칙:

- 검증하지 않은 기능을 정상이라고 판단하지 않습니다.
- 문제를 숨기기 위해 기능을 삭제하지 않습니다.
- 수정 권한을 별도로 받지 않았다면 먼저 문제와 재현 방법을 보고합니다.

### Docs Agent

담당:

- README
- API 문서
- ERD
- 아키텍처 문서
- 실행 방법
- 포트폴리오 설명

원칙:

- 실제 코드와 일치하는 내용만 작성합니다.
- 구현되지 않은 기능을 완료 기능으로 문서화하지 않습니다.

---

## 17. Git 및 Worktree 원칙

기능 단위로 브랜치를 사용합니다.

브랜치 예시:

```text
feature/spotify-search-ui
feature/auth-profile
feature/follow-system
feature/following-feed
fix/music-record-schema
docs/readme-architecture
```

### 병렬 작업

여러 Agent가 동시에 작업하는 경우 서로 다른 Git worktree와 브랜치를 사용합니다.

- 같은 브랜치를 여러 Agent가 동시에 수정하지 않습니다.
- 같은 파일을 여러 Agent가 동시에 수정하지 않습니다.
- 다른 Agent의 worktree 파일을 직접 수정하지 않습니다.
- 작업 시작 시 현재 브랜치를 확인합니다.
- 작업 종료 시 변경 파일을 명시합니다.

### 커밋 원칙

하나의 커밋에는 하나의 목적만 담습니다.

커밋 메시지 예시:

```text
feat: add Spotify track selection UI
feat: connect music records to authenticated users
feat: add follow and unfollow actions
fix: prevent repeated music record requests
docs: update SWIM architecture overview
```

사용자의 명시적인 요청 없이 `main`에 직접 병합하거나 원격 저장소에 push하지 않습니다.

---

## 18. DB 변경 원칙

DB 스키마를 변경할 때는 다음 내용을 함께 제공합니다.

1. 변경 이유
2. 실행할 SQL
3. 기존 데이터 영향
4. 백엔드 영향
5. 프론트엔드 영향
6. 롤백 또는 주의사항
7. 실행 후 확인 방법

다음 명령은 사용자 확인 없이 실행하지 않습니다.

```sql
drop table
truncate
delete from ... without where
```

기존 테이블에 컬럼을 추가할 때는 가능한 경우 안전한 마이그레이션을 사용합니다.

```sql
alter table ...
add column if not exists ...
```

단, 정확성과 제약조건이 필요한 경우 무조건 `if not exists`를 붙이기보다 현재 스키마를 먼저 확인합니다.

---

## 19. 테스트 및 검증 원칙

작업 완료 전에 가능한 범위에서 다음을 수행합니다.

### 공통

- 프로젝트 실행
- 빌드
- 타입 검사
- 변경된 코드 확인
- Git diff 확인
- 기존 기능 회귀 확인

### Frontend

- 화면이 실제로 표시되는지 확인
- 사용자 입력 확인
- 로딩 상태 확인
- 오류 상태 확인
- 빈 결과 확인
- 새로고침 후 상태 확인
- 브라우저 콘솔 오류 확인

### Backend

- 정상 요청
- 필수값 누락 요청
- 외부 API 실패
- 잘못된 쿼리
- 환경변수 누락
- HTTP 상태 코드와 응답 형태 확인

### Authentication

- 회원가입
- 로그인
- 로그아웃
- 새로고침 후 세션 유지
- 비로그인 사용자 접근
- 다른 사용자 데이터 접근 제한

### Follow

- 팔로우
- 중복 팔로우
- 언팔로우
- 자기 자신 팔로우 방지
- 피드 반영
- 새로고침 후 관계 유지

실행할 수 없는 테스트가 있다면 통과했다고 말하지 말고, 실행하지 못한 이유와 사용자가 확인할 방법을 설명합니다.

---

## 20. 완료 기준

다음 조건을 충족해야 작업을 완료로 판단합니다.

- 요청된 기능이 실제 코드에 구현되었습니다.
- 사용자 흐름이 연결되어 있습니다.
- 기존 기능을 깨뜨리지 않았습니다.
- 실행 또는 빌드 결과를 확인했습니다.
- 변경 파일을 확인했습니다.
- 남은 문제를 숨기지 않았습니다.
- 임시 코드나 거짓 데이터만으로 동작하지 않습니다.
- 필요한 문서 또는 설정 변경을 안내했습니다.

테스트 파일이 통과했다는 이유만으로 UI 기능까지 완료되었다고 판단하지 않습니다.

---

## 21. 완료 보고 형식

작업 완료 후 다음 형식으로 보고합니다.

### 변경 내용

- 구현하거나 수정한 내용

### 변경 파일

- 실제 변경된 파일 목록

### 검증 결과

- 실행한 명령
- 성공한 테스트
- 직접 확인한 사용자 흐름

### 남은 문제

- 구현하지 못한 부분
- 수동 확인이 필요한 부분
- 다른 Agent 또는 사용자가 수행해야 할 작업

### 다음 단계

- 현재 작업 이후 가장 우선되는 작업 한 가지

구현하지 않은 내용을 완료했다고 보고하지 않습니다.

---

## 22. SWIM 최종 판단 기준

모든 기술적 판단은 다음 질문을 기준으로 합니다.

> 이 변경이 사용자가 음악으로 자신의 하루를 기록하고, 다른 사람과 음악을 통해 연결되는 경험을 완성하는 데 필요한가?

필요하지 않거나 이번 MVP에 과도한 작업이라면 추가하지 않습니다.