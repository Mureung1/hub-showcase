# ARCHITECTURE.md

> IRIS MVP의 시스템 구성, 컴포넌트 책임, 주요 실행 흐름을 정리한 문서입니다.

---

# 1. System Overview

IRIS는 Discord 서버별로 하나의 대학 공지 사이트를 등록하고, 30분마다 공지를 확인해 Discord 채널 알림과 사용자 DM 알림을 제공한다.

```text
Admin Web
  -> Backend REST API
  -> MySQL

Discord Slash Commands
  -> Discord Bot
  -> Backend Services
  -> MySQL
  -> Discord API

Scheduler
  -> Crawler
  -> Notice Deduplication
  -> Notification Service
  -> Discord API
```

**Runtime Components**

- Admin Web: React/Vite 기반 관리자 설정 UI
- Backend API: Express 기반 REST API
- Discord Bot: discord.js 기반 slash command와 interaction 처리
- Scheduler: node-cron 기반 30분 주기 작업 실행
- Crawler: Axios/Cheerio 기반 공지 목록 추출
- Database: MySQL + Prisma
- Summary Service: 향후 AI 요약 버튼 기능을 위한 확장 컴포넌트

---

# 2. Architecture Boundaries

- MVP에서는 Discord 서버 1개당 공지 사이트 1개만 등록한다.
- Admin 페이지는 MVP에서 별도 로그인이나 토큰 검증을 하지 않는다.
- `/setup`은 Discord interaction에서 관리자 권한만 확인하고 Admin 바로가기 버튼을 제공한다.
- Discord 채널은 IRIS가 자동 생성하지 않고 기존 채널을 선택한다.
- MVP 알림은 카테고리별 채널이 아니라 하나의 공통 알림 채널로 보낸다.
- 현재 DB/API는 기존 `categories.channelId`를 유지하며, Admin Web이 모든 카테고리에 같은 알림 채널 id를 저장한다.
- 활성화된 카테고리에만 Discord Role을 생성한다.
- IRIS는 기존 Discord Role을 재사용하지 않는다. 같은 이름의 Role이 이미 있으면 저장을 실패 처리하고 관리자에게 다른 역할 이름을 입력하게 한다.
- 새로 생성하는 Discord Role은 별도 색상을 지정하지 않고 Discord 기본 색상을 사용한다.
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

- Admin Web 요청 검증
- 테스트 크롤링 실행 및 결과 반환
- 공지 사이트와 카테고리 설정 저장
- Discord 채널 목록 조회
- Discord Role 생성, 이름 변경, 삭제 orchestration
- 설정 삭제 시 관련 DB 데이터 정리

## Discord Bot

- `/help`, `/setup`, `/subscribe`, `/keyword` 처리
- `/setup` 실행자의 서버 관리자 권한 확인
- `/subscribe` category button interaction 처리
- 구독 변경에 따른 Discord Role 부여/제거
- Bot 제거 시 `guildDelete` 이벤트를 받아 해당 서버 DB 데이터 정리

## Crawler And Scheduler

- 30분마다 등록된 공지 사이트 순회
- selector 기반 공지 목록과 전체 카테고리 목록 추출
- `title`, `link`, `date`, `category` 필수 검증
- 링크 정규화와 `hashKey` 생성
- 신규 공지 중복 검사

## Notification Service

- 활성화된 카테고리의 공지만 저장 및 알림 처리
- 공통 알림 채널에 Embed 전송
- 실제 공지 카테고리 Role과 활성화된 `전체` Role을 mention 대상에 포함
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
- `categories`: 감지 카테고리와 Discord 알림 채널/Role 연결 정보
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
User runs /setup in Discord server
  -> Bot checks administrator permission
  -> If allowed, respond with Admin page link button ephemerally
  -> If denied, respond with permission error ephemerally
```

## Test Crawl Flow

```text
Admin enters notice site and selectors
  -> POST /api/admin/{guildId}/notice-config/test
  -> Backend validates required request fields
  -> Crawler fetches notice page
  -> Extract notices and category list using selectors
  -> Validate title, link, date, category, category list
  -> Parse date as DateTime
  -> Return preview notices and detected categories
```

테스트 크롤링은 DB에 설정을 저장하지 않는다.

## Initial Save Flow

```text
Admin submits site and category settings
  -> POST /api/admin/{guildId}/notice-config
  -> Validate that test-crawl-compatible settings are provided
  -> Create Discord Roles for active categories
  -> Fail if a Role with the requested name already exists
  -> Save notice site
  -> Save categories with roleId or null
  -> Commit all DB changes
