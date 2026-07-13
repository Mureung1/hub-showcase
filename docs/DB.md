# DB.md

> IRIS MVP 데이터 모델 기준 문서입니다.

---

# 1. Core Rules

- 서비스 전체는 여러 Discord 서버를 지원한다.
- MVP에서는 Discord 서버 1개당 공지 사이트 1개만 등록한다.
- 공지 사이트는 `notice_sites.guild_id`로 Discord 서버와 연결한다.
- `notice_sites.guild_id`는 unique이며, 서버당 하나의 공지 사이트만 허용한다.
- 공지 중복 검사는 `noticeSiteId + normalizedLink` 기준으로 수행한다.
- 카테고리 구독은 `subscriptions.userId + categoryId` 기준으로 저장한다.
- 키워드는 `guildId + userId + keyword` 기준으로 서버별 분리 저장한다.
- DB 컬럼은 dbdiagram 기준을 따르고, TypeScript/Prisma 코드에서는 camelCase 필드로 매핑할 수 있다.

---

# 2. Tables

## notice_sites

서버별 공지 사이트와 크롤링 selector를 저장한다.

| Column | Type | Constraint | Note |
|---|---|---|---|
| id | int | pk, increment | 내부 site id |
| guild_id | varchar | not null, unique | Discord guild id |
| name | varchar | not null | 사이트 이름 |
| url | varchar | not null | 공지 목록 URL |
| listSelector | varchar | not null | 공지 목록 selector |
| titleSelector | varchar | not null | 제목 selector |
| linkSelector | varchar | not null | 링크 selector |
| dateSelector | varchar | not null | 날짜 selector |
| categorySelector | varchar | not null | 카테고리 selector |
| created_at | datetime | not null | 생성일 |
| updated_at | datetime | not null | 수정일 |

**Rules**

- `guild_id` unique 제약으로 MVP의 서버당 공지 사이트 1개 정책을 보장한다.
- selector 테스트 크롤링은 `title`, `link`, `date`, `category`를 모두 가져와야 성공한다.

---

## categories

테스트 크롤링에서 감지된 카테고리와 Discord 연결 정보를 저장한다.

| Column | Type | Constraint | Note |
|---|---|---|---|
| id | int | pk, increment | 내부 category id |
| name | varchar | not null | 감지된 카테고리명 |
| noticeSiteId | int | not null, fk | `notice_sites.id` |
| channelId | varchar | not null | 기존 Discord 채널 id |
| roleId | varchar | nullable | IRIS가 생성한 Discord role id |
| roleName | varchar | not null | 사용자가 입력한 role 이름 |
| isActive | boolean | not null | 알림 활성화 여부 |
| created_at | datetime | not null | 생성일 |
| updated_at | datetime | not null | 수정일 |

**Indexes**

- `(noticeSiteId, name)` unique

**Rules**

- Discord 채널은 자동 생성하지 않고 기존 채널을 선택한다.
- 활성화된 카테고리는 카테고리 설정 저장 시 `roleName`으로 IRIS가 Role을 생성한다.
- 비활성화된 카테고리는 Role을 생성하지 않고 `roleId = null`로 저장한다.
- 비활성화된 카테고리는 구독 목록, 공지 저장, 알림 대상에서 제외한다.
- 테스트 크롤링으로 감지된 카테고리 미리보기는 저장 전 임시 데이터로 처리할 수 있다.

---

## notices

크롤링된 공지와 중복 검사 정보를 저장한다.

| Column | Type | Constraint | Note |
|---|---|---|---|
| id | int | pk, increment | 내부 notice id |
| noticeSiteId | int | not null, fk | `notice_sites.id` |
| categoryId | int | not null, fk | `categories.id` |
| hashKey | varchar(64) | not null, unique | 중복 검사 key |
| title | varchar | not null | 공지 제목 |
| link | varchar | not null | 원본 링크 |
| date | datetime | not null | 공지 날짜 |
| normalizedLink | varchar | not null | 정규화된 원본 링크 |
| summary | text | nullable | 요청 기반 AI 요약 결과 |
| firstSeenAt | datetime | not null | 최초 감지일 |
| created_at | datetime | not null | 생성일 |
| updated_at | datetime | not null | 수정일 |

