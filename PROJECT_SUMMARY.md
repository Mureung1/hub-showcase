# 우리결(Woorigyeol) 프로젝트 요약 문서

> 이 문서는 2026-07-29 기준으로 **실제 코드를 열어 확인한 내용만** 정리한 것이다.
> 기획서(README.md)에만 있고 코드에 없는 항목은 "기획서에는 있으나 미구현"으로 명시했다.

---

## 1. 프로젝트 개요

**한 줄 소개**: 대학생을 대상으로, 취미·성향 테스트 결과를 기반으로 **과팅(이성 그룹 미팅) 팀 매칭**과 **룸메이트 매칭**을 제공하는 웹 서비스.

### 기술 스택

| 구분 | 기술 |
|---|---|
| 프론트엔드 | React 19 + Vite, react-router-dom 7, axios, zustand (persist → localStorage) |
| 백엔드 | Node.js + Express 5 (ESM), Prisma 7 (+ @prisma/adapter-mariadb), MySQL |
| 인증 | JWT(jsonwebtoken, 7일 만료) + bcrypt(saltRounds 10) |
| 도구 | oxlint, prettier, nodemon, morgan, vitest(백엔드 유틸 테스트 2개) |

- 프론트 개발 서버: 5173(Vite 기본), 백엔드: 4000 (`LoginPage.jsx`에 `http://localhost:4000` 하드코딩으로 확인)
- 모든 API는 `/api` 프리픽스로 마운트됨 (`backend/src/app.js`)

### 폴더 구조 (2단계)

```
hub/
├── README.md / DESIGN.md / CLAUDE.md   # 기획·디자인·개발 가이드 문서
├── intro-page/          # 랜딩 페이지 (실서비스 아님)
├── vanillla-prototype/  # 클릭 프로토타입 (디자인 참고용)
├── frontend/
│   └── src/
│       ├── api/         # axios 인스턴스 (client.js)
│       ├── components/  # NotificationBell, ChatListButton, 모달 3종
│       ├── pages/       # 라우트 단위 화면 17개
│       ├── store/       # authStore.js (zustand)
│       ├── styles/ utils/ assets/
│       ├── App.jsx      # 라우터 정의
│       └── main.jsx
└── backend/
    ├── src/
    │   ├── routes/       # 엔드포인트 정의 (14개 라우터)
    │   ├── controllers/  # 요청/응답 처리
    │   ├── services/     # 비즈니스 로직 (매칭·팀·채팅·알림)
    │   ├── middlewares/  # authMiddleware, errorHandler
    │   ├── utils/        # 점수 계산, 매칭 계산 순수 함수
    │   ├── data/         # 테스트 문항→점수 매핑 테이블
    │   ├── config/       # env, prismaClient
    │   ├── app.js / server.js
    │   └── scripts/      # backfillInviteCodes.js
    └── prisma/           # schema.prisma + 마이그레이션 15개
```

---

## 2. 핵심 기능 목록 (코드에 실제 구현된 것만)

