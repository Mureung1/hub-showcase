## DTO 작성 규칙

API 요청·응답에 쓰는 DTO를 만들 때 지키는 규칙. 모든 도메인에 공통 적용한다

- DTO는 `<도메인>/dto`에 둔다.
- 예:는 이해를 돕기 위한 것이다.

### 1. record로 만든다

- 응답 DTO는 **불변 `record`** 로 만든다.
    - 예: `ParkingLotSearchResponse`, `ParkingLotDetailResponse`

### 2. 변환은 정적 팩토리 `from()`

- 엔티티 → DTO 변환은 DTO의 **정적 팩토리 `from()`** 이 소유한다. 엔티티·서비스에 변환 책임을 두지 않는다.
    - 예: `ParkingLotDetailResponse.from(parkingLot)`
- `@Embedded` VO를 감싸는 `from()`은 `null`을 먼저 처리한다 (전 컬럼이 `null`이면 VO 자체가 `null`).

### 3. 도메인 타입을 응답에 직접 노출하지 않는다

- 응답 DTO는 도메인 타입(엔티티·VO)을 그대로 담지 않고, 항상 응답 전용 타입으로 변환한다.
  - 엔티티: `from()`으로 변환(위 2). 예: `ParkingLot` → `ParkingLotDetailResponse`.
  - VO: 별도 `~Response` record로 변환. 예: `Fee` → `FeeResponse`, `OperatingHours` → `OperatingHoursResponse`.
- 행동 없는 순수 데이터 VO도 예외 없이 변환한다.
- 타입명은 `~Response`, 필드명(JSON 키)은 도메인 언어를 따른다.
    - 예: 타입 `FeeResponse`, 필드 `fee` → JSON `"fee": { ... }`

### 4. 원본 값·사실만 내려준다 (표현 판단은 프론트)

- 값은 원본 그대로 내려주고, 화면 표시용 포맷은 프론트가 한다.
    - 예: 시간은 `"0900"`(원본) → 프론트가 `"09:00"`으로 표시.
- enum은 이름 문자열로 내려준다.
    - 예: `payType` → `"PAID"` (`PayType.name()`)
- 백엔드는 사실(fact)만 내려주고, 값을 화면에 어떻게 보여줄지는 정하지 않는다.
    - 예: 요금이 `0`일 때 "전화 문의"/"무료"/"0원" 중 무엇으로 안내할지는 프론트가 판단.
- **경계 기준**: "이 판단이 화면 밖에서도 의미 있는가"로 나눈다.
  - 데이터 성격에 대한 판단(범위·필수)은 백엔드가, 화면 표현(문구·포맷)은 프론트가 한다.

### 5. 필드 선택

- 각 화면·용도에 **필요한 필드만** 담는다. 같은 엔티티라도 용도별로 DTO를 나눈다.
    - 예: 검색 결과(`id`·`name`·`address`·`distance`·`payType`) vs 상세(요금·운영시간 등 전체).