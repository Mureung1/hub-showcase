---
name: backend-test-scaffold
description: Generates JUnit/Spring Boot test scaffolding for SpendMate backend service methods, following this project's established test conventions (@SpringBootTest + @Transactional, Korean descriptive test names, given-when-then structure, plain JUnit Jupiter assertions). Use this skill whenever writing a test for a new or not-yet-implemented Service method — especially for TDD, where the test is written before the implementation exists. Trigger when the user asks to "테스트 짜줘", "테스트코드 만들어줘", "TDD로 하자", "이 메서드 테스트 스캐폴드 만들어줘", or when starting work on a new Service method that needs test coverage before/alongside implementation.
---

# Backend Test Scaffold

SpendMate 백엔드(`SpendMate/be`)의 서비스 레이어 테스트를 만들 때 따르는 규칙. `SubscriptionServiceTest.java`(`src/test/java/com/spendmate/service/`)에서 이미 확립된 패턴을 그대로 따른다 — 새 테스트마다 스타일이 흔들리지 않게 하는 게 이 스킬의 목적이다.

## 기본 구조

```java
package com.spendmate.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class 대상서비스명Test {

    @Autowired
    private 대상서비스 target;

    @Test
    void 한글로_시나리오를_서술하는_테스트명() {
        // given: 테스트에 필요한 선행 데이터 준비
        // when: 테스트 대상 메서드 호출
        // then: 결과 검증
    }
}
```

- **위치**: `src/test/java/com/spendmate/<main과 동일한 하위 패키지>/<클래스명>Test.java` — main 코드와 미러링되는 패키지 구조를 그대로 따른다.
- **`@SpringBootTest`**: 실제 스프링 컨텍스트(로컬 Postgres 연결 포함)를 통째로 띄운다. 이 프로젝트엔 `@DataJpaTest`용 인메모리 DB나 Testcontainers가 없으므로, 테스트 실행 전 로컬 Postgres가 켜져 있어야 한다(`open -a Postgres`).
- **`@Transactional`을 클래스에 붙인다**: 각 테스트 메서드가 끝나면 자동으로 롤백되어, 테스트 데이터가 실제 개발 DB에 남지 않는다. 수동 cleanup 코드를 따로 짤 필요 없음.
- **assertion은 순수 JUnit Jupiter만 사용**한다(`assertEquals`/`assertTrue`/`assertFalse`/`assertThrows`). 이 프로젝트는 `spring-boot-starter-test`(AssertJ 포함) 대신 세분화된 스타터(`data-jpa-test`, `validation-test`, `webmvc-test`)를 쓰고 있어 AssertJ가 없을 수 있다 — 확실치 않으면 plain JUnit으로 간다.
- **테스트 메서드명은 한글 서술형**으로 짓는다 (예: `구독을_등록하면_목록에서_조회된다`, `존재하지_않는_id를_수정하면_예외가_발생한다`). 영문 camelCase와 섞지 않는다.

## 실행 전 환경변수 로드 필수

`@SpringBootTest`가 `application.yml`의 `${CLAUDE_API_KEY}` 같은 플레이스홀더를 해석 못 하면 컨텍스트 로딩 자체가 실패한다(`PlaceholderResolutionException`). 테스트 실행 전 반드시:

```bash
export $(cat .env | xargs) && ./gradlew test --tests "클래스명"
```

## TDD로 쓸 때 (테스트가 구현보다 먼저 오는 경우)

1. 아직 존재하지 않는 Service 메서드를 테스트 코드에서 먼저 호출한다 — 컴파일 에러가 나는 게 정상이다.
2. 컴파일이 통과하는 최소한의 메서드 시그니처만 먼저 만든다(본문은 비어있거나 더미 리턴).
3. 테스트를 실행해 **실패하는 것을 확인**한다(빨간불) — 이 단계를 건너뛰지 않는다. 테스트가 처음부터 통과하면 그 테스트가 뭔가를 검증 못 하고 있다는 신호다.
4. 실제 로직을 구현해서 테스트를 통과시킨다(초록불).
5. 필요하면 리팩터링하되, 테스트는 계속 통과 상태를 유지한다.

## 항상 챙길 엣지케이스

Service 메서드에 유효성 검증(`validate()` 스타일)이 있다면, 다음 세 종류를 최소한으로 커버한다:
- **정상 케이스**: 성공적으로 동작하는 기본 흐름
- **경계/잘못된 입력**: 검증 로직이 있다면 그걸 건드리는 값(예: 범위 밖 숫자, 빈 문자열) → 예외 발생 확인
- **존재하지 않는 대상**: id로 조회/수정/삭제하는 메서드라면 없는 id에 대해 `NoSuchElementException` 등이 발생하는지 확인

## 검증을 약하게 만들지 않기

`list.stream().anyMatch(...)`처럼 "그런 게 하나라도 있으면 통과"하는 방식은, 이미 DB에 같은 이름의 데이터가 우연히 있으면 실제 로직이 고장 나도 테스트가 통과해버리는 **false positive** 위험이 있다(`SubscriptionServiceTest` 코드리뷰에서 실제로 지적됐던 부분). 가능하면:
- 메서드가 반환하는 엔티티/DTO의 **id를 직접 캡처**해서, 그 id로 정확히 매칭해 검증한다.
- 생성 전후의 **개수 변화**(`size()` 비교)까지 같이 확인하면 더 안전하다.
