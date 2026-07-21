## 아키텍처 개요

백엔드의 패키지 구조·계층 책임·의존 방향을 정리한다. 계층별 상세 규칙은 `backend/docs/conventions/`의 각 문서(`domain.md`·`repository.md`·`service.md`·`controller.md`·`dto.md`)를 참고한다.

### 1. 패키지 구조 (도메인 기반)

- 계층이 아니라 **도메인(기능) 단위**로 최상위 패키지를 나눈다. 공통·횡단 관심사는 `global`에 둔다.

        com.chasewar
        ├── global/              공통·횡단 관심사
        │   ├── config/          설정
        │   ├── domain/          공통 도메인 (예: BaseEntity)
        │   ├── exception/       예외 체계 (+ errorcode)
        │   └── infra/           공용 외부 연동 (예: 지오코딩·장소검색)
        └── parking/             주차장 도메인
            ├── api/             컨트롤러
            ├── service/         서비스
            ├── repository/      리포지토리
            ├── domain/          엔티티 (+ vo)
            ├── dto/             응답 DTO
            └── infra/           도메인 특화 외부 연동

- 새 도메인이 생기면 `parking`과 같은 형태의 패키지를 하나 더 만든다.

### 2. 계층과 책임

| 계층 | 패키지 | 책임 |
|---|---|---|
| 컨트롤러 | `api` | HTTP 요청 수신·응답 (얇게, 위임만) |
| 서비스 | `service` | 비즈니스 로직·트랜잭션 경계 |
| 리포지토리 | `repository` | 영속성 접근 |
| 도메인 | `domain`(+`vo`) | 엔티티·값 객체·enum |
| DTO | `dto` | 계층 경계 데이터 (응답 등) |
| 인프라 | `infra` | 외부 API 연동 (포트·어댑터) |

### 3. 의존 방향

- 요청 흐름을 따라 **한 방향으로만** 의존한다.
    - `api → service → repository → domain`
- 바깥 계층이 안쪽을 알고, 도메인은 어떤 계층에도 의존하지 않는다.

### 4. 외부 연동 (포트 · 어댑터)

- 서비스는 외부 시스템을 **인터페이스(포트)** 로만 의존하고, 구현(어댑터)은 `infra`에 둔다.
    - 예: `PlaceSearchClient`(포트) ← `KakaoPlaceSearchClient`(어댑터, `infra/placesearch/kakao`)
- 공용 연동은 `global/infra`, 특정 도메인 전용 연동은 `<도메인>/infra`.

### 5. global (횡단 관심사)

- 여러 도메인이 공유하는 것만 `global`에 둔다 — 설정, 공통 엔티티(`BaseEntity`), 예외 체계, 공용 외부 연동.
- 특정 도메인에만 쓰이는 것은 그 도메인 패키지에 둔다.

### 6. 전역 원칙

- **Just-In-Time**: 지금 필요한 코드만 만든다. 호출자가 없는 헬퍼·메서드·클래스를 미리 만들지 않고, 쓰는 곳이 생길 때 함께 추가한다.