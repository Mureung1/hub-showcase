---
id: WI-0035
title: PP-033 Approval Gate 기반 배포 Live E2E
type: work-record
status: planned
date: 2026-07-14
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
  - ../adr/ADR-0009-mock-local-live-gateway-boundary.md
  - ../adr/ADR-0010-free-demo-deployment-boundary.md
  - WI-0039-shared-fork-live-security-foundation.md
paths:
  - .github/workflows/staging-live.yml
  - edge/**
  - scripts/staging-live/**
  - backend/src/liveTest/**
  - backend/src/main/resources/application-staging-live.yml
  - docs/runbooks/staging-live*.md
  - docs/contracts.md
---

# WI-0035 PP-033 Approval Gate 기반 배포 Live E2E

> GitHub Issue: [PP-033 #35](https://github.com/gdh0730/hub/issues/35)

## 문제와 근거

Mock 계약과 Local Live canary만으로는 배포된 API·Worker·Gateway를 포함한 실제 추천
경로가 현재 Naver·Elice 계약과 맞는지 알 수 없다. 기존 계획은 공유 Fork의 GitHub
`staging-live` Environment에 원본 provider key를 두었으나, workflow를 변경할 수 있는
관리자를 비밀 신뢰 경계에서 제외하지 못해 ADR-0009로 폐기됐다.

## 목적과 성공 기준

목적은 GitHub Actions가 provider·cloud 장기 secret을 보유하지 않은 상태에서 사용자가
승인한 정확한 main SHA만 배포 Live 검증을 시작하고, Provider Gateway가 최소 호출로
실제 계약 drift를 확인하게 하는 것이다.

- workflow는 `workflow_dispatch`, `contents: read`, `id-token: write`와 승인 SHA 입력만
  사용하고 provider·Vercel·Render·Cloudflare token을 저장하지 않는다.
- Approval Gate는 repository·owner·actor ID, event, main ref, 승인 SHA, workflow
  SHA·경로·내용 hash, runner, issuer·audience·expiry와 `jti` replay를 모두 검증한다.
- Provider Gateway만 Naver 원본 key를 보유하고 scope가 제한된 단기 JWT로 Local·Blog와
  향후 전체 E2E에 필요한 호출만 허용한다.
- 한 번의 비개인성 입력으로 schema, 후보 수, 근거 연결, 금지 field, grounded 설명,
  호출 상한과 terminal 상태를 검증한다.
- log와 artifact에는 credential, cookie, token, 검색·provider 원문을 남기지 않는다.
- 코드 자동 검증, Local Live, Gate·Gateway 배포와 전체 E2E를 별도 상태로 기록한다.

## 범위, 비범위와 제약

범위는 Approval Gate·Provider Gateway가 실제 사용자 계정에 배포된 이후의 무비밀
GitHub OIDC workflow, 호출 budget, redacted invariant validator, 수동 전체 E2E,
rotation과 실패 Runbook이다.

일반 PR·push의 live 호출, 실제 사용자 입력, provider 원문 snapshot 공개, secret을
GitHub Environment로 되돌리는 변경과 실패 시 자동 production 활성화는 포함하지 않는다.
최초 배포·검증은 수동 요청만 허용한다. 예약 검증은 별도 scheduler 신원과 비용·알림
정책을 Gate에서 검증할 수 있을 때만 추가하며 사용자 actor 검사를 약화해 활성화하지
않는다.

## 판단 기준과 대안

기준은 공유 Fork 관리자와 원본 비밀의 분리, 사용자 승인 SHA, 비용 상한, 실제 drift
검출, 개인정보 최소화와 실패 영향 격리다.

- GitHub Environment secret은 workflow 수정 위험 때문에 제외한다.
- Local Live만 사용하면 배포 proxy·runtime·secret 주입을 검증하지 못해 배포 E2E를
  별도 둔다.
- 장소명을 golden value로 비교하면 검색 순위 변동에 취약해 schema·grounding과 금지
  field 불변식을 확인한다.
- provider 원문 artifact는 진단이 쉽지만 약관·데이터 위험 때문에 safe summary만
  보존한다.

## 문제 해결 기록

1. PP-037의 무비밀 Gate/Gateway 자동 검증을 선행 조건으로 확인한다.
2. 사용자 actor와 승인 SHA를 cloud 쪽 Gate에서 검증해 저장소 관리자 권한과 배포
   권한을 분리한다.
3. 고정 입력, provider별 호출 수, LLM output 상한과 kill switch를 코드로 고정한다.
4. redaction 음성 테스트 뒤 Gate·Gateway를 배포하고 수동 canary를 먼저 수행한다.
5. 전체 추천 E2E와 rotation을 검증한 뒤에만 반복 실행 필요성과 scheduler 신원을
   별도 결정한다.

## 구현 결과와 검증 증거

현재 PP-033은 `planned`다. PP-037의 foundation 코드와 자동 검증은 실제 Gate 배포,
provider canary 또는 전체 추천 E2E 증거가 아니다. 완료에는 다음이 필요하다.

- 실제 Gate·Gateway deployment ID와 configuration hash를 비밀 없이 기록한 증거
- 승인되지 않은 actor·SHA·workflow와 재사용 `jti`가 outbound 전에 거부되는 결과
- GitHub job에 원본 provider·cloud secret이 없다는 permission·environment 검토
- 수동 전체 E2E의 schema·근거·terminal 상태와 호출 상한 safe summary
- log·artifact에서 secret, cookie, token과 provider 원문이 없다는 사람의 표본 검사
- credential rotation 후 이전 값이 사용되지 않는 결과와 rollback 훈련

실제 edge와 demo stack이 생성되지 않은 현재 상태에서 배포 성공을 주장하지 않는다.

## AI 사용과 사람의 검증

AI에는 workflow·validator와 음성 fixture 초안을 위임할 수 있다. AI는 secret을 읽거나
live 실행을 승인하지 않는다. 사람은 actor·SHA, cloud deployment, 비용·호출량,
rotation, Naver 약관과 실제 E2E를 확인한다.

## 남은 위험과 학습

GitHub OIDC claim과 Cloudflare runtime 정책은 바뀔 수 있고 synthetic 요청 하나는 실제
사용자 다양성을 대표하지 못한다. 공식 변경과 drift가 있으면 Gate를 fail-closed하고
Mock·Local Live·배포 문제를 분리해 진단한다. 반복 실행을 위해 사용자 검증을
약화하는 대신 별도 scheduler 신뢰 주체를 설계해야 한다.
