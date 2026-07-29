# ARCHITECTURE.md

> IRIS MVP의 시스템 구성, 컴포넌트 책임, 주요 실행 흐름을 정리한 문서입니다.

---

# 1. System Overview

IRIS는 Discord 서버별로 하나의 대학 공지 사이트를 등록하고, 30분마다 공지를 확인해 Discord 채널 알림과 사용자 DM 알림을 제공한다.

```text
관리자 페이지
  -> Backend REST API
  -> MySQL

Discord 슬래시 명령어
  -> Discord Bot
  -> Backend 서비스
  -> MySQL
  -> Discord API

Scheduler
  -> Crawler
  -> 공지 중복 검사
  -> 알림 서비스
  -> Discord API
```

**Runtime Components**

- Admin Web: React/Vite 기반 관리자 설정 UI
- Backend API: Express 기반 REST API
- Discord Bot: discord.js 기반 슬래시 명령어와 interaction 처리
- Scheduler: node-cron 기반 30분 주기 작업 실행
- Crawler: Axios/Cheerio 기반 공지 목록 추출
- Database: MySQL + Prisma
- Summary Service: 향후 AI 요약 버튼 기능을 위한 확장 컴포넌트

---

# 2. Architecture Boundaries

- MVP에서는 Discord 서버 1개당 공지 사이트 1개만 등록한다.
- Admin 페이지는 MVP에서 별도 로그인이나 토큰 검증을 하지 않는다.
- `/setup`은 Discord interaction에서 관리자 권한만 확인하고 관리자 바로가기 버튼을 제공한다.
- Discord 채널은 IRIS가 자동 생성하지 않고 기존 채널을 선택한다.
- MVP 알림은 카테고리별 채널이 아니라 하나의 공통 알림 채널로 보낸다.
- 현재 DB/API는 기존 `categories.channelId`를 유지하며, 관리자 페이지가 모든 카테고리에 같은 알림 채널 id를 저장한다.
- 활성화된 카테고리에만 Discord 역할을 생성한다.
- IRIS는 기존 Discord 역할을 재사용하지 않는다. 같은 이름의 역할이 이미 있으면 저장을 실패 처리하고 관리자에게 다른 역할 이름을 입력하게 한다.
- 새로 생성하는 Discord 역할은 별도 색상을 지정하지 않고 Discord 기본 색상을 사용한다.
- 비활성화된 카테고리는 `roleId = null`로 저장하고 구독 목록, 공지 저장, 알림 대상에서 제외한다.
- `전체` 카테고리는 공지 저장용 카테고리가 아니라 전체 공지 구독 역할로 사용한다. 실제 공지는 감지된 원래 카테고리에 저장한다.
- AI 요약은 기본 알림 시점에 자동 생성하지 않고, 요약 버튼 클릭 시에만 실행하는 확장 기능으로 둔다.

---

# 3. Component Responsibilities

## Admin Web

- 공지 사이트 URL과 selector 입력
- 테스트 크롤링 실행
- 최근 공지 미리보기와 전체 카테고리 목록 표시
- 공통 알림 채널, 카테고리별 역할 이름, 활성화 여부 설정
- 전체 설정 생성, 조회, 교체, 카테고리 부분 수정, 삭제 요청

## Backend API

- 관리자 페이지 요청 검증
- 테스트 크롤링 실행 및 결과 반환
- 공지 사이트와 카테고리 설정 저장
- Discord 채널 목록 조회
- Discord 역할 생성, 이름 변경, 삭제 흐름 제어
- 설정 삭제 시 관련 DB 데이터 정리

## Discord Bot

- `/help`, `/guide`, `/setup`, `/subscribe`, `/keyword` 처리
- `/setup` 실행자의 서버 관리자 권한 확인
- `/subscribe` 카테고리 버튼 interaction 처리
- 구독 변경에 따른 Discord 역할 부여/제거
- Bot 제거 시 `guildDelete` 이벤트를 받아 해당 서버 DB 데이터 정리
- 사용자 서버 이탈 시 `guildMemberRemove` 이벤트를 받아 해당 사용자의 구독과 키워드 정리

## Crawler And Scheduler

