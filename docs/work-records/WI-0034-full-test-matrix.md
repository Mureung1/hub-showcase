---
id: WI-0034
title: PP-032 서비스 전체 자동 검증 매트릭스
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
  - ../adr/ADR-0008-frontend-same-origin-boundary.md
paths:
  - backend/src/test/**
  - backend/src/integrationTest/**
  - backend/src/evalTest/**
  - frontend/tests/**
  - frontend/**/*.test.*
  - evals/**
  - mock-api/**
  - tools/test-policy/**
  - .github/workflows/**
  - Makefile
  - docs/contracts.md
---

# WI-0034 PP-032 서비스 전체 자동 검증 매트릭스

> GitHub Issue: [PP-032 #34](https://github.com/gdh0730/hub/issues/34)

## 문제와 근거

PP-032는 개별 Task에서 만든 테스트를 사용자 여정과 위험 기준으로 대조해, 계약·데이터·
비동기 처리·AI Eval·브라우저·접근성·보안 검증의 누락과 중복을 제거한다. 각 모듈 테스트가
통과해도 익명 세션부터 최종 결과까지 연결이 끊기거나 mock 외부 차단이 일부 suite에서
빠질 수 있다. 반대로 같은 Gradle task를 여러 명령에서 반복하면 CI 시간과 실패 해석 비용이
증가한다.

현재 `make check`는 개발 환경 검증을 제공하지만 아직 존재하지 않는 전체 비즈니스 journey와
프런트 E2E를 검증하지 않는다. 따라서 이 문서는 전체 테스트가 통과했다는 결과가 아니라
PP-001~PP-031 산출물을 하나의 추적 가능한 release gate로 묶기 위한 계획이다.

## 목적과 성공 기준

목적은 각 계약과 위험에 정확한 테스트 소유 계층을 지정하고, clean clone과 CI에서 실제
외부 호출 없이 동일한 실패를 재현하는 최소 중복 검증 체계를 만드는 것이다.

성공 기준은 다음과 같다.

- OpenAPI operation, event type, DB migration, LLM schema, UI route와 주요 오류 코드가 하나
  이상의 자동 테스트에 연결된 traceability matrix를 유지한다.
- Java 단위 테스트는 Docker 없이 실행되고 integration은 Testcontainers PostgreSQL·Redis와
  WireMock이 생명주기를 소유한다.
- Eval은 schema, grounding, refusal, injection, fallback과 후보 부족·degraded 정책을 고정
  JSONL fixture로 검증한다.
- Playwright는 서로 다른 두 browser context에서 조건 확정, 202 job, SSE, 결과, 방 공유,
  투표 변경·삭제와 주최자 확정을 끝까지 수행한다.
- 접근성, 보안, 만료, 중복 message, 동시 투표, Redis/provider 장애와 재연결을 음성
  시나리오로 포함한다.
- local/test/load와 CI에서 실제 Naver·Elice DNS·HTTP 접근을 차단하고 발생 시 suite를
  실패시킨다.
- `make check`는 각 계층을 한 번만 실행하고 실패 report·trace·문서 검사를 CI artifact로
  보존한다.

## 범위, 비범위와 제약

범위는 test taxonomy, traceability matrix, 공통 fixture builder, container·WireMock lifecycle,
Eval policy, Playwright E2E, 접근성·보안 회귀, CI job 분할·artifact와 flaky test 정책이다.
실제 provider drift는 PP-033의 별도 Approval Gate 기반 배포 Live 검증이 담당한다.

production 규모의 부하, 실제 개인정보, 실제 provider key, 브라우저 종류의 무제한 조합,
수동 사용성 조사를 자동 테스트로 대체하는 것은 포함하지 않는다. snapshot만으로 의미를
검증하지 않으며 시간·UUID·재시도는 제어 가능한 test double을 사용한다.

## 판단 기준과 대안

판단 기준은 위험 검출력, 결정성, 격리, 실행 시간, 실패 원인 가시성과 유지보수성이다.

- 모든 테스트를 `@SpringBootTest`로 실행하면 느리고 실패 범위가 넓어 domain 단위,
  adapter 계약, system E2E를 분리한다.
- CI service container와 Testcontainers를 함께 쓰면 생명주기가 중복되므로 integration은
  Testcontainers만 사용한다.
- live provider를 merge gate로 사용하면 외부 장애와 quota로 결정성이 깨져 mock CI와
  Approval Gate 기반 배포 Live 검증을 분리한다.
- 재시도만으로 flaky test를 숨기지 않는다. 격리된 재현, 원인 문서, 수정 없이 자동 재실행을
  성공 근거로 채택하지 않는다.

테스트 데이터는 의미가 명시된 builder와 versioned fixture를 사용한다. 같은 계약을 여러
계층에서 반복할 때는 단위 테스트가 규칙 조합을, 통합 테스트가 boundary mapping을, E2E가
대표 여정만 검증하도록 역할을 분리한다.

## 문제 해결 기록

1. PP-001~PP-031의 성공 기준, API·event·DB·LLM·UI 계약을 test inventory로 추출한다.
2. 각 위험에 가장 낮고 빠른 유효 테스트 계층을 하나 지정하고 boundary와 대표 journey만
   상위 계층에서 반복한다.
3. 시간, UUID, network, Redis delivery와 SSE를 제어할 fixture API를 통일한다.
4. backend unit/integration/Eval과 frontend component/E2E 명령을 Gradle·Make dependency
   graph에 중복 없이 연결한다.
5. 외부 network 차단과 mock host allowlist를 모든 suite 시작·종료에서 검증한다.
6. 정상 journey와 실패·동시성·재연결 browser E2E를 두 context로 구현한다.
7. CI artifact와 traceability 검사 후 clean clone에서 `make check`를 재실행한다.

현재는 inventory와 테스트 실행을 수행하지 않았으며 전체 회귀가 통과했다고 주장하지 않는다.

## 구현 결과와 검증 증거

PP-032는 아직 구현·검증되지 않았다. 완료 시 다음 증거가 모두 필요하다.

- 모든 공개 API, event, migration, LLM schema, route와 오류 정책이 테스트 ID에 매핑된
  traceability report 및 누락을 의도적으로 넣었을 때 실패하는 음성 검사
- Docker 없는 Java unit 성공과 Testcontainers 소유 integration의 container 자동 정리 결과
- 정상·0건·중복·429·5xx·timeout provider fixture와 schema·grounding·injection Eval report
- outbox 유실 복구, duplicate delivery, pending claim, DLQ, SSE reconnect와 동시 투표 결과
- 두 browser context full journey, 360px·desktop, keyboard와 자동 접근성 Playwright artifact
- 외부 network를 의도적으로 시도한 fixture가 suite를 실패시키는 안전 음성 테스트
- 변경 없는 반복 실행에서 같은 결과가 나오며 격리되지 않은 flaky test가 없다는 기록
- clean clone의 `make check` 및 GitHub Actions 성공과 JUnit·Eval·Playwright report 링크

하나의 수동 성공이나 일부 suite 통과를 전체 서비스 완료 증거로 사용하지 않는다.

## AI 사용과 사람의 검증

AI에는 계약 대비 test inventory, 경계·음성 case, fixture builder, 실패 log 분류와 추적성
검사 초안을 위임할 수 있다. AI 생성 테스트가 구현을 그대로 복제하거나 의미 없는 assertion을
사용하면 거절하고 실패를 실제로 검출하는 mutation·음성 fixture로 확인한다.

사람은 사용자 여정과 고위험 경계의 누락, 테스트 계층 선택, flaky 원인, 접근성 수동 확인과
CI artifact를 검토한다. 외부 network가 차단됐는지 별도 관찰하고 release gate 예외를 자동으로
허용하지 않는다.

## 남은 위험과 학습

테스트 수가 늘면 실행 시간이 길어지고 fixture와 실제 계약이 함께 잘못 바뀔 수 있다. 변경된
계약은 구현과 별도의 검토자를 거치고 traceability diff를 PR에 제시한다. 브라우저·Docker·
운영 proxy 차이는 PP-035 packaging E2E에서 보완한다. 재현되지 않는 간헐 실패는 통과로
무시하지 않고 Troubleshooting 기록과 격리 기준을 적용한다.

핵심 학습 기준은 테스트 개수가 아니라 각 중요한 실패가 어느 계층에서 왜 검출되는지
설명하고 clean 환경에서 같은 증거를 재현할 수 있는가이다.
