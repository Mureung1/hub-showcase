## 리포지토리(Repository) 작성 규칙

Spring Data JPA 리포지토리를 만들 때 지키는 규칙. 모든 도메인에 공통 적용한다

- 리포지토리는 `<도메인>/repository`에 둔다.
- 예:는 이해를 돕기 위한 것이다.

### 1. 인터페이스

- `public interface XxxRepository extends JpaRepository<Entity, Long>`.
- **`@Repository`는 붙이지 않는다** — Spring Data가 자동 등록·예외 변환한다.

### 2. 트랜잭션 소유권

- 리포지토리엔 `@Transactional`을 붙이지 않는다. 트랜잭션 경계는 **서비스가 소유**한다.

### 3. 쿼리 작성 정책

- **정적·단순**: 파생 쿼리(메서드명)를 우선한다.
    - 예: `findByPkltCd`, `findByCoordinatesLatitudeIsNull`
- 복잡한 조건의 쿼리는 상황에 맞게 판단 후 이하 3가지 방법 중 하나를 사용한다.
    - **정적·복잡**(조인·프로젝션): `@Query`(JPQL).
    - **동적**(조건 조합): QueryDSL.
    - **대량·DB 특화**(대량 upsert 등): JPA 대신 **전용 JDBC 리포지토리**로 분리한다.

### 4. 반환 타입

- 단건: `Optional<Entity>` (null 반환 금지).
- 다건: `List<Entity>`.

### 5. 테스트

- 파생 쿼리·JPA 기본 메서드(`findById`·`save` 등)는 **전용 테스트를 두지 않는다** — 프레임워크가 생성·보장하는 저위험 대상이고, 서비스 통합 테스트가 실제로 실행하며 겸사겸사 검증한다.
- **직접 쓴 `@Query`·복잡 쿼리만** `@DataJpaTest` 슬라이스로 격리 테스트한다.