- 공지 사이트 설정 저장 또는 교체 직후 해당 사이트 즉시 초기 수집
- 30분마다 등록된 공지 사이트 순회
- selector 기반 공지 목록과 전체 카테고리 목록 추출
- `title`, `link`, `date`, `category` 필수 검증
- 링크 정규화와 `hashKey` 생성
- 신규 공지 중복 검사
- 해당 사이트에 저장된 공지가 0개인 초기 수집은 기준 데이터 저장만 수행하고 Discord 알림은 보내지 않음

## Notification Service

- 활성화된 카테고리의 공지만 저장 및 알림 처리
- 공통 알림 채널에 Embed 전송
- 실제 공지 카테고리 역할과 활성화된 `전체` 역할을 mention 대상에 포함
- 공지 제목 기준 키워드 매칭
- 키워드 일치 사용자에게 DM 전송

## Summary Service

- 1차 MVP 필수 구현 대상은 아니다.
- MVP 현재 요약 버튼은 준비 중 Ephemeral 안내만 반환한다.
- 향후 공지 알림의 요약 버튼 클릭 시 실행한다.
- 향후 기존 summary가 있으면 재사용한다.
- 향후 summary가 없으면 공지 상세 본문을 가져와 AI 요약을 생성하고 저장한다.

---

# 4. Data Ownership

- `notice_sites.guild_id`: Discord 서버별 공지 사이트 설정 기준
- `categories`: 감지 카테고리와 Discord 알림 채널/역할 연결 정보
- `notices`: 크롤링된 공지, 중복 검사, 요청 기반 요약 저장
- `subscriptions`: 사용자별 카테고리 구독 상태
- `keywords`: 서버별 사용자 키워드 설정

**Key Rules**

- 서버당 공지 사이트 1개는 `notice_sites.guild_id` unique 제약으로 보장한다.
- 공지 중복 검사는 `sha256(noticeSiteId + ":" + normalizedLink)`로 수행한다.
- 카테고리 구독의 서버 범위는 `categoryId -> categories.noticeSiteId -> notice_sites.guild_id`로 확인한다.
- 키워드는 `guildId + userId + keyword` 기준으로 서버별 분리 저장한다.

---

# 5. Main Flows

## /setup Flow

```text
사용자가 Discord 서버에서 /setup 실행
  -> Bot이 관리자 권한 확인
  -> 권한이 있으면 관리자 페이지 링크 버튼을 Ephemeral로 응답
  -> 권한이 없으면 권한 오류를 Ephemeral로 응답
```

## Test Crawl Flow

```text
관리자가 공지 사이트와 selector 입력
  -> POST /api/admin/{guildId}/notice-config/test
  -> Backend가 필수 요청 값 검증
  -> Crawler가 공지 페이지 요청
  -> selector로 공지 목록과 카테고리 목록 추출
  -> 제목, 링크, 날짜, 카테고리, 카테고리 목록 검증
  -> 날짜를 DateTime으로 변환
  -> 최근 공지 미리보기와 감지 카테고리 반환
```

테스트 크롤링은 DB에 설정을 저장하지 않는다.

## Initial Save Flow

```text
관리자가 사이트와 카테고리 설정 저장
  -> POST /api/admin/{guildId}/notice-config
  -> 테스트 크롤링 가능한 설정인지 검증
  -> 활성 카테고리의 Discord 역할 생성
  -> 같은 이름의 역할이 이미 있으면 실패
  -> 공지 사이트 저장
  -> 카테고리를 roleId 또는 null과 함께 저장
  -> 모든 DB 변경사항 commit
```

역할 생성이나 DB 저장 중 하나라도 실패하면 전체 설정 저장을 실패 처리한다.

## Replace Config Flow

```text
관리자가 사이트 URL 또는 selector 변경
  -> 새 selector로 테스트 크롤링
  -> PUT /api/admin/{guildId}/notice-config
  -> 활성 카테고리의 새 Discord 역할 생성
  -> 같은 이름의 역할이 이미 있으면 실패
  -> 사이트와 카테고리 설정 교체
  -> 기존 카테고리, 구독, 공지 삭제
  -> 새 설정 저장 성공 후 기존 IRIS 역할 삭제
```

