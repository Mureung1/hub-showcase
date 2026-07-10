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
- 패키지는 도메인형: `parking` / `geocoding` / `realtime` / `walktime` / `global`
- 각 도메인 안에 `controller` / `service` / `repository` / `domain`(엔티티) / `dto`
- 공통(설정·예외·외부 API 클라이언트)은 `global`

## API
- REST 리소스는 명사: `/api/parking-lots`, `/api/parking-lots/{id}`
- 응답은 항상 DTO. 엔티티 직접 반환 금지.
- HTTP 상태코드 정확히 (200/400/404/500).

## 영속성
- 엔티티: `parking_lot`(정적, OA-13122), `parking_realtime`(실시간, OA-21709)
- 엔티티는 `domain` 패키지, setter 지양(생성자/정적 팩터리)
- 조회 전용은 `@Transactional(readOnly = true)`

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
