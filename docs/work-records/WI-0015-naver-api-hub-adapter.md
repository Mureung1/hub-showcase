---
id: WI-0015
title: PP-013 Naver API Hub 장소·블로그 검색 어댑터
type: work-record
status: in-progress
date: 2026-07-14
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0009-mock-local-live-gateway-boundary.md
  - ../runbooks/RUN-0001-naver-local-live-and-credential-rotation.md
paths:
  - backend/src/main/java/com/placepick/recommendation/application/port/out/**
  - backend/src/main/java/com/placepick/infrastructure/external/naver/**
  - backend/src/main/java/com/placepick/infrastructure/external/http/**
  - backend/src/test/java/com/placepick/infrastructure/external/naver/**
  - backend/src/integrationTest/java/com/placepick/infrastructure/external/naver/**
  - backend/src/liveContractTest/java/com/placepick/infrastructure/external/naver/**
  - backend/src/naverLiveContractTest/**
  - backend/build.gradle
  - backend/gradle.lockfile
  - mock-api/naver/**
  - .env.live.local.example
  - scripts/naver-live-contract*.sh
  - scripts/check.sh
  - Makefile
  - docs/contracts.md
---

# WI-0015 PP-013 Naver API Hub 장소·블로그 검색 어댑터

> GitHub Issue: [PP-013 #15](https://github.com/gdh0730/hub/issues/15)

## 문제와 근거

기존 저장소에는 mock endpoint가 loopback인지 확인하는 안전장치와 구형 Naver
Developer Center 경로의 단순 WireMock fixture만 있었다. 추천 application이 사용할
typed 검색 port, 현행 NAVER API HUB Local·Blog 경로, 인증 header, HTML 정규화와
provider 오류 계약은 없었다. Mock만 통과해도 발급한 Application과 현재 API가 실제로
호환되는지는 알 수 없다.

반대로 일반 테스트에 실제 key를 넣으면 실패 fixture를 안정적으로 재현할 수 없고
외부 장애·quota·데이터가 merge 결과를 바꾼다. Java adapter의 결정적 자동 검증과
실제 인증 canary를 별도 증거로 구현해야 한다.

## 목적과 성공 기준

추천 application이 공급자 DTO를 알지 않고 장소와 블로그 근거를 검색하는 outbound
port와 NAVER API HUB adapter를 만든다.

- `PlaceSearchPort`와 `BlogSearchPort`는 provider-neutral 입력·결과를 사용하고 Naver
  request·response DTO와 인증은 infrastructure adapter 안에 둔다.
- base URL은 `https://naverapihub.apigw.ntruss.com`, 경로는 `/search/v1/local`과
  `/search/v1/blog`, 인증 header는 `X-NCP-APIGW-API-KEY-ID`와
  `X-NCP-APIGW-API-KEY`로 고정한다.
- HTML 강조 태그를 adapter 경계에서 제거하고 원문 body는 변환 후 폐기한다.
- 400, 401·403, 429, schema 오류, 5xx·timeout을 안정적인 application 오류로
  정규화하고 adapter 자체는 자동 재시도하지 않는다.
- WireMock으로 정상·0건·HTML·오류·timeout·malformed JSON과 구 endpoint 거부를
  자동 검증한다.
- Local Live task는 고정된 비개인성 입력과 `display=1`로 Local·Blog를 각각 한 번만
  호출하고 safe summary만 출력한다.

## 범위, 비범위와 제약

범위는 장소·Blog port, Spring `RestClient` adapter, 고정 origin·credential 검증, DTO·mapper,
오류 분류, redacted logging, 현행 WireMock fixture와 격리된 Local Live 계약 task다.
일반 Spring runtime에는 원본 Naver key를 읽는 자동 구성이나 bean을 등록하지 않는다.

후보 중복 제거·근거 결합은 PP-014, 점수·Top 3는 PP-015, 재시도·quota 보호는
PP-028이 담당한다. 실제 배포 Gateway와 Elice adapter는 포함하지 않는다. Naver
원문 response, 검색어와 credential을 DB·log·JUnit report·artifact에 저장하지 않는다.

Naver 약관과 표시 의무를 사람이 확인하기 전에는 Local·Blog 결과 결합, room 수명까지
저장, 자체 점수화 결과에 포함하거나 Elice 등 제3자 LLM에 전달하는 기능을 활성화하지
않는다.
이번 Local Live는 메모리에서 폐기하는 인증·schema 확인으로 제한한다.

## 판단 기준과 대안

기준은 최신 공식 계약, domain 독립성, 결정적 실패 재현, 비밀 차단, 실제 drift 탐지와
호출 최소화다.

- 외부 DTO를 application에 직접 노출하면 schema 변경이 핵심 규칙에 전파되어
  provider-neutral typed port를 선택했다.
- 범용 map은 변화에 느슨하지만 compile-time 검증과 오류 위치를 잃어 전용 DTO와
  mapper를 선택했다.
- HTTP client와 Worker 양쪽 재시도는 호출 수를 증폭하므로 adapter는 재시도하지 않고
  향후 Worker 정책 한 곳에서만 처리한다.
- 실제 API만 테스트하면 경계 실패를 재현하기 어려워 WireMock 계약을 자동 gate로,
  Local Live 두 호출을 별도 호환성 증거로 사용한다.

## 문제 해결 기록

1. 공식 API HUB 문서에서 base URL, Local·Blog 경로, 인증 header와 요청 제한을 다시
   확인한다.
2. application port와 adapter DTO·mapper를 분리하고 query·credential·원문 body가
   로그에 들어가지 않는 관측 경계를 먼저 설계한다.
3. 현행 경로의 정상·경계·오류 fixture와 이전 `/v1/search/*.json` 경로 음성 테스트를
   작성한다.
4. `local`, `test`, `load`, CI에서 live mode와 실제 host·key가 HTTP client 생성 전에
   거부되는지 확인한다.
5. 자동 검증 통과 뒤 사람이 교체된 credential, diff와 SHA를 확인하고 RUN-0001로
   Local Live를 수행했다.
6. 2026-07-14 두 endpoint가 모두 `INVALID_RESPONSE`로 실패해 application에서
   재호출하지 않고,
   응답 원문 없이 adapter schema·parser 차이의 진단을 후속으로 남겼다.
7. 공식 Local·Blog 계약이 item의 link·설명·주소·작성자 같은 상세 field를 필수로
   보장하지 않는데 기존 validator가 모두 존재해야 한다고 요구한 차이를 확인했다.
   선택 field는 빈 문자열로 정규화하고 제품이 사용할 최소 제목만 필수로 유지하는
   합성 회귀 테스트를 추가했다. 실제 재검증 전에는 이 차이를 실패의 확정 원인으로
   단정하지 않는다.

## 구현 결과와 검증 증거

Java adapter와 Mock 자동 검증은 완료됐다. 실제 인증 canary는 실행했지만 성공 기준을
통과하지 못했다. 상태를 다음처럼 분리한다.

후속 transport 보강 뒤 2026-07-14 최종 `make check`에서 Naver 단위 3개와 adapter
통합 19개·mapping 통합 2개가 failures·errors 0으로 통과했다. malformed JSON은
`INVALID_RESPONSE`, timeout은 `PROVIDER_UNAVAILABLE`로 분리됐고 5xx·timeout의
WireMock 요청 수는 endpoint별 한 건이었다. 이 자동 증거는 과거 Live 실패를 성공으로
바꾸지 않는다.

| 증거 | 현재 상태 | 완료 기준 |
| --- | --- | --- |
| Java·Mock 자동 검증 | 완료 | Naver 단위 3개·통합 21개(어댑터 19개·mapping 2개), failures·errors 0; committed mapping JSON 20개 검증 |
| Local Live canary | 실패 | 2026-07-14 논리 호출 2회, Local·Blog 모두 `INVALID_RESPONSE`; 당시 wire 요청 수는 미확인 |
| 배포 Gateway | 배포 안 됨 | PP-037 foundation 뒤 PP-033의 승인 SHA E2E |

감사한 실행 SHA는 `25217e7e27a93ac252d781b71393df6caef2faaf`다. 2026-07-14
12:16:58.252Z 실행 전 baseline `make check`는 통과했고 application-level 재시도 없이
Local과 Blog 메서드를 각각 한 번 호출했다. 안전한 결과는 Local
`http=none`, `schema=false`, `itemCount=none`, 916ms와 Blog `http=none`,
`schema=false`, `itemCount=none`, 186ms였다. 두 논리 호출 모두
`INVALID_RESPONSE`로 종료돼 Local Live 활용 가능성은 검증되지 않았다.

당시 JDK HTTP transport의 connect retry 기본값을 명시적으로 끄지 않았고 NCP 사용량을
증거로 대조하지 않아 실제 wire 요청 수가 정확히 2회였다고 주장하지 않는다. 이후 live
transport는 Apache HttpClient 5의 automatic retry와 redirect를 코드에서 비활성화하고,
5xx·timeout 계약에서 실제 WireMock 요청 한 건을 검증하도록 보강했다. 다음 재검증은
provider 사용량과 논리 호출 수를 함께 대조한다.

응답 body는 HTTP 처리 과정의 메모리에서 역직렬화됐지만 console에 출력하거나 DB·파일·
JUnit artifact에 영구 보존하지 않았다. 장소명, 주소, link, query와 인증 header도
기록하지 않았으며 실패 원인을 추측해 성공으로 바꾸지 않는다.

후속 진단은 실제 응답 전문을 저장하지 않고 필수 field의 존재·type·JSON parsing 차이를
안전한 합성 fixture로 재현한다. 원인 수정, 호출 상한과 diff 재검토 뒤에만 사람이 새
2회 canary를 승인한다. RUN-0001은 이 실패로 인해 `draft` 상태를 유지한다.

## AI 사용과 사람의 검증

AI에는 공식 계약에서 테스트 조합 추출, port·DTO·mapper·WireMock fixture와 redaction
음성 테스트 초안을 위임할 수 있다. 사람은 공식 Naver 문서의 현재성, 약관상
저장·표시·제3자 전달, credential 교체와 실제 호출을 직접 확인한다.

자동 fixture가 실제 응답과 같다고 가정하지 않고 Local Live가 통과해도 오류·timeout
회귀가 검증됐다고 간주하지 않는다. 두 증거를 모두 연결하되 서로 대신하지 않는다.

## 남은 위험과 학습

API HUB schema, quota와 오류 body는 변경될 수 있고 Local의 작은 결과 상한은 후속
후보 수에 영향을 줄 수 있다. 실제 2xx는 Naver 데이터의 결합·저장·LLM 전달을
허용한다는 뜻이 아니다. 공식 문서·약관 변경, schema drift나 401·403 증가가 감지되면
live를 중지하고 fixture와 계약을 함께 갱신한다.

현재 `in-progress`는 adapter 코드가 없어서가 아니라 실제 Local·Blog canary가 둘 다
`INVALID_RESPONSE`로 실패해 계약 호환성이 확인되지 않았다는 뜻이다. 실제 Naver API
활용 가능성이나 클라우드 배포 완료를 주장하지 않는다.
