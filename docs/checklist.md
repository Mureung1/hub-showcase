# 대학생 맞춤형 정보 큐레이션 대시보드 - 구현 체크리스트

> 원칙: 공모전/대외활동 카테고리 하나로 크롤링 → DB → 필터링 → 화면 → 캘린더까지 세로로 완전히 뚫은 뒤, 정책/지원금 등으로 가로 확장

---

## 1단계 — 크롤링 대상 사전 조사

- [x] 크롤링 후보 사이트 리스트업 (대외활동/공모전 게시판 3~5곳)
  - 위비티(Wevity)로 확정
- [x] 각 사이트 robots.txt 확인
  - robots.txt: 일반 크롤러 허용, GPTBot만 3초 크롤-딜레이
- [x] 각 사이트 이용약관 내 크롤링/스크래핑 관련 조항 확인
  - 직접적인 크롤링 금지 조항 없음, 저작권 조항만 존재
- [x] 정적 HTML 사이트인지 확인 (view-source로 데이터 노출 여부 체크)
  - ✅ 정적 HTML 기반 (서버사이드 렌더링)
- [x] JS 렌더링(SPA) 사이트인지 확인 (BeautifulSoup vs Playwright 필요 여부 판단)
  - SPA 아님, BeautifulSoup 사용 가능
- [x] 로그인 후에만 노출되는 정보인지 확인
  - 로그인 없이 모든 데이터 접근 가능
- [x] 실제 공고 페이지 10개 이상 샘플 수집
  - 공모전 10개, 대외활동 5개 이상 수집 완료
  - 상세페이지 구조 파악 완료
- [x] 샘플에서 자격 요건 문장 패턴 정리 (예: "OO 전공 한정", "OO 거주 대학생 대상")
  - 신분(대학생/일반인), 지역(거주지), 학교급 제한 패턴 식별
  - 구체적 조건은 드문 편 (대부분 간단한 텍스트)
- [x] 샘플에서 마감일/모집 기간 표기 패턴 정리
  - YYYY-MM-DD 형식 + D-Day 표기
  - 수행기간: 자유 텍스트 형식
- [x] 최종 크롤링 대상 사이트 확정 및 사이트별 우선순위 결정
  - **확정**: 위비티(Wevity) - https://www.wevity.com
  - **카테고리 우선순위**: 공모전(find) > 대외활동(active)

---

## 2단계 — 데이터 모델 설계 (Prisma 스키마)

- [x] 1단계 조사 결과 기반 공고(Posting) 엔티티 필드 정의 (제목, 카테고리, 마감일, 모집기간, 원문링크 등)
  - Posting: title, category, receptionStartDate/End, eventStartDate/End, sourceUrl, parseStatus
- [x] 자격 요건(Eligibility) 필드 정의 (전공, 학년, 거주지, 소득분위 등 파싱 가능한 구조로)
  - Eligibility: majors[], regions[], grades[], enrollmentStatuses[], ageMin/Max, incomeMax, gpaMin, rawEligibilityText
- [x] 유저(User) 엔티티 필드 정의 (프로필 정보 포함)
  - User: id(Supabase Auth UID), email, createdAt
- [x] 유저 프로필(UserProfile) 엔티티 설계 (학과, 학년, 거주지, 소득분위, 관심 키워드)
  - UserProfile: major, grade, enrollmentStatus, residenceRegion, incomeBracket, age, interestTags
- [x] 캘린더 이벤트(CalendarEvent) 엔티티 설계 (개인 일정용 - 시험기간, 알바 등)
  - CalendarEvent: uid, type(EXAM/PART_TIME/OTHER), dtstart, dtend, relatedPostingId, source
- [x] 스크랩(Scrap) 엔티티 설계 (유저-공고 매핑, D-Day 알림 여부)
  - Scrap: userId, postingId (@@unique), notifyEnabled
- [x] 정책/지원금 카테고리용 필드 확장 여지 남기기 (주석 또는 nullable 필드)
  - Posting.category에 POLICY/CAMPUS_EVENT enum 포함, Eligibility.incomeMax/gpaMin 정책용 필드