## Category Patch Flow

```text
관리자가 알림 채널, roleName, isActive 변경
  -> PATCH /api/admin/{guildId}/notice-config/categories
  -> 알림 채널이 바뀌면 카테고리 channelId 값 수정
  -> 활성 상태에서 roleName이 바뀌면 Discord 역할 이름 변경
  -> 비활성화하면 역할을 삭제하고 roleId를 null로 저장
  -> 다시 활성화하면 저장된 roleName으로 역할 생성
  -> 재활성화 또는 이름 변경 시 기존 Discord 역할 이름과 충돌하면 실패
```

## Scheduled Crawl Flow

```text
공지 사이트 설정 저장/교체
  -> 해당 사이트 즉시 초기 수집
  -> 기존 저장 공지가 0개이면 알림 없이 DB 저장

30분마다 실행
  -> 모든 공지 사이트 로드
  -> 사이트별 크롤링
  -> 공지 링크 정규화
  -> hashKey 생성
  -> 이미 저장된 공지는 제외
  -> 공지 카테고리를 활성 카테고리와 매칭
  -> 신규 공지 저장
  -> 실제 카테고리와 활성화된 전체 카테고리의 mention 역할 구성
  -> 설정된 알림 채널에 공지 메시지 1개 전송
  -> 제목을 guild 범위 키워드와 매칭
  -> 키워드 DM 알림 전송
     - 공지 제목, 매칭 키워드, 카테고리, 공지일 표시
     - MVP는 서버당 공지 사이트 1개 정책이므로 개인 DM 알림에서는 사이트명 생략
```

비활성화된 카테고리의 공지는 저장 및 알림 대상에서 제외한다.
`전체` 카테고리는 별도 저장 카테고리로 사용하지 않고, 전체 공지를 받고 싶은 사용자를 위한 mention 역할로만 사용한다.

## /subscribe Flow

```text
사용자가 /subscribe 실행
  -> 활성 카테고리 로드
  -> 사용자 현재 구독 상태 로드
  -> Discord 카테고리 버튼 표시
  -> 사용자가 카테고리 버튼 클릭
  -> 해당 카테고리 구독 상태 토글
  -> 카테고리 역할 부여 또는 제거
```

## /keyword Flow

```text
사용자가 /keyword 실행
  -> 현재 guild의 사용자 키워드 로드
  -> 추가/삭제 버튼이 있는 페이지형 키워드 목록 표시
  -> 추가 버튼 클릭 시 키워드 모달 표시
  -> 삭제 버튼 클릭 시 키워드 선택 메뉴 표시
  -> 사용자가 삭제할 키워드 선택
  -> 삭제 확인 버튼 클릭 시 선택 키워드 삭제
  -> 나가기 버튼 클릭 시 삭제하지 않고 목록으로 복귀
```

## Delete Config And Bot Removal Flow

```text
관리자가 설정 삭제
  -> DELETE /api/admin/{guildId}/notice-config
  -> IRIS가 생성한 Discord 역할 삭제
  -> 공지 사이트, 카테고리, 공지, 구독 삭제
  -> 키워드는 유지
  -> guild를 설정 전 초기 상태로 복구

Bot이 먼저 제거된 경우
  -> Bot이 guildDelete 이벤트 수신
  -> 해당 guild의 공지 설정, 구독, 키워드 DB 데이터 삭제
  -> guild 접근 권한이 없으므로 Discord 역할 삭제는 건너뜀

사용자가 guild를 나간 경우
  -> Bot이 guildMemberRemove 이벤트 수신
  -> 해당 guild의 사용자 구독, 키워드 삭제
```

## Summary Button Flow

```text
사용자가 공지 Embed의 요약 버튼 클릭
  -> "요약 기능은 준비 중입니다."를 Ephemeral로 응답
```

MVP 현재는 공지 채널 알림, 키워드 DM 알림, DM 저장 알림에 `요약 보기` 버튼을 노출하지만 실제 AI 요약은 생성하지 않는다.
향후 고도화 단계에서 notice 조회, summary cache 재사용, 원문 상세 fetch, AI 요약 생성, summary 저장 흐름을 연결한다.

