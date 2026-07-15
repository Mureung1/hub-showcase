# Requirements Document

## Introduction

서바이벌 스터디 웹(Survival Study Web)은 `survival-study-challenge` core 계약을 소비하는 Next.js App Router 기반 웹 계층이다. 본 기능은 공개 챌린지 탐색부터 인증, 참가, 결제, 포인트, 게임화, 자동 작업 연결까지 사용자가 브라우저에서 수행하는 흐름과 외부 요청을 core 도메인 함수로 전달하는 경계를 제공한다.

본 문서는 웹 계층이 사용자에게 어떤 화면과 상호작용을 제공해야 하는지, 인증·결제·Storage·Realtime·Cron 요청을 어떤 경계에서 core 계약에 연결해야 하는지를 정의한다. DB 스키마, 트랜잭션 도메인 규칙, 정산 계산, RLS 정책 정의는 authoritative core contract인 `.kiro/specs/survival-study-challenge/{requirements.md,design.md,tasks.md}`의 소유이며 본 스펙에서 재정의하지 않는다.

## Glossary

- **Web_Layer**: 페이지, 레이아웃, 컴포넌트, Server_Action, Route_Handler, Middleware를 포함하는 본 스펙의 Next.js App Router 웹 시스템
- **Core_Contract**: `survival-study-challenge` 스펙이 소유하는 도메인 함수, 반환 타입, Domain_Error, 데이터 모델, 무결성 규칙의 authoritative 계약
- **Core_Adapter**: Web_Layer가 Core_Contract를 호출하도록 웹 입력과 세션을 도메인 입력으로 변환하는 서버 측 경계
- **Mock_Adapter**: Core_Contract 구현이 준비되지 않은 동안 결정적 fixture와 명시적 미지원 결과를 반환하는 개발 전용 Core_Adapter 구현
- **Adapter_Result**: 성공 데이터 또는 정형화된 Domain_Error를 포함하는 Core_Adapter 반환값
- **Domain_Error**: Core_Contract가 정의한 `UNAUTHENTICATED`, `DUPLICATE_EMAIL`, `INSUFFICIENT_POINTS`, `PAYMENT_DECLINED`, `DUPLICATE_PARTICIPATION`, `CAPACITY_FULL`, `STUDY_TIME_NOT_MET`, `DEADLINE_EXCEEDED`, `NOT_ALIVE`, `CONSERVATION_VIOLATED`, `INVALID_CONFIG`, `ALREADY_SETTLED` 오류 집합
- **Server_Component**: 서버에서 데이터를 조회하고 HTML을 생성하며 브라우저 비밀정보를 포함하지 않는 React 컴포넌트
- **Client_Component**: 브라우저 상호작용, 로컬 상태, 타이머, 파일 선택, Realtime 구독을 담당하는 React 컴포넌트
- **Server_Action**: 인증된 사용자 입력을 검증하고 Core_Adapter를 호출하는 서버 함수
- **Route_Handler**: 결제 Webhook, Vercel_Cron 등 HTTP 요청을 검증하고 Core_Adapter를 호출하는 서버 엔드포인트
- **Middleware**: Supabase_Auth 쿠키 세션을 갱신하고 보호 경로 접근을 판정하는 요청 계층
- **Supabase_Auth**: 가입, 로그인, 로그아웃, 쿠키 기반 세션을 제공하는 인증 서비스
- **Browser_Client**: 공개 또는 사용자 권한 읽기, Storage 업로드, Realtime 구독에 사용하는 브라우저용 Supabase 클라이언트
- **Server_Client**: 서버 쿠키 컨텍스트에서 세션과 허용된 데이터를 읽는 서버용 Supabase 클라이언트
- **Protected_Route**: 인증 세션이 있어야 접근 가능한 페이지 또는 요청 경로
- **Official_Challenge**: 운영팀이 개설하고 현금 Entry_Fee로 참가하는 공식 챌린지
- **User_Challenge**: 사용자가 개설하고 Point로 참가하는 사용자 챌린지
- **Participant**: Core_Contract에 참가자로 등록된 사용자
- **Challenge_Detail**: 챌린지 기간, 참가 비용, 일일 학습 시간, 인증 조건, 모집 상태, 참가자 수, 예상 보상을 포함하는 공개 상세 정보
- **Daily_Goal**: Participant가 해당 날짜에 제출하는 학습 목표
- **Study_Timer**: 학습 세션의 경과 시간을 표시하고 완료된 세션을 서버에 기록하는 브라우저 상호작용
- **Retrospective**: 학습 후 제출하는 회고 텍스트
- **Verification_Evidence**: 일일 인증에 첨부하는 비공개 파일
- **Evidence_Path**: `{user_id}/{challenge_id}/{date}/{file_id}` 형식의 Storage 객체 경로
- **Survival_Status**: Participant의 `alive`, `eliminated`, `completed` 상태
- **Leaderboard**: 참가자의 순위, Survival_Status, 연속 인증 일수, 현재 생존자 수를 표시하는 읽기 모델
- **Realtime_Update**: Supabase Realtime이 전달하는 생존 현황, Leaderboard, Surprise_Mission 변경 알림
- **Point_Wallet**: 사용자의 현재 Point 잔액 읽기 모델
- **Point_Ledger**: Point 적립·사용 금액, 사유, 처리 시각을 표시하는 거래 내역
- **Badge**: 완주 등 성취에 따라 지급된 프로필 항목
- **Learning_Report**: 챌린지 종료 후 Participant에게 제공되는 학습 결과 읽기 모델
- **Surprise_Mission**: 진행 중인 챌린지에 표시되는 돌발 미션
- **Payment_Provider**: 아직 선정되지 않은 외부 결제대행사
- **Payment_Adapter**: Payment_Provider별 세션 생성, Webhook 서명 검증, 이벤트 정규화를 캡슐화하는 서버 인터페이스
- **Payment_Session**: Official_Challenge 결제를 시작하기 위한 외부 결제 URL과 만료 정보를 포함하는 결과
- **Payment_Webhook**: Payment_Provider가 결제 승인 또는 실패를 통지하는 서명된 HTTP 요청
- **Vercel_Cron**: 일일 탈락 및 종료 정산 Route_Handler를 예약 호출하는 스케줄러
- **Cron_Secret**: Vercel_Cron 요청을 인증하는 서버 전용 비밀값
- **Loading_State**: 탐색 또는 변경 작업이 완료되기 전 사용자에게 진행 중임을 알리는 UI 상태
- **Empty_State**: 표시할 데이터가 없을 때 원인과 다음 행동을 안내하는 UI 상태
- **Error_State**: 오류 원인과 복구 행동을 사용자에게 제공하는 UI 상태
- **Responsive_UI**: 320 CSS 픽셀 이상의 뷰포트에서 가로 스크롤 없이 주요 작업을 수행할 수 있는 화면 구성
- **Accessible_UI**: 키보드 조작, 의미 구조, 이름 있는 컨트롤, 포커스 표시, 상태 알림을 제공하는 WCAG 2.2 AA 목표 UI

