---
id: WI-0031
title: PP-029 실제 Naver와 OpenAI 어댑터 활성화
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - backend/src/main/java/com/placepick/infrastructure/external/naver/**
  - backend/src/main/java/com/placepick/infrastructure/external/openai/**
  - backend/src/main/java/com/placepick/recommendation/port/**
  - backend/src/main/resources/application*.yml
  - backend/src/test/java/com/placepick/infrastructure/external/**
  - backend/src/integrationTest/java/com/placepick/infrastructure/external/**
  - backend/src/evalTest/**
  - mock-api/**
  - evals/**
  - docs/contracts.md
  - docs/runbooks/external-provider*.md
---

# WI-0031 PP-029 실제 Naver와 OpenAI 어댑터 활성화

> GitHub Issue: [PP-029 #31](https://github.com/gdh0730/hub/issues/31)

## 문제와 근거

PP-029는 mock으로 검증한 추천 pipeline을 실제 Naver API HUB와 OpenAI Responses API에
연결하되, local/test/load와 CI가 외부로 나가지 않는 안전 경계를 유지해야 한다. 외부 DTO를
domain에 직접 노출하면 provider 응답 변경이 핵심 규칙을 오염시키고, profile이나 key 하나만
잘못 설정되어도 개발·부하 테스트가 비용과 데이터 유출을 일으킬 수 있다.

현재 저장소는 mock endpoint만 허용하는 환경 안전 기반을 갖지만 실제 인증 header, 응답
normalization, strict structured output, live host allowlist와 kill switch는 구현되어 있지 않다.
또한 이전 Naver Developer Center의 header·quota 전제를 사용하면 신규 API HUB 계약과 맞지
않는다. 이 Work Record는 실제 호출을 수행했다는 기록이 아니라 안전한 구현 기준이다.

## 목적과 성공 기준

목적은 application 계층이 provider를 알지 않는 port를 유지하면서 두 실제 provider의 현재
계약을 adapter에 격리하고, 명시적인 staging-live 문맥에서만 제한된 호출을 허용하는 것이다.

성공 기준은 다음과 같다.

- 장소·블로그 검색과 조건·추천 문구 생성을 provider-neutral port로 정의하고 mock과 live
  adapter가 동일한 domain 결과·오류 계약을 구현한다.
- Naver adapter는 API HUB base host, `X-NCP-APIGW-API-KEY-ID`와
  `X-NCP-APIGW-API-KEY`, Local/Blog 경로, 429와 복수 오류 body를 처리한다.
- OpenAI adapter는 Responses API, strict JSON Schema, `store=false`, 제한된 output,
  timeout과 privacy-preserving `safety_identifier`를 사용한다.
- `PLACEPICK_EXTERNAL_MODE=live`, 전용 profile, 정확한 HTTPS host allowlist, 필요한 secret이
  모두 충족될 때만 live bean이 활성화된다.
- local/test/load/CI에서는 실제 host나 key가 들어오면 애플리케이션과 테스트가 시작 전에
  실패하고 DNS·HTTP 외부 호출이 0건이다.
- provider 오류는 stable application error로 정규화되고 retry 가능 여부와 degraded/fallback
  판단이 provider DTO 밖에서 일관되게 적용된다.

## 범위, 비범위와 제약

범위는 provider port, Naver API HUB adapter, OpenAI Responses adapter, 설정 validation,
host allowlist, credential presence 검사, kill switch, WireMock 계약 fixture, structured output
Eval과 redacted logging이다. 실제 일일 live 검증 workflow와 secret provisioning은 PP-033에서
수행한다.

다른 LLM provider, 지도·길찾기, scraping, Naver raw response 영구 저장, 모델 fine-tuning,
브라우저의 직접 provider 호출은 포함하지 않는다. 실제 secret은 코드·fixture·Work Record·
로그에 기록하지 않는다. Naver 데이터 표시·저장 범위는 사람의 약관 검토 gate를 통과해야
하며 이 문서는 그 승인을 대신하지 않는다.

## 판단 기준과 대안

판단 기준은 외부 호출 안전성, 계약 변경 격리, 사실 근거 보존, 비용 상한, 테스트 재현성이다.

- provider SDK를 domain 전반에 노출하면 교체와 fixture 검증이 어려워 port/adapter 경계를
  선택한다.
- OpenAI 호출은 현재 기능에 필요한 HTTP 표면이 작으므로 Spring `RestClient`로 명시적인
  request·response mapping을 구현하고 불필요한 SDK 종속을 추가하지 않는다.
- JSON mode만 사용하는 방식은 field와 추가 속성을 충분히 제한하지 못하므로 strict JSON
  Schema Structured Outputs를 사용한다.
- profile 이름만으로 live를 켜는 방식은 오작동 위험이 있어 mode, profile, host, secret,
  kill switch의 다중 조건을 모두 검증한다.
- 실제 provider를 일반 CI에서 호출하는 방식은 비결정성·비용·secret 노출 위험이 있어 mock
  계약 CI와 staging-live 검증을 분리한다.

OpenAI 모델명과 output 상한은 검증된 기본값을 exact configuration으로 두되 환경별 교체가
가능하게 한다. 모델 교체는 schema Eval과 비용 검토 없이 자동 반영하지 않는다.

## 문제 해결 기록

1. PP-005의 provider 정책과 PP-009·PP-013의 mock 계약을 실제 adapter 입력·출력 기준으로
   대조한다.
2. Naver와 OpenAI DTO를 infrastructure package에 한정하고 domain 변환에서 누락·HTML·빈 값
   처리 규칙을 고정한다.
3. provider별 인증, timeout, request ID, 오류 body와 retry 힌트를 redaction 가능한 형태로
   mapping한다.
4. live activation predicate와 host allowlist를 먼저 테스트해 잘못된 구성에서는 HTTP client가
   생성되지 않게 한다.
5. WireMock으로 정상·0건·schema 위반·401·403·429·5xx·timeout을 통합 검증한다.
6. OpenAI 응답의 refusal, incomplete, malformed output과 prompt injection fixture를 Eval한다.
7. PP-033에서 secret을 제공한 뒤 한정된 staging-live E2E로 drift만 확인한다.

현재까지는 위 구현·검증 단계를 수행하지 않았으며 실제 provider 성공을 주장하지 않는다.

## 구현 결과와 검증 증거

PP-029의 실제 adapter와 live 검증 증거는 아직 없다. 완료 판단에는 다음이 필요하다.

- Naver 정상·0건·중복·HTML field·401·403·429·5xx·timeout·서로 다른 오류 body의 WireMock
  계약 테스트
- OpenAI strict schema 정상·추가 field·필수 field 누락·refusal·incomplete·429·5xx·timeout
  fixture와 fallback Eval
- 모든 local/test/load 조합에서 public provider host와 key 주입을 거부하는 음성 테스트
- mock mode에서 outbound 요청의 목적지가 허용된 WireMock host뿐임을 확인한 network 증거
- credential, request/response 원문, safety identifier가 log·metric·test report에 없다는 검사
- kill switch를 내렸을 때 신규 외부 호출이 시작되지 않고 job이 정의된 오류로 종료되는 결과
- 약관 검토 기록과 PP-033의 제한된 live run 링크
- `make integration`, `make eval`, `make check` 성공 결과

mock 테스트만으로 실제 provider 호환성을 완료 처리하지 않고, 반대로 live 한 번의 성공도 전체
오류 계약의 증거로 사용하지 않는다.

## AI 사용과 사람의 검증

AI에는 공식 schema와 기존 fixture 비교, DTO mapping, 오류 분류, redaction과 Eval 사례 초안을
위임할 수 있다. AI가 기억으로 제안한 endpoint, header, model 이름은 채택하지 않고 구현
시점의 공식 문서와 제한된 live 응답으로 다시 확인한다.

사람은 Naver 약관·표시 의무, OpenAI 모델·비용 상한, secret 권한, host allowlist와 실제
staging-live 실행을 승인한다. 네트워크 기록과 로그를 직접 검토해 허용되지 않은 host 및
민감값 노출이 없는지 확인한다.

## 남은 위험과 학습

provider endpoint, quota, model, schema와 정책은 저장소 배포와 독립적으로 바뀔 수 있다.
공식 변경이나 live drift가 발견되면 adapter fixture와 ADR을 함께 재검토한다. 외부 결과의
일시적 편향과 블로그 품질은 schema 통과만으로 해결되지 않으므로 grounded Eval을 계속
확장해야 한다.

핵심 학습 기준은 실제 연동 여부보다 외부 변화와 비용이 domain·개발 환경으로 전파되지
않도록 경계를 검증하는 것이다.
