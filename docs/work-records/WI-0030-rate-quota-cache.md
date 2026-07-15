---
id: WI-0030
title: PP-028 요청 제한과 외부 할당량 및 캐시 보호
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - backend/src/main/java/com/placepick/infrastructure/ratelimit/**
  - backend/src/main/java/com/placepick/infrastructure/cache/**
  - backend/src/main/java/com/placepick/infrastructure/external/**
  - backend/src/main/resources/application*.yml
  - backend/src/test/java/com/placepick/infrastructure/ratelimit/**
  - backend/src/integrationTest/java/com/placepick/infrastructure/ratelimit/**
  - observability/**
  - docs/contracts.md
  - docs/runbooks/provider-quota*.md
---

# WI-0030 PP-028 요청 제한과 외부 할당량 및 캐시 보호

> GitHub Issue: [PP-028 #30](https://github.com/gdh0730/hub/issues/30)

## 문제와 근거

PP-028은 익명 서비스의 반복 요청, 외부 provider 할당량 고갈, 동시 cache miss와 장시간
외부 지연이 전체 추천 처리에 미치는 영향을 제한한다. 회원 계정이 없으므로 단일 식별자만
믿는 rate limit은 우회되기 쉽고, 애플리케이션 인스턴스 메모리만 사용하면 수평 확장 시
한도가 일관되지 않는다. 같은 조건의 동시 요청이 모두 외부 API를 호출하면 비용과 429가
증폭될 수 있다.

현재 환경에는 Redis가 있지만 비즈니스 rate limit, provider quota counter, cache 허용 범위,
`Retry-After` 계약과 stampede 방지가 구현되어 있지 않다. 특히 Naver 원문 응답을 편의를
위해 저장하면 약관·표시 의무와 충돌할 수 있으므로 법적 검토 없이 cache를 확대해서는
안 된다.

## 목적과 성공 기준

목적은 정상적인 익명 사용을 불필요하게 막지 않으면서 과도한 요청과 외부 비용을 제한하고,
장애가 발생해도 일관된 오류와 관측 가능한 보호 동작을 제공하는 것이다.

성공 기준은 다음과 같다.

- endpoint 특성에 따라 익명 session과 privacy-preserving IP hash를 조합한 분산 rate limit을
  적용하고 초과 시 429, 안정적인 `errorCode`, `Retry-After`를 반환한다.
- 추천 생성, 조건 추출, 방 투표, event 수집의 서로 다른 비용을 독립 bucket으로 관리한다.
- Naver와 Elice 호출 전에 provider별 요청·token budget을 원자적으로 예약하고, 잔여량이
  안전 기준보다 낮으면 외부 호출 전에 fail closed한다.
- timeout과 전체 job deadline을 분리해 한 provider 지연이 worker를 무기한 점유하지 않는다.
- 동일한 자체 파생 결과에만 짧은 cache와 single-flight를 적용하며 Naver raw response는
  명시적 약관 승인 전 저장하지 않는다.
- 제한 허용·거부·provider 429·quota 잔여량·cache hit/miss/wait를 민감 label 없이 metric으로
  제공한다.

## 범위, 비범위와 제약

범위는 Redis 기반 원자적 rate limit, endpoint policy, provider budget guard, timeout budget,
허용된 파생 데이터 cache, stampede 방지, 오류 mapping, metric과 복구 Runbook이다. 실제
provider client 활성화는 PP-029, 보안·데이터 수명 검토는 PP-030에서 닫는다.

CAPTCHA, 유료 요금제, 사용자별 계약 quota, CDN/WAF, Naver raw payload cache는 포함하지
않는다. local/test/load 프로필은 mock 외부 모드를 유지하며 실제 quota endpoint나 key를
사용하지 않는다. 임의의 처리량 수치를 성능 목표로 확정하지 않고 provider 계약과 PP-034
실측을 근거로 설정값을 조정한다.

## 판단 기준과 대안

판단 기준은 원자성, 다중 인스턴스 일관성, 정상 사용자 영향, 외부 비용 제한, 개인정보
최소화와 장애 시 예측 가능성이다.

- JVM local counter는 단순하지만 인스턴스마다 한도가 달라 제외한다.
- IP 원문만 기준으로 사용하면 NAT 사용자를 함께 차단하고 개인정보가 남으므로 제외한다.
- Redis의 원자 script 또는 동등한 단일 명령으로 bucket 소비를 판정하고 session과 회전
  salt 기반 IP hash를 보조 key로 사용한다.
- lock 없는 cache-aside는 thundering herd를 막지 못하므로 짧은 lease의 single-flight와
  대기 상한을 둔다.
- provider 429를 무제한 재시도하는 대신 `Retry-After`, job deadline과 제한된 backoff를
  함께 적용한다.

Redis 장애 시 추천·조건 추출처럼 비용이 큰 외부 호출은 보호를 우선해 fail closed하고,
투표처럼 DB 제약으로 안전한 내부 요청은 제한 정책의 별도 fallback을 사용한다. 이 차이는
endpoint 정책과 Runbook에 명시한다.

## 문제 해결 기록

1. 공개 endpoint를 외부 비용, DB 쓰기, 읽기, telemetry 비용군으로 분류한다.
2. PP-005의 provider quota와 PP-003의 TTL을 읽어 configuration schema와 안전 범위를
   고정한다.
3. Redis key가 token·원문 IP·자연어를 포함하지 않도록 namespace와 hash 방식을 설계한다.
4. clock을 주입할 수 있는 limiter와 quota reservation을 구현해 경계 시각을 단위 테스트한다.
5. Testcontainers Redis에서 경쟁 요청, TTL, script 원자성과 Redis 중단 정책을 검증한다.
6. WireMock 429·timeout과 결합해 재시도 횟수와 job deadline을 확인한다.
7. cache 허용 데이터 목록과 약관 gate를 문서화하고 관측 metric·Runbook을 연결한다.

위 순서는 계획이며 실제 제한값 조정, 부하 측정이나 외부 quota 검증은 아직 이루어지지 않았다.

## 구현 결과와 검증 증거

PP-028은 아직 구현되지 않았고 보호 효과도 측정하지 않았다. 완료 증거는 다음을 포함한다.

- 고정 clock에서 bucket 허용·거부·복구 시각과 정확한 `Retry-After`를 검증하는 단위 테스트
- 다수 thread와 두 application instance가 같은 Redis key를 소비해 설정 한도를 넘지 않는
  통합 테스트
- NAT를 모사한 같은 IP의 다른 session과 같은 session의 IP 변경에 대한 정책 테스트
- Redis 장애에서 endpoint 비용군별 fail-closed/fallback 동작을 확인한 장애 주입 결과
- provider 429, 5xx, timeout, 늦은 응답에서 재시도와 전체 deadline이 지켜지는 WireMock 결과
- 동시 cache miss가 외부 mock 호출 한 번으로 수렴하고 lease 만료 뒤 복구되는 stampede 테스트
- Redis key, log, metric에 원문 IP·세션 token·자연어·API key가 없는지 확인한 secret 검사
- `make integration`, `make eval`, `make check`와 PP-034 부하 실험의 추적 링크

기준값은 실측·provider 계약 검토 전까지 성과로 주장하지 않으며, 테스트 통과 전에는 status를
`done`으로 변경하지 않는다.

## AI 사용과 사람의 검증

AI에는 endpoint 비용 분류 초안, 원자성 경합 테스트, 429·timeout fixture와 metric cardinality
검토를 위임할 수 있다. 제안된 제한값은 근거 없이 채택하지 않고 provider 계약, 정상 사용자
시나리오와 부하 결과로 검토한다.

사람은 약관상 cache 가능 범위, IP hash 처리, 외부 비용 상한, Redis 장애 정책과 정상 사용자
오탐을 승인한다. 실제 keyspace와 metric label을 직접 점검하고 live secret이나 endpoint를
local/test/load에서 사용하지 않았는지 확인한다.

## 남은 위험과 학습

분산 시스템의 clock drift, Redis 지연과 NAT 환경은 제한의 공정성에 영향을 줄 수 있다.
오탐률이나 quota 소진 패턴이 측정되면 bucket 기준과 hash 조합을 재검토한다. provider가
quota 의미나 응답 header를 바꾸면 adapter 계약과 guard를 함께 갱신해야 한다. 약관 검토가
raw 응답 저장을 허용하더라도 데이터 최소화와 최신성 이점을 다시 비교한 뒤 별도 결정한다.

핵심 학습 기준은 rate limit을 단순 트래픽 차단이 아니라 비용, 개인정보, 사용자 복구와
연결된 명시적 정책으로 다루는 것이다.
