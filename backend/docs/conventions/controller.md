## 컨트롤러(Controller) 작성 규칙

HTTP 요청을 받는 API 컨트롤러를 만들 때 지키는 규칙. 모든 도메인에 공통 적용한다

- 컨트롤러는 `<도메인>/api`에 둔다.
- 예:는 이해를 돕기 위한 것이다.

### 1. 기본 골격

- `@RestController` + `@RequestMapping("/api/<자원>")` + `@RequiredArgsConstructor`.
- 클래스명은 `XxxController`, 서비스를 `final` 필드로 생성자 주입한다.
    - 예: `ParkingLotController` → `/api/parking-lots`

### 2. RESTful 설계

- URL은 **행위가 아니라 자원(명사)** 으로 표현하고, 컬렉션은 **복수형 + 케밥 케이스**로 짓는다.
    - 예: `/api/parking-lots` (O) / `/api/getParkingLots` (X)
- 행위는 **HTTP 메서드**로 표현한다 — 조회 `GET`, 생성 `POST`, 수정 `PUT`·`PATCH`, 삭제 `DELETE`.
- 특정 자원은 경로 변수로 식별한다.
    - 예: `GET /api/parking-lots/{id}` (단건 조회)
- 응답 상태 코드는 결과에 맞게 쓴다 — 조회·성공 `200`, 생성 `201`, 내용 없음 `204`, 잘못된 요청 `400`, 없음 `404`.

### 3. 얇은 컨트롤러 (위임만)

- 컨트롤러는 **요청을 받아 서비스에 위임하고 응답을 반환**하는 역할만 한다. 비즈니스 로직을 두지 않는다.
- 검증·거리 계산·분기 등은 서비스·도메인이 담당한다.

### 4. 요청 매핑

- 매핑 애노테이션(`@GetMapping` 등)으로 메서드를 자원 경로에 연결한다.
- 경로 변수는 `@PathVariable`, 쿼리 파라미터는 `@RequestParam`으로 받는다.
    - 예: `@GetMapping("/{id}")` + `@PathVariable Long id`

### 5. 반환

- 응답 **DTO를 반환**한다.
- 엔티티를 직접 반환하지 않는다.
    - 서비스가 이미 DTO로 변환

### 6. 예외 처리 (전역 핸들러에 위임)

- 컨트롤러에서 `try-catch`로 예외를 처리하지 않는다.
- 서비스가 던진 예외는 **전역 예외 핸들러**가 `ErrorCode` → HTTP 상태 + 응답 코드로 변환한다.
    - 예: 없는 리소스 → `404` + `{ "code": "NOT_FOUND_PARKING_LOT" }`

### 7. 테스트

- **전체 통합**(`@SpringBootTest` + `MockMvc`)으로 테스트한다 — 진짜 서비스·DB가 돌고, 외부 클라이언트만 `@MockitoBean`으로 대체한다.
- 이 계층의 책임(상태코드·JSON 직렬화·에러 계약)을 **대표 케이스**로 검증한다: 성공(`200`)·실패(`404` 등)·잘못된 요청(`400`).
- 비즈니스 로직(필터·정렬 등)은 재검증하지 않는다 (서비스 테스트가 담당).