## Scope

### In Scope

- Next.js App Router 페이지, 중첩 레이아웃, loading/error/not-found 경계, Server_Component와 Client_Component
- Supabase_Auth 가입·로그인·로그아웃 UI, 쿠키 세션 갱신 Middleware, Protected_Route 처리
- 공개 Official_Challenge 및 공개 User_Challenge 목록·상세 화면
- Official_Challenge 결제 세션 시작과 결과 UX, User_Challenge Point 참가, User_Challenge 개설 UX
- Server_Action과 Core_Adapter를 통한 core 도메인 함수 연결
- Daily_Goal, Study_Timer, Retrospective, Verification_Evidence 업로드, 생존 인증 UX
- Survival_Status, Leaderboard, Point_Wallet, Point_Ledger, Badge, Learning_Report, Surprise_Mission UI
- Supabase Storage 업로드와 Realtime 구독의 웹 통합
- 미정 Payment_Provider를 위한 Payment_Adapter, Payment_Webhook Route_Handler
- Vercel_Cron elimination·settlement Route_Handler와 스케줄 설정
- 상태·오류 매핑, 보안, Accessible_UI, Responsive_UI, 자동화된 웹 테스트
- Core_Contract 미완성 기간의 Mock_Adapter 기반 UI shell 병렬 개발

### Out of Scope

- DB 테이블, 열거형, 제약, 인덱스, 마이그레이션 및 seed 정의
- 포인트·참가·인증·탈락·부활·정산의 트랜잭션 도메인 로직 구현
- Refund, 추가 보상, Service_Fee, Reward_Pool, Point 분배 계산
- RLS 및 Storage 정책 자체의 정의와 원격 적용
- Supabase 원격 migration, 원격 DB reset, 원격 데이터 삭제
- Payment_Provider 선정과 Provider 계정 개설
- 운영자용 Official_Challenge 생성 도메인 기능

## Requirements

### Requirement 1: 앱 셸과 내비게이션

**User Story:** 방문자로서, 일관된 웹 구조와 내비게이션을 사용하고 싶다. 그래야 원하는 기능을 예측 가능한 경로에서 찾을 수 있다.

#### Acceptance Criteria

1. WHEN 방문자가 Web_Layer의 페이지에 접근하면, THE Web_Layer SHALL 전역 헤더, 주 콘텐츠 영역, 현재 인증 상태에 맞는 내비게이션을 표시한다
2. WHEN 인증된 사용자가 전역 내비게이션을 사용하면, THE Web_Layer SHALL 챌린지, 내 학습, Point_Wallet, 프로필 화면으로 이동 가능한 링크를 표시한다
3. WHEN 인증되지 않은 사용자가 전역 내비게이션을 사용하면, THE Web_Layer SHALL 가입과 로그인 화면으로 이동 가능한 링크를 표시한다
4. IF 방문자가 존재하지 않는 웹 경로에 접근하면, THEN THE Web_Layer SHALL 공개 챌린지 목록으로 이동 가능한 not-found 화면을 표시한다
5. WHILE 페이지 데이터가 준비되지 않은 상태이면, THE Web_Layer SHALL 해당 화면 구조를 반영한 Loading_State를 표시한다

