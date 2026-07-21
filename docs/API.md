# API.md

> IRIS의 REST API와 Discord Slash Command 동작을 정리한 문서입니다.

---

# 1. Common

## 1.1 Base URL

```text
/api
```

## 1.2 Content Type

```http
Content-Type: application/json
```

## 1.3 공통 성공 응답

```json
{
  "data": {
    "key": "value"
  }
}
```

## 1.4 공통 실패 응답

```json
{
  "error": {
    "status": 400,
    "message": "에러 메시지"
  }
}
```

# 2. REST API

## 2.1 Landing Page Guide

**Rules**

- 시작 가이드는 랜딩 카드 영역을 전환해 표시한다.
- 시작 가이드는 Discord Bot 초대, 권한 승인, `/setup` 입력, 관리자 페이지 접속까지만 안내한다.
- 공지 사이트 등록, 카테고리 설정, 채널 선택 안내는 관리자 페이지 내부 Guide에서 처리한다.


# 3. Notice Site API

공지 사이트 등록과 카테고리 설정을 하나의 설정 흐름으로 처리합니다.
MVP에서는 `guildId`당 notice site 1개만 저장합니다.
기존 설정이 있으면 먼저 기존 설정을 불러옵니다.

사이트 정보 입력
→ 테스트 크롤링
→ 감지 카테고리 설정
→ 최종 저장

사이트 등록 화면과 카테고리 설정 화면은 서로 다른 기능이 아니라 하나의 설정 과정을 두 단계로 나눈 것입니다.

## 3.1 테스트 크롤링

관리자가 입력한 공지 사이트 URL과 Selector가 정상적으로 동작하는지 확인합니다.
최근 공지 미리보기와 감지된 카테고리 목록을 반환하며, 이 단계에서는 DB에 설정을 저장하지 않습니다.

```http
POST /api/admin/{guildId}/notice-config/test
```

**Request Body**

```json
{
  "name": "경북대학교 컴퓨터학부",
  "url": "https://cse.knu.ac.kr/board/notice",
  "listSelector": "ul.notice-list > li",
  "titleSelector": ".title",
  "linkSelector": "a.link",
  "dateSelector": ".date",
  "categorySelector": ".category",
  "categoryListSelector": ".category-tabs a"
}
```

**Response Body**

```json
{
  "data": {
    "notices": [
      {
        "title": "2026학년도 2학기 수강신청 안내",
        "link": "https://example.com/notices/123",
        "date": "2026-07-12T00:00:00.000Z",
        "category": "학사"
      }
    ],
    "categories": [
      "학사",
      "장학",
      "취업"
    ]
  }
}
```

**Success Rules**

- 'listSelector'를 통해 최신 공지 1개 이상 감지
- 감지된 미리보기 공지 항목에서 제목, 링크, 날짜, 카테고리를 추출할 수 있어야 함
- 날짜를 추출하고 DateTime으로 변환할 수 있어야 함
- `categoryListSelector`로 전체 카테고리 1개 이상 감지

**Failure Rules**

- 공지를 가져오지 못함
- Request Body 필수 값 누락
- 제목, 링크, 날짜, 카테고리 중 하나라도 추출 실패
- 날짜를 DateTime으로 변환하지 못함
- 전체 카테고리를 1개도 감지하지 못함

---

## 3.1.1 Selector 설정 도움 요청

Selector 설정이 어려운 관리자가 개발자에게 설정 도움을 요청할 때 사용합니다.
현재 Day 4 frontend mock flow에서는 실제 전송 없이 요청 접수 상태만 표시합니다.

실제 API 연동 후에는 요청 내용이 운영자 메일로 전달되고, 운영자는 사용자가 입력한 이메일 주소로 답변합니다.

```http
POST /api/admin/{guildId}/selector-help-requests
```

**Request Body**

```json
{
  "email": "admin@example.com",
  "siteName": "경북대학교 컴퓨터학부",
  "url": "https://cse.knu.ac.kr/board/notice"
}
```

**Success Rules**

- `email`, `siteName`, `url`은 필수입니다.
- 요청은 운영자 확인용 메일 또는 저장소로 전달되어야 합니다.
- 답변은 입력한 `email`을 기준으로 처리합니다.

---

## 3.2 공지 사이트 설정 저장

사이트 정보와 카테고리 설정을 한 번에 저장합니다.

