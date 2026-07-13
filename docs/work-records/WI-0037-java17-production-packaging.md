---
id: WI-0037
title: PP-035 Java 17 운영 이미지와 Demo Compose 패키징
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
  - ../adr/ADR-0008-frontend-same-origin-boundary.md
paths:
  - backend/Dockerfile
  - backend/src/main/resources/application-production.yml
  - frontend/Dockerfile
  - frontend/next.config.*
  - docker-compose.production.yml
  - scripts/production/**
  - .github/workflows/**
  - docs/runbooks/production-demo*.md
  - README.md
---

# WI-0037 PP-035 Java 17 운영 이미지와 Demo Compose 패키징

## 문제와 근거

PP-035는 개발용 Dev Container가 아닌 최소 운영 image에서 API, worker와 frontend를 동일한
artifact·계약으로 실행하고 종료·복구·rollback할 수 있게 만든다. 개발 image를 그대로
배포하면 불필요한 compiler·도구·권한이 포함되고, API와 worker를 한 process로만 실행하면
독립적인 확장·종료와 queue 복구를 검증하기 어렵다. 프런트와 백엔드 origin이 갈리면 cookie,
CSRF와 SSE proxy 계약도 달라진다.

현재 저장소에는 Java 17 Spring Boot 개발 기반과 Compose infrastructure가 있지만 운영용
backend/frontend image, `api/worker` 역할 분리, same-origin proxy, readiness와 graceful shutdown
검증이 없다. 이 Work Record는 cloud 배포나 운영 준비가 완료됐다는 기록이 아니다.

## 목적과 성공 기준

목적은 exact version·digest와 비루트 실행을 사용하는 재현 가능한 image를 만들고, 한 대의
Demo Compose에서도 production 경계와 장애 복구를 검증할 수 있게 하는 것이다.

성공 기준은 다음과 같다.

- backend multi-stage build의 builder JDK와 runtime JRE가 모두 Java 17이며 Gradle Wrapper와
  dependency verification으로 동일한 Boot artifact를 생성한다.
- frontend는 pin·lock된 Node 24 build와 최소 runtime image를 사용하고 backend API·SSE를
  same-origin으로 proxy한다.
- 같은 backend image를 `PLACEPICK_ROLE=api`와 `PLACEPICK_ROLE=worker`로 각각 실행하고 local
  편의를 위한 `all` 역할은 production Compose에서 사용하지 않는다.
- 모든 runtime container는 비루트, read-only root filesystem과 필요한 writable volume만
  사용하며 source, build cache와 secret을 image layer에 포함하지 않는다.
- API liveness·readiness, worker readiness, frontend health가 의존 서비스와 역할 상태를
  정확히 반영한다.
- SIGTERM에서 API는 신규 요청을 중단하고 진행 중 응답을 정리하며 worker는 새 message claim을
  멈추고 DB commit 후 ACK 원칙을 지켜 미완료 message를 복구한다.
- clean clone에서 build, migration, startup, full mock E2E, shutdown, restart와 이전 image
  rollback을 문서 절차로 재현한다.

## 범위, 비범위와 제약

범위는 backend·frontend Dockerfile, production configuration, API/worker role wiring, Demo
Compose, image metadata·health, non-root·filesystem policy, runtime secret injection, graceful
shutdown, migration 실행 순서, rollback Runbook과 CI smoke다.

Kubernetes, cloud registry·hosting, TLS termination, autoscaling, 무중단 production migration,
실제 도메인·DNS와 유료 인프라는 포함하지 않는다. Demo Compose는 production과 동일한
경계를 검증하지만 production 가용성을 보장하는 배포 플랫폼은 아니다.

## 판단 기준과 대안

판단 기준은 Java 17 일관성, 최소 공격면, 재현성, 역할 격리, data 정합성, rollback 가능성이다.

- Dev Container image 재사용은 편하지만 도구와 권한이 과도해 runtime image를 분리한다.
- API와 worker를 다른 source artifact로 만들면 drift 위험이 있어 같은 Boot JAR과 role
  configuration을 사용한다.
- production에서 `all` 역할은 process 장애가 두 역할을 함께 중단하므로 사용하지 않는다.
- frontend가 브라우저에서 backend 다른 origin을 직접 호출하면 cookie·CORS가 복잡해져
  Next.js same-origin proxy를 선택한다.
- container 시작 때마다 자동으로 임의 migration을 수행하는 대신 명시적 단일 migration
  단계가 성공한 뒤 API·worker를 시작한다.

base image와 package는 exact tag·digest로 고정하고 변경은 의도적 dependency update로
처리한다. secret은 runtime environment 또는 secret mount로만 주입하고 Compose 파일에는
이름만 선언한다.

## 문제 해결 기록

1. backend artifact, frontend standalone output, migration과 API/worker 실행 입력을 inventory로
   정리한다.
2. Java 17 builder/runtime과 Node 24 builder/runtime의 base image·digest·비루트 UID를 고정한다.
3. role별 Spring bean 활성화와 readiness 조건을 구현하고 production에서 `all`을 거부한다.
4. same-origin proxy, forwarded header와 SSE buffering·timeout을 계약 테스트한다.
5. Demo Compose에 migration, API, worker, frontend와 infrastructure dependency·health를 연결한다.
6. read-only filesystem, secret 미포함, image metadata와 dependency 결과를 정적 검사한다.
7. clean build부터 full mock E2E, SIGTERM·restart·pending recovery와 이전 image rollback까지
   실행해 Runbook을 검증한다.

현재 운영 image, production Compose와 위 실행 증거는 존재하지 않는다.

## 구현 결과와 검증 증거

PP-035는 아직 구현·검증되지 않았다. 완료 판단에는 다음 증거가 필요하다.

- backend builder와 runtime에서 `java -version`이 17을 보고하고 Java 21 artifact·toolchain이
  없는 image 검사
- clean clone의 dependency verification 기반 backend·frontend reproducible build 결과와 image
  digest·source revision label
- 비루트 UID, read-only filesystem, Linux capability와 image layer에 source·cache·secret이
  없는 정적 검사
- production Compose config, migration 1회 실행, 모든 health·readiness와 full mock browser E2E
- frontend same-origin cookie·CSRF·SSE 연결과 proxy buffering 비활성 검증
- API·worker SIGTERM 중 요청·job을 발생시켜 중복 결과나 message 유실 없이 재시작되는 결과
- 잘못된 role, external mode, host와 누락 secret에서 fail-fast하는 음성 테스트
- 이전 image digest로 rollback하고 DB schema 호환 범위에서 health와 대표 조회가 복구되는 기록
- CI packaging smoke와 `make check` 성공 링크

Demo Compose 기동만으로 production 배포 완료나 고가용성을 주장하지 않는다.

## AI 사용과 사람의 검증

AI에는 multi-stage Dockerfile, role configuration, Compose dependency, image 정적 검사와 종료
시나리오 초안을 위임할 수 있다. 생성된 base image와 설정은 공식 지원 범위, digest, Java 17
출력과 실제 container 동작을 확인한 경우만 채택한다.

사람은 image 공급망, runtime 권한, secret 주입, migration·rollback, same-origin 보안 경계와
SIGTERM 중 데이터 정합성을 검토한다. clean clone 절차를 직접 실행하고 cloud 배포가 범위에
포함되지 않았음을 release 문서에서 확인한다.

## 남은 위험과 학습

Demo Compose는 단일 host 장애와 실제 TLS·proxy·orchestrator 종료 순서를 재현하지 못한다.
배포 플랫폼을 선택하면 health, secret, migration lock과 shutdown grace를 해당 환경에서 다시
검증해야 한다. DB migration이 이전 image와 역호환되지 않으면 단순 image rollback이 불가능하므로
각 migration Task에서 expand/contract와 rollback 조건을 명시한다.

핵심 학습 기준은 image 생성 자체가 아니라 같은 artifact가 역할별로 안전하게 시작·종료되고
clean 환경에서 복구 절차까지 재현되는가이다.
