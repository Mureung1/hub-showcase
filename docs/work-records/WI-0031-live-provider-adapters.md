---
id: WI-0031
title: PP-029 실제 Naver와 Elice 어댑터 활성화
type: work-record
status: planned
date: 2026-07-14
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0009-mock-local-live-gateway-boundary.md
  - ../adr/ADR-0011-elice-chat-completions-provider-boundary.md
  - WI-0039-shared-fork-live-security-foundation.md
  - WI-0040-elice-llm-proxy-live-contract.md
paths:
  - backend/src/main/java/com/placepick/infrastructure/external/naver/**
  - backend/src/main/java/com/placepick/infrastructure/external/llm/**
  - backend/src/main/java/com/placepick/recommendation/application/port/**
  - backend/src/main/resources/application*.yml
  - backend/src/test/java/com/placepick/infrastructure/external/**
  - backend/src/integrationTest/java/com/placepick/infrastructure/external/**
  - backend/src/evalTest/**
  - mock-api/**
  - evals/**
  - docs/contracts.md
  - docs/runbooks/external-provider*.md
---

# WI-0031 PP-029 실제 Naver와 Elice 어댑터 활성화

> GitHub Issue: [PP-029 #31](https://github.com/gdh0730/hub/issues/31)

## 문제와 근거

PP-029는 mock으로 검증한 추천 pipeline을 실제 Naver API HUB와 Elice Chat Completions에
연결하되, local/test/load와 CI가 외부로 나가지 않는 안전 경계를 유지해야 한다. 외부 DTO를
domain에 직접 노출하면 provider 응답 변경이 핵심 규칙을 오염시키고, profile이나 key 하나만
잘못 설정되어도 개발·부하 테스트가 비용과 데이터 유출을 일으킬 수 있다.

현재 저장소에는 mock endpoint 안전장치가 있고, PP-013 범위의 Naver 인증 header·응답
normalization·Local Live 계약 기반은 구현·자동 검증 중이다. 그러나 전체 추천 pipeline의
배포 Gateway 활성화, Elice strict structured output, 공통 kill switch는 아직 구현되어
있지 않다. 또한 이전 Naver Developer Center의 header·quota 전제를 사용하면 신규 API HUB
계약과 맞지 않는다. 이 Work Record는 실제 호출을 수행했다는 기록이 아니라 후속 활성화의
안전 기준이다.

## 목적과 성공 기준

목적은 application 계층이 provider를 알지 않는 port를 유지하면서 두 실제 provider의 현재
계약을 adapter에 격리하고, Local Live와 배포 Gateway의 명시적 문맥에서만 제한된 호출을
허용하는 것이다.

성공 기준은 다음과 같다.

- 장소·블로그 검색과 조건·추천 문구 생성을 provider-neutral port로 정의하고 mock과 live
  adapter가 동일한 domain 결과·오류 계약을 구현한다.
- Naver adapter는 API HUB base host, `X-NCP-APIGW-API-KEY-ID`와
  `X-NCP-APIGW-API-KEY`, Local/Blog 경로, 429와 복수 오류 body를 처리한다.
- Elice adapter는 OpenAI-compatible Chat Completions, strict JSON Schema,
  `stream=false`, `store=false`, 제한된 output과 timeout을 사용한다.
- Embedding은 PP-038 capability 확인과 분리하고 이 runtime adapter에 연결하지 않는다.
- Local Live는 격리 계약 task, 배포 Live는 Provider Gateway endpoint·단기 자격·kill switch와
  정확한 HTTPS host allowlist가 모두 충족될 때만 활성화된다.
- local/test/load/CI에서는 실제 host나 key가 들어오면 애플리케이션과 테스트가 시작 전에
  실패하고 DNS·HTTP 외부 호출이 0건이다.
- provider 오류는 stable application error로 정규화되고 retry 가능 여부와 degraded/fallback
  판단이 provider DTO 밖에서 일관되게 적용된다.

## 범위, 비범위와 제약

범위는 provider port, Naver API HUB adapter, Elice Chat Completions adapter, 설정 validation,
host allowlist, credential presence 검사, kill switch, WireMock 계약 fixture, structured output
Eval과 redacted logging이다. 배포 Live의 Gate·Gateway provisioning과 승인 SHA E2E는 PP-033에서
수행한다.

직접 OpenAI Responses 구현, 다른 LLM provider, 지도·길찾기, scraping, Naver raw response
영구 저장, embedding runtime, 모델 fine-tuning,
브라우저의 직접 provider 호출은 포함하지 않는다. 실제 secret은 코드·fixture·Work Record·
로그에 기록하지 않는다. Naver 데이터 표시·저장 범위는 사람의 약관 검토 gate를 통과해야
하며 이 문서는 그 승인을 대신하지 않는다.

## 판단 기준과 대안

판단 기준은 외부 호출 안전성, 계약 변경 격리, 사실 근거 보존, 비용 상한, 테스트 재현성이다.

- provider SDK를 domain 전반에 노출하면 교체와 fixture 검증이 어려워 port/adapter 경계를
  선택한다.
- Elice 호출은 현재 기능에 필요한 HTTP 표면이 작으므로 Spring `RestClient`로 명시적인
  request·response mapping을 구현하고 불필요한 SDK 종속을 추가하지 않는다.
- JSON mode만 사용하는 방식은 field와 추가 속성을 충분히 제한하지 못하므로 strict JSON
  Schema Structured Outputs를 사용한다.
- profile 이름만으로 live를 켜는 방식은 오작동 위험이 있어 mode, profile, host, secret,
  kill switch의 다중 조건을 모두 검증한다.
- 실제 provider를 일반 CI에서 호출하는 방식은 비결정성·비용·secret 노출 위험이 있어 Mock
  계약 CI, Local Live와 Gate를 통과한 배포 Live 검증을 분리한다.
- Elice 실패 시 직접 OpenAI Responses로 자동 fallback하면 비용·개인정보·API 계약이
  조용히 바뀌므로 별도 ADR과 검증 없이는 허용하지 않는다.

Elice model과 output 상한은 검증된 기본값을 exact configuration으로 두되 환경별 교체가
가능하게 한다. 모델 교체는 schema Eval과 비용 검토 없이 자동 반영하지 않는다.

## 문제 해결 기록

1. PP-005의 provider 정책과 PP-009·PP-013의 mock 계약을 실제 adapter 입력·출력 기준으로
   대조한다.
2. Naver와 Elice DTO를 infrastructure package에 한정하고 domain 변환에서 누락·HTML·빈 값
   처리 규칙을 고정한다.
3. provider별 인증, timeout, request ID, 오류 body와 retry 힌트를 redaction 가능한 형태로
   mapping한다.
4. live activation predicate와 host allowlist를 먼저 테스트해 잘못된 구성에서는 HTTP client가
   생성되지 않게 한다.
5. WireMock으로 정상·0건·schema 위반·401·403·429·5xx·timeout을 통합 검증한다.
6. Elice Chat 응답의 불완전 종료, malformed·schema 위반과 prompt injection fixture를 Eval한다.
7. PP-033에서 원본 key를 Provider Gateway에만 제공한 뒤 승인 SHA의 배포 Live E2E로 drift만
   확인한다.

PP-013의 Naver adapter foundation과 Mock 계약 검증은 별도 Work Record에서 진행 중이다.
여기서 정의한 Elice runtime adapter, 배포 활성화, kill switch와 전체 E2E는 아직 수행하지 않았으며
실제 provider 성공을 주장하지 않는다.

## 구현 결과와 검증 증거

PP-029의 Elice runtime adapter·배포 활성화와 전체 live 검증 증거는 아직 없다. PP-013의 Naver
기반이 완료되더라도 아래 전체 조건을 충족해야 PP-029를 완료한다.

- Naver 정상·0건·중복·HTML field·401·403·429·5xx·timeout·서로 다른 오류 body의 WireMock
  계약 테스트
- Elice strict schema 정상·추가 field·필수 field 누락·불완전 종료·429·5xx·timeout
  fixture와 fallback Eval
- 모든 local/test/load 조합에서 public provider host와 key 주입을 거부하는 음성 테스트
- mock mode에서 outbound 요청의 목적지가 허용된 WireMock host뿐임을 확인한 network 증거
- credential, 전체 proxy URL과 request/response 원문이 log·metric·test report에 없다는 검사
- kill switch를 내렸을 때 신규 외부 호출이 시작되지 않고 job이 정의된 오류로 종료되는 결과
- 약관 검토 기록과 Local Live·PP-033 배포 Live의 분리된 safe summary
- `make integration`, `make eval`, `make check` 성공 결과

mock 테스트만으로 실제 provider 호환성을 완료 처리하지 않고, 반대로 live 한 번의 성공도 전체
오류 계약의 증거로 사용하지 않는다.

## AI 사용과 사람의 검증

AI에는 공식 schema와 기존 fixture 비교, DTO mapping, 오류 분류, redaction과 Eval 사례 초안을
위임할 수 있다. AI가 기억으로 제안한 endpoint, header, model 이름은 채택하지 않고 구현
시점의 공식 문서와 제한된 live 응답으로 다시 확인한다.

사람은 Naver 약관·표시 의무, Elice 모델·정책·비용 상한, Local Live credential, Gateway secret,
host allowlist와 실제 배포 Live 실행을 승인한다. 네트워크 기록과 로그를 직접 검토해
허용되지 않은 host 및 민감값 노출이 없는지 확인한다.

## 남은 위험과 학습

provider endpoint, quota, model, schema와 정책은 저장소 배포와 독립적으로 바뀔 수 있다.
공식 변경이나 live drift가 발견되면 adapter fixture와 ADR을 함께 재검토한다. 외부 결과의
일시적 편향과 블로그 품질은 schema 통과만으로 해결되지 않으므로 grounded Eval을 계속
확장해야 한다.

핵심 학습 기준은 실제 연동 여부보다 외부 변화와 비용이 domain·개발 환경으로 전파되지
않도록 경계를 검증하는 것이다.