기존 설정이 없을 때 최초 생성 시 사용
사이트 등록과 카테고리 설정은 마지막 저장 시 한 번에 반영

```http
POST /api/admin/{guildId}/notice-config
```

**Request Body**

```json
{
   "site": {
    "name": "...",
    "url": "...",
    "listSelector": "...",
    "titleSelector": "...",
    "linkSelector": "...",
    "dateSelector": "...",
    "categorySelector": "...",
    "categoryListSelector": "..."
  },
  "categories": [
    {
      "name": "학사",
      "channelId": "...",
      "roleName": "학사공지",
      "isActive": true
    },
    {
      "name": "장학",
      "channelId": "...",
      "roleName": "장학공지",
      "isActive": false
    }
  ]
}
```

**Response Body**

```json
{
  "data": {
    "message": "공지 사이트 설정이 완료되었습니다."
  }
}
```

**Rules**

- 관리자는 테스트 크롤링으로 확인한 설정을 저장합니다.
- Discord 서버당 하나의 공지 사이트만 설정 할 수 있습니다.
- Day 7 기본 저장 API에서는 Discord Role 생성 전이므로 `roleId = null`로 저장합니다.
- Day 8 Discord Role 연동 후에는 활성화된 카테고리의 Role을 Discord에 먼저 생성한 후 DB에 저장합니다.
- 'roleName'이 없으면 카테고리명을 기본값으로 사용합니다.
- 비활성화된 카테고리는 `roleId = null`로 저장합니다.
- 모든 카테고리는 채널과 활성화 여부를 포함해야 합니다.
- `roleName`은 선택 값이며, 없으면 카테고리명을 기본값으로 사용합니다.
- 생성 과정 중 하나라도 실패하면 전체 생성을 실패 처리합니다.
- 생성이 완료되면 공지 사이트와 카테고리 설정이 함께 저장됩니다.

**Error Responses**

- `400 Bad Request`
  - Request Body 필수 값이 누락되었거나 형식이 올바르지 않음
  - 카테고리 설정이 1개도 포함되지 않음
- `409 Conflict`
  - 해당 Discord 서버에 이미 공지 사이트 설정이 존재함
- `500 Internal Server Error`
  - DB 저장 중 알 수 없는 서버 오류

---

## 3.3 전체 설정 조회

현재 Discord 서버에 등록된 공지 사이트와 카테고리 설정을 함께 조회합니다.
관리자가 설정한 기존 설정이 있을 때 사용합니다.

```http
GET /api/admin/{guildId}/notice-config
```

**Response Body**

```json
{
    "data": {
        "site": {
            "name": "경북대학교 컴퓨터학부",
            "url": "https://example.com/notices",
            "listSelector": ".notice-list > li",
            "titleSelector": ".title a",
            "linkSelector": ".title a",
            "dateSelector": ".date",
            "categorySelector": ".category",
            "categoryListSelector": ".category-tabs a"
        },
        "categories": [
            {
                "categoryId": 1,
                "name": "학사",
                "channelId": "111111111111111111",
                "roleId": "222222222222222222",
                "roleName": "학사공지",
                "isActive": true
            },
            {   
                "categoryId": 2,
                "name": "장학",
                "channelId": "333333333333333333",
                "roleId": "2222222222222",
                "roleName": "장학공지",
                "isActive": true
            }
        ]
    }
}
```

**Rules**

- Role은 저장 시 사용자가 입력한 `roleName`으로 IRIS가 생성한다.
- 현재 Discord 서버의 공지 사이트 설정이 있는 경우에만 조회할 수 있습니다.
- 공지 사이트 정보와 카테고리 설정을 함께 반환합니다.
- 카테고리는 저장된 순서대로 반환합니다.
- `roleId`가 없는 경우 `null`을 반환합니다.
- 설정이 존재하지 않으면 `404 Not Found`를 반환합니다.

**Error Responses**

- `404 Not Found`
  - 해당 Discord 서버에 저장된 공지 사이트 설정이 없음
- `500 Internal Server Error`
  - DB 조회 중 알 수 없는 서버 오류

---

## 3.4 전체 설정 교체

관리자가 설정한 기존 설정이 있을 때 사용됩니다.
현재 Discord 서버에 등록된 공지 사이트와 카테고리 설정을 새로운 설정으로 전체 교체합니다.
관리자가 사이트 URL 또는 Selector를 변경하고, 테스트 크롤링을 통해 새 카테고리를 감지한 뒤 최종 저장할 때 사용합니다.
site 정보는 수정하고, category 설정은 새로 감지된 카테고리 목록 기준으로 다시 저장합니다.

