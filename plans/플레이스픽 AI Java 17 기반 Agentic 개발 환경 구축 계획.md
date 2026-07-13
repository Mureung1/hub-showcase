# 플레이스픽 AI Java 17 기반 Agentic 개발 환경 구축 계획

## 요약

- 초기 범위는 **백엔드 개발 환경과 검증 하네스 구축**으로 제한한다. 추천·투표 등 비즈니스 기능과 프런트엔드 구현은 포함하지 않는다.
- 공식 기술 기준은 **Java 17 + Spring Boot 3.5.16 + Gradle Wrapper 8.14.4 + JUnit 5**로 통일한다. Spring Boot 3.5.16은 Java 17과 Gradle 8.4 이상을 지원하며, BOM이 JUnit 5.12.2와 Testcontainers 1.21.4를 관리한다. Gradle 8.14.4는 8.14 계열 보안 수정 패치이므로 8.14.3 대신 사용한다. ([Spring Boot 요구사항](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [관리 의존성](https://docs.spring.io/spring-boot/3.5/appendix/dependency-versions/coordinates.html), [Gradle 8.14.4](https://docs.gradle.org/8.14.4/release-notes.html))
- 호스트·Dev Container·Gradle daemon/toolchain·컴파일 산출물·CI를 모두 Java 17로 맞춘다.
- `documents/`는 기획 원문·참고 자료, 새 `docs/`는 개발 과정의 운영 정본으로 구분한다.

## 구현 변경

1. **원문과 기준 문서 정합성 확보**

   - 다음 6개 Java 21 표기를 모두 Java 17로 변경한다.
     - `documents/개발 환경.md`의 기술 스택, Dev Container 이미지, GitHub Actions, 최종 요약 4곳
     - `documents/기획안_spring.md`의 기술 스택 1곳
     - `documents/전체 구현 설계.md`의 최종 기술 구성 1곳
   - `개발 환경.md`에 이미 존재하는 사용자의 `(선택 사항)` 변경은 그대로 보존한다.
   - 선택 사항인 Codex 사용 방식, `.codex/config.toml`, `PLANS.md`, MCP, 작업 프롬프트 템플릿은 실제 환경에 만들지 않는다.
   - 비선택 영역의 트리·체크리스트·최종 요약에 남은 `PLANS.md`, `.codex/config.toml`, MCP 참조는 Work Record·Issue·ADR 흐름으로 교체한다.
   - 원문의 `main/develop` 전략은 확정된 GitHub Flow로 정정한다.
   - 기존 사용자의 미추적 HTML 프로토타입과 `src/components/ProjectIntro.jsx`는 변경하거나 이동하지 않는다.

2. **Java 17 Spring Boot 빌드 기반**

   - 루트 Gradle 멀티 프로젝트와 `backend` 애플리케이션을 Groovy DSL로 구성하고 모든 명령은 루트 `./gradlew`를 사용한다.
   - Java toolchain과 `options.release`를 모두 17로 고정하고, Java 17 이외의 daemon·compiler·test runtime이면 setup/check가 즉시 실패하게 한다.
   - Gradle Wrapper 8.14.4와 배포 SHA-256을 고정하고 동적 버전과 SNAPSHOT을 금지한다. Maven Central만 허용하며 dependency locking과 verification metadata를 커밋한다.
   - Spring Web MVC, Validation, JPA, Redis, Cache, Actuator, Prometheus Registry, Flyway를 포함하고 PostgreSQL 드라이버는 `runtimeOnly`로 둔다.
   - 테스트는 Spring Boot Test, JUnit 5, Testcontainers PostgreSQL/Core, WireMock 3.13.2를 사용한다. Redis는 Boot 관리 Testcontainers와 `GenericContainer`로 실행해 별도 비호환 Redis 모듈을 피한다.
   - Flyway를 DB 스키마 정본으로 사용하고 Hibernate는 `ddl-auto=validate`로 제한한다.
   - 환경 단계에서는 비즈니스 REST API를 만들지 않는다. 외부 공개 HTTP 표면은 `/actuator/health`, `/actuator/prometheus`뿐이며 계약 문서에는 나머지를 `planned`로 표시한다.

3. **재현 가능한 로컬 실행 하네스**

   - Java 17 Bookworm 기반 Dev Container에 Docker CLI, Git, curl, jq, make, shellcheck, GitHub CLI와 문서 검증용 Node 24를 설치한다. Gradle과 k6의 호스트 설치에는 의존하지 않는다.
   - Docker-outside-of-Docker 방식으로 Docker Desktop socket을 연결하고 `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal`을 설정한다.
   - VS Code에는 Codex, Java/Spring/Gradle, Docker/Dev Containers, REST Client, Markdown, Mermaid, GitHub Actions 확장을 고정한다.
   - `.gitattributes`, `.editorconfig`, `.gitignore`로 Windows에서도 셸 스크립트와 `gradlew`가 LF 및 실행 권한을 유지하도록 한다.
   - Compose 책임을 다음과 같이 분리한다.
     - 기본: PostgreSQL, Redis, Mock Naver, Mock LLM
     - Dev Container 오버레이: `dev` 서비스
     - 관측성 오버레이: Prometheus, Grafana
     - 부하 테스트 오버레이: 컨테이너형 k6
   - PostgreSQL 16, Redis 7.4, WireMock 3.13.2, Prometheus 3.13.1, Grafana 13.1.0, k6 2.1.0의 정확한 태그와 digest를 고정한다.
   - 모든 서비스에 healthcheck를 추가하고 `container_name`은 사용하지 않는다. 호스트 포트는 `127.0.0.1`에만 바인딩한다.
   - 로컬·테스트·부하 프로필은 `PLACEPICK_EXTERNAL_MODE=mock`을 강제한다. 실제 네이버·LLM 주소나 키가 들어오면 애플리케이션과 부하 스크립트가 실패하도록 한다.
   - `.env.example`에는 비밀이 아닌 예시만 두고 `.env`와 실제 키는 커밋하지 않는다.

4. **Agentic 작업 루프와 포트폴리오 문서화**

   - 루트 `AGENTS.md`에는 저장소 지도, 고정 명령, Java 17 기준, 아키텍처 불변식, 외부 API 안전 규칙, 문서 라우팅, 완료 정의를 간결하게 기록한다. `backend`에는 필요한 범위만 좁히는 중첩 지침을 둔다. 이는 계층형 AGENTS 지침을 따르는 구성이다. ([공식 AGENTS.md 안내](https://learn.chatgpt.com/docs/agent-configuration/agents-md))
   - 실제 개발 루프는 `문제 정의 → 구현 → 단위 테스트 → 통합/계약 테스트 → Eval → 부하/관측 → 원인 분석·수정 → 문서화`로 고정한다.
   - 모든 중요한 작업은 `WI-0001` 형식의 Work Record를 생성하고 다음을 기록한다.
     - 문제와 근거, 목적, 성공 기준, 범위와 제약
     - 검토한 대안과 평가 기준, 선택과 트레이드오프
     - 관찰·가설·검증·결과·다음 결정
     - 구현 결과, 테스트 로그·스크린샷·측정값 등 검증 증거
     - AI에 위임한 범위, 채택·거절한 결과, 사람의 검증
     - 남은 위험, 재검토 조건, 배운 점
   - 장기 영향 결정은 ADR, 비직관적·재발 가능 장애는 Troubleshooting, 측정 가설은 Experiment, 반복 복구 절차는 Runbook, 검증 완료 성과는 Case Study로 분리한다.
   - 첫 기록은 환경 구축 Work Record와 다음 ADR로 시작한다.
     - Java 17·Spring Boot 3.5·Gradle 8 선택
     - Compose와 Testcontainers의 책임 경계
     - GitHub Flow와 포트폴리오 문서 추적 정책
   - 전체 프롬프트나 내부 추론 과정은 저장하지 않는다. 재현 가능한 가설·결정·근거·검증만 기록하고 비밀값과 개인정보는 제거한다.
   - README는 현재 구현과 목표 상태를 분리하고 실행법, 아키텍처, 검증 명령, 문서 인덱스, 실제 측정 결과 링크를 제공한다. 검증하지 않은 성능 수치는 기재하지 않는다.
   - Markdown lint, 내부 링크, frontmatter 필수 필드·상태값, 중복 ID, 미완료 placeholder, 문서 추적성 및 secret 검사를 자동화한다.

5. **Codex·GitHub·CI 안전망**

   - `.codex/config.toml` 없이 `.codex/hooks.json`만 둔다. Stop hook은 테스트를 강제 실행하지 않고 변경이 있을 때 `make check`와 문서 갱신을 상기시키는 유효한 JSON을 출력한다.
   - Hook은 현재의 3단계 이벤트/그룹/핸들러 스키마를 사용하며, 프로젝트 hook은 개발자가 `/hooks`에서 직접 검토·신뢰한다. ([공식 Hooks 스키마](https://learn.chatgpt.com/docs/hooks))
   - 기존 예약 자동 병합 워크플로를 제거한다. `main + 짧은 feature/fix/docs/chore 브랜치 + 필수 CI + 수동 squash merge`를 적용한다.
   - Issue Form은 feature·engineering task·bug·decision을 제공하고 PR 템플릿은 Issue, Work Record, ADR/TS/EXP, 문제·의도·결정·검증·영향·롤백·AI/사람 검증을 연결한다.
   - CI는 문서/정책·Compose 검증, 백엔드 전체 검증, 환경 파일 변경 시 Dev Container smoke 검증으로 분리한다.
   - CI 통합 테스트는 Testcontainers가 PostgreSQL과 Redis를 직접 관리하게 하며 GitHub service container나 사전 Compose 실행을 중복 사용하지 않는다.
   - GitHub Actions는 commit SHA로 고정하고 실패 시 JUnit·통합 테스트·문서 검사 보고서를 업로드한다. 원격 branch protection 변경은 별도 관리자 권한 없이 수행하지 않고 필요한 규칙만 문서화한다.

## 고정 실행 인터페이스

- `make setup`: 필수 도구·Docker engine·Java 17·환경 파일을 검증하되 기존 `.env`를 덮어쓰지 않는다.
- `make up` / `make down`: 기본 인프라 시작·종료
- `make run`: `local` 프로필로 백엔드 실행
- `make test`: 순수 단위 테스트
- `make integration`: Testcontainers·WireMock 기반 통합/계약 테스트
- `make eval`: JSONL fixture와 Eval 정책 검증
- `make check`: 문서·Compose·셸 검사와 Gradle `check`를 중복 없이 한 번씩 실행
- `make observe`: Prometheus·Grafana 포함 실행
- `make load-smoke`: Actuator health smoke 수행
- `make reset`: 명시적 확인 후 로컬 컨테이너와 볼륨 초기화

기본 포트는 앱 8080, PostgreSQL 5432, Redis 6379, Mock Naver 8089, Mock LLM 8090, Prometheus 9090, Grafana 3001로 고정한다. k6 컨테이너는 `http://dev:8080`, 호스트 실행 문맥은 `http://localhost:8080`을 사용한다.

추천 API 부하 테스트는 API 구현 전에는 만들지 않는다. 향후 계약이 확정되면 `POST` 응답을 반드시 `202 Accepted + 유효한 jobId`로 검증하며 200 응답을 허용하지 않는다.

## 검증 및 인수 기준

- 호스트, Dev Container, Gradle daemon/toolchain, 테스트 JVM, CI가 모두 Java 17을 보고해야 한다.
- 활성 설정에 Java 21 toolchain, `java-version: 21`, Java 21 Dev Container 이미지가 남아 있으면 CI가 실패해야 한다. ADR에서 거절 대안으로 Java 21을 언급하는 것은 허용한다.
- Docker Desktop을 실행한 깨끗한 clone에서 `Reopen in Container → make setup → make up → make run → make check → make observe → make load-smoke`가 추가 호스트 JDK·Gradle·k6 설치 없이 성공해야 한다.
- 모든 Compose 조합은 `docker compose config`를 통과하고 `up --wait` 후 healthy 상태가 되어야 한다.
- 단위 테스트는 Docker 없이, 통합 테스트는 Testcontainers PostgreSQL·Redis와 WireMock으로 통과해야 하며 실제 외부 API 호출이 없어야 한다.
- Actuator health와 Prometheus endpoint가 응답하고 Prometheus target과 Grafana datasource가 정상이어야 한다.
- 문서 검사에는 정상 문서 통과뿐 아니라 누락 필드, 중복 ID, 잘못된 내부 링크, 미완료 placeholder, 추적성 누락이 실패하는 음성 테스트를 포함한다.
- 기존 `개발 환경.md`의 사용자 변경과 미추적 HTML 파일이 보존되었는지 구현 전후 diff로 확인한다.

## 가정과 경계

- Docker Desktop 엔진은 현재 중지 상태이므로 실제 검증 전에 사용자가 실행해야 한다.
- 이번 단계에는 프런트엔드, 추천·투표 비즈니스 API, 실제 Naver/LLM 연동, 운영 배포, 실측되지 않은 도메인 성능 목표를 포함하지 않는다.
- 향후 애플리케이션 런타임 이미지를 추가할 때도 builder JDK와 runtime JRE를 모두 Java 17로 고정한다.
- `documents/`는 참고 원문이고 `docs/`가 구현 이후의 단일 운영 정본이다. 다만 에이전트 판단을 오염시킬 수 있는 Java 버전·브랜치 전략·선택 사항 잔여 참조는 원문에서도 함께 정정한다.