```

Role 생성이나 DB 저장 중 하나라도 실패하면 전체 설정 저장을 실패 처리한다.

## Replace Config Flow

```text
Admin changes site URL or selectors
  -> Test crawl with new selectors
  -> PUT /api/admin/{guildId}/notice-config
  -> Create new Roles for active categories
  -> Fail if a Role with the requested name already exists
  -> Replace site and category settings
  -> Delete old categories, subscriptions, and notices
  -> Delete old IRIS-created Roles after successful save
```

## Category Patch Flow

```text
Admin changes notification channel, roleName, or isActive
  -> PATCH /api/admin/{guildId}/notice-config/categories
  -> Update category channelId values if notification channel changed
  -> Rename Discord Role if roleName changed and category remains active
  -> Delete Role and set roleId null if disabled
  -> Create Role from saved roleName if re-enabled
  -> Fail if re-enabled or renamed Role conflicts with an existing Discord Role name
```

## Scheduled Crawl Flow

```text
Every 30 minutes
  -> Load all notice sites
  -> Crawl each site
  -> Normalize each notice link
  -> Build hashKey
  -> Skip existing notices
  -> Match notice category to active category
  -> Save new notice
  -> Build mention roles from actual category and active 전체 category
  -> Send one notification message to the configured notification channel
  -> Match title against guild-scoped keywords
  -> Send keyword DM notifications
```

비활성화된 카테고리의 공지는 저장 및 알림 대상에서 제외한다.
`전체` 카테고리는 별도 저장 카테고리로 사용하지 않고, 전체 공지를 받고 싶은 사용자를 위한 mention 역할로만 사용한다.

## /subscribe Flow

```text
User runs /subscribe
  -> Load active categories
  -> Load user's current subscriptions
  -> Show Discord category buttons
  -> User clicks a category button
  -> Toggle that category subscription
  -> Add or remove the category Role
```

## /keyword Flow

```text
User runs /keyword
  -> Load user's keywords in current guild
  -> Show paginated keyword list with add/delete buttons
  -> Add button opens keyword modal
  -> Delete button shows keyword select menu
  -> User selects keywords
  -> Delete selected keywords when delete confirm button is clicked
  -> Return without deleting when exit button is clicked
```

## Delete Config And Bot Removal Flow

```text
Admin deletes config
  -> DELETE /api/admin/{guildId}/notice-config
  -> Delete IRIS-created Discord Roles
  -> Delete notice site, categories, notices, subscriptions, keywords
  -> Guild returns to initial unconfigured state

Bot is removed first
  -> Bot receives guildDelete event
  -> Delete DB data for that guild
  -> Skip Discord Role deletion because guild access is gone
```

## Summary Button Flow

```text
User clicks summary button on notice embed
  -> Respond ephemerally with "요약 기능은 준비 중입니다."
```

MVP 현재는 공지 채널 알림, 키워드 DM 알림, DM 저장 알림에 `요약 보기` 버튼을 노출하지만 실제 AI 요약은 생성하지 않는다.
향후 고도화 단계에서 notice 조회, summary cache 재사용, 원문 상세 fetch, AI 요약 생성, summary 저장 흐름을 연결한다.

## Notice DM Save Flow

```text
User clicks DM으로 저장 on notice channel notification
  -> Copy the notice embed to the user's DM
  -> Attach 요약 보기 and 알림 삭제 buttons
  -> Respond ephemerally in the channel
```

DM 알림의 `알림 삭제` 버튼은 해당 DM 메시지만 삭제하며, 저장된 notice 데이터나 사용자 키워드 설정은 변경하지 않는다.

---

# 6. Failure Handling

## Test Crawl Failure

- Request body 필수 값이 없으면 실패
- 공지를 1개도 가져오지 못하면 실패
- `title`, `link`, `date`, `category` 중 하나라도 추출하지 못하면 실패
- 날짜를 DateTime으로 변환하지 못하면 실패
- 감지된 카테고리가 0개이면 실패

## Config Save Failure

- 활성 카테고리 Role 생성 실패 시 전체 저장을 실패 처리한다.
- DB 저장 실패 시 전체 저장을 실패 처리한다.
- 부분 생성된 Discord Role은 가능한 범위에서 정리한다.

## Config Replace Failure

- 새 Role 생성 또는 새 설정 저장 실패 시 기존 설정을 유지한다.
- 기존 IRIS Role 삭제는 새 설정 저장이 성공한 뒤 수행한다.

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
- Admin 바로가기 버튼은 ephemeral 응답의 link button으로 제공한다.
- Bot은 채널 목록 조회, 메시지 전송, Embed 전송, Role 생성, Role 이름 변경, Role 삭제, 멤버 Role 부여/제거 권한이 필요하다.
- Bot의 Role 위치는 IRIS가 생성하고 관리할 Role보다 높아야 한다.
- 이후 확장 시 Admin 접근은 Discord OAuth 또는 guild-scoped token으로 보호한다.

---

# 8. Scheduling Policy

- 기본 크롤링 주기는 30분이다.
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