```http
PUT /api/admin/{guildId}/notice-config
```

**Request Body**
```json
{
  "site": {
    "name": "경북대학교 전자공학부",
    "url": "https://example.com/notices",
    "listSelector": ".notice-list > li",
    "titleSelector": ".title a",
    "linkSelector": ".title a",
    "dateSelector": ".date",
    "categorySelector": ".category",
    "categoryListSelector": ".category-tabs a"
  },
  "categories": [
    {
      "name": "학사",
      "channelId": "111111111111111111",
      "roleName": "학사공지",
      "isActive": true
    },
    {
      "name": "장학",
      "channelId": "333333333333333333",
      "roleName": "장학공지",
      "isActive": false
    }
  ]
}
```

**Response Body**

```json
{
  "data": {
    "message": "공지 사이트 설정이 교체되었습니다."
  }
}
```

**Rules**

- 사이트 정보와 카테고리 설정을 한 번에 교체합니다.
- 카테고리 설정은 1개 이상 포함되어야 합니다.
- `channelId`는 기존 Discord 채널이어야 한다.
- 활성화된 카테고리에 대해서만 `roleName`을 사용하여 새로운 Discord Role을 생성합니다.
- 비활성화된 카테고리는 Role을 생성하지 않으며 roleId는 null로 저장합니다.
- roleName이 비어 있으면 카테고리명을 기본 역할 이름으로 사용합니다.
- 기존 카테고리, 카테고리 구독 정보, 저장된 공지 데이터는 삭제한 후 새 설정으로 다시 생성합니다.
- 기존 IRIS가 생성한 Discord Role은 새 설정이 정상적으로 저장된 후 삭제합니다.
- 새 Role 생성 또는 DB 저장 중 하나라도 실패하면 전체 교체를 실패 처리합니다.

## 3.5 카테고리 설정만 수정

공지 사이트 URL과 Selector는 유지하고 카테고리 설정만 변경합니다.
변경 가능한 값:
- Discord 채널
- 역할 이름
- 활성화 여부

```http
PATCH /api/admin/{guildId}/notice-config/categories
```

**Request Body**

```json
{
  "categories": [
    {
      "categoryId": 1,
      "channelId": "444444444444444444",
      "roleName": "학사 알림",
      "isActive": true
    },
    {
      "categoryId": 2,
      "channelId": "555555555555555555",
      "roleName": "장학 알림",
      "isActive": false
    }
  ]
}
```

**Rules**

- 변경된 카테고리만 요청에 포함합니다.
- 활성 상태를 유지하는 카테고리는 기존 roleId는 유지합니다.
- 채널이 변경되면 DB의 channelId를 수정합니다.
- 역할 이름이 변경되면 기존 Discord Role의 이름을 변경합니다.
- 활성화 여부가 변경되면 isActive를 수정합니다.
- 카테고리를 비활성화하면 IRIS가 생성한 Discord Role을 삭제합니다.
- Role 삭제 후 `roleId`는 `null`로 저장하며, `roleName`은 유지합니다.
- 비활성화된 카테고리를 다시 활성화하면 저장된 `roleName`으로 새로운 Discord Role을 생성합니다.
- 비활성화된 카테고리는 구독 목록에 표시하지 않고 공지 저장 및 알림 대상에서도 제외합니다.

---

## 3.6 전체 설정 삭제

현재 Discord 서버에 등록된 IRIS 설정과 관련 데이터를 모두 삭제하여 서비스를 초기화합니다.
관리자가 더 이상 해당 서버에서 IRIS 알림 서비스를 사용하지 않거나, 처음부터 다시 설정하려는 경우 사용합니다.

```http
DELETE /api/admin/{guildId}/notice-config
```

**Response Body**

```json
{
  "data": {
    "message": "IRIS 설정이 삭제되었습니다. 필요한 경우 Discord 서버에서 Bot을 제거할 수 있습니다."
  }
}

```

**Rules**

