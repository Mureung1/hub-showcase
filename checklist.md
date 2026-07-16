# checklist.md — 진행 상황 및 검증

> 작업 세션마다 이 문서를 갱신합니다.  
> 에이전트에게 `@checklist.md Task N 항목을 확인하고 체크해줘`로 검증을 요청하세요.

---

## Task 0 — 프로젝트 셋업

- [x] Vite + React 프로젝트 생성
- [x] TypeScript 설정 (`tsconfig.json`, `.tsx` 마이그레이션)
- [x] Tailwind CSS v4 설정 (`@tailwindcss/vite`, `@theme` 토큰)
- [x] oxlint 설정 및 `npm run lint` 통과
- [x] CLAUDE.md 웹앱 기준으로 갱신
- [x] README.md 웹앱 기준으로 갱신
- [x] plan.md 작성
- [x] checklist.md 작성
- [x] `src/pages/`, `src/hooks/`, `src/api/` 디렉터리 생성
- [x] React Router 설치 및 기본 라우트 연결
- [x] `npm run build` 성공 확인

**검증**
- [x] `npm run dev` → localhost:5173 접속 가능
- [x] `npm run typecheck` → 타입 에러 0건
- [x] `npm run lint` → 에러 0건
- [x] `npm run build` → dist/ 생성

---

## Task 1 — UI 기반·라우팅

- [x] 순수 HTML/CSS 프로토타입 5화면 제작 (`public/prototype/`), 기획서에서 링크 연결
- [ ] 동료 피드백 받아 기획서 수정
- [x] React Router 설치 (`react-router-dom`)
- [ ] 공통 Layout 컴포넌트 (헤더 + 하단 네비) — 임시 `DevNav`만 있음, 정식 디자인 적용 필요
- [ ] `/` 홈 화면 (챌린지·기록 CTA 목업)
- [ ] `/record` 기록 작성 화면 (UI만)
- [ ] `/calendar` 캘린더 화면 (UI만)
- [x] `/rooms` 친구 방 목록 화면 (프로토타입)
- [ ] `/room` 친구 방 화면 (O/X + 사진·메모 목업)
- [ ] `/settings` 설정 화면
- [ ] 모바일 뷰포트(375px) 레이아웃 확인

**검증**
- [ ] 5개 경로 간 네비게이션 동작
- [ ] 375px·768px에서 레이아웃 깨짐 없음
- [ ] 비교·순위·스트릭 UI 없음

---

## Task 2 — 백엔드·인증

### Backend
- [x] `server/` Express + TypeScript 프로젝트 초기화 (디렉토리 구조·Prisma·oxlint·vitest 환경 구성 완료, `GET /health`로 확인됨)
- [x] Prisma로 Supabase Postgres 연결 및 User 모델 정의 (마이그레이션 적용 완료)
- [x] JWT 발급·검증 설정 (jsonwebtoken, bcryptjs) — 단위 테스트 5개 통과
- [x] `POST /auth/signup` 구현 — 201/409 확인
- [x] `POST /auth/login` 구현 — 200/401 확인
- [x] `GET /auth/me` 구현 — 인증 미들웨어 포함, 200/401 확인
- [ ] Swagger/OpenAPI 문서 반영 (P0 아님, 미착수)

### Frontend
- [x] `src/api/client.ts` HTTP 클라이언트
- [x] 로그인 페이지 (`LoginPage.tsx`, API 연동)
- [x] 회원가입 페이지 (`SignupPage.tsx`, API 연동)
- [x] 토큰 저장 및 API 요청 시 Authorization 헤더 (`localStorage`, `client.ts`)
- [x] 비로그인 시 보호 라우트 리다이렉트 (`RequireAuth.tsx` — record/calendar/rooms/settings)

**검증**
- [x] 회원가입 → 로그인 → `/auth/me` 200 응답 (curl + 브라우저 양쪽 확인, `feature-verify` Agent 검증 완료)
- [x] 잘못된 토큰으로 API 호출 시 401
- [x] 로그아웃 후 보호 페이지 접근 불가 (`RequireAuth`로 `/login` 리다이렉트 확인)

---

## Task 3 — 챌린지·기록

### Backend
- [ ] Challenge 엔티티 및 일별 주제 생성 로직
- [ ] Record 엔티티 (userId, date, imageUrl, memo)
- [ ] S3(또는 로컬) 이미지 업로드
- [ ] `GET /challenges/today`
- [ ] `POST /records` (당일 중복 거부)
- [ ] `GET /records/today`

