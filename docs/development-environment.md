# 개발 환경 정본

## 목적과 성공 기준

개발자의 호스트 상태와 무관하게 같은 코드가 같은 Java·Gradle·인프라에서
빌드되고, Agent가 표준 명령으로 실패를 재현하고 수정 결과를 검증할 수 있어야
한다. Docker Desktop이 실행 중인 깨끗한 clone에서 Dev Container를 열고
`make setup`, `make up`, `make run`, `make check`를 순서대로 실행하는 것이
기준 시나리오다.

## 고정 기준

| 항목 | 기준 | 의도 |
| --- | --- | --- |
| Java | 17 | 호스트·컨테이너·CI의 런타임 차이 제거 |
| Spring Boot | 3.5.16 | Java 17과 JUnit 5 기반 유지보수 라인 |
| Gradle | Wrapper 8.14.4 | 호스트 Gradle 비의존과 배포 검증 |
| Node | Dev Container 24 | 문서 검증 도구만 실행 |
| Docker CLI | Dev Container 28.3.3 | Docker Desktop 엔진을 socket으로 재사용 |
| Docker Compose | v2 | Dev Container feature가 제공하는 v2 채널 사용 |
| 외부 연동 | mock 고정 | 비용·쿼터·데이터 유출 방지 |

Gradle toolchain과 compiler release, 테스트 JVM은 모두 17이어야 한다. 활성
설정에서 Java 21을 지정하면 정책 검사가 실패한다.

## 실행 인터페이스

| 명령 | 결과 |
| --- | --- |
| `make setup` | Docker·도구·Java 17·환경 파일 사전 조건 확인 |
| `make up` / `make down` | PostgreSQL·Redis·Mock API 시작/종료 |
| `make run` | `local` 프로필로 애플리케이션 실행 |
| `make test` | Docker가 필요 없는 단위 테스트 |
| `make integration` | Testcontainers·WireMock 통합/계약 테스트 |
| `make eval` | Eval fixture와 정책 검증 |
| `make edge-check` | 비밀 없는 Approval Gate·Provider Gateway 자동 검증 |
| `make actionlint` | GitHub Actions workflow 정적 검증 |
| `make check` | 중복 실행 없이 저장소 전체 검증 |
| `make naver-live-contract` | 승인된 로컬에서 Naver Local·Blog 실제 계약을 각 1회 검증 |
| `make llm-live-contract` | 승인된 로컬에서 Elice 합성 Chat·Embedding 계약을 각 1회 검증 |
| `make observe` | Prometheus·Grafana 오버레이 실행 |
| `make load-smoke` | mock 모드에서 health 부하 smoke 실행 |
| `make reset` | 사용자 확인 후 로컬 볼륨 초기화 |

GitHub Actions workflow는 공식 `rhysd/actionlint` v1.7.12 multi-architecture image를
index digest
`sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667`로
고정해 검사한다. 실행 전 image digest와 binary version을 모두 대조한다. 검사
container에는 `.github/workflows`만 tar stream으로 전달하고 repository mount, host
환경 변수와 network를 제공하지 않으므로 로컬 provider credential을 읽거나 실제 API를
호출할 수 없다. 버전과 digest 근거는
[actionlint v1.7.12 release](https://github.com/rhysd/actionlint/releases/tag/v1.7.12)와
[공식 image tag](https://hub.docker.com/r/rhysd/actionlint/tags?name=1.7.12)다.

## 서비스와 포트

모든 호스트 포트는 `127.0.0.1`에 바인딩하고 서비스 간 통신은 Compose DNS를
사용한다. 고정 `container_name`은 사용하지 않는다.

| 서비스 | 호스트 포트 | 컨테이너 소비자 |
| --- | ---: | --- |
| Backend | 8080 | k6에서 `http://dev:8080` |
| PostgreSQL | 5432 | `postgres:5432` |
| Redis | 6379 | `redis:6379` |
| Mock Naver | 8089 | `mock-naver:8080` |
| Mock LLM | 8090 | `mock-llm:8080` |
| Prometheus | 9090 | 관측성 오버레이 |
| Grafana | 3001 | 관측성 오버레이 |

## 프로필과 비밀 관리

`local`, `test`, `load`는 `PLACEPICK_EXTERNAL_MODE=mock`을 요구한다. Naver나
LLM base URL이 실제 인터넷 endpoint를 가리키면 시작과 부하 테스트를 중단한다.
`.env.example`에는 비밀이 아닌 예시만 두고 `.env`, API key, token은 커밋하지
않는다. 부하 테스트는 실제 외부 API를 호출하지 않는다.

실제 provider 계약 검증은 표준 앱 profile과 분리한다. Git에서 제외한
`.env.live.local`은 `make naver-live-contract`와 `make llm-live-contract`의 공용 입력이며
`make run`, `make test`, `make integration`, `make eval`, `make edge-check`와
`make check`는 읽지 않는다. parser는 파일을 source·eval하지 않고 allowlist만 읽는다.
Naver와 Elice 명령은 자기 credential·URL·model만 하위 JVM에 전달한다.

Naver task는 CI, 잘못된 mode와 누락 credential을 요청 전에 거부하고 공식 HTTPS
origin을 코드에 고정한다. Local·Blog 각 한 번의 safe summary만 허용한다. 2026-07-14
실제 두 논리 호출은 모두 `INVALID_RESPONSE`로 실패했고 wire 요청 수는 확인되지
않았으므로 활용 가능성이 검증된 상태가
아니다.

Elice task는 서로 다른 exact HTTPS `mlapi.run/{canonical-uuid}/v1` base, exact Chat·
Embedding model과 합성 입력만 허용한다. Chat·Embedding 각 한 번의 safe summary만
출력하고 token, 전체 URL, prompt·응답 body와 vector를 출력하지 않는다. Elice 정책
검토 전 제품 데이터 전송과 Embedding runtime은 금지한다.

배포 Live는 향후 외부 Approval Gate·Provider Gateway를 사용한다. 공유 Fork,
GitHub Actions와 Vercel·Render에는 원본 provider key를 저장하지 않는다. Gate·Gateway
프로그램의 자동 검증 기반은 구현됐지만, cloud resource가 배포됐거나 실제 provider
호출이 성공했다는 의미는 아니다.

## 포함하지 않는 선택 사항

프로젝트 로컬 `.codex/config.toml`, `PLANS.md`, MCP 연결, 저장소 고유 Codex
프로필·승인 설정, 작업 프롬프트 템플릿은 이 환경의 필수 구성에 포함하지 않는다.
Agent 작업 맥락은 `AGENTS.md`, Issue, Work Record와 ADR로 전달한다.

## 알려진 수동 전제

Docker Desktop 엔진 시작과 프로젝트 hook 신뢰는 사용자 동작이다. Codex hook은
`/hooks`에서 내용을 검토하고 신뢰한 뒤 사용한다. 원격 branch protection은
관리자 권한이 필요한 별도 작업이며 저장소 파일만으로 적용하지 않는다.
