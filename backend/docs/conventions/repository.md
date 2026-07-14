# 리포지토리(Repository) 작성 규칙
ChaSeWar 백엔드에서 Spring Data JPA 리포지토리를 만들 때 지키는 규칙
- 리포지토리는 `<도메인>/repository`에 둔다.

## 1. 인터페이스
- `public interface XxxRepository extends JpaRepository<Entity, Long>` (Spring Data JPA).
- **`@Repository`는 붙이지 않는다** — Spring Data가 자동 등록·예외 변환.

## 2. 트랜잭션 소유권
- 리포지토리엔 `@Transactional`을 붙이지 않는다. **트랜잭션 경계는 서비스가 소유.**
- 서비스: 클래스에 `@Transactional(readOnly = true)`, **쓰기 메서드에만** `@Transactional`.

## 3. 쿼리 작성 정책
- **정적·단순**: 파생 쿼리(메서드명, 예: `findByPkltCd`) 우선.
- **정적·복잡**(조인·프로젝션): `@Query`(JPQL).
- **동적**(조건 조합): **QueryDSL**. (의존성·Q타입 생성 설정은 처음 필요할 때 추가)
- **대량·DB 특화**(예: 대량 upsert): native SQL vs `JdbcTemplate` — 그 작업 시 상의해 결정.

## 4. 반환 타입
- 단건: `Optional<Entity>` (null 반환 금지).
- 다건: `List<Entity>`.

## 5. 메서드 추가 (just-in-time)
- 커스텀 쿼리 메서드는 **호출자(서비스)가 필요로 할 때** 추가한다. 미리 만들지 않는다.

## 6. 테스트
- `@DataJpaTest` 슬라이스로 **커스텀 쿼리를 테스트** (커스텀 쿼리가 생길 때만; 단순 CRUD·매핑은 `validate`가 커버).
- `@DisplayName`(한글)·`@Nested`로 조직화, `DatabaseCleaner`+Fixture 빌더 활용.