### Requirement 2: 계정과 세션 UX

**User Story:** 학습자로서, 가입하고 로그인 상태를 유지하고 싶다. 그래야 보호된 학습 기능을 안전하게 사용할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 유효한 가입 정보를 제출하면, THE Web_Layer SHALL Supabase_Auth 가입 결과와 다음 인증 단계를 표시한다
2. IF Supabase_Auth가 중복 이메일을 반환하면, THEN THE Web_Layer SHALL 이메일 필드와 연결된 중복 이메일 Error_State를 표시한다
3. WHEN 등록된 사용자가 유효한 로그인 정보를 제출하면, THE Web_Layer SHALL 쿠키 세션을 생성하고 원래 요청한 Protected_Route 또는 기본 대시보드로 이동시킨다
4. IF Supabase_Auth가 인증 실패를 반환하면, THEN THE Web_Layer SHALL 자격 증명 오류를 표시하고 로그인 화면을 유지한다
5. WHEN 인증된 사용자가 로그아웃을 요청하면, THE Web_Layer SHALL Supabase_Auth 세션을 종료하고 공개 챌린지 목록으로 이동시킨다
6. WHILE 유효한 세션 쿠키가 존재하면, THE Middleware SHALL 요청과 응답의 Supabase_Auth 세션을 갱신한다
7. IF 인증되지 않은 사용자가 Protected_Route에 접근하면, THEN THE Middleware SHALL 원래 경로를 복귀 경로로 보존하여 로그인 화면으로 이동시킨다
8. IF 인증되지 않은 사용자가 보호된 Server_Action을 호출하면, THEN THE Web_Layer SHALL `UNAUTHENTICATED` 결과를 반환한다

### Requirement 3: 공개 챌린지 목록과 상세

**User Story:** 방문자로서, 모집 중인 챌린지를 탐색하고 규칙을 확인하고 싶다. 그래야 참가 여부를 결정할 수 있다.

#### Acceptance Criteria

1. WHEN 방문자가 공개 챌린지 목록에 접근하면, THE Web_Layer SHALL 모집 중인 Official_Challenge와 공개 User_Challenge를 종류별로 구분해 표시한다
2. WHEN 공개 챌린지 결과가 존재하지 않으면, THE Web_Layer SHALL 조건을 변경하거나 다시 시도할 수 있는 Empty_State를 표시한다
3. WHEN 방문자가 챌린지를 선택하면, THE Web_Layer SHALL 해당 Challenge_Detail을 표시한다
4. WHILE 챌린지 모집이 마감된 상태이면, THE Web_Layer SHALL 참가 컨트롤을 비활성 상태로 표시하고 모집 마감 사유를 표시한다
5. IF 공개 챌린지 조회가 실패하면, THEN THE Web_Layer SHALL 기존 페이지 구조 안에서 재시도 가능한 Error_State를 표시한다
6. WHEN 공개 챌린지 목록이 표시되면, THE Web_Layer SHALL 각 항목에 챌린지 종류, 기간, 참가 비용, 일일 학습 시간, 모집 상태를 표시한다

### Requirement 4: 공식 챌린지 참가와 결제 UX

**User Story:** 인증된 학습자로서, 공식 챌린지 결제를 시작하고 처리 결과를 확인하고 싶다. 그래야 현금 참가 챌린지에 등록할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 모집 중인 Official_Challenge 참가를 확인하면, THE Web_Layer SHALL Payment_Adapter를 통해 Payment_Session을 요청한다
2. WHEN Payment_Session 생성이 성공하면, THE Web_Layer SHALL 사용자를 Payment_Provider 결제 URL로 이동시킨다
3. IF Payment_Session 생성이 실패하면, THEN THE Web_Layer SHALL 참가 상태를 변경하지 않고 재시도 가능한 결제 Error_State를 표시한다
4. WHEN 사용자가 결제 결과 경로로 돌아오면, THE Web_Layer SHALL 서버에서 조회한 결제 및 참가 상태를 표시한다
5. IF Core_Contract가 `DUPLICATE_PARTICIPATION`을 반환하면, THEN THE Web_Layer SHALL 이미 참가 중인 챌린지 안내와 진행 화면 링크를 표시한다
6. IF Core_Contract가 `CAPACITY_FULL`을 반환하면, THEN THE Web_Layer SHALL 모집 마감 안내를 표시하고 참가 컨트롤을 비활성화한다
7. WHERE Official_Challenge가 Point 할인을 지원하면, THE Web_Layer SHALL 적용 Point와 결제 예정 금액을 결제 확인 전에 표시한다
8. WHEN 사용자가 결제 시작을 반복 요청하면, THE Web_Layer SHALL 진행 중 요청이 완료될 때까지 추가 제출을 비활성화한다

### Requirement 5: 사용자 챌린지 개설 UX