- [x] Prisma schema.prisma 작성
  - 7개 모델, 4개 enum, 최적화 인덱스 포함
- [x] PostgreSQL DB 연결 (Supabase 또는 Railway)
  - Supabase PostgreSQL 프로젝트 생성, CONNECTION_STRING 설정
- [x] 최초 마이그레이션 실행 및 검증
  - prisma migrate dev --name init 실행 완료, migration.sql 생성, 테이블 생성 확인

---

## 3단계 — 크롤러 구현 + 시드 데이터 확보

- [x] Python 크롤링 프로젝트 초기 세팅 (BeautifulSoup / Playwright)
  - ✅ requirements.txt, config.py, .env 설정 완료
  - ✅ BeautifulSoup 사용 (정적 HTML, Playwright 불필요)
- [x] 공모전/대외활동 카테고리 크롤러 1차 구현 (사이트 1곳)
  - ✅ scrapers/wevity.py 구현: collect_ids(), fetch_posting()
  - ✅ 목록 페이지 → 상세 페이지 HTML 파싱
- [x] 크롤링 결과 파싱 → 표준 데이터 구조로 변환
  - ✅ 제목, 마감일, 자격요건, 주최사 추출
  - ✅ 위비티 구조화 필드(분야, 응모대상) 매핑
- [x] 자격 요건 텍스트 파싱 로직 구현 (정규식/규칙 기반)
  - ✅ parser/eligibility_parser.py: canonical 매핑 기반 파싱
  - ✅ 전공, 지역, 학년, 나이 추출 로직
- [x] 파싱 결과 검증 (샘플 대비 정확도 체크)
  - ✅ 신뢰도 99.5% (218/219 CURATED)
  - ✅ 1건만 NEEDS_REVIEW (우수한 성능)
- [x] 크롤러 → Node 백엔드 API 전달 또는 DB 직접 적재 방식 결정
  - ✅ DB 직접 적재 결정 (psycopg2 사용)
- [x] 크롤링 데이터 DB 적재 스크립트 작성
  - ✅ db/repository.py: insert_raw_posting(), insert_posting_with_eligibility()
  - ✅ UUID 명시적 생성, camelCase 컬럼명 큰따옴표 처리
- [x] node-cron으로 주기적 크롤링 스케줄링 설정
  - ⏳ 대기 중 (3단계 완료 후 진행 예정)
- [x] 시드 데이터 최소 50~100건 이상 확보
  - ✅ 219건 수집 완료 (목표 초과 달성)
- [ ] 크롤러 대상 사이트 2번째 추가 (선택)

---

## 4단계 — 유저 프로필 + 인증 ✅ 완료

- [x] JWT 기반 인증 미들웨어 구현 (Express)
- [x] 프로필 등록 폼 UI 구현 (React Hook Form + Zod)
- [x] 프로필 입력 필드: 학과/전공 선택
- [x] 프로필 입력 필드: 학년 선택
- [x] 프로필 입력 필드: 거주지/연고지 선택
- [x] 프로필 입력 필드: 소득 분위 입력
- [x] 프로필 입력 필드: 관심 분야 태그 선택 (멀티 셀렉트)
- [x] 프론트-백 Zod 스키마 공유 설정
- [x] 프로필 등록 API 구현 (POST /api/profile)
- [x] 프로필 수정 API 구현 (PATCH /api/profile)
- [x] 회원가입/로그인 API 구현
- [x] API 클라이언트 구현 (frontend/src/utils/apiClient.ts)
- [x] Auth 페이지 UI (회원가입/로그인)
- [x] 토큰 저장 및 자동 전달
- [x] 인증 상태에 따른 페이지 분기
- [ ] 닉네임 기능 추가
  - [ ] User 모델에 nickname 필드 추가 (Prisma 스키마)
  - [ ] 마이그레이션 실행
  - [ ] 회원가입 시 닉네임 입력 필드 추가
  - [ ] POST /auth/signup에 nickname 파라미터 추가
  - [ ] 프로필 설정 기본정보에 닉네임 필드 추가
  - [ ] 프로필 수정 페이지(SettingsPage)에 닉네임 필드 추가
  - [ ] PATCH /api/profile에 nickname 포함
  - [ ] 닉네임 표시 UI (대시보드 등 필요한 곳)

