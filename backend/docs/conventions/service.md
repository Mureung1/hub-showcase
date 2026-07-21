## 서비스(Service) 작성 규칙

비즈니스 로직을 담는 서비스를 만들 때 지키는 규칙. 모든 도메인에 공통 적용한다

- 서비스는 `<도메인>/service`에 둔다.
- 예:는 이해를 돕기 위한 것이다.

### 1. 기본 골격

- `@Service` + `@RequiredArgsConstructor` + `final` 필드로 **생성자 주입**한다. 필드 주입은 금지한다.
- 로깅이 필요하면 `@Slf4j`.
- 의존성은 **인터페이스(포트)** 로 받고, 서비스는 그 결과만 사용한다.
    - 외부 연동은 클라이언트 인터페이스로 주입받는다.

### 2. 서비스 분리 (책임 단위)

- **엔티티 단위 서비스** 하나에 **사용자 요청으로 실행되는 유스케이스**(조회·등록·수정 등)를 모은다.
    - 예: `ParkingLotService` = 검색 + 상세 조회
- **스케줄·배치로 실행되는 백그라운드 작업**은 별도 서비스로 분리한다.
    - 예: `ParkingLotLoadService`(적재), `ParkingLotGeocodingService`(좌표 매핑)

### 3. 트랜잭션 (서비스가 경계 소유)

- 트랜잭션 경계는 서비스가 소유한다 (리포지토리엔 붙이지 않음).
- 조회는 `@Transactional(readOnly = true)`, 쓰기는 `@Transactional`.

### 4. 예외

- 실패 상황(비즈니스 규칙 위반·리소스 없음 등)은 **에러 코드를 담은 공용 런타임 예외**로 던진다.
    - 예: `throw new ChasewarException(NotFoundErrorCode.NOT_FOUND_PARKING_LOT)`
- 에러 코드가 HTTP 상태·응답 코드를 소유하고, **예외 → HTTP 응답 변환은 전역 예외 핸들러가 전담**한다. 서비스는 상태코드를 알지 못한다.
    - 예: `ErrorCode` enum + `@RestControllerAdvice`

### 5. 반환 (엔티티 노출 금지)

- 서비스는 **응답 DTO**를 반환한다. 엔티티를 컨트롤러로 직접 내보내지 않는다.
- 엔티티 → DTO 변환은 DTO의 정적 팩
    - 예: `ParkingLotDetailResponse.from(parkingLot)`

### 6. 스케줄링

- 주기 작업은 **서비스 메서드에 `@Scheduled`** 를 직접 붙인다.
    - 예: `@Scheduled(cron = DAILY_
- 다중 인스턴스 중복 실행 방지나 스케줄 로직 확장이 필요해지면 **별도 스케줄러 컴포넌트로
  분리**하고 분산 락(ShedLock)·외부

### 7. 상수

- 매직 넘버(반경·최대 개수·페이지  atic final` 상수로 뽑는다.
    - 예: `SEARCH_MAX_RADIUS_METERS`, `MAX_RESULTS_COUNT`, `PAGE_SIZE`

### 8. 테스트

- **DB에 무관한 로직**(예외 분기 등)은 **단위 테스트**(Mockito `@Mock`·`@InjectMocks`)로 검증한다.
- **DB에 의존하는 로직**(쿼리·매핑·**(Testcontainers)로 검증하고, 외부클라이언트만 `@MockitoBean`으로 대체한다.
- 한 서비스의 두 성격 테스트는 `...nTest`로 나눈다.