**User Story:** 인증된 학습자로서, 규칙을 입력해 User_Challenge를 개설하고 싶다. 그래야 다른 학습자와 Point 기반 챌린지를 운영할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 User_Challenge 개설 화면에 접근하면, THE Web_Layer SHALL 제목, 설명, 기간, 일일 학습 시간, Verification_Deadline, 모집 인원, 참가 Point, 탈락 조건, 공개 범위 입력을 표시한다
2. IF 사용자가 필수 입력을 누락하면, THEN THE Web_Layer SHALL 누락된 각 입력과 연결된 오류를 표시하고 Server_Action 호출을 보류한다
3. IF 사용자가 허용 형식 또는 범위를 벗어난 값을 제출하면, THEN THE Web_Layer SHALL 유효하지 않은 각 입력과 연결된 오류를 표시한다
4. WHEN 유효한 User_Challenge 설정이 제출되면, THE Web_Layer SHALL 인증된 사용자 식별자와 검증된 입력을 Core_Adapter에 전달한다
5. WHEN Core_Adapter가 개설 성공을 반환하면, THE Web_Layer SHALL 생성된 User_Challenge 상세 화면으로 이동시킨다
6. IF Core_Adapter가 `INVALID_CONFIG`를 반환하면, THEN THE Web_Layer SHALL Core_Contract가 제공한 필드 오류를 개설 화면에 표시한다
7. THE Web_Layer SHALL User_Challenge 개설 화면에서 현금 참가비 입력을 제공하지 않는다

### Requirement 6: 사용자 챌린지 Point 참가 UX

**User Story:** 인증된 학습자로서, 보유 Point를 확인하고 User_Challenge에 참가하고 싶다. 그래야 현금 없이 학습 챌린지에 참여할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 User_Challenge 상세 화면에 접근하면, THE Web_Layer SHALL 참가 Point와 사용 가능한 Point_Wallet 잔액을 표시한다
2. WHEN 인증된 사용자가 Point 참가를 확인하면, THE Web_Layer SHALL 해당 챌린지 식별자를 Core_Adapter에 전달한다
3. WHEN Core_Adapter가 참가 성공을 반환하면, THE Web_Layer SHALL 참가 완료 상태와 챌린지 진행 화면 링크를 표시한다
4. IF Core_Adapter가 `INSUFFICIENT_POINTS`를 반환하면, THEN THE Web_Layer SHALL 필요한 Point와 현재 잔액을 포함한 부족 안내를 표시한다
5. IF Core_Adapter가 `DUPLICATE_PARTICIPATION`을 반환하면, THEN THE Web_Layer SHALL 중복 참가 안내와 기존 진행 화면 링크를 표시한다
6. IF Core_Adapter가 `CAPACITY_FULL`을 반환하면, THEN THE Web_Layer SHALL 모집 마감 안내를 표시하고 참가 컨트롤을 비활성화한다

### Requirement 7: 일일 목표와 Study_Timer

**User Story:** Participant로서, 오늘의 목표를 작성하고 학습 시간을 측정하고 싶다. 그래야 일일 인증 조건을 채울 수 있다.

#### Acceptance Criteria

1. WHEN Participant가 유효한 Daily_Goal을 제출하면, THE Web_Layer SHALL 날짜와 목표를 Core_Adapter에 전달하고 저장 결과를 표시한다
2. WHEN Participant가 Study_Timer를 시작하면, THE Web_Layer SHALL 브라우저의 단조 증가 시간 기준으로 경과 시간을 표시한다
3. WHILE Study_Timer가 실행 중인 상태이면, THE Web_Layer SHALL 시작 시각, 실행 상태, 표시 경과 시간을 Client_Component 상태로 유지한다
4. WHEN Participant가 Study_Timer 세션을 종료하면, THE Web_Layer SHALL 양의 경과 초를 Core_Adapter에 한 번 전달한다
5. IF Study_Timer 기록 요청이 실패하면, THEN THE Web_Layer SHALL 미기록 세션 시간을 보존하고 재시도 컨트롤을 표시한다
6. WHEN Core_Adapter가 누적 학습 시간을 반환하면, THE Web_Layer SHALL 일일 요구 시간 대비 누적 진행률을 표시한다
7. WHILE 누적 학습 시간이 일일 요구 시간보다 작은 상태이면, THE Web_Layer SHALL 인증 제출 컨트롤에 학습 시간 미달 상태를 표시한다
8. IF 브라우저가 새로고침되거나 절전 상태에서 복귀하면, THEN THE Web_Layer SHALL 서버에 확정된 누적 시간과 로컬 세션 상태를 구분해 표시한다

### Requirement 8: 회고, Evidence 업로드, 생존 인증

**User Story:** Participant로서, 회고와 인증 자료를 제출하고 싶다. 그래야 해당 날짜의 생존 인증을 완료할 수 있다.

#### Acceptance Criteria