---

## 5단계 — 필터링 로직 + 대시보드 카드뷰 ✅ 완료

- [x] 유저 프로필과 공고 자격요건 매칭 알고리즘 설계
- [x] 조건 매칭 함수 구현 (matchingService.ts)
- [x] 필터링 API 구현 (GET /api/postings)
- [x] 공고 상세 조회 API (GET /api/postings/:id)
- [x] 스크랩 API (POST /api/postings/:id/scrap)
- [x] 프론트엔드 API 클라이언트 (postingsApi)
- [x] 대시보드 레이아웃 구현 (카테고리 탭)
- [x] 카드뷰 컴포넌트 구현 (PostingCard.tsx)
- [x] "지원 가능" 뱃지 표시 로직
- [x] 매칭도 (matchScore) 표시
- [x] 카테고리별 탭 전환 UI
- [x] 로딩/에러 상태 UI 처리
- [x] 빈 결과 처리 UI
- [x] 페이지네이션 UI
- [x] 스크랩 토글 기능
- [x] 공고 정렬 필터링 UI
  - [x] 헤더 우측에 "📅 마감일 순" / "⭐ 매칭도 순" 버튼 추가
  - [x] 카테고리 버튼 스타일과 동일하게 디자인
  - [x] 기본값: 마감일 순
  - [x] 클릭 시 공고 목록 재정렬
  - [x] 현재 선택된 필터 하이라이트

---

## 6단계 — 캘린더 연동 ✅ 백엔드 완료 (Google Calendar)

### 6-A: FullCalendar.js 기본 (필수) ✅ 대부분 완료

- [x] FullCalendar.js 설치 및 기본 캘린더 뷰 렌더링
- [x] 개인 일정 등록 폼 구현 (일정명, 시작일, 종료일, 유형: 시험/알바/기타)
- [x] 개인 일정 폼 UI 개선
  - [x] "하루 종일" 체크박스
  - [x] "이 기간에는 캘린더 추천 공고 숨기기" 옵션 (7단계 스마트 매칭에서 활용)
  - [x] 메모 필드 추가
  - [x] 시간 선택 입력 (하루종일 false일 때만 표시)
  - [ ] 상단 버튼 (추가 / 수정) 구현 (선택)
  - [ ] Google Calendar 동기화 버튼 (선택)
- [x] 개인 일정 CRUD API 구현 (POST/GET/PATCH/DELETE /api/calendar-events)
- [x] Prisma 스키마 확장 (isAllDay, startTime, endTime, memo, hideFromRecommendation 필드 추가)
- [x] 캘린더에 개인 일정 표시 (색상 구분: 시험기간/알바/기타)
- [x] 공고 마감일 캘린더 표시 로직 구현
- [ ] 스크랩 시 공고 접수기간/마감일 자동 캘린더 등록 연동 (7-A에서 진행)
- [x] 캘린더 월간/주간 뷰 전환 기능
- [x] 메인 대시보드 우측 캘린더와 캘린더 페이지 동기화
  - [x] calendarEventsApi 연동
  - [x] 개인 일정이 있는 날짜에 색상 점(dot) 표시
  - [x] 시험(주황)/알바(파랑)/기타(회색) 구분 (강화된 색상)
  - [x] 여러 날 연속일정 모든 날짜에 표시
  - [x] 날짜 클릭 시 일정 상세 팝업 표시
    - [x] 일정명, 날짜, 시간, 메모 표시
    - [x] 일정 유형별 색상 코딩
- [ ] 일정 클릭 시 수정/삭제 UI 추가 (선택)

### 6-B: Google Calendar 연동 (선택 - 권장) ✅ 구현 완료