| 기능 | 프론트 주요 파일 | 백엔드 주요 파일 | 설명 |
|---|---|---|---|
| 회원가입 / 아이디 중복확인 | `SignupPage.jsx` | `authController.js`, `validateSchoolEmail.js`, `inviteCodeService.js` | `.ac.kr` 이메일 형식 검증, bcrypt 해싱, 가입 시 고유 초대코드 자동 발급 |
| 로그인 (JWT) | `LoginPage.jsx`, `store/authStore.js` | `authController.js` | JWT 발급(7일), zustand persist로 localStorage 저장, 취미테스트 완료 여부에 따라 첫 화면 분기 |
| 취미 발견 테스트 | `HobbyTestPage.jsx` | `hobbyTestController.js`, `calculateHobbyScore.js` | 8문항 답변 → 4개 취미 유형(딥다이버/에너지러/무드트래블러/소셜메이커) 점수 + 주/보조 유형 산출 |
| 생활성향 테스트 (룸메용) | `LifestyleTestPage.jsx` | `lifestyleTestController.js`, `calculateLifestyleScore.js`, `extractLifestyleFilters.js` | 4개 생활 유형(깔끔루틴러 등) 점수 + 하드/소프트 필터 값(흡연·음주·손님·온도) 추출 |
| 이상형(연애) 테스트 (과팅용) | `DatingTestPage.jsx` | `datingTestController.js`, `calculateDatingScore.js` | 4개 이상형 유형(포근메이트/티키타카러/하트스파커/그로우파트너) 점수 산출 |
| 테스트 완료 상태 조회 | `PurposeSelectPage.jsx` | `testStatusService.js` | 테이블에 결과 행 존재 여부로 3종 테스트 완료 여부 판단 → 화면 분기 |
| 룸메이트 유형 선택 | `RoommateTypeSelectPage.jsx` | `roommateProfileController.js` | friend(친구형) / business(비즈니스형) 저장 |
| 룸메이트 매칭 | `MatchResultsPage.jsx` | `roommateMatchingService.js`, `roommateMatchingUtils.js` | 하드필터 → (선택) 취미필터 → 코사인 유사도 + 소프트필터 가중합 → matches 저장·정렬 반환 |
| 과팅 인원 선택 (1:1/2:2/3:3) | `TeamSizeSelectPage.jsx` | `userProfileService.js` | `users.preferred_team_size` 저장, 1:1이면 팀구성 화면으로 직행 |
| 과팅 동성 후보 매칭 | `DatingSameResultsPage.jsx` | `datingMatchingService.js` | 같은 성별 + 취미 주/보조 유형 겹침 후보 리스트 (점수 계산 없음) |
| 동성 후보 1:1 채팅 (초대코드 교환) | `ChatRoomPage.jsx` | `candidateChatService.js` | CandidateChatRoom 생성(작은 userId를 user1로 정규화), 메시지 송수신, "내 초대코드 보내기" 버튼 |
| 초대코드로 팀 초대·수락 | `TeamSetupPage.jsx`, `NotificationBell.jsx` | `teamInviteService.js` | 코드로 초대 발송 → 수락 시점에 팀 생성/합류(트랜잭션), 성별·정원·중복소속 검증 |
| 팀 구성 현황 + 팀 확정 | `TeamSetupPage.jsx` | `datingTeamService.js` | 5초 폴링으로 팀 현황 갱신, 리더가 정원 충족 시 확정(recruiting→matched), 1인 팀은 solo-confirm 한 번에 처리 |
| 이성 팀 후보 매칭 | `DatingOppositeResultsPage.jsx` | `datingOppositeMatchingService.js`, `datingOppositeMatchingUtils.js` | 팀원 평균 벡터(취미+이상형) 코사인 유사도 5:5 가중합, 점수순 리스트 |
| 이성 팀 상세 보기 | `TeamMatchDetailPage.jsx` | `datingTeamService.js` (getDatingTeamDetail) | 팀원별 닉네임/나이/취미·이상형 유형 + 내 팀과의 궁합% + 내 신청 상태 |
| 매칭 신청 (관심 보내기) / 수락·거절 | `TeamMatchDetailPage.jsx`, `NotificationBell.jsx` | `matchRequestService.js` | 팀당 동시 1건 pending 제한, 수락 시 트랜잭션으로 양팀 confirmed 전환 + 그룹 채팅방 생성 + 잔여 신청 정리 |
| 팀 매칭 그룹 채팅 | `TeamMatchChatRoomPage.jsx` | `teamMatchChatService.js` | 성사된 두 팀 전원이 참여, 5초 폴링, 읽음 시각(lastReadAt) 갱신 |
| 통합 채팅 목록 | `ChatListPage.jsx`, `ChatListButton.jsx` | `chatListService.js` | 1:1 후보 채팅 + 그룹 채팅을 한 목록으로, 마지막 메시지·안읽음 수 표시 |
| 알림 벨 | `NotificationBell.jsx` | `notificationService.js` | 안읽은 채팅 + 대기중 팀 초대 + 대기중 매칭 신청을 합산 배지로 표시, 벨에서 바로 수락/거절 |

**기획서에는 있으나 미구현 (코드 확인 결과)**
- **신고 기능**: `Report` 테이블은 스키마·마이그레이션에 존재하지만, 이를 사용하는 라우트/컨트롤러/화면이 없음
- **마이페이지**: `PurposeSelectPage.jsx`의 버튼이 `console.log('마이페이지 이동 예정')`만 실행 (화면·라우트 없음)
- **룸메이트 매칭 후 채팅**: `MatchResultsPage.jsx`의 채팅 버튼이 `console.log('채팅 이동 예정')` 상태. 스키마의 `ChatRoom`/`ChatMessage`(matches 기반) 테이블을 쓰는 API도 없음
- **실제 학교 이메일 발송 인증**: `.ac.kr` 형식 검증만 수행, `is_verified`는 항상 false로 저장 (CLAUDE.md에 MVP 범위 외로 확정된 사항)

---

## 3. 사용자 워크플로우 (화면 흐름)