1. WHEN Participant가 허용된 파일을 선택하면, THE Web_Layer SHALL 파일 유형과 크기를 검증한 뒤 비공개 evidence 버킷의 Evidence_Path로 업로드한다
2. IF 선택한 파일이 허용된 유형 또는 크기 제한을 위반하면, THEN THE Web_Layer SHALL Storage 업로드를 시작하지 않고 파일 오류를 표시한다
3. WHILE Verification_Evidence 업로드가 진행 중인 상태이면, THE Web_Layer SHALL 업로드 진행 상태를 표시하고 인증 제출을 비활성화한다
4. IF Verification_Evidence 업로드가 실패하면, THEN THE Web_Layer SHALL Retrospective 입력을 보존하고 업로드 재시도 컨트롤을 표시한다
5. WHEN Participant가 Retrospective와 업로드 완료된 Evidence_Path를 제출하면, THE Web_Layer SHALL 참가 식별자, 날짜, Retrospective, Evidence_Path를 Core_Adapter에 전달한다
6. WHEN Core_Adapter가 인증 완료를 반환하면, THE Web_Layer SHALL 해당 날짜의 인증 완료 상태와 완료 시각을 표시한다
7. IF Core_Adapter가 `STUDY_TIME_NOT_MET`을 반환하면, THEN THE Web_Layer SHALL 부족한 학습 시간 안내와 Study_Timer 이동 컨트롤을 표시한다
8. IF Core_Adapter가 `DEADLINE_EXCEEDED`를 반환하면, THEN THE Web_Layer SHALL 마감 초과 안내와 현재 Survival_Status 확인 컨트롤을 표시한다
9. IF Core_Adapter가 `NOT_ALIVE`를 반환하면, THEN THE Web_Layer SHALL 탈락 상태 안내와 사용 가능한 복구 행동을 표시한다
10. WHEN 인증 화면이 표시되면, THE Web_Layer SHALL Core_Contract가 반환한 날짜별 인증 상태를 표시한다

### Requirement 9: 생존 현황과 Leaderboard Realtime

**User Story:** Participant로서, 생존 상태와 순위 변화를 확인하고 싶다. 그래야 챌린지 진행 상황을 즉시 파악할 수 있다.

#### Acceptance Criteria

1. WHEN Participant가 챌린지 진행 화면에 접근하면, THE Web_Layer SHALL Survival_Status, 연속 인증 일수, 남은 기간, 현재 생존자 수를 표시한다
2. WHEN Participant가 Leaderboard 화면에 접근하면, THE Web_Layer SHALL 순위, 표시 이름, Survival_Status, 연속 인증 일수를 표시한다
3. WHILE Leaderboard 화면이 활성 상태이면, THE Web_Layer SHALL 해당 챌린지의 Realtime_Update를 구독한다
4. WHEN 생존 현황 Realtime_Update가 수신되면, THE Web_Layer SHALL 최신 서버 읽기 모델로 생존자 수와 Leaderboard를 갱신한다
5. IF Realtime 구독이 끊기면, THEN THE Web_Layer SHALL 마지막 갱신 시각과 재연결 상태를 표시한다
6. WHEN Leaderboard 화면이 비활성화되면, THE Web_Layer SHALL 해당 Realtime 구독을 해제한다
7. IF Realtime 기능을 사용할 수 없으면, THEN THE Web_Layer SHALL 수동 새로고침으로 최신 읽기 모델을 조회할 수 있게 한다

### Requirement 10: Point_Wallet과 Point_Ledger

**User Story:** 인증된 학습자로서, Point 잔액과 거래 사유를 확인하고 싶다. 그래야 Point의 획득과 사용을 추적할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 Point_Wallet 화면에 접근하면, THE Web_Layer SHALL 현재 Point 잔액을 표시한다
2. WHEN 인증된 사용자가 Point_Ledger 화면에 접근하면, THE Web_Layer SHALL 각 거래의 금액, 적립 또는 사용 방향, 사유, 처리 시각을 표시한다
3. WHEN Point_Ledger 거래가 존재하지 않으면, THE Web_Layer SHALL Point 획득 방법으로 이동 가능한 Empty_State를 표시한다
4. IF Point_Wallet 또는 Point_Ledger 조회가 실패하면, THEN THE Web_Layer SHALL 재시도 가능한 Error_State를 표시한다
5. THE Web_Layer SHALL Point_Wallet과 Point_Ledger를 변경하는 브라우저 직접 쓰기 컨트롤을 제공하지 않는다

### Requirement 11: 배지, Learning_Report, Surprise_Mission

**User Story:** Participant로서, 성취와 학습 결과와 돌발 미션을 확인하고 싶다. 그래야 학습 동기를 유지할 수 있다.

#### Acceptance Criteria

1. WHEN 인증된 사용자가 프로필에 접근하면, THE Web_Layer SHALL 획득한 Badge를 챌린지와 획득 시각별로 표시한다
2. WHEN 완료된 챌린지에 Learning_Report가 존재하면, THE Web_Layer SHALL 해당 Participant에게 보고서 내용을 표시한다
3. WHEN Learning_Report가 아직 생성되지 않았으면, THE Web_Layer SHALL 생성 대기 상태를 표시한다
4. WHEN 활성 Surprise_Mission Realtime_Update가 수신되면, THE Web_Layer SHALL 해당 챌린지 진행 화면에 미션 제목, 설명, 활성 기간을 표시한다
5. WHEN 활성 Surprise_Mission이 존재하지 않으면, THE Web_Layer SHALL 진행 화면의 핵심 인증 기능을 유지한다

