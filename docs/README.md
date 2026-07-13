# 플레이스픽 AI 문서 인덱스

`docs/`는 구현과 함께 갱신되는 운영 정본이다. 최초 기획과 긴 참고 자료는
`documents/`에 보존하되, 현재 실행 방법·계약·결정은 이 디렉터리를 따른다.

## 현재 기준

- [개발 환경](development-environment.md): Java 17, 실행 명령, 프로필, 포트
- [아키텍처](architecture.md): 현재 모듈과 인프라 책임 경계
- [계약](contracts.md): 공개 API·이벤트·프롬프트 계약의 구현 상태
- [문서화 표준](standards/documentation.md): 기록 조건, 필드, 검증과 보안
- [GitHub Flow](standards/github-flow.md): 브랜치·PR·병합·보호 규칙

## 작업과 의사 결정

- [CASE-0001 Java 17 기반 재현 가능한 Agentic 개발 환경 구축](case-studies/CASE-0001-agentic-development-environment.md)
- [WI-0001 Agentic 개발 환경 구축](work-records/WI-0001-agentic-development-environment.md)
- [ADR-0001 Java 17 기술 기준](adr/ADR-0001-java17-baseline.md)
- [ADR-0002 Compose와 Testcontainers의 책임 경계](adr/ADR-0002-compose-testcontainers-boundary.md)
- [ADR-0003 GitHub Flow와 문서 추적성](adr/ADR-0003-github-flow-documentation-traceability.md)
- [TS-0001 WireMock 의존성 충돌](troubleshooting/TS-0001-wiremock-dependency-conflict.md)
- [TS-0002 Testcontainers PostgreSQL tag와 digest 호환성](troubleshooting/TS-0002-testcontainers-digest-compatibility.md)
- [TS-0003 Dev Container Yarn APT 공개키](troubleshooting/TS-0003-devcontainer-yarn-apt-key.md)
- [TS-0004 Dev Container Gradle cache 권한](troubleshooting/TS-0004-devcontainer-gradle-cache-permission.md)
- [TS-0005 Gradle 플랫폼별 verification metadata](troubleshooting/TS-0005-gradle-cross-platform-verification-metadata.md)
- [TS-0006 Spring Boot 테스트 Prometheus observability](troubleshooting/TS-0006-spring-boot-actuator-access.md)
- [TS-0007 비대화형 k6 권한](troubleshooting/TS-0007-k6-non-root-script-permission.md)
- [TS-0008 GitHub Actions Gitleaks PR 권한](troubleshooting/TS-0008-gitleaks-pr-token-permission.md)

## 문제 해결·증거 문서

| 종류 | 작성 조건 | 위치 | 템플릿 |
| --- | --- | --- | --- |
| Work Record | 중요한 모든 작업 | `work-records/` | [템플릿](templates/work-record.md) |
| ADR | 장기 영향·대안 비교가 필요한 결정 | `adr/` | [템플릿](templates/adr.md) |
| Troubleshooting | 비직관적·재발 가능한 장애 | `troubleshooting/` | [템플릿](templates/troubleshooting.md) |
| Experiment | 측정 가능한 가설과 비교 | `experiments/` | [템플릿](templates/experiment.md) |
| Runbook | 반복 가능한 진단·복구 | `runbooks/` | [템플릿](templates/runbook.md) |
| Case Study | 증거가 확보된 포트폴리오 성과 | `case-studies/` | [템플릿](templates/case-study.md) |

## 품질 검사

```bash
npm ci
npm run docs:check
npm run docs:test
```

검사는 Markdown 스타일, frontmatter 필수 필드, ID·상태·날짜, 중복 ID,
내부 링크와 anchor, 미완성 placeholder, Java 17 정책, 변경 파일과 Work Record의
추적 관계, 일반적인 비밀 패턴을 검사한다. 외부 링크 검사는 네트워크 변동으로
필수 CI에서 분리하며 `npm run docs:links:external`로 실행한다.
