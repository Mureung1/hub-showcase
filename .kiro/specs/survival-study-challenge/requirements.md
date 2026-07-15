# Requirements Document

## Introduction

서바이벌 스터디 챌린지(Survival Study Challenge)는 사용자가 참가비(현금) 또는 포인트를 예치하고, 정해진 기간 동안 매일 일정 학습 시간을 채워 인증해야 생존하는 서바이벌형 학습 챌린지 웹서비스이다. 인증에 실패하면 탈락하고 예치한 참가비 또는 포인트를 잃으며, 완주하면 환급금과 추가 보상을 받는다.

서비스는 두 종류의 챌린지를 제공한다. 운영팀이 직접 개설하는 공식 챌린지(현금 참가비 기반)와 사용자가 직접 주제·규칙을 정해 개설하는 사용자 챌린지(서비스 포인트 기반)이다. 사용자는 완주·연속 인증·회고 작성·친구 초대 등으로 포인트를 획득하고, 이 포인트로 새 챌린지에 참가하거나 챌린지를 개설하며 서비스를 지속 이용한다.

이 문서는 계정 관리, 챌린지 개설·탐색·참가, 결제·포인트 예치, 일일 학습 인증(타이머·목표·회고·인증 자료), 생존/탈락 처리, 환급·보상·포인트 분배, 포인트 획득·사용, 게임화 요소(생존 상태·순위·배지·돌발 미션)에 대한 요구사항을 정의한다.

## Glossary

- **Challenge_Service**: 챌린지 개설, 참가, 인증, 정산을 총괄하는 핵심 시스템 컴포넌트
- **Official_Challenge**: 운영팀이 개설하고 현금 참가비 기반으로 운영되는 챌린지
- **User_Challenge**: 일반 사용자가 개설하고 서비스 포인트 기반으로 운영되는 챌린지
- **Participant**: 챌린지에 참가비 또는 포인트를 예치하고 참가한 사용자
- **Host**: User_Challenge를 개설한 사용자
- **Operator**: 서비스 운영팀 권한을 가진 사용자
- **Verification_Service**: 일일 학습 인증(타이머, 목표, 회고, 인증 자료)을 처리하는 시스템 컴포넌트
- **Study_Timer**: 사용자의 실제 학습 시간을 측정하는 웹 기반 타이머
- **Daily_Goal**: 참가자가 매일 작성하는 오늘의 학습 목표
- **Retrospective**: 참가자가 학습 후 제출하는 회고 기록
- **Verification_Evidence**: 인증을 위해 제출하는 학습 자료(회고, 스크린샷 등)
- **Verification_Deadline**: 해당 날짜의 인증을 완료해야 하는 마감 시각
- **Survival_Status**: 참가자가 현재 생존 중인지 탈락했는지를 나타내는 상태
- **Elimination**: 인증 실패 등 탈락 조건 충족 시 참가자가 챌린지에서 제거되는 처리
- **Entry_Fee**: Official_Challenge 참가 시 예치하는 현금 참가비
- **Point**: 서비스 내부 가상 화폐로, User_Challenge 참가·개설 및 각종 혜택에 사용
- **Point_Wallet**: 사용자의 포인트 잔액을 보관하는 계정
- **Deposit**: 챌린지 참가 시 예치하는 참가비 또는 포인트
- **Refund**: 완주자에게 지급되는 기본 환급금
- **Reward_Pool**: 탈락자의 참가비/포인트 중 완주자 보상에 사용되는 재원
- **Service_Fee**: 운영 수수료
- **Revival_Ticket**: 탈락한 참가자가 챌린지에 복귀할 수 있게 하는 아이템
- **Badge**: 완주 등 성취에 대해 지급되는 프로필 배지
- **Learning_Report**: 챌린지 종료 후 참가자에게 제공되는 학습 리포트
- **Leaderboard**: 챌린지 참가자의 생존 상태 및 순위 정보
- **Payment_Service**: 현금 결제 및 환불을 처리하는 시스템 컴포넌트
- **Streak**: 연속으로 인증에 성공한 일수
- **Surprise_Mission**: 챌린지 진행 중 돌발적으로 부여되는 추가 미션

## Requirements

### Requirement 1: 사용자 계정 관리

**User Story:** 학습자로서, 계정을 생성하고 로그인하고 싶다. 그래야 챌린지 참가 이력과 포인트를 안전하게 관리할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 유효한 가입 정보를 제출하면, THE Challenge_Service SHALL 신규 계정을 생성하고 잔액이 0인 Point_Wallet을 함께 생성한다
2. IF 사용자가 이미 등록된 이메일로 가입을 시도하면, THEN THE Challenge_Service SHALL 중복 이메일 오류 메시지를 반환한다
3. WHEN 등록된 사용자가 올바른 인증 정보로 로그인하면, THE Challenge_Service SHALL 인증된 세션을 생성한다
4. IF 사용자가 잘못된 인증 정보로 로그인을 시도하면, THEN THE Challenge_Service SHALL 인증 실패 메시지를 반환하고 세션을 생성하지 않는다
5. THE Challenge_Service SHALL 인증되지 않은 사용자의 챌린지 참가, 개설, 인증, 포인트 사용 요청을 거부한다