### Requirement 12: 결제 Provider adapter와 Webhook

**User Story:** 서비스 운영자로서, 미정인 Payment_Provider를 웹 계층에서 교체 가능하게 연결하고 싶다. 그래야 Provider 선정 전후에 결제 흐름을 안정적으로 개발할 수 있다.

#### Acceptance Criteria

1. THE Web_Layer SHALL Payment_Provider별 구현과 무관한 Payment_Adapter 계약을 제공한다
2. WHEN Payment_Webhook이 수신되면, THE Route_Handler SHALL 원본 요청 본문과 Provider 헤더를 Payment_Adapter의 서명 검증에 전달한다
3. IF Payment_Adapter가 Payment_Webhook 서명을 거부하면, THEN THE Route_Handler SHALL core 도메인 함수를 호출하지 않고 HTTP 401 응답을 반환한다
4. WHEN Payment_Adapter가 승인 이벤트를 검증하면, THE Route_Handler SHALL 정규화된 결제 참조, 사용자 식별자, 챌린지 식별자, 금액을 Core_Adapter에 전달한다
5. WHEN Payment_Adapter가 실패 이벤트를 검증하면, THE Route_Handler SHALL 정규화된 실패 상태를 Core_Adapter에 전달한다
6. WHEN Core_Adapter가 이미 처리된 결제 이벤트 결과를 반환하면, THE Route_Handler SHALL 성공으로 처리된 멱등 응답을 반환한다
7. IF Payment_Webhook 처리 중 일시적 서버 오류가 발생하면, THEN THE Route_Handler SHALL Payment_Provider가 재시도할 수 있는 HTTP 5xx 응답을 반환한다
8. WHERE 실제 Payment_Provider가 구성되지 않았으면, THE Web_Layer SHALL 운영 환경의 현금 결제 시작을 비활성화하고 구성 누락 Error_State를 표시한다
9. THE Web_Layer SHALL Payment_Provider 비밀키와 Webhook 비밀값을 브라우저 번들에 포함하지 않는다

### Requirement 13: Vercel_Cron elimination과 settlement 연결

**User Story:** 서비스 운영자로서, 일일 탈락과 종료 정산을 인증된 예약 요청으로 실행하고 싶다. 그래야 core 규칙이 정해진 주기에 적용될 수 있다.

#### Acceptance Criteria

1. WHEN Vercel_Cron이 elimination 경로를 유효한 Cron_Secret으로 호출하면, THE Route_Handler SHALL 요청 시각을 Core_Adapter의 일일 탈락 함수에 전달한다
2. WHEN Vercel_Cron이 settlement 경로를 유효한 Cron_Secret으로 호출하면, THE Route_Handler SHALL 정산 대상 조회 및 각 대상의 정산 호출을 Core_Adapter에 위임한다
3. IF Cron_Secret이 누락되거나 일치하지 않으면, THEN THE Route_Handler SHALL Core_Adapter를 호출하지 않고 HTTP 401 응답을 반환한다
4. WHEN Cron 작업이 성공하면, THE Route_Handler SHALL 처리 건수와 실행 식별자를 포함한 구조화된 결과를 반환한다
5. IF Core_Adapter가 `CONSERVATION_VIOLATED`를 반환하면, THEN THE Route_Handler SHALL 해당 정산 실패를 구조화된 서버 로그에 기록하고 HTTP 5xx 응답을 반환한다
6. WHEN 동일 Cron 실행이 재호출되면, THE Route_Handler SHALL Core_Contract의 멱등 또는 재실행 안전 결과를 그대로 반환한다
7. THE Web_Layer SHALL Vercel_Cron 설정에 elimination과 settlement 경로의 명시적 스케줄을 제공한다
8. THE Web_Layer SHALL Cron_Secret을 브라우저 응답과 클라이언트 로그에 포함하지 않는다

### Requirement 14: Core_Adapter와 Mock_Adapter 경계

**User Story:** 웹 개발자로서, core 기능의 완료 여부와 독립적으로 UI를 개발하고 싶다. 그래야 계약을 유지하면서 병렬 개발할 수 있다.

#### Acceptance Criteria