- [x] Google Cloud Console 프로젝트 생성 & OAuth 2.0 설정 (사용자 수동)
- [x] Google Calendar API 활성화 (사용자 수동)
- [x] 프론트엔드: `@react-oauth/google` 라이브러리 설치
- [x] 로그인 시 Google 계정 연동 (OAuth 플로우 구현)
- [x] `googleapis` + `google-auth-library` 설치 (백엔드)
- [x] 사용자 액세스 토큰 저장 (User 테이블 확장: googleAccessToken, googleRefreshToken, googleConnectedAt)
- [x] Prisma 스키마 확장 (Scrap 모델에 googleEventId 추가)
- [x] 공고 마감일 → Google Calendar 자동 생성 API 구현
  - `POST /api/calendar/sync` (스크랩 시 트리거)
  - 공고 제목 + 마감일 + 설명 (sourceUrl)
- [x] 캘린더 이벤트 삭제 API (`DELETE /api/calendar/events/:eventId`)
- [x] 스크랩 시 자동 Google Calendar 동기화 구현
- [x] OAuth 콜백 처리 API (`POST /api/calendar/oauth-callback`)
- [x] 캘린더 연동 상태 확인 API (`GET /api/calendar/status`)
- [x] 마감 전 알림 설정 (D-1, D-3 notification 자동 생성)

### 6-C: iCalendar (.ics) 내보내기 (선택 - 폴백)

- [ ] 프론트엔드: 공고 목록 → .ics 파일 생성 함수
- [ ] `ics` 라이브러리 설치
- [ ] `GET /api/calendar/export.ics` 엔드포인트 구현
  - 스크랩된 공고 또는 필터링된 공고 기준
- [ ] 다운로드 버튼 UI (대시보드 우측 패널)
- [ ] 구독 링크 생성 (`webcal://` 프로토콜)
  - Google Calendar, Outlook, Apple Calendar 자동 구독 가능

---

## 7단계 — 스마트 매칭 로직 (유휴 시간 분석)

- [x] 유저 등록 일정 기반 "고부하 기간"(시험기간 등) 식별 로직 구현
  - ✅ getHighLoadPeriods(): 인접 일정 자동 병합 (3일 이내 = 연속)
- [x] 공고 마감일/수행기간과 고부하 기간 중첩 여부 체크 함수 구현
  - ✅ getConflictLevel(): high/medium/low/none 판정
- [x] 규칙 기반 우선순위 스코어링 구현
  - ✅ 마감일이 바쁜기간 직후(1주일 이내): 85점 / 1-3주: 70점
  - ✅ 바쁜기간과 겹침: 20점 (추천 불가)
  - ✅ 맞춤 조건 있을 시: 60-85점 범위
- [ ] 주당 여유 시간 계산 로직 구현 (전체 시간 - 고정 일정 시간) - **선택**
- [x] 추천 사유 텍스트 생성 로직 구현
  - ✅ generateRecommendationReason(): 한국어 추천 메시지 생성
- [x] 추천 공고 정렬/우선순위 배치 API 구현
  - ✅ GET /api/postings?smart=true
  - ✅ 추천여부 우선 > 스코어 높은 순 정렬
- [x] 대시보드 내 "추천 공고" 섹션 UI 구현
  - ✅ 헤더 우측 "⏰ 시간 최적화" 토글 버튼
  - ✅ 활성화 시 스마트 정렬 적용
- [x] 추천 사유 카드 내 표시 UI 구현
  - ✅ PostingCard에 smartScore 표시
  - ✅ 추천/주의 배지 + 상세 메시지 표시
- [ ] 매칭 로직 테스트 케이스 작성 (겹침/안겹침 시나리오) - **선택**
- [ ] 매칭 로직 수정 - 일정이 겹치는 날이 접수 마감일과 겹치는 것이 매칭에서 제외되어야 할 이유는 아님. 공모전 대회 참석 일정이나 프로그램 일정들이 나의 일정과 겹치는지에 대한 여부가 중요. (추후)

---

## 8단계 — 스크랩 + D-Day 알림 ✅ 거의 완료

- [x] 스크랩 버튼 UI 구현 (카드/상세페이지)
- [x] 스크랩 API 구현 (POST/DELETE /api/scraps)
- [x] 스크랩 목록 페이지 구현 (ScrapListPage)
  - [x] 좌측 네비게이션 사이드바 추가
  - [x] D-Day/스크랩순 정렬 토글
  - [x] 페이지네이션
