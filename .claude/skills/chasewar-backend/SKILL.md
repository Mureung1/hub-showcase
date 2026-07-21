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
- 패키지 구조·계층 책임·의존 방향은 `.claude/skills/chasewar-backend/architecture.md` 참고.

## API
- REST 리소스는 명사: `/api/parking-lots`, `/api/parking-lots/{id}`
- 응답은 항상 DTO. 엔티티 직접 반환 금지.
- HTTP 상태코드 정확히 (200/400/404/500).

## 계층별 상세 규칙
- 도메인: `backend/docs/conventions/domain.md`
- 리포지토리: `backend/docs/conventions/repository.md`
- 서비스: `backend/docs/conventions/service.md`
- 컨트롤러: `backend/docs/conventions/controller.md`
- DTO: `backend/docs/conventions/dto.md`

## 테스트
- 비즈니스 규칙·동작을 담은 코드(도메인 로직·서비스·컨트롤러 등)는 **작성 직후 테스트로 검증**한다. 수동 확인으로 대체하지 않는다.
- 프레임워크가 보장하는 것·단순 위임·의미 없는 데이터 홀더(getter·단순 DTO·JPA 기본 메서드 등)는 테스트하지 않는다.
- 상세 규칙(종류·계층별 전략·케이스 도출·네이밍)은 `backend/docs/conventions/test.md` 참고.

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