1. THE Web_Layer SHALL Server_Action과 Route_Handler가 Core_Contract 구현을 직접 import하지 않고 Core_Adapter 계약을 통해 호출하도록 구성한다
2. THE Core_Adapter SHALL 인증된 사용자 식별자를 브라우저 입력이 아닌 서버 세션에서 획득한다
3. WHEN Core_Contract 구현이 준비된 기능이 호출되면, THE Core_Adapter SHALL 웹 입력을 Core_Contract 입력으로 변환하고 Adapter_Result를 반환한다
4. WHERE Core_Contract 구현이 준비되지 않은 기능에 Mock_Adapter가 선택되면, THE Mock_Adapter SHALL 해당 기능의 fixture 결과 또는 명시적 `NOT_IMPLEMENTED` 상태를 반환한다
5. THE Mock_Adapter SHALL 운영 환경에서 선택되지 않도록 구성 검증 결과를 제공한다
6. WHEN Mock_Adapter 데이터가 화면에 표시되면, THE Web_Layer SHALL 개발 환경에서 mock 데이터임을 식별 가능한 표식을 표시한다
7. IF Core_Contract의 함수 시그니처 또는 Domain_Error가 변경되면, THEN THE Web_Layer SHALL Core_Adapter 계약 검사 실패를 통해 불일치를 노출한다
8. THE Web_Layer SHALL Mock_Adapter를 통해 지갑, 참가, 인증, 결제, 정산의 실제 영속 상태를 변경하지 않는다

### Requirement 15: 상태와 오류 매핑

**User Story:** 사용자로서, 작업 결과와 실패 원인을 이해하고 싶다. 그래야 다음 행동을 결정할 수 있다.

#### Acceptance Criteria

1. WHEN Server_Action이 시작되면, THE Web_Layer SHALL 해당 제출 컨트롤에 진행 상태를 표시한다
2. WHEN Server_Action이 성공하면, THE Web_Layer SHALL 영향받은 서버 데이터를 재검증하고 성공 결과를 표시한다
3. IF Server_Action이 필드 검증 오류를 반환하면, THEN THE Web_Layer SHALL 오류를 해당 입력의 접근 가능한 설명으로 표시한다
4. IF Core_Adapter가 알려진 Domain_Error를 반환하면, THEN THE Web_Layer SHALL Domain_Error별 사용자 메시지와 복구 행동을 표시한다
5. IF Core_Adapter가 알 수 없는 오류를 반환하면, THEN THE Web_Layer SHALL 내부 정보를 노출하지 않는 일반 Error_State와 추적 식별자를 표시한다
6. IF 네트워크 오류가 발생하면, THEN THE Web_Layer SHALL 사용자가 입력한 비민감 데이터를 유지하고 재시도 컨트롤을 표시한다
7. WHILE 변경 요청이 진행 중인 상태이면, THE Web_Layer SHALL 동일 작업의 중복 제출을 비활성화한다
8. WHEN Error_State가 동적으로 추가되면, THE Web_Layer SHALL 보조 기술이 오류 메시지를 인식할 수 있는 상태 알림을 제공한다

### Requirement 16: 웹 보안과 개인정보 보호

**User Story:** 사용자로서, 인증 정보와 결제 정보와 인증 자료가 웹 계층에서 안전하게 처리되기를 원한다. 그래야 민감한 학습 및 거래 데이터를 신뢰할 수 있다.

#### Acceptance Criteria

1. THE Web_Layer SHALL 서비스 역할 키, DB 연결 문자열, Payment_Provider 비밀값, Cron_Secret을 서버 전용 모듈에서만 읽는다
2. WHEN Server_Action이 보호된 변경을 수행하면, THE Web_Layer SHALL 서버 세션의 사용자 식별자와 요청 대상의 관계를 Core_Adapter에 전달해 권한 검증을 요청한다
3. WHEN Route_Handler가 외부 요청을 처리하면, THE Web_Layer SHALL 요청 출처별 서명 또는 비밀값 검증을 완료한 후 Core_Adapter를 호출한다
4. THE Web_Layer SHALL 사용자 제공 문자열을 실행 가능한 HTML로 렌더링하지 않는다
5. WHEN Verification_Evidence 열람이 허용되면, THE Web_Layer SHALL 만료 시간이 있는 서버 생성 접근 URL을 사용한다
6. THE Web_Layer SHALL Payment_Webhook 원본 본문, 인증 토큰, 비밀값, Verification_Evidence 내용을 애플리케이션 로그에 기록하지 않는다
7. IF 업로드 파일 이름에 경로 구분자가 포함되면, THEN THE Web_Layer SHALL 서버 생성 file_id를 사용해 Evidence_Path를 구성한다
8. THE Web_Layer SHALL 사용자 주도 도메인 상태 변경에 GET 요청을 사용하지 않으며, 유효한 Cron_Secret으로 인증된 Vercel_Cron 호출만 예외로 한다

### Requirement 17: 접근성과 반응형 UI

**User Story:** 다양한 기기와 보조 기술을 사용하는 사용자로서, 모든 핵심 흐름을 조작하고 이해하고 싶다. 그래야 환경과 능력에 관계없이 챌린지에 참여할 수 있다.

#### Acceptance Criteria

