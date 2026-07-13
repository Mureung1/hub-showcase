# 플레이스픽 AI

네이버 검색 결과와 LLM을 조합해 모임 장소 결정을 돕는 서비스를 위한
백엔드 중심 저장소다. 현재 단계의 결과물은 비즈니스 기능이 아니라, 사람이
검증할 수 있는 Agentic 개발 환경과 반복 가능한 테스트 하네스다.

## 현재 상태와 목표

| 구분 | 현재 구현 | 다음 제품 단계 |
| --- | --- | --- |
| 런타임 | Java 17, Spring Boot 3.5.16, Gradle 8.14.4 | 동일 기준 유지 |
| HTTP | Actuator health·Prometheus만 공개 | 추천·투표 API는 계약 확정 후 구현 |
| 데이터 | PostgreSQL·Redis 로컬 하네스 | 도메인 스키마·Redis Streams 추가 |
| 외부 연동 | Naver·LLM WireMock만 허용 | 실제 연동은 별도 보안 검토 후 추가 |
| 품질 | 단위·통합·Eval·문서, 관측성과 health smoke 검증 완료 | 도메인별 계약·Eval·부하 기준 확장 |

측정하지 않은 처리량이나 품질 수치는 성과로 기재하지 않는다. 상세 실행 증거와
의사 결정은 [WI-0001](docs/work-records/WI-0001-agentic-development-environment.md),
검증 완료 결과의 포트폴리오 요약은
[CASE-0001](docs/case-studies/CASE-0001-agentic-development-environment.md)에 기록한다.

## 시작하기

필수 조건은 Git, VS Code, Dev Containers 확장, 실행 중인 Docker Desktop이다.
호스트의 Gradle·Node·k6 설치에는 의존하지 않는다.

```bash
# VS Code에서 Reopen in Container 후
make setup
make up
make run
```

다른 터미널에서 전체 검증을 실행한다.

```bash
make check
make observe
make load-smoke
```

주요 명령은 다음과 같다.

| 명령 | 목적 |
| --- | --- |
| `make test` | Docker가 필요 없는 단위 테스트 |
| `make integration` | Testcontainers·WireMock 통합/계약 테스트 |
| `make eval` | Eval fixture와 정책 검증 |
| `make check` | 저장소 전체 정적·문서·백엔드 검증 |
| `make down` | 로컬 서비스 종료 |
| `make reset` | 확인 후 로컬 데이터 볼륨 초기화 |

기본 포트는 앱 8080, PostgreSQL 5432, Redis 6379, Mock Naver 8089,
Mock LLM 8090, Prometheus 9090, Grafana 3001이다.

## 문서와 작업 방식

- [문서 인덱스](docs/README.md): 운영 정본, 문서 종류와 탐색 경로
- [개발 환경](docs/development-environment.md): 버전·실행·안전 기준
- [아키텍처](docs/architecture.md): 현재 경계와 목표 구조
- [계약](docs/contracts.md): 현재 공개 표면과 향후 계약 상태
- [문서화 표준](docs/standards/documentation.md): Work Record·ADR·장애 기록 기준

`documents/`는 최초 기획과 참고 자료를 보존하는 원문 영역이고, 실제 구현과
함께 갱신되는 정본은 `docs/`다. 작업은 `main`에서 분기한 짧은 브랜치에서
진행하고 필수 CI 통과 후 수동 squash merge한다.

## 안전 원칙

- `local`, `test`, `load`에서는 실제 Naver·LLM API를 호출하지 않는다.
- 비밀값, `.env`, 개인 정보, 전체 프롬프트나 비공개 추론 과정은 커밋하지 않는다.
- API·이벤트·DB·프롬프트 계약 변경은 구현과 같은 PR에서 문서화한다.
- 원격 branch protection과 실제 외부 연동은 별도 승인 없이는 변경하지 않는다.