**hashKey**

```text
hashKey = sha256(noticeSiteId + ":" + normalizedLink)
```

**Rules**

- 제목이나 날짜가 수정되어도 `normalizedLink`가 같으면 같은 공지로 본다.
- 공지 저장 시 감지된 category는 `categories.id`와 매핑되어야 한다.
- 알림 Embed 기본 필드는 제목, 날짜, 원본 링크이다.

---

## subscriptions

사용자의 카테고리 구독 상태를 저장한다.

| Column | Type | Constraint | Note |
|---|---|---|---|
| id | int | pk, increment | 내부 subscription id |
| userId | varchar | not null | Discord user id |
| categoryId | int | not null, fk | `categories.id` |
| created_at | datetime | not null | 생성일 |

**Indexes**

- `(userId, categoryId)` unique

**Rules**

- guild 범위는 `categoryId -> categories.noticeSiteId -> notice_sites.guild_id`로 확인한다.
- `/subscribe` multi-select 결과를 최종 구독 상태로 보고 추가/삭제를 동기화한다.
- 구독 시 활성화된 category의 `roleId`를 사용자에게 부여하고, 구독 해제 시 제거한다.

---

## keywords

사용자별 키워드 알림 설정을 서버별로 저장한다.

| Column | Type | Constraint | Note |
|---|---|---|---|
| id | int | pk, increment | 내부 keyword id |
| guildId | varchar | not null | Discord guild id |
| userId | varchar | not null | Discord user id |
| keyword | varchar | not null | 등록 키워드 |
| created_at | datetime | not null | 생성일 |

**Indexes**

- `(guildId, userId, keyword)` unique

**Rules**

- 같은 사용자가 여러 Discord 서버에서 같은 키워드를 등록해도 별도 데이터로 저장한다.
- 키워드 매칭 범위는 해당 `guildId`의 공지로 제한한다.
- MVP 키워드 매칭 대상은 공지 제목이다.

---

# 3. Relationships

```text
notice_sites.id < categories.noticeSiteId
notice_sites.id < notices.noticeSiteId
categories.id < notices.categoryId
categories.id < subscriptions.categoryId
```

---

# 4. dbdiagram Source

```dbml
Table notice_sites {
  id int [pk, increment]
  guild_id varchar [not null, unique]
  name varchar [not null]
  url varchar [not null]
  listSelector varchar [not null]
  titleSelector varchar [not null]
  linkSelector varchar [not null]
  dateSelector varchar [not null]
  categorySelector varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
}

Table categories {
  id int [pk, increment]
  name varchar [not null]
  noticeSiteId int [not null, ref: > notice_sites.id]
  channelId varchar [not null]
  roleId varchar
  roleName varchar [not null]
  isActive boolean [not null]
  created_at datetime [not null]
  updated_at datetime [not null]

  indexes {
    (noticeSiteId, name) [unique]
  }
}

Table notices {
  id int [pk, increment]
  noticeSiteId int [not null, ref: > notice_sites.id]
  categoryId int [not null, ref: > categories.id]
  hashKey varchar(64) [not null, unique]
  title varchar [not null]
  link varchar [not null]
  date datetime [not null]
  normalizedLink varchar [not null]
  summary text
  firstSeenAt datetime [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
}

Table subscriptions {
  id int [pk, increment]
  userId varchar [not null]
  categoryId int [not null, ref: > categories.id]
  created_at datetime [not null]

  indexes {
    (userId, categoryId) [unique]
  }
}

Table keywords {
  id int [pk, increment]
  guildId varchar [not null]
  userId varchar [not null]
  keyword varchar [not null]
  created_at datetime [not null]

  indexes {
    (guildId, userId, keyword) [unique]
  }
}
```

---

# 5. AI Summary Policy

- 알림 생성 시점에는 AI 요약을 자동 생성하지 않는다.
- 공지 알림에는 제목, 날짜, 원본 링크를 기본 제공한다.
- 사용자가 요약 버튼을 눌렀을 때만 상세 본문을 가져와 요약을 생성한다.
- 생성된 요약은 `notices.summary`에 저장해 재사용할 수 있다.