라우트는 `frontend/src/App.jsx` 기준. 화살표의 분기 조건은 각 페이지 코드에서 확인한 실제 로직이다.

### 3-1. 회원가입 ~ 로그인

```
/signup (SignupPage.jsx)
  └─ POST /api/auth/check-username (중복확인) → POST /api/auth/signup
  └─ 성공 시 → /login
/login (LoginPage.jsx)
  └─ POST /api/auth/login → JWT를 zustand(authStore) persist로 localStorage 저장
  └─ hasCompletedHobbyTest ? /select-purpose : /test/hobby
/test/hobby (HobbyTestPage.jsx)
  └─ POST /api/tests/hobby → /select-purpose
/select-purpose (PurposeSelectPage.jsx)   ← 허브 화면 (과팅/룸메 선택, 알림벨·채팅목록 버튼)
```

> 참고: 루트 `/`(Home.jsx)는 "개발 환경 준비 중입니다" 플레이스홀더이며, 실제 진입점은 `/login`이다.

### 3-2. 룸메이트 매칭 흐름

```
/select-purpose ─ 룸메이트 카드 클릭
  ├─ 생활성향 테스트 미완료 → /test/lifestyle (LifestyleTestPage.jsx)
  │     └─ POST /api/tests/lifestyle → /select-roommate-type
  └─ 완료 → /select-roommate-type (RoommateTypeSelectPage.jsx)
        └─ POST /api/roommate-profile (friend/business) → /matches
/matches (MatchResultsPage.jsx)
  └─ POST /api/matching/roommate { applyHobbyFilter, roommateTypeOverride }
     (친구형으로 진입 시 취미필터 기본 ON, 화면에서 토글 가능)
  └─ 후보별 GET /api/users/:userId/profile 로 닉네임·소프트필터 표시
  └─ 채팅 버튼은 미구현(placeholder)
```

### 3-3. 과팅 매칭 흐름

```
/select-purpose ─ 과팅 카드 클릭
  ├─ 이상형 테스트 미완료 → /test/dating (DatingTestPage.jsx)
  │     └─ POST /api/tests/dating → /select-team-size
  └─ 완료 → /select-team-size (TeamSizeSelectPage.jsx)
        └─ PATCH /api/users/me/team-size (1/2/3)
        ├─ teamSize=1 → /team-setup (바로 팀 확정 단계로)
        └─ teamSize=2,3 → /matching/dating-same

[동성 팀원 찾기]
/matching/dating-same (DatingSameResultsPage.jsx)
  └─ POST /api/matching/dating-same → 같은 성별 + 취미유형 겹치는 후보 리스트
  ├─ 후보와 채팅 → POST /api/candidate-chat-rooms → /chat/:chatRoomId (ChatRoomPage.jsx)
  │     └─ 메시지 송수신 + "내 초대코드 보내기" 버튼 (GET /api/users/me/invite-code)
  └─ "팀 구성 화면으로" 버튼 → /team-setup

[팀 구성·확정]
/team-setup (TeamSetupPage.jsx)  ← GET /api/dating-teams/me 5초 폴링
  ├─ 코드 입력해 초대 발송: POST /api/team-invites
  ├─ 받은 초대는 알림벨(NotificationBell.jsx)에서 PATCH /api/team-invites/:inviteId 수락/거절
  │     (수락 시점에 백엔드가 팀 생성/합류 처리)
  └─ 리더가 정원 충족 시 "팀 확정":
        PATCH /api/dating-teams/:teamId/confirm  (1인 팀은 POST /api/dating-teams/solo-confirm)
        → status recruiting → matched → /matching/dating-opposite

[이성 팀 매칭 — 구현되어 있음]
/matching/dating-opposite (DatingOppositeResultsPage.jsx)
  └─ GET /api/dating-teams/me → GET /api/dating-teams/:myTeamId/opposite-matches
     (반대 성별 + 같은 인원 + matched 상태 팀들과의 궁합 점수 리스트)
  └─ 카드 클릭 → /matching/dating-opposite/:teamId (TeamMatchDetailPage.jsx)
        └─ GET /api/dating-teams/:teamId (팀원 정보 + 궁합% + 내 신청 상태)
        └─ "관심 보내기" → POST /api/match-requests
  └─ 상대 팀 리더가 알림벨에서 PATCH /api/match-requests/:requestId/accept
        → 양 팀 confirmed + 그룹 채팅방 자동 생성
        → /team-match-chat/:chatRoomId (TeamMatchChatRoomPage.jsx, 5초 폴링)

[채팅 목록]
/chat-list (ChatListPage.jsx) ← GET /api/chat-rooms/my (1:1 + 그룹 통합 목록)
```

