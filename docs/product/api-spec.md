## API 명세

프론트엔드가 쓰는 공개 API 셋과, 데이터 적재를 손으로 돌리는 관리 API 셋으로 나뉜다.
모든 응답은 JSON 이고, 엔티티가 아니라 **응답 전용 record** 로 내려간다.

        GET  /api/places                    목적지 후보 검색
        GET  /api/parking-lots              주변 주차장 목록
        GET  /api/parking-lots/{id}         주차장 상세

        POST /api/admin/parking-lots/seoul     정적 적재
        POST /api/admin/parking-lots/geocode   좌표 채우기
        POST /api/admin/parking-lots/realtime  실시간 수집

### 1. GET /api/places — 목적지 후보 검색

키워드로 장소 후보를 받는다. **좌표를 우리가 고르지 않고 사용자가 고르게** 하는 단계다.

| 파라미터 | 타입 | 필수 | 제약 |
|---|---|---|---|
| `keyword` | String | ✅ | 공백 불가 |

**200** — 후보 배열. 결과가 없으면 **빈 배열**이지 404 가 아니다.

```json
[
  { "name": "이태원역 6호선", "address": "서울 용산구 이태원로 177",
    "coordinates": { "latitude": 37.534508, "longitude": 126.994194 } }
]
```

- `address` 는 **null 일 수 있다.** 도로명·지번이 둘 다 비어 있는 장소가 실제로 있다.

### 2. GET /api/parking-lots — 주변 주차장 목록

목적지 좌표를 받아 **반경 1km 안에서, 가까운 순으로 최대 10곳**을 내려준다.

| 파라미터 | 타입 | 필수 | 제약 |
|---|---|---|---|
| `latitude` | Double | ✅ | -90 ~ 90 |
| `longitude` | Double | ✅ | -180 ~ 180 |

반경 밖이거나 **좌표가 없는 주차장은 아예 후보에서 빠진다.** 페이지네이션은 없다.

**200**

```json
[
  { "id": 12, "name": "이태원 공영주차장", "address": "서울 용산구 ...",
    "distance": 320, "distanceType": "WALKING", "walkingSeconds": 260,
    "payType": "PAID", "realtimeStatus": "MODERATE" }
]
```

| 필드 | 값 | 비는 경우 |
|---|---|---|
| `distance` | 미터 | 없음 |
| `distanceType` | `WALKING` · `STRAIGHT` | 없음 — 도보 경로를 못 받으면 `STRAIGHT` 로 떨어진다 |
| `walkingSeconds` | 초 | `distanceType` 이 `STRAIGHT` 면 **null** |
| `realtimeStatus` | `SPACIOUS` · `MODERATE` · `BUSY` · `FULL` | 실시간을 제공하지 않는 주차장이면 **null** |

### 3. GET /api/parking-lots/{id} — 주차장 상세

| 파라미터 | 위치 | 필수 | 제약 |
|---|---|---|---|
| `id` | path | ✅ | |
| `latitude` | query | ➖ | -90 ~ 90 |
| `longitude` | query | ➖ | -180 ~ 180 |

**좌표는 선택이다.** 목적지 없이 상세만 볼 수 있고, 그때는 거리 정보가 빠진다.

**200**

```json
{
  "id": 12, "name": "이태원 공영주차장", "address": "서울 용산구 ...",
  "tel": "02-000-0000", "parkingKind": "OUTDOOR", "operType": "TIME_BASED",
  "totalSlots": 84, "payType": "PAID",
  "fee": { "basicFee": 300, "basicMinutes": 5,
           "extraUnitFee": 300, "extraUnitMin": 5, "dayMaxFee": 20000 },
  "operatingHours": { "weekdayStart": "0000", "weekdayEnd": "2400",
                      "weekendStart": "0000", "weekendEnd": "2400",
                      "holidayStart": "0000", "holidayEnd": "2400" },
  "realtimeInfo": { "availableSlots": 31, "totalSlots": 84,
                    "status": "MODERATE", "sourceUpdatedAt": "2026-07-29T14:02:00" },
  "distanceInfo": { "distance": 320, "distanceType": "WALKING", "walkingSeconds": 260 }
}
```

**enum 으로 내려가는 필드**

| 필드 | 값 |
|---|---|
| `parkingKind` | `OUTDOOR` · `ON_STREET` · `UNKNOWN` |
| `operType` | `TIME_BASED` · `RESIDENT_PRIORITY` · `TIME_AND_RESIDENT` · `BUS_ONLY` · `TIME_AND_BUS` · `UNKNOWN` |
| `payType` | `PAID` · `FREE` · `UNKNOWN` |

원본 코드가 우리가 아는 값이 아니면 **`UNKNOWN` 으로 떨어뜨린다.** 적재를 실패시키지 않는다.

**통째로 null 이 되는 객체가 넷 있다.**

| 필드 | null 인 경우 |
|---|---|
| `fee` | 요금 정보가 원본에 없을 때 |
| `operatingHours` | 운영시간이 원본에 없을 때 |
| `realtimeInfo` | 실시간을 제공하지 않는 주차장일 때 |
| `distanceInfo` | 목적지 좌표를 안 줬거나, 주차장 좌표가 없을 때 |

**404** — 그 `id` 의 주차장이 없을 때 (`NOT_FOUND_PARKING_LOT`).

### 4. 관리 API

적재를 스케줄과 무관하게 손으로 돌린다. 셋 다 **200, 본문 없음.**

| 엔드포인트 | 하는 일 |
|---|---|
| `POST /api/admin/parking-lots/seoul` | 정적 주차장 정보 적재 |
| `POST /api/admin/parking-lots/geocode` | 좌표가 빈 주차장을 지오코딩 |
| `POST /api/admin/parking-lots/realtime` | 실시간 주차 대수 수집 |

동기로 돌기 때문에 **적재가 끝날 때까지 응답이 오지 않는다.** 인증이 없으므로 외부에 열지 않는다.

### 5. 오류 응답

성공이 아닐 때는 어떤 엔드포인트든 같은 모양으로 내려간다.

```json
{ "code": "INVALID_REQUEST_PARAMETER", "message": "..." }
```

| 상태 | `code` | 언제 |
|---|---|---|
| 400 | `MISSING_REQUEST_PARAMETER` | 필수 파라미터가 아예 없을 때 |
| 400 | `INVALID_REQUEST_PARAMETER` | 범위를 벗어나거나 타입이 안 맞을 때 (`?latitude=999` · `?latitude=abc`) |
| 404 | `NOT_FOUND_PARKING_LOT` | 없는 주차장 id |
| 503 | `EXTERNAL_SERVER_UNAVAILABLE` | 카카오 · Tmap · 서울 열린데이터 호출이 실패했을 때 |
| 500 | `INTERNAL_SERVER_ERROR` | 그 밖의 예외 |

- `code` 는 프로그램이 읽는 값, `message` 는 사람이 읽는 값이다. **프론트엔드는 `code` 로 분기한다.**
- 검색 결과가 0건인 것은 오류가 아니다. **200 + 빈 배열**로 내려간다.