1. THE Web_Layer SHALL 모든 입력에 프로그램적으로 연결된 레이블과 오류 설명을 제공한다
2. THE Web_Layer SHALL 모든 핵심 작업을 키보드만으로 수행할 수 있게 한다
3. WHEN 키보드 사용자가 상호작용 요소에 포커스하면, THE Web_Layer SHALL 식별 가능한 포커스 표시를 제공한다
4. WHEN 모달 또는 대화상자가 열리면, THE Web_Layer SHALL 포커스를 대화상자 안으로 이동시키고 닫힐 때 호출 요소로 복원한다
5. THE Web_Layer SHALL 텍스트와 대화형 요소의 색상 대비를 WCAG 2.2 AA 기준에 맞춘다
6. WHEN 상태가 색상으로 구분되면, THE Web_Layer SHALL 색상 외의 텍스트 또는 아이콘 정보를 함께 제공한다
7. WHILE 뷰포트 너비가 320 CSS 픽셀 이상이면, THE Web_Layer SHALL 핵심 흐름을 가로 스크롤 없이 제공한다
8. WHEN 사용자가 텍스트를 200%까지 확대하면, THE Web_Layer SHALL 핵심 콘텐츠와 컨트롤을 손실 없이 제공한다
9. WHERE 사용자가 동작 감소 환경설정을 사용하면, THE Web_Layer SHALL 필수적이지 않은 애니메이션을 제거한다
10. WHEN 비동기 상태가 변경되면, THE Web_Layer SHALL 보조 기술에 변경 결과를 알린다

### Requirement 18: 공유 파일과 인프라 소유권

**User Story:** 개발팀으로서, core와 web 작업의 파일 충돌과 인프라 오작동을 줄이고 싶다. 그래야 두 스펙을 병렬로 구현할 수 있다.

#### Acceptance Criteria

1. THE Web_Layer SHALL 웹 전용 코드를 App Router, 웹 컴포넌트, 웹 adapter, 웹 테스트 디렉터리에 한정한다
2. WHEN 웹 구현에 새 의존성이 필요하면, THE Web_Layer SHALL package manifest와 lockfile 변경을 하나의 소유권 작업으로 묶는다
3. WHEN 웹 구현에 TypeScript 설정 변경이 필요하면, THE Web_Layer SHALL 기존 core 컴파일 범위를 보존하는 추가 설정만 적용한다
4. WHEN 웹 구현에 환경변수가 필요하면, THE Web_Layer SHALL 비밀값 없이 변수 이름과 용도를 `.env.example`에 추가한다
5. THE Web_Layer SHALL core 소유의 `src/db`, Drizzle 마이그레이션, Supabase migration, RLS 정의 파일을 수정하지 않는다
6. THE Web_Layer SHALL 원격 Supabase migration, 원격 DB reset, 원격 데이터 삭제 명령을 실행하지 않는다
7. IF 웹 구현에 DB 또는 RLS 변경이 필요하면, THEN THE Web_Layer SHALL core 스펙 변경 요청으로 기록하고 웹 코드에서 우회 구현하지 않는다
8. WHEN 공유 파일 변경이 core 작업과 충돌하면, THE Web_Layer SHALL core 변경을 먼저 통합한 뒤 웹 변경을 재적용한다

### Requirement 19: 웹 계층 검증 가능성

**User Story:** 개발팀으로서, 사용자 흐름과 adapter 경계를 자동으로 검증하고 싶다. 그래야 core를 재구현하지 않고 웹 회귀를 방지할 수 있다.

#### Acceptance Criteria

1. WHEN 공개 챌린지 화면 테스트가 실행되면, THE Web_Layer SHALL 목록, 상세, Loading_State, Empty_State, Error_State를 결정적 fixture로 검증 가능하게 한다
2. WHEN 인증 흐름 테스트가 실행되면, THE Web_Layer SHALL 가입, 로그인, 로그아웃, Protected_Route 복귀를 격리된 Supabase_Auth 대역으로 검증 가능하게 한다
3. WHEN Server_Action 테스트가 실행되면, THE Web_Layer SHALL 입력 검증, 세션 사용자 주입, Domain_Error 매핑을 Mock_Adapter로 검증 가능하게 한다
4. WHEN Verification_Evidence 테스트가 실행되면, THE Web_Layer SHALL 파일 검증, Evidence_Path 구성, 업로드 실패 복구를 Storage 대역으로 검증 가능하게 한다
5. WHEN Realtime 테스트가 실행되면, THE Web_Layer SHALL 구독, 갱신, 재연결, 구독 해제를 Realtime 대역으로 검증 가능하게 한다
6. WHEN Payment_Webhook 테스트가 실행되면, THE Web_Layer SHALL 유효 서명, 무효 서명, 중복 이벤트, 일시적 실패를 Payment_Adapter 대역으로 검증 가능하게 한다
7. WHEN Cron Route_Handler 테스트가 실행되면, THE Web_Layer SHALL 유효 Cron_Secret, 무효 Cron_Secret, core 성공, core 실패를 Core_Adapter 대역으로 검증 가능하게 한다
8. WHEN 접근성 테스트가 실행되면, THE Web_Layer SHALL 핵심 페이지의 이름 있는 컨트롤, 레이블, 키보드 포커스, 상태 알림을 자동 검사 가능하게 한다