### Requirement 2: 공식 챌린지 탐색

**User Story:** 학습자로서, 운영팀이 개설한 공식 챌린지 목록과 상세 정보를 보고 싶다. 그래야 참가 여부를 결정할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 메인 화면에 접근하면, THE Challenge_Service SHALL 참가 모집 중인 Official_Challenge 목록을 표시한다
2. WHEN 사용자가 특정 Official_Challenge를 선택하면, THE Challenge_Service SHALL 진행 기간, Entry_Fee, 일일 학습 시간, 인증 조건, 현재 참가자 수, 예상 보상을 표시한다
3. WHILE Official_Challenge의 모집이 마감된 상태이면, THE Challenge_Service SHALL 해당 챌린지의 참가 신청 기능을 비활성화 상태로 표시한다

### Requirement 3: 공식 챌린지 참가 및 결제

**User Story:** 학습자로서, 현금 참가비를 결제하고 공식 챌린지에 참가하고 싶다. 그래야 금전적 책임감으로 학습을 지속할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 Official_Challenge 참가를 요청하고 Payment_Service가 Entry_Fee 결제를 승인하면, THE Challenge_Service SHALL 해당 사용자를 Participant로 등록하고 Survival_Status를 생존으로 설정한다
2. IF Payment_Service가 Entry_Fee 결제를 거부하면, THEN THE Challenge_Service SHALL 참가를 완료하지 않고 결제 실패 메시지를 반환한다
3. IF 사용자가 이미 참가한 Official_Challenge에 다시 참가를 요청하면, THEN THE Challenge_Service SHALL 중복 참가 오류를 반환한다
4. IF 모집 인원이 마감된 Official_Challenge에 참가를 요청하면, THEN THE Challenge_Service SHALL 참가를 거부하고 모집 마감 메시지를 반환한다
5. WHEN Participant의 결제가 완료되면, THE Challenge_Service SHALL 결제 금액과 일시를 포함한 결제 내역을 기록한다

### Requirement 4: 사용자 챌린지 개설

**User Story:** 학습자로서, 원하는 주제와 규칙으로 직접 챌린지를 개설하고 싶다. 그래야 친구나 스터디원, 익명 사용자와 함께 소규모 챌린지를 운영할 수 있다.

#### Acceptance Criteria

1. WHEN Host가 진행 기간, 일일 학습 시간, Verification_Deadline, 모집 인원, 참가 Point, 탈락 조건, 공개 범위를 포함한 유효한 챌린지 설정을 제출하면, THE Challenge_Service SHALL 해당 설정으로 User_Challenge를 생성한다
2. IF Host가 필수 설정 항목 중 하나라도 누락한 채 개설을 요청하면, THEN THE Challenge_Service SHALL 누락된 항목을 명시한 오류를 반환하고 챌린지를 생성하지 않는다
3. IF Host의 개설 설정 값이 허용 범위를 벗어나면, THEN THE Challenge_Service SHALL 유효하지 않은 설정 오류를 반환한다
4. THE Challenge_Service SHALL User_Challenge를 Point 기반으로만 운영하고 현금 참가비를 허용하지 않는다
5. WHERE User_Challenge의 공개 범위가 전체 공개로 설정되면, THE Challenge_Service SHALL 해당 챌린지를 공개 목록에 노출한다

### Requirement 5: 사용자 챌린지 참가 및 포인트 예치

**User Story:** 학습자로서, 보유 포인트를 예치하고 사용자 챌린지에 참가하고 싶다. 그래야 현금 없이도 챌린지에 도전할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 User_Challenge 참가를 요청하고 Point_Wallet 잔액이 참가 Point 이상이면, THE Challenge_Service SHALL 참가 Point를 Deposit으로 차감하고 해당 사용자를 Participant로 등록한다
2. IF 사용자의 Point_Wallet 잔액이 참가 Point 미만이면, THEN THE Challenge_Service SHALL 참가를 거부하고 포인트 부족 메시지를 반환한다
3. IF 모집 인원이 마감된 User_Challenge에 참가를 요청하면, THEN THE Challenge_Service SHALL 참가를 거부하고 모집 마감 메시지를 반환한다
4. IF 사용자가 이미 참가한 User_Challenge에 다시 참가를 요청하면, THEN THE Challenge_Service SHALL 중복 참가 오류를 반환한다

