---
name: chasewar-backend
description: 차세워(ChaSeWar) 백엔드(Spring Boot) 코드를 작성할 때 사용. 확정된 스택·구조·규칙에 맞게 일관된 백엔드를 만들기 위함.
---

# ChaSeWar 백엔드 규칙

## 스택
- Java 21, Gradle, Spring Boot 3.2+
- Spring Web(REST), Spring Data JPA + MySQL, Validation, Lombok
- 외부 API 호출: RestClient (비동기 필요 시 WebClient)
- 실시간 수집: `@Scheduled`

## 아키텍처
- 계층이 아니라 **도메인 단위**로 최상위 패키지를 나눈다 — `parking` · `place`, 공통은 `global`.
- 도메인 안은 계층으로 나눈다 — `api` · `service` · `repository` · `domain`(+`vo`) · `dto` · `infra`.
- 의존은 `api → service → repository → domain` **한 방향**. 도메인은 어떤 계층도 모른다.
- 외부 연동은 **인터페이스(포트)로 의존**하고 구현은 `infra`에 둔다. 벤더 이름은 구현체에만.

## API
- REST 리소스는 명사: `/api/parking-lots`, `/api/parking-lots/{id}`
- 응답은 항상 DTO. 엔티티 직접 반환 금지.
- HTTP 상태코드 정확히 (200/400/404/500).

## 테스트
- 비즈니스 규칙·동작을 담은 코드(도메인 로직·서비스·컨트롤러 등)는 **작성 직후 테스트로 검증**한다. 수동 확인으로 대체하지 않는다.
- 프레임워크가 보장하는 것·단순 위임·의미 없는 데이터 홀더(getter·단순 DTO·JPA 기본 메서드 등)는 테스트하지 않는다.
- 메서드명은 `success_`·`fail_` + 짧은 키워드, 상세 시나리오는 `@DisplayName`(한글)에 쓴다.
- 본문은 given / when / then으로 나누고, 결과는 **대표 필드만** 검증한다.

## 외부 연동 · 실시간
- 장소 검색: 카카오 키워드 검색 — 후보 목록을 내려주고 **사용자가 고른다**
- 지오코딩: 카카오 주소 검색 (주소→좌표) — 적재용이라 첫 결과 사용
- 도보 거리: Tmap 보행자 경로 — 목록은 병렬 조회, **실패하면 직선거리로 폴백**
- 거리 계산: Haversine
- 적재: 정적은 매일 새벽, 실시간은 2분 주기. 둘 다 `@Scheduled` + upsert
- 외부 API 키는 환경변수로, 커밋 금지

## 검증 · 예외
- 요청 검증은 `@Valid` + Bean Validation
- 예외는 `global`의 공통 처리(`@RestControllerAdvice`)로 일관되게

## 하지 말 것
- 컨트롤러에 비즈니스 로직
- 엔티티를 요청/응답에 직접 노출
- 외부 API 키 하드코딩/커밋
- 도메인 간 순환 참조