---

## 4. API 엔드포인트 목록

모든 경로는 `/api` 프리픽스 하위 (`backend/src/routes/index.js` 기준). 🔒 = `authMiddleware` (JWT 필요).

### 인증 — `routes/auth.js` → `authController.js`

| Method | 경로 | 컨트롤러 함수 | 역할 |
|---|---|---|---|
| POST | `/api/auth/check-username` | `checkUsername` | 아이디 중복 확인 (`{ available }` 반환) |
| POST | `/api/auth/signup` | `signup` | 회원가입 (이메일 형식·나이 검증, bcrypt 해싱, 초대코드 발급) |
| POST | `/api/auth/login` | `login` | 로그인, JWT 발급 + 취미테스트 완료 여부 반환 |

### 테스트 — `routes/tests.js`

| Method | 경로 | 컨트롤러 함수 | 역할 |
|---|---|---|---|
| GET 🔒 | `/api/tests/status` | `getTestStatus` | 취미/생활성향/이상형 테스트 완료 여부 3종 조회 |
| POST 🔒 | `/api/tests/hobby` | `submitHobbyTest` | 취미 테스트 제출 → 점수·주/보조 유형 저장 |
| POST 🔒 | `/api/tests/dating` | `submitDatingTest` | 이상형 테스트 제출 |
| POST 🔒 | `/api/tests/lifestyle` | `submitLifestyleTest` | 생활성향 테스트 제출 (점수 + 필터값 저장) |

### 룸메이트 — `routes/roommateProfile.js`, `routes/roommateMatching.js`

| Method | 경로 | 컨트롤러 함수 | 역할 |
|---|---|---|---|
| POST 🔒 | `/api/roommate-profile` | `submitRoommateProfile` | 룸메이트 유형(friend/business) 저장 |
| POST 🔒 | `/api/matching/roommate` | `matchRoommate` | 룸메이트 매칭 계산·저장·반환 (body: `applyHobbyFilter`, `roommateTypeOverride`) |

### 과팅 매칭 — `routes/datingMatching.js`, `routes/datingTeamRoutes.js`

| Method | 경로 | 컨트롤러 함수 | 역할 |
|---|---|---|---|
| POST 🔒 | `/api/matching/dating-same` | `matchDatingSame` | 동성 팀원 후보 리스트 (취미유형 겹침 기준) |
| GET 🔒 | `/api/dating-teams/me` | `getMyTeam` | 내 팀 구성 현황 (팀 없으면 본인 1명으로 간주) |
| POST 🔒 | `/api/dating-teams/solo-confirm` | `confirmSoloTeam` | 1인 팀 생성+확정을 한 번에 (트랜잭션) |
| PATCH 🔒 | `/api/dating-teams/:teamId/confirm` | `confirmTeam` | 리더의 팀 확정 (recruiting→matched, 정원 검증) |
| GET 🔒 | `/api/dating-teams/:teamId/opposite-matches` | `getOppositeMatches` | 이성 팀 후보 궁합 점수 리스트 계산·저장·반환 |
| GET 🔒 | `/api/dating-teams/:teamId` | `getDatingTeamDetailInfo` | 팀 상세 (팀원 정보 + 내 팀과의 궁합% + 신청 상태) |

### 매칭 신청 — `routes/matchRequestRoutes.js` → `matchRequestController.js`

| Method | 경로 | 컨트롤러 함수 | 역할 |
|---|---|---|---|
| POST 🔒 | `/api/match-requests` | `sendMatchRequest` | 이성 팀에 관심 보내기 (성별·인원·상태·중복 검증) |
| PATCH 🔒 | `/api/match-requests/:requestId/accept` | `acceptRequest` | 수락 → 양팀 confirmed + 그룹 채팅방 생성 (트랜잭션) |
| PATCH 🔒 | `/api/match-requests/:requestId/reject` | `rejectRequest` | 거절 (역방향 pending 신청도 함께 정리) |

### 팀 초대 — `routes/teamInviteRoutes.js` → `teamInviteController.js`

| Method | 경로 | 컨트롤러 함수 | 역할 |
|---|---|---|---|
| POST 🔒 | `/api/team-invites` | `sendTeamInvite` | 초대코드로 팀 초대 발송 |
| GET 🔒 | `/api/team-invites/received` | `getReceivedInvites` | 받은 pending 초대 목록 |
| PATCH 🔒 | `/api/team-invites/:inviteId` | `respondToInvite` | 수락/거절 (수락 시 팀 생성·합류 트랜잭션) |

