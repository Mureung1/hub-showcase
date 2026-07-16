---
name: chasewar-backend
description: 차세워(ChaSeWar) 백엔드(Spring Boot) 코드를 작성하거나 리뷰할 때 사용. 확정된 스택·구조·규칙에 맞게 일관된 백엔드를 만들기 위함.
---

# ChaSeWar 백엔드 규칙

## 스택
- Java 21, Gradle, Spring Boot 3.2+
- Spring Web(REST), Spring Data JPA + MySQL, Validation, Lombok
- 외부 API 호출: RestClient (비동기 필요 시 WebClient)
- 실시간 수집: `@Scheduled`

## 아키텍처
- 계층: Controller → Service → Repository. 상위→하위 단방향 의존만.
- 패키지는 도메인형: 비즈니스 도메인 `parking`, 공통 `global`.
  - 외부 API 클라이언트: **데이터 소스는 도메인 안**(`parking/infra/seoul`) 
  - **범용 기술 도구는 `global/infra`**(`geocoding`·`placesearch`)
  - 연동 내부 = 인터페이스 최상위 + 벤더 하위폴더(`kakao/`).
- 각 도메인 안에 `api` / `service` / `repository` / `domain`(엔티티) / `dto`

## API
- REST 리소스는 명사: `/api/parking-lots`, `/api/parking-lots/{id}`
- 응답은 항상 DTO. 엔티티 직접 반환 금지.
- HTTP 상태코드 정확히 (200/400/404/500).

## 엔티티/도메인
- 엔티티/도메인 모델 작성 규칙은 `backend/docs/conventions/domain.md`를 따른다

## `Repository`
- `Repository` 작성 규칙은 `backend/docs/conventions/repository.md`를 따른다.

## 외부 연동 · 실시간
- 지오코딩: 네이버 지역검색 (목적지→좌표), 첫 결과 사용
- 도보 시간: Tmap 보행자 경로 (상세 화면)
- 거리 계산: Haversine
- 실시간 대수: `@Scheduled`로 주기 수집 후 upsert
- 외부 API 키는 환경변수로, 커밋 금지

## 검증 · 예외
- 요청 검증은 `@Valid` + Bean Validation
- 예외는 `global`의 공통 처리(`@RestControllerAdvice`)로 일관되게

## 하지 말 것
- 컨트롤러에 비즈니스 로직
- 엔티티를 요청/응답에 직접 노출
- 외부 API 키 하드코딩/커밋
- 도메인 간 순환 참조
