# API.md

> IRIS의 REST API와 Discord 슬래시 명령어 동작을 정리한 문서입니다.

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
- 시작 가이드는 사전 준비, Discord Bot 초대 및 권한 승인, `/setup` 입력, 관리자 페이지 접속까지만 안내한다.
- 공지 사이트 등록, 카테고리 설정, 채널 선택 안내는 관리자 페이지 내부 가이드에서 처리한다.


# 3. Notice Site API

공지 사이트 등록과 카테고리 설정을 하나의 설정 흐름으로 처리합니다.
MVP에서는 `guildId`당 공지 사이트 1개만 저장합니다.
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
  "url": "https://computer.knu.ac.kr/bbs/board.php?bo_table=sub6_1_a&lang=kor",
  "listSelector": ".basic_tbl_head tbody > tr",
  "titleSelector": ".bo_tit a",
  "linkSelector": ".bo_tit a",
  "dateSelector": ".td_datetime",
  "categorySelector": ".bo_cate_link",
  "categoryListSelector": "#bo_cate_ul a"
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

MVP 현재는 Backend API를 제공하지 않고, Frontend에서 실제 전송 없이 접수 안내 문구만 표시합니다.
실제 서비스 연동 후에는 요청 내용이 운영자 메일 또는 저장소로 전달되고, 운영자는 사용자가 입력한 이메일 주소로 답변합니다.

Planned endpoint:

```http
POST /api/admin/{guildId}/selector-help-requests
```

**Request Body**

```json
{
  "email": "admin@example.com",
  "siteName": "경북대학교 컴퓨터학부",
  "url": "https://computer.knu.ac.kr/bbs/board.php?bo_table=sub6_1_a&lang=kor"
}
```

**Success Rules**

- `email`, `siteName`, `url`은 필수입니다.
- MVP 현재는 요청을 실제로 전송하지 않고 접수 안내만 표시합니다.
- 실제 서비스 연동 후 요청은 운영자 확인용 메일 또는 저장소로 전달되어야 합니다.
- 답변은 입력한 `email`을 기준으로 처리합니다.

---

## 3.2 공지 사이트 설정 저장

사이트 정보와 카테고리 설정을 한 번에 저장합니다.