### 채팅 — `routes/candidateChatRoutes.js`, `routes/teamMatchChatRoutes.js`, `routes/chatListRoutes.js`

| Method | 경로 | 컨트롤러 함수 | 역할 |
|---|---|---|---|
| POST 🔒 | `/api/candidate-chat-rooms` | `createChatRoom` | 1:1 후보 채팅방 생성(이미 있으면 기존 방 반환) |
| POST 🔒 | `/api/candidate-chat-rooms/:chatRoomId/messages` | `sendMessage` | 1:1 메시지 전송 |
| GET 🔒 | `/api/candidate-chat-rooms/:chatRoomId/messages` | `getMessages` | 1:1 메시지 조회 + 내 읽음시각 갱신 |
| POST 🔒 | `/api/team-match-chat-rooms/:chatRoomId/messages` | `sendMessage` (teamMatchChatController) | 그룹 채팅 메시지 전송 |
| GET 🔒 | `/api/team-match-chat-rooms/:chatRoomId/messages` | `getMessages` (teamMatchChatController) | 그룹 채팅 메시지 조회(발신자 닉네임 포함) + 읽음시각 갱신 |
| GET 🔒 | `/api/chat-rooms/my` | `getMyChatRooms` | 1:1 + 그룹 통합 채팅 목록 (마지막 메시지·안읽음 수) |

### 유저·알림·기타 — `routes/userProfile.js`, `routes/notificationRoutes.js`

| Method | 경로 | 컨트롤러 함수 | 역할 |
|---|---|---|---|
| GET 🔒 | `/api/users/me/invite-code` | `getMyInviteCode` | 내 초대코드 조회 |
| PATCH 🔒 | `/api/users/me/team-size` | `updateMyTeamSize` | 선호 과팅 인원 저장 |
| GET 🔒 | `/api/users/:userId/profile` | `getUserProfile` | 닉네임 + 소프트필터(손님/온도) 조회 (민감정보 제외) |
| GET 🔒 | `/api/notifications/summary` | `getSummary` | 안읽은 채팅 + 대기 초대 + 대기 매칭신청 합산 요약 |
| GET | `/api/health` | (인라인) | 서버 동작 확인 |

---

## 5. DB 스키마 요약 (`backend/prisma/schema.prisma`)

마이그레이션 15개 적용 완료. 모델명은 PascalCase, 실제 테이블/컬럼은 `@@map`/`@map`으로 snake_case 매핑.