### Requirement 6: 일일 학습 목표 및 타이머

**User Story:** 참가자로서, 매일 학습 목표를 작성하고 웹 타이머로 학습 시간을 측정하고 싶다. 그래야 요구된 학습 시간을 채웠음을 기록할 수 있다.

#### Acceptance Criteria

1. WHEN Participant가 해당 날짜에 Daily_Goal을 제출하면, THE Verification_Service SHALL 해당 날짜의 Daily_Goal을 기록한다
2. WHEN Participant가 Study_Timer를 시작하면, THE Study_Timer SHALL 경과 학습 시간을 측정한다
3. WHILE Study_Timer가 실행 중인 상태이면, THE Verification_Service SHALL 해당 세션의 누적 학습 시간을 갱신한다
4. WHEN Participant의 해당 날짜 누적 학습 시간이 챌린지의 일일 학습 시간에 도달하면, THE Verification_Service SHALL 해당 날짜의 학습 시간 조건을 충족으로 표시한다

### Requirement 7: 일일 생존 인증

**User Story:** 참가자로서, 학습 시간을 채운 뒤 회고와 인증 자료를 제출해 생존 인증을 완료하고 싶다. 그래야 해당 날짜에 탈락하지 않고 생존할 수 있다.

#### Acceptance Criteria

1. WHEN Participant가 해당 날짜의 학습 시간 조건을 충족한 상태에서 Retrospective와 Verification_Evidence를 Verification_Deadline 이전에 제출하면, THE Verification_Service SHALL 해당 날짜의 생존 인증을 완료로 기록한다
2. IF Participant가 학습 시간 조건을 충족하지 않은 상태에서 인증을 제출하면, THEN THE Verification_Service SHALL 인증을 거부하고 학습 시간 미달 메시지를 반환한다
3. IF Participant가 Verification_Deadline 이후에 인증을 제출하면, THEN THE Verification_Service SHALL 해당 인증을 마감 초과로 거부한다
4. THE Verification_Service SHALL 각 Participant의 날짜별 인증 완료 상태를 기록한다

### Requirement 8: 생존 및 탈락 처리

**User Story:** 참가자로서, 인증 실패 시 명확하게 탈락 처리되기를 원한다. 그래야 서바이벌 규칙이 공정하게 적용됨을 신뢰할 수 있다.

#### Acceptance Criteria

1. WHEN 해당 날짜의 Verification_Deadline이 경과했고 Participant가 그날의 생존 인증을 완료하지 않았으면, THE Challenge_Service SHALL 해당 Participant의 Survival_Status를 탈락으로 변경한다
2. WHEN Participant가 탈락 처리되면, THE Challenge_Service SHALL 해당 Participant의 Deposit을 상실 처리하고 Reward_Pool에 편입한다
3. WHILE Participant의 Survival_Status가 탈락인 상태이면, THE Verification_Service SHALL 해당 Participant의 이후 일일 인증 제출을 거부한다
4. WHEN 챌린지가 최종일까지 진행되어 종료되면, THE Challenge_Service SHALL 최종일까지 Survival_Status가 생존인 Participant를 완주자로 확정한다

### Requirement 9: 공식 챌린지 환급 및 보상

**User Story:** 완주한 참가자로서, 기본 환급금과 추가 보상을 받고 싶다. 그래야 완주에 대한 실질적 보상을 얻을 수 있다.

#### Acceptance Criteria

1. WHEN Official_Challenge가 종료되고 완주자가 확정되면, THE Challenge_Service SHALL 각 완주자에게 기본 Refund를 지급한다
2. WHEN Official_Challenge가 종료되면, THE Challenge_Service SHALL 탈락자의 Entry_Fee 중 Service_Fee를 제외한 금액을 완주자에게 추가 보상으로 분배한다
3. WHEN 완주자가 확정되면, THE Challenge_Service SHALL 각 완주자에게 완주 Badge와 Learning_Report를 지급한다
4. THE Challenge_Service SHALL 완주자에게 분배되는 추가 보상 총액이 Reward_Pool에서 Service_Fee를 제외한 금액을 초과하지 않도록 한다

### Requirement 10: 사용자 챌린지 포인트 분배

**User Story:** 사용자 챌린지 완주자로서, 종료 후 규칙에 따라 포인트를 분배받고 싶다. 그래야 완주에 대한 포인트 보상을 얻을 수 있다.

#### Acceptance Criteria