## Notice DM Save Flow

```text
사용자가 공지 채널 알림에서 DM으로 저장 클릭
  -> 공지 Embed를 사용자 DM으로 복사
  -> 요약 보기와 알림 삭제 버튼 추가
  -> 채널에서는 Ephemeral로 결과 응답
```

DM 알림의 `알림 삭제` 버튼은 해당 DM 메시지만 삭제하며, 저장된 notice 데이터나 사용자 키워드 설정은 변경하지 않는다.

---

# 6. Failure Handling

## Test Crawl Failure

- 요청 body 필수 값이 없으면 실패
- 공지를 1개도 가져오지 못하면 실패
- `title`, `link`, `date`, `category` 중 하나라도 추출하지 못하면 실패
- 날짜를 DateTime으로 변환하지 못하면 실패
- 감지된 카테고리가 0개이면 실패

## Config Save Failure

- 활성 카테고리 역할 생성 실패 시 전체 저장을 실패 처리한다.
- DB 저장 실패 시 전체 저장을 실패 처리한다.
- 부분 생성된 Discord 역할은 가능한 범위에서 정리한다.

## Config Replace Failure

- 새 역할 생성 또는 새 설정 저장 실패 시 기존 설정을 유지한다.
- 기존 IRIS 역할 삭제는 새 설정 저장이 성공한 뒤 수행한다.

## Discord Notification Failure

- 채널 접근 불가나 메시지 전송 실패는 해당 알림 실패로 기록한다.
- 다른 서버나 다른 공지 처리는 계속 진행한다.

## Keyword DM Failure

- 사용자가 DM을 차단했거나 DM 전송이 실패해도 공지 저장과 채널 알림은 유지한다.
- 실패한 DM은 전체 크롤링 작업을 중단시키지 않는다.

## Summary Failure

- MVP 현재 `요약 보기`는 실제 AI 요약을 생성하지 않으므로 실패 가능한 외부 요약 호출이 없다.
- 향후 AI 요약 생성 실패 시 원본 공지 정보만 유지하고, 실패 결과는 클릭한 사용자에게 ephemeral로 안내한다.

---

# 7. Security And Permissions

- `/setup`은 Discord 서버 안에서만 실행할 수 있다.
- `/setup`은 실행자의 관리자 권한을 확인한다.
- Admin 페이지는 MVP에서 별도 인증이나 토큰 검증을 하지 않는다.
- 관리자 바로가기 버튼은 Ephemeral 응답의 링크 버튼으로 제공한다.
- Bot은 채널 목록 조회, 메시지 전송, Embed 전송, 역할 생성, 역할 이름 변경, 역할 삭제, 멤버 역할 부여/제거 권한이 필요하다.
- Bot의 역할 위치는 IRIS가 생성하고 관리할 역할보다 높아야 한다.
- 이후 확장 시 Admin 접근은 Discord OAuth 또는 guild-scoped token으로 보호한다.

---

# 8. Scheduling Policy

- 기본 크롤링 주기는 30분이다.
- 공지 사이트 설정 저장 또는 교체 직후 해당 사이트만 즉시 수집한다.
- 해당 사이트의 첫 수집은 기준 데이터 저장용으로 처리하고 알림을 보내지 않는다.
- 서버별 커스텀 주기는 MVP 범위 밖이다.
- 크롤링 실패 시 즉시 재시도하지 않고 다음 주기에서 다시 시도한다.
- 한 서버나 한 사이트의 실패가 전체 스케줄러 작업을 중단시키지 않아야 한다.

---

# 9. Extension Points

- Multi-site: `notice_sites.guild_id` unique 제약 제거 또는 `guildId + siteId` 기준으로 확장
- Admin Auth: Discord OAuth 또는 guild-scoped setup token 추가
- AI Summary: Summary Button interaction과 summary cache 고도화
- AI Selector 추천: selector 입력 보조 기능 추가
- Dashboard: 공지 수집 상태, 알림 실패, 구독 통계 표시
- Calendar: 공지 마감일 추출과 Google Calendar 연동
