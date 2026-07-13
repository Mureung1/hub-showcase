# 도메인 모델(엔티티) 작성 규칙
ChaSeWar 백엔드에서 JPA 엔티티·값 객체(VO)·enum을 만들 때 지키는 규칙
- `ParkingLot`을 기준 예시로 삼는다.
- 엔티티는 `<도메인>/domain`, VO·enum은 `<도메인>/domain/vo`에 둔다.

## 1. 엔티티 기본 골격
- `@Entity` + `@Getter`(Lombok) + `@NoArgsConstructor(access = AccessLevel.PROTECTED)`.
- **Setter 금지.** 상태 변경은 의도가 드러나는 메서드로만 한다.
- 공통 감사 필드는 `BaseEntity`를 상속해 얻는다
- 기본 생성자를 PROTECTED로 막고, 값 생성은 **업무 생성자**로 한다. (호출자가 생길 때 just-in-time 추가)

## 2. 식별자
- **대리키(surrogate key)**: `Long id` + `@GeneratedValue(strategy = GenerationType.IDENTITY)` (MySQL AUTO_INCREMENT).
- **업무키(business key)**: 외부 데이터의 고유 코드는 별도 필드로 두고 DB에서 unique 제약을 건다. (예: `pkltCd`)
- 업무키를 PK로 쓰지 않는다 — 외부 데이터 사정으로 바뀔 수 있으니 내부 대리키와 분리한다.

## 3. 매핑 애노테이션은 최소로
- 기본 네이밍 전략(camelCase → snake_case)·기본값으로 충분하면 `@Table`·`@Column`을 **생략**한다.
- 길이·제약·컬럼명 등이 **기본과 달라야 할 때만** 애노테이션을 붙인다.
- 실제 컬럼명·제약의 소유권은 Flyway 마이그레이션에 있다

## 4. 값 객체(VO)
- 비즈니스적으로 의미가 있고, 개념적으로 한 덩어리인 필드 묶음은 **`record` + `@Embeddable`** 로 만들고, 엔티티에서 `@Embedded`로 포함한다.
- 예: 요금(`Fee`), 운영시간(`OperatingHours`), 좌표(`Coordinates`).
- record로 만들어 불변성을 보장한다 (값 무결성).

## 5. Enum 매핑
- 외부 데이터의 **범주형 코드 값**(주차장 종류·운영 형태·유료 여부 등)은 enum으로 만든다.
- 형식: `(code, description)` 필드 + `@Getter @RequiredArgsConstructor`.
- 엔티티 필드엔 `@Enumerated(EnumType.STRING)` — 이름으로 저장한다. **`ordinal` 금지**(순서 바뀌면 데이터가 깨짐).
- 예상 못한 코드에도 배치 적재가 죽지 않도록 **`UNKNOWN` 폴백**을 두고 `fromCode(String)`으로 변환한다. (`fromCode`는 실제 호출자(로더·매퍼)가 생길 때 just-in-time 추가)

## 6. 스키마·DDL 관리
- 스키마 소유권은 **Flyway 마이그레이션**(`db/migration/V*.sql`). JPA는 `ddl-auto=validate`로 **검증만** 한다.
- 마이그레이션 파일은 **공유(커밋·푸시)된 뒤엔 불변** — 수정하지 말고 새 버전(V n+1)을 추가한다. (아직 공유 전 로컬 전용이면 수정 후 로컬 DB 초기화 가능)
- 엔티티 필드명이 바뀌면 마이그레이션으로 컬럼명을 정합시키고, 앱 부팅 시 `validate` 통과로 확인한다.

## 7. 데이터 저장 철학 (원본 저장 · 가공은 읽기 계층)
- 외부 데이터는 **가능한 한 원본 형태로 저장**하고, 표시용 가공이나 비즈니스 로직에 필요한 부분은 조회 DTO/서비스/엔티티에서 한다
- 예: `name`은 원본 저장(`(시)`/`(구)` 포함) → 응답 DTO에서 제거. `address`는 `"서울특별시 "` prefix를 붙여 저장(지오코딩·다지역 확장 대비). `district`는 원본 주소에서 구(區) 토큰을 파싱.

## 8. 네이밍
- 클래스 PascalCase, 필드·메서드 camelCase.
- boolean 필드는 **형용사/능동형**으로 짓는다(예: `realtimeAvailable`). 수동태(`~Provided`)·`is` 접두사는 지양 — Lombok getter가 자연스럽게 읽히도록.