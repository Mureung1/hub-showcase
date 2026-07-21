## 도메인 모델(엔티티) 작성 규칙

JPA 엔티티·값 객체(VO)·`enum`을 만들 때 지키는 규칙. 모든 도메인에 공통 적용한다

- 엔티티는 `<도메인>/domain`, VO·enum은 `<도메인>/domain/vo`에 둔다.
- 예:는 이해를 돕기 위한 것이다.

### 1. 엔티티 기본 골격

- `@Entity` + `@Getter`(Lombok) + `@NoArgsConstructor(access = AccessLevel.PROTECTED)`.
- Setter 금지. 상태 변경은 의도가 드러나는 메서드로만 한다.
  - 예: 좌표 주입은 `assignCoordinates(...)`
- 공통 감사 필드(생성·수정 시각 등)는 `BaseEntity`를 상속해 얻는다.
- 기본 생성자를 `PROTECTED`로 막고, 값 생성은 업무 생성자로 한다.
  - 호출자가 생길 때 just-in-time 추가

### 2. 식별자

- 대리키를 PK로 쓴다.
  - `Long id` + `@GeneratedValue(strategy = GenerationType.IDENTITY)` (MySQL AUTO_INCREMENT)
- 외부 데이터의 고유 코드(업무키)는 별도 필드로 두고 DB unique 제약을 건다.
- 업무키를 PK로 쓰지 않는다 — 외부 사정으로 바뀔 수 있으니 내부 대리키와 분리한다.
  - 예: `ParkingLot` = `id`(대리키) + `pkltCd`(주차장 코드, 업무키)

### 3. 매핑 애노테이션은 최소로

- 기본 네이밍 전략(camelCase → snake_case)·기본값으로 충분하면 `@Table`·`@Column`을 생략한다.
- 길이·제약·컬럼명 등이 기본과 달라야 할 때만 애노테이션을 붙인다.
- 실제 컬럼명·제약의 소유권은 Flyway 마이그레이션에 있다 (아래 6).

### 4. 값 객체(VO)

- 비즈니스적으로 의미 있고 개념적으로 한 덩어리인 필드 묶음은 `record` + `@Embeddable`로 만들고, 엔티티에서 `@Embedded`로 포함한다.
- `record`로 만들어 불변성을 보장한다 (값 무결성).
  - 예: 요금 `Fee`, 운영시간 `OperatingHours`, 좌표 `Coordinates`

### 5. Enum 매핑

- 외부 데이터의 범주형 코드 값은 `enum`으로 만든다.
- 형식: (`code`, `description`) 필드 + `@Getter` `@RequiredArgsConstructor`
- 엔티티 필드엔 `@Enumerated(EnumType.STRING)` — 이름으로 저장한다. `ordinal` 금지(순서 바뀌면 데이터가 깨짐).
- 예상 못한 코드에도 배치 적재가 죽지 않도록 `UNKNOWN` 폴백을 두고 `fromCode(String)`으로 변환한다. (`fromCode`는 호출자가 생길 때 just-in-time 추가)
  - 예: 주차장 종류·운영 형태·유료 여부

### 6. 스키마·DDL 관리

- 스키마 소유권은 Flyway 마이그레이션(`db/migration/V*.sql`). JPA는 `ddl-auto=validate`로 검증만 한다.
- 마이그레이션 파일은 공유(커밋·푸시)된 뒤엔 불변 — 수정하지 말고 새 버전(`V n+1`)을 추가한다.
  - 아직 로컬 전용이면 수정 후 로컬 DB 초기화 가능
- 엔티티 필드명이 바뀌면 마이그레이션으로 컬럼명을 정합시키고, 부팅 시 `validate` 통과로 확인한다.

### 7. 데이터 저장 철학 (원본 저장 · 가공은 읽기 계층)

- 외부 데이터는 원본을 저장하고, 표시용 가공·비즈니스 변환은 읽기 계층(조회 DTO·서비스)에서 한다.
- 저장 시엔 후속 처리(지오코딩·확장·검색)에 필요한 최소 정규화만 한다.
  - 예: 원본 명칭을 그대로 저장하고 표시용 접미사 제거는 응답 DTO에서 / 주소에 시(市) prefix를 붙여 저장(지오코딩 대비) / 주소에서 구(區) 토큰을 파싱해 별도 필드로

### 8. 네이밍

- 클래스 PascalCase, 필드·메서드 camelCase.
- `boolean` 필드는 형용사/능동형으로 짓는다. 수동태(`~Provided`)·`is` 접두사는 지양 — Lombok getter가 자연스럽게 읽히도록.
  - 예: `realtimeAvailable`