- 현재 공지 설정이 존재하는 Discord 서버에서만 사용할 수 있습니다.
- 공지 사이트 설정을 삭제합니다.
- 카테고리 설정을 삭제합니다.
- 저장된 공지 이력을 (notice) 삭제합니다.
- 카테고리 구독 정보를 삭제합니다.
- 사용자 키워드 설정을 삭제합니다.
- Day 7 기본 삭제 API에서는 DB에 저장된 설정 데이터만 삭제합니다.
- Discord Role 삭제는 Discord Role 연동 후 처리합니다.
- DB 데이터 삭제 중 오류가 발생하면 삭제 실패로 처리합니다.
- 삭제가 완료되면 해당 Discord 서버는 공지 사이트를 등록하지 않은 초기 상태가 됩니다.
- 삭제 완료 후 관리자는 필요한 경우 Discord 서버에서 IRIS Bot을 제거할 수 있습니다.

**Error Responses**

- `404 Not Found`
  - 삭제할 공지 사이트 설정이 없음
- `500 Internal Server Error`
  - DB 삭제 중 알 수 없는 서버 오류

---

# 4. Discord Resource API

관리자 페이지에서 Discord 서버 리소스를 조회할 때 사용합니다.

## 4.1 Discord 채널 목록 조회

Bot이 접근할 수 있는 Discord 채널 목록을 조회합니다.

```http
GET /api/admin/{guildId}/discord/channels
```

**Response Body**

```json
{
  "data": {
    "channels": [
      {
        "id": "111111111111111111",
        "name": "학사공지"
      },
      {
        "id": "222222222222222222",
        "name": "장학공지"
      }
    ]
  }
}
```

**Rules**

- Bot이 접근 가능한 텍스트 채널만 반환합니다.
- Bot이 메시지를 전송할 수 없는 채널은 제외합니다.
- 채널은 Discord 서버의 현재 상태를 기준으로 조회합니다.
- 채널 이름과 ID를 함께 반환합니다.
- Discord 서버에 접근할 수 없으면 조회를 실패 처리합니다.

---

# 5. Discord Command

## 5.1 /help

사용자에게 사용 가능한 명령어 안내를 제공합니다.

**Flow**

- `/help` 실행
- ephemeral 응답으로 제공
- 각 슬래시 명령어 설명 제공

**Rules**
- `/setup`은 관리자 전용으로 표시

---

## 5.2 /setup

관리자가 IRIS 설정 페이지에 접근할 수 있도록 관리자 페이지 링크를 제공합니다.

**Flow**

- `/setup` 실행
- interaction 실행자의 Discord 서버 관리자 권한 확인
- 관리자이면 Admin 페이지 링크를 ephemeral 응답으로 제공

**Rules**
- Discord 서버 안에서만 실행할 수 있습니다.
- 관리자 권한이 없는 사용자는 실행할 수 없습니다.
- MVP에서는 링크에 별도 인증 토큰을 포함하지 않는다.

---

## 5.3 /subscribe

사용자에게 카테고리 목록을 제공하고, 구독/비구독 기능을 제공합니다.

**Flow**
- `/subscribe` 실행
- 활성화된 카테고리 목록 조회
- multi-select로 구독/비구독 후 저장
- 선택된 카테고리 Role 부여, 선택 해제된 카테고리 Role 제거

**Rule**
- Discord multi-select component로 표시
- 선택된 카테고리 집합을 최종 구독 상태로 저장
- 현재 구독 중인 카테고리는 선택된 상태로 표시

---

## 5.4 /keyword

### /keyword add
서버별 사용자 키워드를 등록한다.

- 입력값: `keyword`
- 공백 제거 및 길이 검증
- 중복 확인
- `guildId + userId + keyword` 기준 저장
- Ephemeral 응답

### /keyword remove
서버별 사용자 키워드를 삭제한다.

- 입력값: `keyword`
- Select Menu 또는 키워드 입력으로 삭제
- 본인 키워드만 삭제
- Ephemeral 응답

### /keyword list
현재 Discord 서버에서 사용자가 등록한 키워드 목록을 보여준다.

- 입력값: 없음
- 현재 서버에서 본인이 등록한 키워드 목록 반환
- Ephemeral 응답


## Summary Button

AI 요약 확장 기능을 위한 interaction이다.

**Flow**

- 공지 알림 Embed에 요약 보기 버튼을 둘 수 있다.
- 버튼 클릭 시 해당 notice의 summary가 있으면 재사용한다.
- summary가 없으면 공지 상세 본문을 가져와 AI 요약을 생성한다.
- 결과는 클릭한 사용자에게 ephemeral로 응답한다.

**Rules**
- 위의 다른 기능들을 모두 개발 후 개발 예정