기존 설정이 없을 때 최초 생성 시 사용
사이트 등록과 카테고리 설정은 마지막 저장 시 한 번에 반영
Frontend 관리자 흐름에서는 테스트 크롤링 성공 후 최초 저장할 때 이 API를 호출합니다.

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
      "channelId": "111111111111111111",
      "roleName": "학사공지",
      "isActive": true
    },
    {
      "name": "장학",
      "channelId": "111111111111111111",
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
- 활성화된 카테고리만 Discord 역할 생성 대상입니다.
- `roleName`을 입력하지 않으면 기본 역할 이름은 `IRIS-{카테고리명}`입니다.
- `roleName`을 입력하면 입력한 이름을 그대로 역할 이름으로 사용합니다.
- 같은 이름의 역할이 이미 있으면 기존 역할을 재사용하지 않고 `400 Bad Request`를 반환합니다.
- 같은 이름의 역할이 없으면 IRIS가 새로 생성합니다.
- 새로 생성하는 역할은 별도 색상을 지정하지 않고 Discord 기본 색상을 사용합니다.
- 비활성화된 카테고리는 역할을 생성하지 않고 `roleId = null`로 저장합니다.
- 모든 카테고리는 채널과 활성화 여부를 포함해야 합니다.
- MVP 관리자 UI는 하나의 알림 채널만 선택하고, API 요청에서는 모든 카테고리의 `channelId`에 같은 값을 넣습니다.
- `roleName`은 선택 값입니다.
- 역할 생성 또는 DB 저장 중 하나라도 실패하면 전체 생성을 실패 처리합니다.
- 생성이 완료되면 공지 사이트와 카테고리 설정이 함께 저장됩니다.

**Error Responses**

- `400 Bad Request`
  - Request Body 필수 값이 누락되었거나 형식이 올바르지 않음
  - 카테고리 설정이 1개도 포함되지 않음
  - Discord 채널이 존재하지 않거나 Bot이 메시지를 보낼 수 없음
  - Bot이 Discord 역할을 관리할 권한이 없음
  - 같은 이름의 Discord 역할이 이미 존재함
- `409 Conflict`
  - 해당 Discord 서버에 이미 공지 사이트 설정이 존재함
- `500 Internal Server Error`
  - DB 저장 또는 Discord API 연동 중 알 수 없는 서버 오류

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
            "url": "https://computer.knu.ac.kr/bbs/board.php?bo_table=sub6_1_a&lang=kor",
            "listSelector": ".basic_tbl_head tbody > tr",
            "titleSelector": ".bo_tit a",
            "linkSelector": ".bo_tit a",
            "dateSelector": ".td_datetime",
            "categorySelector": ".bo_cate_link",
            "categoryListSelector": "#bo_cate_ul a"
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
                "channelId": "111111111111111111",
                "roleId": "333333333333333333",
                "roleName": "장학공지",
                "isActive": true
            }
        ]
    }
}
```

**Rules**

- 역할은 저장 시 확정된 `roleName`으로 생성합니다.
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
Frontend 관리자 흐름에서는 기존 설정이 있는 상태에서 사이트 정보 또는 Selector를 수정하고 테스트 크롤링을 다시 실행한 뒤 저장할 때 이 API를 호출합니다.

```http
PUT /api/admin/{guildId}/notice-config
```

**Request Body**
```json
{
  "site": {
    "name": "경북대학교 컴퓨터학부",
    "url": "https://computer.knu.ac.kr/bbs/board.php?bo_table=sub6_1_a&lang=kor",
    "listSelector": ".basic_tbl_head tbody > tr",
    "titleSelector": ".bo_tit a",
    "linkSelector": ".bo_tit a",
    "dateSelector": ".td_datetime",
    "categorySelector": ".bo_cate_link",
    "categoryListSelector": "#bo_cate_ul a"
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
      "channelId": "111111111111111111",
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
- MVP 관리자 UI는 하나의 알림 채널만 선택하고, API 요청에서는 모든 카테고리의 `channelId`에 같은 값을 넣습니다.
- 활성화된 카테고리에 대해서만 역할 이름 정책에 따라 Discord 역할을 새로 생성합니다.
- 같은 이름의 역할이 이미 있으면 기존 역할을 재사용하지 않고 `400 Bad Request`를 반환합니다.
- 비활성화된 카테고리는 역할을 생성하지 않으며 roleId는 null로 저장합니다.
- roleName이 비어 있으면 `IRIS-{카테고리명}`을 기본 역할 이름으로 사용합니다.
- 기존 카테고리, 카테고리 구독 정보, 저장된 공지 데이터는 삭제한 후 새 설정으로 다시 생성합니다.
- 기존 Discord 역할은 새 설정이 정상적으로 저장된 후 정리합니다.
- 기존 Discord 역할 정리 실패는 로그로 남기고, 새 설정 저장 성공 응답은 유지합니다.
- 새 역할 생성 또는 DB 저장 중 하나라도 실패하면 전체 교체를 실패 처리합니다.

**Error Responses**

- `400 Bad Request`
  - Request Body 필수 값이 누락되었거나 형식이 올바르지 않음
  - 카테고리 설정이 1개도 포함되지 않음
  - Discord 채널이 존재하지 않거나 Bot이 메시지를 보낼 수 없음
  - Bot이 Discord 역할을 관리할 권한이 없음
  - 같은 이름의 Discord 역할이 이미 존재함
- `404 Not Found`
  - 교체할 공지 사이트 설정이 없음
- `500 Internal Server Error`
  - DB 교체 또는 Discord API 연동 중 알 수 없는 서버 오류

## 3.5 카테고리 설정만 수정

공지 사이트 URL과 Selector는 유지하고 카테고리 설정만 변경합니다.
변경 가능한 값:
- 알림 채널
- 역할 이름
- 활성화 여부
Frontend 관리자 흐름에서는 기존 설정 조회로 `categoryId`가 있는 카테고리의 알림 채널, 역할 이름, 활성화 여부만 수정할 때 이 API를 호출합니다.

```http
PATCH /api/admin/{guildId}/notice-config/categories
```

**Request Body**

```json
{
  "categories": [
    {
      "categoryId": 1,
      "channelId": "111111111111111111",
      "roleName": "학사 알림",
      "isActive": true
    },
    {
      "categoryId": 2,
      "channelId": "111111111111111111",
      "roleName": "장학 알림",
      "isActive": false
    }
  ]
}
```

**Response Body**

```json
{
  "data": {
    "message": "카테고리 설정이 수정되었습니다.",
    "categories": [
      {
        "categoryId": 1,
        "name": "학사",
        "channelId": "111111111111111111",
        "roleId": "222222222222222222",
        "roleName": "학사 알림",
        "isActive": true
      },
      {
        "categoryId": 2,
        "name": "장학",
        "channelId": "111111111111111111",
        "roleId": null,
        "roleName": "장학 알림",
        "isActive": false
      }
    ]
  }
}
```

**Rules**

- 요청에 포함된 카테고리의 설정을 수정합니다.
- 활성 상태를 유지하는 카테고리는 기존 roleId는 유지합니다.
- 알림 채널이 변경되면 요청에 포함된 카테고리들의 `channelId`를 같은 값으로 수정합니다.
- 역할 이름이 변경되면 기존 Discord 역할의 이름을 변경합니다.
- 활성화 여부가 변경되면 isActive를 수정합니다.
- 카테고리를 비활성화하면 IRIS가 생성한 Discord 역할을 삭제합니다.
- 역할 삭제 후 `roleId`는 `null`로 저장하며, `roleName`은 유지합니다.
- 비활성화된 카테고리를 다시 활성화하면 역할 이름 정책에 따라 Discord 역할을 새로 생성합니다.
- 역할 생성 또는 이름 변경 시 같은 이름의 Discord 역할이 이미 있으면 기존 역할을 재사용하지 않고 `400 Bad Request`를 반환합니다.
- 비활성화된 카테고리는 구독 목록에 표시하지 않고 공지 저장 및 알림 대상에서도 제외합니다.
- `전체` 카테고리는 공지 저장 카테고리가 아니라 전체 공지 구독 역할로 사용합니다. 실제 공지는 감지된 원래 카테고리에 저장합니다.

**Error Responses**

- `400 Bad Request`
  - Request Body 필수 값이 누락되었거나 형식이 올바르지 않음
  - 중복된 `categoryId`가 포함됨
  - Discord 채널이 존재하지 않거나 Bot이 메시지를 보낼 수 없음
  - Bot이 Discord 역할을 관리할 권한이 없음
  - 같은 이름의 Discord 역할이 이미 존재함
- `404 Not Found`
  - 공지 사이트 설정이 없거나 요청한 카테고리가 현재 서버 설정에 속하지 않음
- `500 Internal Server Error`
  - DB 수정 또는 Discord API 연동 중 알 수 없는 서버 오류

---

## 3.6 전체 설정 삭제

현재 Discord 서버에 등록된 공지 사이트 설정을 삭제하여 사이트 등록 단계부터 다시 설정할 수 있게 합니다.
관리자가 공지 사이트 URL 또는 Selector를 처음부터 다시 잡으려는 경우 사용합니다.

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
- 사용자 키워드 설정은 삭제하지 않습니다.
- 저장된 Discord 역할을 삭제합니다.
- Discord 역할 삭제 또는 DB 데이터 삭제 중 오류가 발생하면 삭제 실패로 처리합니다.
- 삭제가 완료되면 해당 Discord 서버는 공지 사이트를 등록하지 않은 초기 상태가 됩니다.
- 삭제 완료 후 관리자는 필요한 경우 Discord 서버에서 IRIS Bot을 제거할 수 있습니다.

**Error Responses**

- `404 Not Found`
  - 삭제할 공지 사이트 설정이 없음
- `400 Bad Request`
  - Bot이 Discord 역할을 관리할 권한이 없음
- `500 Internal Server Error`
  - DB 삭제 또는 Discord API 연동 중 알 수 없는 서버 오류

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
        "name": "공지알림"
      }
    ]
  }
}
```

**Error Responses**

- `404 Not Found`
  - Bot이 해당 Discord 서버에 참여하고 있지 않음
- `500 Internal Server Error`
  - Discord API 조회 중 알 수 없는 서버 오류

**Rules**

- Bot이 접근 가능한 텍스트 채널만 반환합니다.
- Bot이 메시지를 전송할 수 없는 채널은 제외합니다.
- 채널은 Discord 서버의 현재 상태를 기준으로 조회합니다.
- 채널 이름과 ID를 함께 반환합니다.
- Discord 서버에 접근할 수 없으면 조회를 실패 처리합니다.
- `guildId`는 URL path parameter로 받고, Discord client에서 해당 guild를 조회합니다.

---

# 5. Discord Command

## 5.1 /help

사용자에게 사용 가능한 명령어 안내를 제공합니다.

**Flow**

- `/help` 실행
- Ephemeral 응답으로 제공
- 보라색 Embed로 제공
- 각 슬래시 명령어 설명 제공

**Rules**
- `/setup`은 관리자 전용으로 표시
- `/guide`는 권한, 알림, 개인정보 설정 안내 명령어로 표시

---

## 5.2 /guide

권한과 개인정보 설정처럼 사용 전 확인해야 할 주의사항을 안내합니다.

**Flow**

- `/guide` 실행
- Ephemeral 응답으로 제공
- 보라색 Embed로 제공
- 권한 설정, 알림 설정, 개인정보 설정, 설정 삭제, Bot 제거 주의사항 제공

**Rules**
- Bot 역할은 IRIS가 만든 역할보다 위에 있어야 함을 안내합니다.
- 역할 관리 권한이 없으면 구독 역할 부여와 해제가 실패할 수 있음을 안내합니다.
- 키워드 알림은 개인 DM으로 전송된다고 안내합니다.
- Discord 개인정보 설정에서 서버 멤버의 DM을 차단하면 키워드 알림을 받을 수 없고, 공지를 DM으로 저장할 수 없음을 안내합니다.
- 설정 삭제 시 공지 사이트, 카테고리, 구독, 수집 공지 데이터가 삭제되고 키워드는 유지됨을 안내합니다.
- Discord 역할까지 정리하려면 Bot 제거 전에 관리자 페이지에서 설정 삭제를 먼저 실행해야 함을 안내합니다.
- Bot을 먼저 제거하면 DB 데이터는 정리되지만 Discord 역할은 서버에 남을 수 있음을 안내합니다.

---

## 5.3 /setup

관리자가 IRIS 설정 페이지에 접근할 수 있도록 관리자 페이지 바로가기 버튼을 제공합니다.

**Flow**

- `/setup` 실행
- interaction 실행자의 Discord 서버 관리자 권한 확인
- 관리자이면 보라색 Embed와 관리자 페이지 바로가기 버튼을 Ephemeral 응답으로 제공

**Rules**
- Discord 서버 안에서만 실행할 수 있습니다.
- 관리자 권한이 없는 사용자는 실행할 수 없습니다.
- 관리자 페이지 URL은 `{ADMIN_WEB_URL}/admin/{guildId}` 형식으로 생성하고 Discord 링크 버튼에 연결합니다.
- MVP에서는 링크에 별도 인증 토큰을 포함하지 않는다.
- 개발 중에는 테스트 서버에만 슬래시 명령어를 등록합니다.
- 운영에서는 전역 슬래시 명령어로 등록합니다.
- 슬래시 명령어 등록 방식과 관계없이 실행 시 서버 식별은 `interaction.guildId`를 사용합니다.

---

## 5.4 /subscribe

사용자에게 카테고리 목록을 제공하고, 구독/비구독 기능을 제공합니다.

**Flow**
- `/subscribe` 실행
- 활성화된 카테고리 목록 조회
- 카테고리 버튼 클릭으로 구독/비구독 즉시 토글
- 구독된 카테고리 역할 부여, 구독 해제된 카테고리 역할 제거

**Rule**
- Discord 버튼 컴포넌트로 표시
- 보라색 Embed와 버튼 목록으로 표시
- Embed 내용은 짧은 안내만 포함
- 버튼을 누를 때마다 해당 카테고리 구독 상태를 즉시 변경
- 현재 구독 중인 카테고리는 다른 버튼 스타일로 표시

---

## 5.5 /keyword

사용자에게 현재 키워드 목록을 제공하고, 추가/삭제 기능을 제공합니다.

**Flow**
- `/keyword` 실행
- 현재 Discord 서버에서 본인이 등록한 키워드 목록 조회
- `키워드 추가` 버튼 클릭 시 모달로 키워드 입력
- `키워드 삭제` 버튼 클릭 시 선택 메뉴로 삭제할 키워드 선택
- 선택 메뉴에서 여러 키워드를 선택한 뒤 `삭제하기` 버튼으로 삭제 확정
- `나가기` 버튼으로 삭제하지 않고 키워드 목록으로 복귀
- 키워드가 많으면 이전/다음 버튼으로 페이지 이동
- 변경 후 키워드 목록을 다시 표시

**Rule**
- Discord 버튼 컴포넌트, 모달, 선택 메뉴로 표시
- 키워드 목록과 삭제 화면은 보라색 Embed로 표시
- 키워드는 공백 제거 및 길이 검증 후 저장
- `guildId + userId + keyword` 기준으로 중복 방지
- 본인 키워드만 조회/삭제
- 공지 사이트 설정이 없어도 키워드는 등록할 수 있으며, 설정 완료 후 새 공지부터 DM 알림 대상이 됩니다.
- 키워드 매칭은 제목 기준이며 대소문자를 구분하지 않습니다.
- Ephemeral 응답

**Keyword DM Rule**
- 키워드가 매칭된 공지는 사용자 DM으로 Embed 알림을 보냅니다.
- DM 알림에는 공지 제목, 매칭 키워드, 카테고리, 공지일을 표시합니다.
- MVP는 서버당 공지 사이트 1개 정책이므로 개인 DM 알림에서는 사이트명을 표시하지 않습니다.
- DM 알림에는 `알림 삭제` 버튼을 붙입니다.
- DM 알림에는 `요약 보기` 버튼도 함께 붙입니다.
- `알림 삭제`를 누르면 버튼 영역을 `정말 삭제` / `취소`로 바꿉니다.
- `정말 삭제`를 누르면 해당 DM 메시지만 삭제합니다.
- `취소`를 누르면 다시 `요약 보기`와 `알림 삭제` 버튼으로 돌아갑니다.
- DM 메시지 삭제는 저장된 공지와 사용자 키워드 설정을 삭제하지 않습니다.


## Summary Button

AI 요약 확장 기능을 위한 interaction이다.

**Flow**

- 공지 알림 Embed에 요약 보기 버튼을 둘 수 있다.
- MVP 현재 공지 알림 Embed에는 `DM으로 저장`, `요약 보기` 버튼을 표시한다.
- `DM으로 저장` 클릭 시 해당 공지 Embed를 클릭한 사용자 DM으로 보낸다.
- DM으로 복사된 공지 알림에는 `요약 보기` 버튼과 `알림 삭제` 2단계 확인 버튼을 붙인다.
- `요약 보기` 클릭 시 현재는 `요약 기능은 준비 중입니다.`를 Ephemeral로 응답한다.

**Future Flow**

- 버튼 클릭 시 해당 notice의 summary가 있으면 재사용한다.
- summary가 없으면 공지 상세 본문을 가져와 AI 요약을 생성한다.
- 결과는 클릭한 사용자에게 Ephemeral로 응답한다.

**Rules**
- 실제 요약 생성과 저장은 고도화 단계에서 개발한다.
- 현재 MVP에서는 요약 버튼을 먼저 노출하되 준비 중 안내만 제공한다.
