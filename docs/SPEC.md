# SPEC.md

> IRIS MVP 기능 요구사항 및 동작 명세를 정리한 문서입니다.

---

# 1. MVP 목표

IRIS는 대학 공지를 반복해서 확인해야 하는 불편함을 줄이기 위해, 공지 사이트를 주기적으로 확인하고 필요한 공지를 Discord에서 편리하게 받을 수 있는 서비스를 목표로 합니다.

---

# 2. MVP 범위

## Landing

- 서비스 소개
- Discord Bot 초대 (초대링크 존재)
- 시작 가이드

## Admin

- 공지 사이트 등록
- 테스트 크롤링
- 카테고리 설정

## Discord

- /help
- /setup
- /subscribe
- /keyword

## System

- 공지 크롤링
- Discord 알림
- 키워드 DM 알림

---

# 3. Functional Requirements

## 3.1 Landing

### 서비스 소개

- 서비스 소개
- 핵심 기능 소개
- Discord Bot 초대 버튼 제공
- 시작 가이드 버튼 제공

### Discord Bot 초대

**동작**

- Discord OAuth 초대 페이지로 이동

### 시작 가이드

**동작**

- 시작 가이드 버튼은 별도 페이지나 모달을 열지 않고 랜딩의 카드 영역을 시작 가이드 단계로 전환한다.
- 시작 가이드 표시 중 버튼 문구는 `기능 소개`로 변경한다.
- `기능 소개` 버튼을 누르면 카드 영역을 핵심 기능 소개로 되돌린다.

**표시**

- 봇 초대하기: 랜딩의 Discord Bot 초대 버튼으로 IRIS Bot을 서버에 추가
- 권한 승인: Discord 안내에 따라 서버와 Bot 권한 승인
- /setup 입력: 봇을 초대한 서버에서 관리자 권한으로 `/setup` 명령어 입력
- 관리자 페이지 접속: Bot이 제공한 링크로 관리자 설정 페이지 접속

---

## 3.2 관리자 페이지

### 공지 사이트 등록

**입력**

- 사이트 이름
- 공지 URL
- List Selector
- Title Selector
- Link Selector
- Date Selector
- Category Selector
- Category List Selector

**기능**

- Selector 가이드 버튼
- 개발자에게 요청 버튼
- 테스트 크롤링
- 최근 공지 미리보기
- 다음 버튼

**검증**

- 테스트 크롤링은 최신 공지를 1개 이상 가져오면 성공
- 각 공지는 title, link, date, category를 모두 포함해야 함
- 공지별 category가 없거나 전체 카테고리 목록에서 감지된 카테고리가 0개면 실패
- 테스트 크롤링 성공 전에는 다음 단계로 이동할 수 없음

---

### 카테고리 설정

**표시**

감지된 카테고리 목록

**설정 항목**

- Discord Channel
- Role 이름
- 활성화 여부

**동작**

- Discord Channel은 기존 채널 목록에서 선택
- IRIS는 MVP에서 Discord Channel을 자동 생성하지 않음
- 활성화된 카테고리의 Role은 사용자가 입력한 이름으로 IRIS가 자동 생성
- 비활성화된 카테고리는 Role을 생성하지 않고 roleId를 null로 저장
- 활성화된 카테고리만 /subscribe, 공지 저장, 공지 알림 대상이 됨

**기능**

- 이전
- 저장
- 다음

---

### 설정 완료

**표시**

- 설정 완료 안내
- 사용 가능한 명령어

**기능**

- 첫 페이지로 이동

---

## 3.3 Discord

### /help

**기능**

- 사용 가능한 명령어 안내
- Ephemeral 응답
- 관리자 전용 명령어 표시

---

### /setup

**기능**

- 관리자 권한 확인
- 관리자이면 관리자 페이지 링크 제공
- MVP에서는 관리자 페이지 링크에 별도 인증 토큰을 포함하지 않음
- 응답은 Ephemeral로 제공

---

### /subscribe

**기능**

- 활성화된 카테고리 조회
- Discord multi-select component로 카테고리 구독 상태 표시
- 선택된 카테고리는 구독
- 선택 해제된 카테고리는 구독 해제
- Discord Role 자동 부여
- Discord Role 자동 제거

---

### /keyword

**지원 명령어**

- add
- remove
- list

---

## 3.4 System

### 공지 크롤링

**기능**

- 등록된 사이트 주기적 크롤링
- MVP 기본 주기 30분
- 신규 공지 확인
- noticeSiteId와 normalizedLink 기반 hashKey 중복 검사

---

### Discord 알림

**기능**

- 카테고리별 채널 전송
- Discord Role Mention
- Embed 메시지
- 제목, 날짜, 원본 링크 포함

---

### 키워드 알림

**기능**

- 제목 기준 키워드 검사
- 일치 시 사용자 DM 전송
- 원본 링크 포함

---

### Bot 제거 정책

- 관리자가 설정 삭제 후 Bot을 제거하는 것을 권장합니다.
- Bot이 먼저 제거되면 `guildDelete` 이벤트를 통해 해당 서버의 DB 데이터를 자동으로 삭제합니다.
- Bot이 이미 제거된 상태에서는 Discord Role을 삭제할 수 없습니다.

---

### AI 공지 요약

**MVP 정책**

- 1차 MVP 필수 기능은 아님
- 확장 가능한 구조만 준비
- 기본 알림에서는 요약을 자동 생성하지 않음
- 사용자가 요약 버튼을 눌렀을 때만 AI 요약 생성
- 불필요한 토큰 소비를 줄이기 위해 요청 기반으로 동작
- 요약 생성 실패 시 원본 공지 정보만 유지

**기능**

- 공지 알림 Embed에 요약 보기 버튼 제공 가능
- 버튼 클릭 시 공지 상세 본문을 기반으로 AI 요약 생성
- 생성된 요약은 사용자에게 Ephemeral 응답 또는 후속 메시지로 제공
- 생성된 요약은 재사용할 수 있도록 저장 가능

---

# 4. Out of Scope

현재 MVP에서는 구현하지 않습니다.

- AI Selector 추천
- 여러 공지 사이트 등록
- 관리자 Dashboard
- Google Calendar 연동
- 공지 마감일 추출 및 재알림
- 알림 시점의 자동 AI 요약 생성

---

# 5. Future Enhancements

- AI Selector 추천
- Multi-site 지원
- Dashboard
- Google Calendar 연동
- AI 기반 마감일 추출 및 재알림