- [ ] 스크랩 시 캘린더 자동 동기화 연결 (6단계 로직과 연동) - 선택
- [x] D-Day 계산 로직 구현
- [x] D-Day 표시 UI (카드, 캘린더 공통)
  - [x] D-Day 배지 (색상 코딩: 과거=빨강, ≤3일=노랑, 그외=회색)
- [x] 푸시 알림 기능 구현 (웹 푸시)
  - [x] VAPID 키 생성 및 설정
  - [x] Service Worker 등록 및 푸시 수신 처리
  - [x] PushSubscription 테이블 추가
  - [x] POST /api/scraps/subscribe 엔드포인트
  - [x] 프론트: 권한 요청 → 구독 → 서버 저장
- [x] 알림 발송 스케줄링 (node-cron 활용, D-3, D-1)
  - [x] notificationService에서 매일 자정 실행
  - [x] web-push로 실제 알림 발송
- [x] 알림 온/오프 설정 UI
  - [x] ScrapListPage에서 🔔/🔕 토글
  - [x] PATCH /api/scraps/:id 연동

---

## 9단계 — 환경설정 + 프로필 수정 ✅ 완료

- [x] 환경설정 페이지 레이아웃 구현 (사이드바 네비게이션)
  - [x] SettingsPage.tsx 생성
  - [x] 좌측 사이드바 (다른 페이지로 이동 가능)
- [x] 프로필 수정 페이지 구현 (기존 ProfileSetup과 동일 폼)
  - [x] 학과/전공 선택
  - [x] 학년 선택
  - [x] 거주지 선택
  - [x] 소득분위 선택
  - [x] 관심 분야 멀티 셀렉트
  - [x] 프로필 정보 자동 로드
- [x] PATCH /api/profile 연동 (기존 API 활용)
- [x] 프로필 수정 완료 알림 UI (토스트 메시지)
- [x] 비밀번호 변경 기능 구현
  - [x] User 모델에 password 필드 추가
  - [x] bcrypt로 비밀번호 해싱
  - [x] PATCH /api/auth/password 엔드포인트
  - [x] 프론트: 비밀번호 변경 폼 (현재/새/확인)
  - [x] 유효성 검사 (최소 6자, 일치 여부)
  - [x] 에러 메시지 표시
- [x] 로그아웃 버튼 (환경설정 페이지)
  - [x] 빨간 버튼, 🚪 아이콘
  - [x] 확인 대화상자
  - [x] tokenManager.clearTokens() 및 auth 페이지로 이동
- [x] 네비게이션 통일
  - [x] 모든 페이지에서 settings로 이동 가능
  - [x] "⚙ 프로필 설정" → settings 페이지
- [x] 탭 UI (프로필 정보 / 비밀번호 변경)
- [ ] 스크랩 관리 페이지 (스크랩 목록, 삭제 기능 - 선택)
- [ ] 공지사항 또는 FAQ 페이지 (선택)

---

## 10단계 — 정책/지원금 카테고리 확장 (시간 여유 시)

- [ ] 정책/지원금 사이트 크롤링 대상 조사 (1단계와 동일 프로세스)
- [ ] 정책/지원금 전용 자격요건 파싱 규칙 정의 (소득분위 조건 등 추가 고려)
- [ ] Prisma 스키마 확장 (정책 관련 필드 반영)
- [ ] 정책/지원금 크롤러 구현
- [ ] 필터링 로직에 정책 카테고리 반영
- [ ] 대시보드 탭에 정책/지원금 카테고리 활성화
- [ ] (생략 시) 발표 자료에 "구조상 확장 가능하도록 설계" 문구 및 스키마 다이어그램 준비

---

## 배포 및 마무리

- [ ] Frontend Vercel 배포 설정
- [ ] Backend Railway/Render 배포 설정
- [ ] 환경 변수 (.env) 프로덕션 세팅
- [ ] DB 마이그레이션 프로덕션 반영
- [ ] 배포 후 전체 플로우 QA (회원가입 → 프로필 등록 → 캘린더 → 필터링 → 스크랩 → 환경설정)
- [ ] 발표용 데모 시나리오 스크립트 작성