| 모델 (테이블) | 핵심 컬럼 | 관계 |
|---|---|---|
| `User` (users) | userId, schoolEmail(unique), username(unique), passwordHash, nickname, gender, birthYear, schoolName, **inviteCode(unique)**, **preferredTeamSize**, isVerified | 아래 대부분 테이블과 1:N 또는 1:1 |
| `HobbyTestResult` (hobby_test_results) | hobbyTags(Json: primary/secondary), rawAnswers(Json), scoreSummary(Json) | User 1:1 (userId unique) |
| `PersonalityTest` (personality_tests) | testType(enum: dating/lifestyle), answers(Json), scoreSummary(Json) | User 1:N (실질적으로 유형당 1개 사용) |
| `RoommateProfile` (roommate_profiles) | roommateType(enum: friend/business) | User 1:1 |
| `DatingTeam` (dating_teams) | leaderId, gender, teamSize, status(enum: recruiting/matched/closed/**confirmed**) | User(리더) 1:N, DatingTeamMember 1:N, TeamInvite 1:N |
| `DatingTeamMember` (dating_team_members) | 복합 PK (teamId, userId) | User↔DatingTeam N:M 연결 테이블 |
| `Match` (matches) | matchType(enum: roommate/dating_same/dating_opposite), partyAId, partyBId, similarityScore, status(proposed/confirmed/rejected) | relation 없는 plain ID (roommate=userId쌍, dating_opposite=teamId쌍) |
| `ChatRoom` / `ChatMessage` (chat_rooms/chat_messages) | matchId(unique) / senderId, content | Match 1:1 — **테이블만 있고 사용하는 API 없음** |
| `Report` (reports) | reporterId, targetId, reason, status | **테이블만 있고 사용하는 API 없음** |
| `CandidateChatRoom` (candidate_chat_rooms) | user1Id/user2Id(@@unique, 작은 ID가 user1), user1/user2LastReadAt | User와 2개 relation, 메시지 1:N |
| `CandidateChatMessage` (candidate_chat_messages) | chatRoomId, senderId, content | CandidateChatRoom 1:N |
| `TeamInvite` (team_invites) | fromUserId, toUserId, teamId(nullable — 수락 시 채움), status(pending/accepted/rejected) | User 2개 relation, DatingTeam optional |
| `MatchRequest` (match_requests) | fromTeamId, toTeamId(@@unique 쌍), similarityScore, status(pending/accepted/rejected) | relation 없는 plain teamId |
| `TeamMatchChatRoom` (team_match_chat_rooms) | matchRequestId(unique) | 멤버·메시지 1:N (userId는 relation 없는 plain ID) |
| `TeamMatchChatRoomMember` (team_match_chat_room_members) | chatRoomId+userId(@@unique), lastReadAt | TeamMatchChatRoom 1:N |
| `TeamMatchChatMessage` (team_match_chat_messages) | chatRoomId, senderId, content | TeamMatchChatRoom 1:N |

관계 요약: **User↔DatingTeam은 DatingTeamMember를 통한 N:M**, 나머지는 대부분 1:1 또는 1:N. `Match`, `MatchRequest`, `TeamMatchChat*` 계열은 의도적으로 FK relation 없이 plain BigInt로 연결한다(스키마 주석에 사유 명시).

---

## 6. 매칭 알고리즘 요약

### 6-1. 테스트 점수 계산 (공통 방식)

`utils/calculateHobbyScore.js` / `calculateLifestyleScore.js` / `calculateDatingScore.js`
- 각 답변 선택지를 `data/*ScoreMap.js`에서 찾아 **주타입 +2점, 보조타입 +1점** 누적
- 동점 처리: 총점 → "주타입(2점)으로 선택된 횟수" → 타입 고정 순서
- 결과: 4개 유형별 점수(4차원 벡터로 사용됨) + primary/secondary 유형
- 생활성향 테스트는 추가로 `extractLifestyleFilters.js`가 흡연/음주(하드필터), 손님방문/온도선호(소프트필터) 값을 추출해 함께 저장

### 6-2. 룸메이트 매칭 — `services/roommateMatchingService.js` + `utils/roommateMatchingUtils.js`

`POST /api/matching/roommate` 호출 시 즉시 계산(on-demand):

1. **하드필터** (`passesHardFilter`): 성별, 흡연여부, 음주여부, 룸메이트타입(friend/business) **4개 모두 일치**해야 후보
2. **취미필터** (선택, `passesHobbyFilter`): `applyHobbyFilter=true`면 내 취미 주/보조 유형이 후보의 주/보조 유형과 하나라도 겹쳐야 통과 (친구형 선택 시 프론트가 기본 ON)
3. **유사도**: 생활성향 4타입 점수 벡터 간 **코사인 유사도** (`cosineSimilarity`, 0~1)
4. **소프트필터** (`softFilterMatch`): 손님방문정책·온도선호 일치 개수 ÷ 2 → 0 / 0.5 / 1
5. **최종 점수** (`calculateFinalScore`): `유사도 × 0.6 + 소프트필터 × 0.4`
6. `matches` 테이블에 저장(같은 조합 있으면 점수 갱신, partyAId < partyBId로 정규화), 점수 내림차순 반환

### 6-3. 과팅 동성 매칭 — `services/datingMatchingService.js`

`POST /api/matching/dating-same`: 점수 계산 없이 **필터만** 적용한 후보 리스트.
- 조건: 본인 제외 + **같은 성별** + 취미 테스트 완료 + `passesHobbyFilter`(주/보조 유형 겹침) 통과
- 반환: 후보의 닉네임 + 취미 주/보조 유형

### 6-4. 과팅 이성 팀 매칭 — `utils/datingOppositeMatchingUtils.js` + `services/datingOppositeMatchingService.js`

`GET /api/dating-teams/:teamId/opposite-matches` 호출 시:

1. **팀 벡터 계산** (`getTeamAverageVectors`): 팀원들의 취미 4타입 점수 평균 벡터 + 이상형 4타입 점수 평균 벡터 (해당 테스트 미완료 팀원은 평균에서 제외)
2. **후보 팀 필터** (`getOppositeTeamCandidates`): `status='matched'` + **반대 성별** + **같은 teamSize**
3. **궁합 점수**: `취미 벡터 코사인 유사도 × 0.5 + 이상형 벡터 코사인 유사도 × 0.5`
4. `matches`(dating_opposite)에 저장 후 점수 내림차순 + 후보 팀 리더 닉네임 붙여 반환
5. 같은 공식의 단일 쌍 버전 `calculateTeamPairFinalScore`를 팀 상세 화면 궁합%와 매칭 신청 점수 기록에 재사용

### 6-5. 매칭 신청 성사 — `services/matchRequestService.js`

- 신청: 팀당 pending 1건 제한, rejected 이력은 재신청 허용(같은 행을 pending으로 되돌림)
- 수락(트랜잭션): 신청 accepted → 역방향·잔여 pending 신청 일괄 rejected → 양 팀 `matched→confirmed`(후보 리스트에서 제외됨) → 그룹 채팅방 생성 + 양팀 전원 멤버 등록

---

## 7. 주요 미들웨어 / 인증 방식

| 파일 | 역할 |
|---|---|
| `backend/src/middlewares/authMiddleware.js` | `Authorization: Bearer {token}` 헤더에서 JWT 추출 → `jwt.verify(token, env.jwtSecret)` 검증 → `req.user = { userId, username }` 주입. 실패 시 401 |
| `backend/src/middlewares/errorHandler.js` | `notFoundHandler`(404) + `errorHandler`(`err.status` 있으면 해당 코드, 없으면 500) |
| `backend/src/controllers/authController.js` | 로그인 시 `jwt.sign({ userId, username }, secret, { expiresIn: '7d' })`, 비밀번호는 bcrypt(saltRounds 10) |
| `frontend/src/store/authStore.js` + `frontend/src/api/client.js` | zustand persist로 토큰을 localStorage에 저장, axios 요청 인터셉터가 모든 요청에 `Authorization` 헤더 자동 첨부 |

- 인증이 필요한 모든 라우트는 라우터 정의에서 `authMiddleware`를 개별 적용 (auth 3개와 `/health`만 공개)
- CORS는 `app.js`에서 `cors()` 와일드카드 허용 상태 (CLAUDE.md에 "배포 시 좁히기" 미결 항목으로 기재됨)

---

## 8. 폴더/파일 구조 트리

### frontend/src

```
frontend/src/
├── App.jsx                      # 17개 라우트 정의
├── main.jsx
├── api/
│   └── client.js                # axios 인스턴스 + JWT 인터셉터
├── store/
│   └── authStore.js             # zustand persist (token, user)
├── components/
│   ├── NotificationBell.jsx     # 알림 벨 (초대/매칭신청 수락·거절 처리 포함)
│   ├── ChatListButton.jsx       # 채팅 목록 이동 버튼
│   ├── ConfirmModal.jsx / InfoModal.jsx / InviteCodeModal.jsx
├── pages/                       # (각 페이지에 동명 .css 동반)
│   ├── Home.jsx                 # "/" 플레이스홀더
│   ├── LoginPage.jsx / SignupPage.jsx
│   ├── HobbyTestPage.jsx / DatingTestPage.jsx / LifestyleTestPage.jsx
│   ├── PurposeSelectPage.jsx    # 과팅/룸메 선택 허브
│   ├── RoommateTypeSelectPage.jsx / MatchResultsPage.jsx        # 룸메이트
│   ├── TeamSizeSelectPage.jsx / DatingSameResultsPage.jsx       # 과팅 1단계
│   ├── TeamSetupPage.jsx        # 팀 구성 (5초 폴링)
│   ├── DatingOppositeResultsPage.jsx / TeamMatchDetailPage.jsx  # 이성 매칭
│   ├── ChatRoomPage.jsx         # 1:1 후보 채팅
│   ├── TeamMatchChatRoomPage.jsx# 그룹 채팅 (5초 폴링)
│   └── ChatListPage.jsx         # 통합 채팅 목록
├── styles/  (tokens.css)
├── utils/
│   └── lifestyleLabels.js
└── assets/  (로고, 일러스트)
```

### backend/src

```
backend/src/
├── app.js                        # express 설정 (cors, json, morgan, /api 마운트)
├── server.js                     # 서버 실행 진입점
├── config/
│   ├── env.js                    # 환경변수
│   └── prismaClient.js           # PrismaClient (mariadb 어댑터)
├── middlewares/
│   ├── authMiddleware.js
│   └── errorHandler.js
├── routes/                       # 14개 라우터 (index.js에서 통합)
│   ├── index.js / auth.js / tests.js
│   ├── roommateProfile.js / roommateMatching.js
│   ├── datingMatching.js / datingTeamRoutes.js
│   ├── teamInviteRoutes.js / matchRequestRoutes.js
│   ├── candidateChatRoutes.js / teamMatchChatRoutes.js / chatListRoutes.js
│   ├── userProfile.js / notificationRoutes.js
├── controllers/                  # 라우터별 대응 컨트롤러 15개
├── services/                     # 비즈니스 로직
│   ├── roommateMatchingService.js / datingMatchingService.js
│   ├── datingOppositeMatchingService.js / datingTeamService.js
│   ├── teamInviteService.js / matchRequestService.js
│   ├── candidateChatService.js / teamMatchChatService.js / chatListService.js
│   ├── notificationService.js / inviteCodeService.js
│   ├── testStatusService.js / userProfileService.js
├── utils/
│   ├── calculateHobbyScore.js / calculateDatingScore.js / calculateLifestyleScore.js
│   ├── extractLifestyleFilters.js
│   ├── roommateMatchingUtils.js (+ .test.js) / datingOppositeMatchingUtils.js
│   ├── inviteCodeUtils.js / validateSchoolEmail.js (+ .test.js)
├── data/                         # 테스트 문항 선택지 → 점수 매핑
│   ├── hobbyScoreMap.js / datingScoreMap.js
│   ├── lifestyleScoreMap.js / lifestyleFilterMap.js
└── scripts/
    └── backfillInviteCodes.js    # 기존 유저 초대코드 일괄 발급 스크립트
```

### backend/prisma

```
backend/prisma/
├── schema.prisma                 # 모델 17개 (섹션 5 참고)
└── migrations/                   # 20260713_init ~ 20260729_add_confirmed... 총 15개
```

---

## 발견된 참고사항 (수정하지 않고 메모만 남김)

1. **`LoginPage.jsx`가 공용 axios 인스턴스(`apiClient`)를 쓰지 않고 `http://localhost:4000/api/auth/login`을 하드코딩**해 직접 호출한다. 다른 페이지는 전부 `VITE_API_BASE_URL` 기반 `apiClient`를 사용하므로, 배포 시 로그인만 주소가 어긋날 수 있다. (`SignupPage.jsx`도 유사한지 여부는 확인 필요)
2. **미사용 테이블**: `ChatRoom`/`ChatMessage`(matches 기반 채팅), `Report`(신고)는 스키마·마이그레이션에만 존재하고 사용하는 코드가 없다. 실제 채팅은 `CandidateChatRoom`·`TeamMatchChatRoom` 계열을 사용한다.
3. **placeholder 버튼 2곳**: `PurposeSelectPage.jsx`의 마이페이지 버튼, `MatchResultsPage.jsx`의 룸메이트 채팅 버튼은 `console.log`만 실행한다.
4. **zod 미사용**: CLAUDE.md와 `backend/package.json`에는 zod가 요청 검증용으로 명시돼 있으나, backend 코드에서 zod import를 찾을 수 없었다. 입력 검증은 각 컨트롤러/서비스의 수동 if-검사로 구현돼 있다.
5. **dating_opposite 매칭의 중복 row 가능성**: 코드 주석에도 명시돼 있듯(`datingOppositeMatchingService.js`), 룸메이트 매칭과 달리 partyAId/partyBId 순서를 정규화하지 않아 상대 팀이 같은 API를 호출하면 방향이 반대인 별도 row가 생긴다 (의도된 동작으로 주석 처리됨).
6. **채팅 폴링**: 그룹 채팅(`TeamMatchChatRoomPage`)과 팀 구성 화면(`TeamSetupPage`)은 5초 폴링이 구현돼 있으나, **1:1 후보 채팅(`ChatRoomPage`)은 폴링 없이 입장 시 1회만 조회**한다. 상대 메시지를 보려면 재입장이 필요하다.
7. **`users.is_verified`는 항상 false로 저장**되고 이후 갱신하는 코드가 없다 (실제 이메일 인증이 MVP 범위 밖이므로 계획과 일치).
8. **루트 라우트 `/`(Home.jsx)는 "개발 환경 준비 중" 플레이스홀더**라서 사용자는 `/login`으로 직접 진입해야 한다.
9. **테스트 코드**: `roommateMatchingUtils.test.js`, `validateSchoolEmail.test.js` 2개가 vitest(`npm test`)로 존재한다. 그 외 자동 테스트는 없다.
10. **확인 필요**: 프론트 각 테스트 페이지의 문항 수·내용이 백엔드 scoreMap과 정확히 1:1 대응하는지는 문항 데이터 파일까지 대조하지 않아 확인하지 못했다 (점수 계산 로직 자체는 코드로 확인함).
