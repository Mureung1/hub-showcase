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

### 3. 순수 데이터 VO는 직접 재사용

- 행동 없는 순수 데이터 VO는 **별도 Response 타입을 만들지 않고 응답에 그대로 담는다** (JSON에서 중첩 객체로 직렬화됨).
    - 예: `Fee`·`OperatingHours`를 그대로 담아 `fee`·`operatingHours`로 중첩.
- **API 표현이 VO와 달라져야 할 때만**(필드 숨김·포맷 변경·추가) 별도 Response record를 도입한다. 그 전엔 만들지 않는다.

### 4. 원본 값 (표시 가공은 프론트)

- 값은 **원본 그대로** 내려주고, 화면 표시용 포맷은 프론트가 한다.
    - 예: 시간은 `"0900"`(원본) → 프론트가 `"09:00"`으로 표시.
- enum은 이름 문자열로 내려준다.
    - 예: `payType` → `"PAID"` (`PayType.name()`)

### 5. 필드 선택

- 각 화면·용도에 **필요한 필드만** 담는다. 같은 엔티티라도 용도별로 DTO를 나눈다.
    - 예: 검색 결과(`id`·`name`·`address`·`distance`·`payType`) vs 상세(요금·운영시간 등 전체).