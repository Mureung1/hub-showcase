# P0 API Contract

> **초기 계약 기록:** 이 문서의 닉네임 생성과 요청별 `userId` 전달 방식은 Google 로그인·서버 세션 전환으로 폐기됐습니다. 현재 공개 API와 인증 경계는 [`docs/current-implementation-status.md`](../../docs/current-implementation-status.md)를 따릅니다. 이 문서는 전환 전 계약과 판단을 공부할 수 있도록 보존합니다.

## 목적

이 계약은 React mock 상태를 Spring Boot API로 교체할 때 사용할 최소 인터페이스다. P0에서 닉네임은 표시명일 뿐이며, 클라이언트가 브라우저에 보관한 `userId`만 같은 책장을 다시 조회하는 기준이다.

모든 날짜는 ISO 8601 UTC 문자열로 반환한다. 식별자는 숫자 또는 UUID 문자열 중 서버 구현의 한 가지 방식으로 일관되게 사용한다.

## 공통 오류 응답

```json
{
  "code": "INVALID_PAGE_RANGE",
  "message": "끝난 페이지는 59쪽보다 앞설 수 없어요."
}
```

- 형식 오류·소유하지 않은 리소스·페이지 범위 오류는 `400` 또는 `404`로 응답한다.
- 클라이언트는 오류 뒤 입력 초안을 유지한다.
- 기록 저장의 응답이 불확실하게 끊긴 경우 자동 재전송하지 않고 책 상세를 재조회한다.

## 사용자 생성

### `POST /api/users`

요청:

```json
{ "nickname": "다정" }
```

응답 `201`:

```json
{
  "id": "user-123",
  "nickname": "다정",
  "createdAt": "2026-07-14T09:00:00Z"
}
```

클라이언트는 응답의 `id`를 `itjang:user`에 보관한다. 닉네임으로 기존 사용자를 조회하는 API는 만들지 않는다.

## 책 등록

### `GET /api/books/search?q={query}`

책 이름으로 외부 도서 정보를 검색한다. 서버가 Google Books API를 호출하며 API 키는 클라이언트에 노출하지 않는다.

응답 `200`:

```json
{
  "books": [
    {
      "providerId": "volume-123",
      "title": "아주 작은 습관의 힘",
      "author": "제임스 클리어",
      "isbn10": "0735211299",
      "isbn13": "9780735211292",
      "publishedDate": "2018",
      "pageCount": 320
    }
  ]
}
```

- 검색 결과는 제목, 저자, 출판일, ISBN으로 판본을 구분해 표시한다.
- 같은 ISBN을 가진 API 결과는 한 결과로 합친다.
- ISBN이 다른 판본은 별도 결과로 표시한다.

### `POST /api/books`

요청:

```json
{
  "userId": "user-123",
  "providerId": "volume-123",
  "initialPage": 1
}
```

- `providerId`는 검색 결과에서 선택한 Google Books volume ID다.
- `initialPage`는 생략하면 `1`이며, 1 이상의 정수여야 한다.
- 서버는 선택한 volume을 다시 조회해 제목·저자·ISBN을 저장한다.
- 같은 사용자가 같은 판본을 다시 등록하면 `409 DUPLICATE_BOOK`을 반환한다.
- 판본 식별 키는 유효한 ISBN-13, ISBN-10을 변환한 ISBN-13, ISBN이 없으면 provider ID 순서로 정한다.

응답은 아래 책 상세 응답과 같은 구조를 `201`로 반환한다.
- 응답에는 `metadataProvider`, `metadataProviderId`, `isbn10`, `isbn13`이 포함된다.

## 사용자 책장 조회

### `GET /api/users/{userId}/books?status=READING`

응답 `200`:

```json
{
  "books": [
    {
      "id": "book-123",
      "title": "아주 작은 습관의 힘",
      "author": "제임스 클리어",
      "initialPage": 1,
      "status": "READING",
      "recordCount": 2,
      "nextStartPage": 75,
      "latestRecord": {
        "id": "record-2",
        "startPage": 59,
        "endPage": 74,
        "impression": "한 줄이면 충분해요.",
        "createdAt": "2026-07-14T09:00:00Z"
      },
      "createdAt": "2026-07-10T09:00:00Z"
    }
  ]
}
```

- 기록이 없으면 `latestRecord`는 `null`, `recordCount`는 `0`, `nextStartPage`는 `initialPage`다.
- 목록 순서는 최신 기록의 `createdAt DESC, id DESC`이며, 기록 없는 책끼리는 책의 `createdAt DESC, id DESC`다.

## 책 상세 조회

### `GET /api/books/{bookId}?userId={userId}`

`userId`는 P0의 임시 소유 확인용이다. 다른 사용자의 책은 `404`를 반환한다.

응답 `200`:

```json
{
  "id": "book-123",
  "title": "아주 작은 습관의 힘",
  "author": "제임스 클리어",
  "initialPage": 1,
  "status": "READING",
  "nextStartPage": 75,
  "latestRecord": {
    "id": "record-2",
    "startPage": 59,
    "endPage": 74,
    "impression": "한 줄이면 충분해요.",
    "createdAt": "2026-07-14T09:00:00Z"
  },
  "readingRecords": [
    {
      "id": "record-1",
      "startPage": 42,
      "endPage": 58,
      "impression": null,
      "createdAt": "2026-07-12T09:00:00Z"
    },
    {
      "id": "record-2",
      "startPage": 59,
      "endPage": 74,
      "impression": "한 줄이면 충분해요.",
      "createdAt": "2026-07-14T09:00:00Z"
    }
  ]
}
```

`readingRecords`는 오래된 기록부터 반환한다. `latestRecord`와 `nextStartPage`는 반드시 `createdAt DESC, id DESC` 기준의 최신 기록에서 계산한다.

## 세션 기록 저장

### `POST /api/books/{bookId}/records`

일반 요청:

```json
{
  "userId": "user-123",
  "endPage": 74,
  "impression": "한 줄이면 충분해요.",
  "readingDurationSeconds": 930
}
```

다시 읽기·건너뛰기 예외 요청:

```json
{
  "userId": "user-123",
  "startPageOverride": 56,
  "endPage": 74,
  "impression": null
}
```

- 서버는 기본적으로 현재 `nextStartPage`를 `startPage`로 확정한다.
- `startPageOverride`는 예외에서만 허용하고, 이전 기록과의 연속성은 강제하지 않는다.
- `endPage`는 1 이상의 정수이며 확정된 시작 페이지보다 작을 수 없다.
- 감상은 선택이다.
- `readingDurationSeconds`는 선택적 타이머 세션을 끝낸 경우의 실제 경과 초다. 타이머를 사용하지 않으면 생략하며, 음수는 허용하지 않는다.

응답 `201`:

```json
{
  "record": {
    "id": "record-3",
    "startPage": 75,
    "endPage": 91,
    "impression": null,
    "readingDurationSeconds": 930,
    "createdAt": "2026-07-14T10:00:00Z"
  },
  "nextStartPage": 92
}
```

프론트는 이 응답으로 상세의 기록 목록과 다음 시작 페이지를 갱신한다. 목록의 최근 이어 읽기 카드도 새 응답 기준으로 재조회하거나 갱신한다.

## 읽기 기록 달력 — P1

### `GET /api/reading-activity?from=2026-05-11&to=2026-08-02`

- HttpOnly 세션의 사용자 기록만 조회하며 사용자 ID를 받지 않는다.
- `from`, `to`는 양 끝을 포함하는 ISO 날짜이고 최대 84일이다.
- 기록 날짜는 `Asia/Seoul` 기준으로 계산한다.
- 기록이 없는 날짜는 `days`에서 생략한다.

응답 `200`:

```json
{
  "from": "2026-05-11",
  "to": "2026-08-02",
  "days": [
    { "date": "2026-07-27", "count": 2 }
  ]
}
```
