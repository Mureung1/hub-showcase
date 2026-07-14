# 플레이스픽 AI

네이버 검색 결과와 LLM을 조합해 모임 장소 결정을 돕는 서비스 저장소다. 현재
구현된 결과물은 Java 17 백엔드 개발 환경과 반복 가능한 검증 하네스이며, 완성형
MVP의 기능·계약·선행 관계는 [서비스 완성 roadmap](docs/roadmap.md)에서 관리한다.

## 현재 상태와 목표

| 구분 | 현재 구현 | 다음 제품 단계 |
| --- | --- | --- |
| 런타임 | Java 17, Spring Boot 3.5.16, Gradle 8.14.4 | 동일 기준 유지 |
| HTTP | Actuator health·Prometheus만 공개 | 조건 확인, 비동기 추천, SSE, 공유·투표·확정 |
| 데이터 | PostgreSQL·Redis 로컬 하네스 | 도메인 스키마, outbox, Redis Streams와 DLQ |
| 외부 연동 | Naver·Gateway 자동 검증, Elice 무자격증명 자동 타깃 검증 통과; Naver Live 논리 호출 2건 `INVALID_RESPONSE`·wire 수 미확인, Elice Live 미실행·cloud 미배포 | Naver 원인 진단, Elice 합성 Live와 승인 배포 E2E |
| 프런트엔드 | 독립 프로토타입만 존재 | Next.js 기반 주최자·참여자 전체 사용자 여정 |
| 품질 | 환경 단위·통합·Eval·문서와 health smoke 검증 완료 | 계약·Eval·브라우저 E2E·보안·부하·릴리스 gate |

측정하지 않은 처리량이나 품질 수치는 성과로 기재하지 않는다. 상세 실행 증거와
의사 결정은 [WI-0001](docs/work-records/WI-0001-agentic-development-environment.md),
검증 완료 결과의 포트폴리오 요약은
[CASE-0001](docs/case-studies/CASE-0001-agentic-development-environment.md)에 기록한다.

목표 사용자 여정은 `익명 세션 → 자연어 조건 초안 → 사용자 확인 → 202 추천 Job →
근거 기반 후보 3개 → 공유방 → LIKE/DISLIKE → 주최자 최종 확정`이다. 현재 코드가
이 흐름을 제공한다는 뜻은 아니며, 각 계약은 roadmap의 Task가 구현·검증될 때
`specified`에서 `implemented`로 전환한다.

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
| `make edge-check` | Approval Gate·Provider Gateway의 무비밀 자동 검증 |
| `make actionlint` | 고정된 actionlint 이미지로 GitHub Actions workflow 검증 |
| `make check` | 저장소 전체 정적·문서·백엔드 검증 |
| `make naver-live-contract` | 별도 승인 후 Naver Local·Blog 실제 계약을 각 1회 검증 |
| `make llm-live-contract` | 별도 승인 후 Elice 합성 Chat·Embedding 계약을 각 1회 검증 |
| `make down` | 로컬 서비스 종료 |
| `make reset` | 확인 후 로컬 데이터 볼륨 초기화 |

기본 포트는 앱 8080, PostgreSQL 5432, Redis 6379, Mock Naver 8089,
Mock LLM 8090, Prometheus 9090, Grafana 3001이다.

## 문서와 작업 방식

- [문서 인덱스](docs/README.md): 운영 정본, 문서 종류와 탐색 경로
- [서비스 완성 roadmap](docs/roadmap.md): PP-001~PP-038 Task DAG와 완료 기준
- [개발 환경](docs/development-environment.md): 버전·실행·안전 기준
- [아키텍처](docs/architecture.md): 현재 경계와 목표 구조
- [계약](docs/contracts.md): 현재 공개 표면과 향후 계약 상태
- [문서화 표준](docs/standards/documentation.md): Work Record·ADR·장애 기록 기준
- [Naver Local Live Runbook](docs/runbooks/RUN-0001-naver-local-live-and-credential-rotation.md): 실제 계약 검증과 key 교체
- [Elice LLM Local Live Runbook](docs/runbooks/RUN-0002-elice-llm-local-live-and-token-rotation.md): 합성 계약 검증과 token 교체

`documents/`는 최초 기획과 참고 자료를 보존하는 원문 영역이고, 실제 구현과
함께 갱신되는 정본은 `docs/`다. 작업은 `main`에서 분기한 짧은 브랜치에서
진행하고 필수 CI 통과 후 수동 squash merge한다.

## 안전 원칙

- `local`, `test`, `load`와 필수 CI에서는 실제 Naver·LLM API를 호출하지 않는다.
- 실제 Naver 계약 확인은 Git에서 제외한 `.env.live.local`을 읽는 격리 task에서만
  Local·Blog 각 한 번으로 제한한다. 표준 실행과 `make check`는 이 파일을 읽지 않는다.
- 2026-07-14 Naver Local·Blog canary는 둘 다 `INVALID_RESPONSE`로 실패했다. Mock
  통과와 실제 Naver 활용 가능성을 혼동하지 않고 원인 진단 전 자동 재호출하지 않는다.
- Elice 실제 확인은 별도 격리 task의 합성 Chat·Embedding으로만 수행한다. Elice 정책
  검토 전 실제 사용자 입력·Naver 결과를 보내지 않고 Embedding을 runtime에 사용하지 않는다.
- 직접 OpenAI Responses API는 Elice 실패 시 자동 fallback하지 않는 재검토 대안이다.
- 배포 Live의 원본 provider key는 외부 Provider Gateway만 보유한다. 공유 Fork,
  GitHub Actions, Vercel과 Render에는 원본 key를 두지 않는다.
- Mock 자동 검증, Naver·Elice Local Live, 제품 runtime과 클라우드 배포를 서로 다른
  상태로 기록한다.
- 대화에 노출된 기존 Naver key는 재사용하지 않고 교체를 사람이 확인한다.
- Naver 약관 검토 전에는 Local·Blog 결과 결합·영구 저장·LLM 전달을 활성화하지 않는다.
- 비밀값, `.env`, 개인 정보, 전체 프롬프트나 비공개 추론 과정은 커밋하지 않는다.
- API·이벤트·DB·프롬프트 계약 변경은 구현과 같은 PR에서 문서화한다.
- 원격 branch protection과 실제 외부 연동은 별도 승인 없이는 변경하지 않는다.

향후 무료 포트폴리오 demo의 목표는 Vercel Hobby 프런트, Render Free Singapore의
Java `all` 역할, Neon Free와 Upstash Free다. 현재 cloud resource나 실제 서비스는
배포되지 않았으며 Render sleep·cold start와 무료 한도 때문에 production 또는 상시
가용 환경으로 표현하지 않는다. 세부 경계는
[ADR-0009](docs/adr/ADR-0009-mock-local-live-gateway-boundary.md)와
[ADR-0010](docs/adr/ADR-0010-free-demo-deployment-boundary.md)을 따른다.
