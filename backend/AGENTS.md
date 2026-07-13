# 백엔드 에이전트 지침

이 문서는 저장소 공통 규칙을 `backend/` 범위에서 더 엄격하게 적용한다.

## 런타임과 빌드 불변식

- Gradle daemon, toolchain, compilation release와 모든 테스트 JVM은 Java 17을 사용한다.
- Gradle은 저장소 루트의 Wrapper로만 실행한다.
- Spring Boot는 저장소에 고정된 3.5.x line을 유지하고 동적 버전과 SNAPSHOT을
  추가하지 않는다.
- Flyway SQL이 스키마 정본이며 Hibernate는 `ddl-auto=validate`를 유지한다.

## 구현 허용 조건

- 현재 공개 endpoint는 Actuator health와 Prometheus뿐이다.
- 비즈니스 Controller는 `docs/contracts.md`의 계약이 `specified`이고 연결된 `PP-*`
  Issue와 Work Record가 있을 때만 추가한다.
- Controller, application, domain, adapter 변경과 단위·통합·계약 테스트 및 문서
  갱신을 같은 PR에 포함한다.
- `specified` 표시는 구현 완료가 아니다. 구현과 자동 검증이 끝난 뒤에만 계약을
  `implemented`로 변경한다.

## 아키텍처와 외부 연동 안전

- Controller는 변환과 위임만 수행하며 도메인은 HTTP·JPA·외부 DTO에 의존하지 않는다.
- Naver와 LLM 연동은 `placepick.external` 설정 경계와 application port 뒤에 둔다.
- 외부 호출은 DB transaction 안에서 수행하지 않는다.
- `local`, `test`, `load` profile은 `mock` mode와 loopback 또는 Compose mock host만
  사용한다. 테스트를 통과시키기 위해 시작 안전장치를 약화하지 않는다.
- 실제 provider는 승인된 `staging-live` profile에서만 활성화하며 host allowlist와
  kill switch를 적용한다.
- source, fixture, log와 문서에 credential, 실제 secret, 개인정보나 운영 데이터를
  넣지 않는다.

## 검증

- `./gradlew test`: Docker 없는 빠른 단위 테스트
- `./gradlew integrationTest`: PostgreSQL·Redis Testcontainers와 WireMock 계약 테스트
- `./gradlew evalTest`: 결정적 JSONL fixture와 정책 검증
- `./gradlew check`: 전체 백엔드 검증 gate

결정적 규칙에는 단위 테스트, 인프라 wiring·HTTP 계약에는 통합 테스트를 추가한다.
측정 가능한 LLM·추천 정책에는 정상, 경계, 거부와 adversarial Eval fixture를 함께
추가한다.