### Frontend
- [ ] 오늘의 챌린지 카드 (API 연동)
- [ ] 이미지 선택/촬영 UI
- [ ] 한 줄 메모 입력 (글자 수 제한)
- [ ] 기록 제출 및 성공/에러 피드백
- [ ] 당일 기록 완료 시 재작성 UI 비활성화

**검증**
- [ ] 당일 첫 기록 성공
- [ ] 같은 날 두 번째 기록 → 서버 4xx
- [ ] 다른 날짜 챌린지는 07:00 KST 기준으로 전환 (수동/테스트 가능)

---

## Task 4 — 캘린더

### Backend
- [ ] `GET /records?year=&month=` 월별 목록 API

### Frontend
- [ ] 월 이동 (이전/다음)
- [ ] 기록 있는 날 썸네일 표시
- [ ] 기록 없는 날 빈 칸
- [ ] 날짜 클릭 → 기록 상세 모달/페이지

**검증**
- [ ] 기록 3일 이상 데이터로 썸네일 정확히 표시
- [ ] 월 경계(1일·말일) 전환 정상
- [ ] 타인 기록은 캘린더에 노출되지 않음

---

## Task 5 — 친구 방

### Backend
- [ ] Room · RoomMember 엔티티, 사용자당 다중 방 소속 허용
- [ ] 방 생성 (최대 6명)
- [ ] 초대코드 참여
- [ ] `GET /rooms` (내 방 목록)
- [ ] `GET /rooms/{id}/today` (멤버별 O/X + 완료자 사진 URL·메모)

### Frontend
- [ ] 방 목록 화면 (`rooms.html` 프로토타입 완료, React 이식 예정)
- [ ] 방 생성 UI
- [ ] 초대코드 입력·참여 UI
- [ ] 멤버 목록 + 오늘 O/X 표시, 완료 멤버는 사진·메모 미리보기
- [ ] 기록 개수·빈도·연속일 미표시 확인 (내용 공유는 허용)

**검증**
- [ ] 여러 방 생성·전환 정상
- [ ] 3~6명 방 생성·참여 성공
- [ ] 7번째 참여 시도 거부
- [ ] API 응답에 완료자 사진 URL·메모 포함, 미완료 멤버는 미포함
- [ ] UI에 순위·스트릭·기록 횟수 없음

---

## Task 6 — AI 데일리 케어

### Backend
- [ ] LLM 연동 (기록 저장 후 또는 조회 시 생성)
- [ ] `GET /records/{id}/ai-care`
- [ ] AI 응답 캐싱 (동일 기록 재요청)

### Frontend
- [ ] 기록 완료 후 AI 메시지 표시
- [ ] 로딩 스피너
- [ ] API 실패 시 graceful fallback

**검증**
- [ ] 기록 1건당 AI 메시지 1회
- [ ] 점수·등급·인증 성공/실패 UI 없음
- [ ] 메시지 톤: 응원 또는 제안 (비판·평가 없음)

---

## Task 7 — 알림

### Backend
- [ ] Push 구독 엔드포인트 `POST /notifications/subscribe`
- [ ] 07:00 KST 스케줄러
- [ ] Web Push 발송 (VAPID)

### Frontend
- [ ] Service Worker 등록
- [ ] 알림 권한 요청 (설정 화면)
- [ ] 구독 해제 UI

**검증**
- [ ] 알림 권한 허용 후 구독 저장
- [ ] 테스트 트리거로 푸시 수신 확인
- [ ] 권한 거부 시 앱 크래시 없음

---

## 공통 품질 게이트 (모든 Task)

- [ ] `npm run typecheck` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과
- [ ] CLAUDE.md 절대 원칙 위반 UI/API 없음
- [ ] 변경 범위가 해당 Task에 한정됨

---

## 버그·이슈 트래킹

| ID | 설명 | 상태 | Task |
|---|---|---|---|
| — | (발견 시 추가) | — | — |

---

## 마일스톤 요약

| 마일스톤 | 포함 Task | 우선순위 | 목표 주차 | 상태 |
|---|---|---|---|---|
| M0 — 문서·셋업 | Task 0 | P0 | Week 1 | ✅ 완료 |
| M1 — UI 프로토타입 | Task 1 | P0 | Week 1 | 🔄 진행 중 (Layout·화면 UI 남음) |
| M2 — 인증 | Task 2 | P0 | Week 2 | ✅ 완료 (하루 앞당김) |
| M3 — 핵심 기록 | Task 3, 4 | P0~P1 | Week 2~3 | ⬜ 대기 |
| M4 — 소셜(비교 없음) | Task 5 | P1 | Week 3~4 | ⬜ 대기 |
| M5 — AI·알림 | Task 6, 7 | P2 | Week 4 | ⬜ 대기 |