1. WHEN User_Challenge가 종료되고 완주자가 확정되면, THE Challenge_Service SHALL Reward_Pool에 모인 Point를 챌린지의 분배 규칙에 따라 완주자의 Point_Wallet에 분배한다
2. THE Challenge_Service SHALL 완주자에게 분배되는 Point 총액이 Reward_Pool의 Point 총액을 초과하지 않도록 한다
3. IF User_Challenge 종료 시 완주자가 존재하지 않으면, THEN THE Challenge_Service SHALL 챌린지의 규칙에 정의된 미완주 처리 방식에 따라 Reward_Pool의 Point를 처리한다
4. WHEN User_Challenge가 종료되면, THE Challenge_Service SHALL 각 완주자에게 완주 Badge를 지급한다

### Requirement 11: 포인트 획득

**User Story:** 학습자로서, 완주와 학습 활동으로 포인트를 얻고 싶다. 그래야 얻은 포인트로 서비스를 지속 이용할 수 있다.

#### Acceptance Criteria

1. WHEN Participant가 챌린지를 완주하면, THE Challenge_Service SHALL 완주 보상 Point를 해당 사용자의 Point_Wallet에 적립한다
2. WHEN Participant의 Streak가 챌린지에 정의된 연속 인증 보상 기준에 도달하면, THE Challenge_Service SHALL 연속 인증 보상 Point를 적립한다
3. WHEN Participant가 Retrospective를 제출하면, THE Challenge_Service SHALL 회고 작성 보상 Point를 적립한다
4. WHEN 초대받은 사용자가 초대 링크를 통해 신규 계정을 생성하면, THE Challenge_Service SHALL 초대한 사용자에게 친구 초대 보상 Point를 적립한다
5. WHEN Point가 적립되면, THE Challenge_Service SHALL 적립 사유와 금액을 포함한 포인트 거래 내역을 기록한다

### Requirement 12: 포인트 사용

**User Story:** 학습자로서, 보유 포인트를 다양한 용도로 사용하고 싶다. 그래야 포인트 획득과 사용이 순환하는 구조에서 서비스를 지속 이용할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 Point 사용을 요청하고 Point_Wallet 잔액이 사용 금액 이상이면, THE Challenge_Service SHALL 해당 금액을 Point_Wallet에서 차감하고 요청한 항목을 제공한다
2. IF 사용자의 Point_Wallet 잔액이 사용 요청 금액 미만이면, THEN THE Challenge_Service SHALL 사용을 거부하고 포인트 부족 메시지를 반환한다
3. WHERE 사용자가 Official_Challenge 참가 시 Point 할인을 적용하면, THE Challenge_Service SHALL 할인에 사용된 Point만큼 Entry_Fee를 차감한다
4. WHEN 사용자가 Revival_Ticket을 구매하여 탈락한 챌린지에 복귀를 요청하면, THE Challenge_Service SHALL 해당 Participant의 Survival_Status를 생존으로 복원한다
5. WHEN Point가 사용되면, THE Challenge_Service SHALL 사용 사유와 금액을 포함한 포인트 거래 내역을 기록한다

### Requirement 13: 게임화 및 진행 현황

**User Story:** 참가자로서, 나의 생존 상태와 순위, 참가자 감소 현황을 확인하고 싶다. 그래야 학습을 게임처럼 경험하며 동기를 유지할 수 있다.

#### Acceptance Criteria

1. WHEN Participant가 챌린지 진행 화면에 접근하면, THE Challenge_Service SHALL 해당 Participant의 Survival_Status, Streak, 남은 기간을 표시한다
2. WHEN Participant가 Leaderboard에 접근하면, THE Challenge_Service SHALL 현재 생존자 수와 참가자 순위를 표시한다
3. WHEN 챌린지 진행 중 Surprise_Mission이 발생하면, THE Challenge_Service SHALL 해당 미션을 챌린지 진행 중인 Participant에게 표시한다
4. WHEN Participant가 완주 Badge를 획득하면, THE Challenge_Service SHALL 해당 Badge를 사용자 프로필에 표시한다

### Requirement 14: 참가비 및 포인트 예치 무결성

**User Story:** 서비스 운영자로서, 예치·분배된 자원의 총량이 정확히 보존되기를 원한다. 그래야 정산 분쟁 없이 신뢰할 수 있는 서비스를 운영할 수 있다.

#### Acceptance Criteria

1. THE Challenge_Service SHALL 챌린지 종료 시 분배된 Refund, 추가 보상, Service_Fee의 합이 참가자가 예치한 Deposit 총액과 일치하도록 한다
2. WHEN 포인트 거래가 처리되면, THE Challenge_Service SHALL Point_Wallet의 잔액이 음수가 되지 않도록 한다
3. IF 결제 또는 포인트 차감 처리 중 오류가 발생하면, THEN THE Challenge_Service SHALL 해당 거래를 취소하고 잔액을 거래 이전 상태로 유지한다
