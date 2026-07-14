---
id: WI-0040
title: PP-038 Elice LLM Proxy Local Live 계약 검증
type: work-record
status: in-progress
date: 2026-07-14
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0011-elice-chat-completions-provider-boundary.md
  - ../runbooks/RUN-0002-elice-llm-local-live-and-token-rotation.md
  - https://github.com/gdh0730/hub/issues/42
paths:
  - backend/src/main/java/com/placepick/infrastructure/external/llm/**
  - backend/src/main/java/com/placepick/infrastructure/external/http/**
  - backend/src/test/java/com/placepick/infrastructure/external/llm/**
  - backend/src/integrationTest/java/com/placepick/infrastructure/external/llm/**
  - backend/src/llmLiveContractTest/**
  - backend/build.gradle
  - backend/gradle.lockfile
  - .env.live.local.example
  - scripts/*live-contract*.sh
  - scripts/lib/live-contract-env.sh
  - scripts/check.sh
  - scripts/scan-test-reports.sh
  - scripts/scan-test-reports-test.sh
  - .github/workflows/ci.yml
  - Makefile
  - README.md
  - AGENTS.md
  - backend/AGENTS.md
  - docs/**
---

# WI-0040 PP-038 Elice LLM Proxy Local Live 계약 검증

> GitHub Issue: [PP-038 #42](https://github.com/gdh0730/hub/issues/42)

## 문제와 근거

Mock LLM은 정상·오류·timeout을 결정적으로 재현하지만 제공된 Elice proxy가 실제로
Chat Completions strict schema와 Embedding 계약을 지원하는지는 증명하지 못한다.
기존 OpenAI Responses 직접 호출 방향을 그대로 유지하면 현재 credential·endpoint와
맞지 않고, 호환 proxy라는 이유만으로 OpenAI와 동일한 기능·데이터 정책을 가정하게 된다.

2026-07-14 Naver Local Live는 baseline `make check` 통과 뒤 Local·Blog 메서드를
application 수준에서 각각 한 번 호출했지만 둘 다 `INVALID_RESPONSE`로 실패했다.
당시 provider 사용량을 대조하지 않아 실제 wire 요청 수는 확정하지 않는다. 이 결과는 Mock의 필요성을
약화하지 않고 실제 계약 증거를 독립적으로 관리해야 함을 확인한다. Naver 원인 진단과
Elice 계약 검증은 서로 다른 provider 작업으로 분리한다.

## 목적과 성공 기준

목적은 실제 token 없이 Elice 요청·응답·오류·redaction을 자동 검증하고, 승인된 로컬에서
합성 Chat과 Embedding을 각각 한 번만 호출해 capability를 확인하는 것이다.

- 공용 `.env.live.local`을 수동 parsing하되 Naver와 Elice 명령은 자기 provider 변수만
  하위 프로세스에 전달한다.
- URL은 서로 다른 exact HTTPS `mlapi.run/{canonical-uuid}/v1`, 모델은
  `openai/gpt-4.1-mini`와 `openai/text-embedding-3-small`만 허용한다.
- Chat은 strict JSON Schema, `stream=false`, `store=false`, tool 없음과 bounded output을
  검증한다.
- Embedding은 합성 입력 한 건, float encoding, index 0, 1,536 finite dimensions만
  확인하고 vector를 출력·저장하지 않는다.
- 400, 401·403, 429, 5xx, timeout, malformed·oversized·schema 위반을 안정적인 오류로
  정규화하고 자동 재시도·Responses fallback을 금지한다.
- token, 전체 proxy URL, 요청·응답 본문과 vector가 console·JUnit·Gradle report·Git에
  나타나지 않아야 한다.

## 범위, 비범위와 제약

범위는 Elice 전용 Java 17 transport·schema validator, WireMock 계약, Local Live source
set, 공용 환경 parser의 provider 격리, `make llm-live-contract`, ADR·Runbook·계약과
실행 증거다. runtime bean은 자동 등록하지 않는다.

PP-009 조건 추출, PP-016 추천 이유, PP-029 runtime wiring, 실제 사용자·Naver 데이터
전송, Embedding 기반 검색·추천·중복 제거, vector 저장소, Cloudflare LLM Gateway와 cloud
배포는 포함하지 않는다. Elice의 보관·로깅·학습 사용·삭제·개인정보 정책을 사람이
검토하기 전에는 합성 canary 외 데이터를 보내지 않는다.

## 판단 기준과 대안

기준은 현재 제공된 계약과의 일치, strict schema, 최소 호출, provider별 secret 격리,
결정적 Mock 회귀, 데이터 최소화와 후속 교체 가능성이다.

- Elice를 일반 앱에 바로 연결하면 제품 기능과 계약 확인이 섞이므로 독립 Local Live
  harness를 먼저 둔다.
- 직접 OpenAI Responses는 공식 기능이 명확하지만 현재 제공 경로와 다르므로 자동
  fallback이 아닌 재검토 대안으로 남긴다.
- Chat 성공만으로 Embedding을 runtime에 채택하지 않고 capability 상태를 분리한다.
- 전체 proxy 응답을 artifact로 남기면 진단은 쉽지만 데이터·비밀 위험이 커 safe summary와
  합성 WireMock fixture만 보존한다.

## 문제 해결 기록

1. Elice proxy가 OpenAI-compatible Chat Completions와 Embedding URL을 별도로 제공한다는
   구성 계약을 확인했다.
2. OpenAI 공식 문서에서 GPT-4.1 mini의 Chat Completions·Structured Outputs 지원과
   `text-embedding-3-small` 기본 1,536차원을 비교 기준으로 확인했다.
3. Responses 직접 호출을 기본에서 대안으로 옮기고 Elice 정책 검토 전 실제 제품 데이터
   전달을 차단하는 ADR-0011을 채택했다.
4. Naver 실패를 application에서 재호출하지 않고 `INVALID_RESPONSE` 두 건으로 기록해
   Elice 작업과
   원인·증거를 분리했다.
5. unit security, LLM WireMock 통합 테스트와 Local Live source set compile을 먼저
   실행해 실제 credential 없이 transport·schema·redaction 경계를 검증했다.
6. Apache HttpClient 5의 automatic retry·redirect를 명시적으로 끈 공통 전송 계층으로
   Naver·Elice를 통일하고 5xx·timeout의 WireMock 요청 수가 endpoint별 한 건인지 검증했다.
7. 텍스트와 binary JUnit·Gradle report를 fail-closed 검사하고 provider별 Live 명령도
   종료 성공 여부와 무관하게 전용 report를 검사하도록 보강했다.
8. Dev Container Java 17에서 전체 `make check`를 실행하고 실제 Elice 합성 canary는
   별도의 수동 Live 증거로 남긴다.

## 구현 결과와 검증 증거

Elice 자동 타깃 검증은 2026-07-14에 `BUILD SUCCESSFUL`로 끝났다. unit security 18개,
Elice transport 통합 37개, committed mapping 통합 4개로 총 59개 테스트가
failures·errors 0이었고 mapping JSON 20개를 parsing했다.
`compileLlmLiveContractTestJava`도 성공했다. Naver는 단위 3개·통합 21개로 총 24개가
failures·errors 0이었다.

같은 날 최종 트리에서 Dev Container Java 17 전체 `make check`가 275.6초, exit 0으로
통과했다. actionlint 1.7.12의 고정 digest를 대조했고 Markdown은 83개 파일·오류 0,
문서 음성 테스트는 8/8, Edge는 74/74였다. Gradle은 unit·integration·Eval을 실행하고
Naver·LLM Live class를 compile한 뒤 100초에 `BUILD SUCCESSFUL`로 끝났다. 텍스트와
binary를 포함한 test report 61개도 비밀·본문 안전 scan을 통과했다. Live task는
실행하지 않아 이 전체 검증에서 실제 provider 호출은 0회였다. 자동 검증과 Live 상태를
다음처럼 분리한다.

| 증거 | 현재 상태 | 완료 기준 |
| --- | --- | --- |
| Elice 자동 타깃 검증 | 통과 | 59 tests·20 mapping JSON·Live source compile, failures·errors 0 |
| 저장소 전체 검증 | 통과 | Dev Container Java 17, exit 0, 275.6초; report 61개 안전 scan, 실제 provider 호출 0회 |
| Chat Local Live | 실행 안 됨 | 합성 입력 1회, 2xx, strict schema·usage 통과 |
| Embedding capability | 실행 안 됨 | 합성 입력 1회, 2xx, data 1개·1,536 finite dimensions |
| 제품 runtime | 구현 안 됨 | PP-009·PP-016·PP-029와 Elice 정책 검토 |
| 클라우드 배포 | 배포 안 됨 | PP-033·PP-035 승인 SHA E2E |

Naver는 별도 PP-013에서 `INVALID_RESPONSE` 원인을 진단하며 WI-0015와 RUN-0001을 완료로
바꾸지 않는다. Elice canary 결과도 실제 실행 전에는 성공으로 갱신하지 않는다.

## AI 사용과 사람의 검증

AI에는 공식 OpenAI 호환 기준 탐색, transport·schema·음성 fixture와 문서 초안을
위임한다. AI는 token이나 실제 proxy URL을 읽거나 출력하지 않고 live 실행을 승인하지
않는다.

사람은 Elice endpoint·token, 실행 SHA, 호출량, 정책·비용과 실제 canary를 확인한다.
Chat·Embedding safe summary, secret scan과 provider 사용량을 직접 대조한 뒤에만 상태를
변경한다.

## 남은 위험과 재검토 조건

Elice의 OpenAI 호환 범위, model alias, response schema, quota와 데이터 정책은 바뀔 수
있다. `store=false`가 수락돼도 proxy 미보관을 증명하지 않는다. strict schema 미지원,
정책 미확정, 예상 밖 token·응답 노출이나 사용량이 관찰되면 live를 중단하고 provider
선정과 Gateway 경계를 재검토한다.

Embedding을 제품 기능으로 쓰려면 사용자 가치, 품질 Eval, vector 저장·보존·삭제와 비용을
별도 Task에서 승인해야 한다. PP-038의 성공은 PP-009·PP-016·PP-029 구현 완료가 아니다.
