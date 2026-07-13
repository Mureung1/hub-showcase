---
id: WI-0035
title: PP-033 Staging Live 비밀 관리와 예약 실제 E2E
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - .github/workflows/staging-live.yml
  - scripts/staging-live/**
  - backend/src/liveTest/**
  - backend/src/main/resources/application-staging-live.yml
  - docs/runbooks/staging-live*.md
  - docs/contracts.md
---

# WI-0035 PP-033 Staging Live 비밀 관리와 예약 실제 E2E

> GitHub Issue: [PP-033 #35](https://github.com/gdh0730/hub/issues/35)

## 문제와 근거

PP-033은 mock 계약이 실제 Naver·OpenAI의 endpoint, 인증, schema와 계속 맞는지 제한된
staging 호출로 탐지한다. 실제 provider를 일반 CI에 넣으면 외부 장애·비용·quota가 merge를
불안정하게 만들고 fork PR이나 로그를 통해 secret이 노출될 수 있다. 반대로 live 검증을 전혀
하지 않으면 mock이 통과해도 provider 변경을 배포 전에 발견하지 못한다.

현재 GitHub `staging-live` Environment, repository workflow, provider secret, 비용 한도와
redacted 결과 정책은 구성되어 있지 않다. 이 Work Record는 secret이 준비됐거나 실제 호출이
성공했다는 선언이 아니라 안전한 provisioning과 실행 기준을 고정한다.

## 목적과 성공 기준

목적은 최소 권한 GitHub Environment에서 비개인성 입력 한 건으로 전체 추천 경로의 계약
drift를 하루 한 번과 수동 요청으로 검증하고, 외부 결과와 secret을 artifact에 남기지 않는
것이다.

성공 기준은 다음과 같다.

- GitHub `staging-live` Environment에 `NAVER_API_HUB_KEY_ID`, `NAVER_API_HUB_KEY`,
  `OPENAI_API_KEY`를 repository와 분리해 등록하고 접근 담당자·rotation·폐기 절차를 기록한다.
- workflow는 `contents: read` 최소 권한, environment 보호, concurrency 1, timeout과 호출
  budget을 적용하며 fork PR과 일반 push에서는 실행되지 않는다.
- `workflow_dispatch`와 매일 18:20 UTC schedule을 제공하되 Environment variable
  `STAGING_LIVE_ENABLED=true`가 승인되기 전에는 schedule job이 외부 호출 전에 종료된다.
- 고정된 비개인성 입력 한 건으로 조건 추출, Naver Local·Blog, 점수화, OpenAI 추천 이유와
  terminal job까지 수행한다.
- 검증은 정확한 장소명 일치가 아니라 schema, 후보 수, 근거 연결, 금지 field, grounded
  설명, 호출 상한과 terminal 상태를 판단한다.
- log와 artifact에는 secret, cookie, session·share token, 자연어 이외의 개인 데이터와 전체
  provider response를 남기지 않고 count·schema version·error class·검증 결과만 보존한다.
- 실패 시 live 기능을 자동 배포하거나 schedule을 우회하지 않고 Runbook과 Issue로 연결한다.

## 범위, 비범위와 제약

범위는 GitHub Environment provisioning 문서, secret·variable 정책, scheduled/manual workflow,
전용 `liveTest` source set 또는 격리 runner, 호출 budget, invariant validator, redacted artifact,
실패 Runbook과 rotation 검증이다.

유료 cloud staging 배포, production traffic, 실제 사용자 입력, PR merge gate, 자동 secret 생성,
provider 응답 snapshot 공개는 포함하지 않는다. Environment의 secret 값 설정과 보호 규칙
승인은 저장소 코드만으로 완료할 수 없는 사람·관리자 작업이다.

## 판단 기준과 대안

판단 기준은 secret 격리, 비용 상한, drift 검출력, 결정성, 개인정보 최소화와 실패 영향이다.

- 모든 PR에서 live 호출하는 방식은 secret과 비용 위험 때문에 제외한다.
- 수동 실행만 사용하면 장기 drift 발견이 사람 기억에 의존하므로 준비 완료 후 하루 한 번의
  schedule을 병행한다.
- provider 전체 응답을 artifact로 저장하면 디버깅은 쉽지만 데이터·약관 위험이 커 schema와
  redacted summary만 저장한다.
- 특정 장소명을 golden value로 비교하면 검색 순위 변동 때문에 불안정하므로 불변식과
  grounding을 검증한다.

workflow는 외부 호출 전 configuration·budget·kill switch를 검증하고 이후 단계에서 호출
count를 누적한다. 상한을 초과할 가능성이 있으면 남은 단계를 수행하지 않는다. schedule은
관리자가 secret, provider budget alert와 rotation 담당자를 확인한 뒤에만 변수로 활성화한다.

## 문제 해결 기록

1. PP-029의 live activation 조건과 PP-032의 mock full journey를 live test 입력으로 재사용한다.
2. GitHub Environment secret·variable·승인 담당자와 최소 workflow permission을 문서화한다.
3. 비개인성 입력, provider별 최대 호출 횟수와 OpenAI output·token 상한을 코드 상수와
   configuration validation으로 고정한다.
4. 외부 응답을 저장하지 않고 schema·grounding·후보 수를 검사하는 validator를 구현한다.
5. secret masking과 artifact allowlist를 음성 fixture로 검증한 뒤 수동 run 한 번을 승인한다.
6. 비용·quota dashboard와 rotation 절차를 확인한 후 schedule enable 변수를 전환한다.
7. 수동 run과 실제 schedule run의 결과·비용·redaction을 각각 검토한다.

현재 Environment와 workflow를 만들거나 실제 provider를 호출하지 않았으며 live 성공 증거는
없다.

## 구현 결과와 검증 증거

PP-033은 아직 구현·검증되지 않았다. 완료에는 다음 증거가 모두 필요하다.

- `staging-live` Environment 이름, secret 이름, 담당자, rotation·폐기일과 budget alert를
  값 노출 없이 확인한 관리자 체크 기록
- schedule enable 변수가 false·누락일 때 outbound 요청 전에 안전 종료하는 workflow 결과
- fork PR, 일반 push와 권한 없는 actor가 Environment secret에 접근하지 못하는 정책 검증
- 수동 full E2E 한 건에서 조건 schema, Naver 후보·근거, grounded OpenAI 결과와 terminal
  상태가 통과한 redacted summary
- provider별 호출 count와 token/output이 설정 상한 이내였다는 검증
- 실패 fixture에서 key, header, cookie, token, 장소별 원문이 log·artifact에 나타나지 않는 검사
- 실제 하루 schedule run 한 건의 성공 또는 설명 가능한 실패와 Runbook 실행 기록
- secret rotation 후 이전 credential이 사용되지 않고 새 credential로 검증되는 결과

secret 등록만으로 완료 처리하지 않고 manual·scheduled 실행과 redaction을 사람이 확인해야
status를 변경한다.

## AI 사용과 사람의 검증

AI에는 workflow·validator 초안, permission 비교, redaction 음성 fixture와 실패 분류를 위임할
수 있다. AI는 secret 값을 읽거나 생성하지 않으며 live 실행을 독자적으로 활성화하지 않는다.
provider 응답 설명도 redacted invariant 결과만 사용한다.

사람은 GitHub Environment, 비용 한도·알림, 호출 횟수, secret rotation, 약관과 실제 manual·
schedule run을 승인한다. Actions log와 artifact를 직접 열어 민감정보가 없고 최소 권한이
적용됐는지 확인한다.

## 남은 위험과 학습

하루 한 번의 synthetic 요청은 지역·시간·입력 다양성을 대표하지 못하며 provider 장애와
서비스 결함을 완전히 구분하지 못한다. false alarm과 drift 누락을 분석해 입력 확대가 필요한지
검토하되 비용·약관 승인을 먼저 받는다. GitHub Environment 보호 기능은 저장소 요금제와 설정에
따라 다를 수 있으므로 실제 UI와 API 상태를 증거로 남긴다.

핵심 학습 기준은 live 호출 횟수가 아니라 mock과 실제 계약 차이를 최소한의 비용·데이터로
탐지하고 즉시 비활성화할 수 있는가이다.
