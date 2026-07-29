## ERD

서울 열린데이터 두 개(정적 OA-13122 · 실시간 OA-21709)를 받아 저장하는 **두 테이블**로 이루어진다.
테이블 자체보다 **왜 이렇게 이었는지**가 중요해서, 결정과 근거를 함께 적는다.

### 1. 전체 모양

        parking_lot                      parking_lot_realtime
        ├── id            PK             ├── id                PK
        ├── pklt_cd       UK  ·······>   ├── pklt_cd           UK
        ├── name                         ├── total_slots
        ├── 주소 · 연락처                 ├── available_slots
        ├── 요금 (Fee)                    ├── source_updated_at
        ├── 운영시간 (OperatingHours)      └── created_at · updated_at
        ├── 좌표 (Coordinates)
        ├── realtime_available
        └── created_at · updated_at

        ······>  FK 없이 pklt_cd 값으로만 잇는다 (4번 참고)

- 관계는 **1 : 0..1** — 주차장 하나에 실시간 행이 있거나 없다.
- `parking_lot_realtime.pklt_cd` 에 UNIQUE 가 걸려 있어 주차장당 한 행만 존재한다.

### 2. parking_lot — 정적 정보

매일 새벽 OA-13122 을 받아 `pklt_cd` 기준으로 upsert 한다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGINT | PK, auto increment |
| `pklt_cd` | VARCHAR(20) | **UNIQUE**, NOT NULL — 서울시가 부여한 주차장 코드 |
| `name` | VARCHAR(100) | NOT NULL |
| `address` `district` `tel` | VARCHAR | 원본에 없으면 null |
| `parking_kind` `oper_type` `pay_type` | VARCHAR | enum 을 문자열로 저장 (`@Enumerated(STRING)`) |
| `total_slots` | INT | 총 주차 구획 수 |
| `latitude` `longitude` | DOUBLE | 지오코딩 결과. **비어 있을 수 있다** (5번) |
| `realtime_available` | BOOLEAN | NOT NULL, 기본 false |
| `created_at` `updated_at` | DATETIME | NOT NULL — `BaseEntity` 가 채운다 |

**VO 는 별도 테이블이 아니라 컬럼으로 펼쳐진다** (`@Embedded`).

| VO | 펼쳐지는 컬럼 |
|---|---|
| `Fee` | `basic_fee` `basic_minutes` `extra_unit_fee` `extra_unit_min` `day_max_fee` |
| `OperatingHours` | `weekday_start` `weekday_end` `weekend_start` `weekend_end` `holiday_start` `holiday_end` |
| `Coordinates` | `latitude` `longitude` |

### 3. parking_lot_realtime — 실시간 스냅샷

2분 주기로 OA-21709 을 받아 `pklt_cd` 기준으로 upsert 한다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGINT | PK, auto increment |
| `pklt_cd` | VARCHAR(20) | **UNIQUE**, NOT NULL |
| `total_slots` | INT | NOT NULL — 실시간 피드가 주는 값. 정적 값과 다를 수 있다 |
| `available_slots` | INT | NOT NULL, `0 <= available_slots <= total_slots` |
| `source_updated_at` | DATETIME | **원본이 갱신된 시각.** 우리가 수집한 시각(`updated_at`)과 다르다 |
| `created_at` `updated_at` | DATETIME | NOT NULL |

### 4. 두 테이블을 잇는 방법

**`id` 가 아니라 `pklt_cd` 로 잇는다.** 실시간 피드가 주는 식별자가 `pklt_cd` 뿐이라,
`id` 로 이으려면 수집할 때마다 주차장을 먼저 조회해 변환해야 한다.

**FK 를 걸지 않는다.** 처음에는 걸었다가 `V4__drop_parking_lot_realtime_fk.sql` 에서 뺐다.

> 실시간 피드에는 정적 데이터에 없는 주차장이 섞여 들어온다.
> FK 가 있으면 그런 행 하나 때문에 INSERT 가 실패하고 **배치 전체가 롤백된다.**
> 실시간 적재가 통째로 멈추는 대신, 매칭되지 않는 행은 그냥 남겨 둔다.

그래서 **읽을 때 LEFT JOIN** 으로 붙이고, 짝이 없으면 "정보 없음"으로 다룬다.
느슨하게 이은 대가로 정합성은 애플리케이션이 책임진다.

### 5. 일부러 중복을 둔 곳

정규화만 따지면 없어야 할 컬럼이 둘 있다. **성격이 서로 다르다.**

| 컬럼 | 겹쳐 보이는 것 | 판단 |
|---|---|---|
| `parking_lot_realtime.total_slots` | `parking_lot.total_slots` | **중복이 아니다.** 정적 원본이 준 구획 수와 실시간 피드가 준 총 면수는 **다른 출처의 다른 사실**이다. 이름만 같다 |
| `parking_lot.realtime_available` | `parking_lot_realtime` 행의 존재 여부 | **파생 값이다.** 조인 없이 실시간 제공 여부를 거르려고 둔 플래그 |

파생 값을 두면 **원본과 어긋날 수 있다.** 그래서 원본이 무엇이고 누가 갱신하는지가 분명해야 한다.
여기서 원본은 `parking_lot_realtime` 행의 존재 여부다.

> **현재 `realtime_available` 은 아무도 `true` 로 만들지 않아 항상 `false` 다.**
> 생성자에도 없고 갱신하는 코드도 없다. 채워서 쓰거나 컬럼을 없애거나 **둘 중 하나를 정해야 한다.**

### 6. 값이 없을 수 있는 컬럼

| 컬럼 | 왜 비는가 |
|---|---|
| `latitude` `longitude` | 지오코딩이 주소를 찾지 못한 경우. 좌표가 없으면 거리 계산에서 빠진다 |
| `address` `tel` | 원본이 비워서 내려주는 주차장이 있다 |
| `Fee` 의 각 컬럼 | 무료이거나 원본에 요금이 없는 경우 |
| `source_updated_at` | 원본이 갱신 시각을 안 주는 경우 |

**"값이 없다"를 문구로 바꾸는 일은 하지 않는다.** 백엔드는 없는 값을 그대로 내려주고,
"전화 문의" · "정보 없음" 같은 표현은 프론트엔드가 정한다.

### 7. 이력을 남기지 않는다

`parking_lot_realtime` 은 주차장당 **한 행만** 유지하고 계속 덮어쓴다. 지난 값은 남지 않는다.

- 원본이 스냅샷만 제공해서, 우리가 쌓아도 **비어 있는 구간이 생긴다**
- MVP 범위에 혼잡 예측이 없어 과거 값을 쓸 곳이 없다
- 이력이 필요해지면 이 테이블은 그대로 두고 **적재 이력 테이블을 따로 만든다**
