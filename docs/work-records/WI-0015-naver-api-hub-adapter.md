---
id: WI-0015
title: PP-013 Naver API Hub 장소·블로그 검색 어댑터
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
paths:
  - backend/src/main/java/com/placepick/recommendation/adapter/out/naver/**
  - backend/src/integrationTest/java/com/placepick/recommendation/adapter/out/naver/**
  - backend/src/integrationTest/resources/contracts/naver/**
  - docs/contracts.md
---

# WI-0015 PP-013 Naver API Hub 장소·블로그 검색 어댑터

> GitHub Issue: [PP-013 #15](https://github.com/gdh0730/hub/issues/15)

## 문제와 근거

현재 저장소에는 외부 endpoint가 mock인지 검사하는 환경 안전 장치와 단순 WireMock
fixture만 있고, 추천 도메인이 사용할 장소·블로그 검색 port와 Naver 응답 변환 계약은
없다. 과거 Developer Center 방식의 인증 헤더와 호출량 전제를 그대로 사용하면 신규
NAVER API HUB 신청 경로, 인증 방식, 오류 응답과 불일치할 위험이 있다. 또한 Naver
응답에 포함될 수 있는 HTML 강조 태그나 서로 다른 오류 body를 도메인까지 노출하면
후속 정규화와 사용자 출력의 안전성이 외부 형식에 종속된다.

## 목적과 성공 기준

추천 application이 공급자 DTO를 알지 않고 장소 검색과 블로그 근거 검색을 요청할 수
있는 outbound port 및 NAVER API HUB adapter를 만든다. 다음 조건을 자동 검증해야
성공으로 판정한다.

- API HUB base URL과 `X-NCP-APIGW-API-KEY-ID`, `X-NCP-APIGW-API-KEY` 인증을
  전용 설정 경계에서만 조립한다.
- 장소와 블로그의 정상, 0건, HTML 포함, 인증 실패, 429, 5xx, timeout 및 서로 다른
  오류 body를 WireMock 계약 테스트로 재현한다.
- 응답 DTO는 adapter 내부에서 도메인 입력 모델로 변환되고 HTML 태그와 외부의
  불안정한 필드는 경계에서 제거한다.
- `local`, `test`, `load`에서 실제 Naver host나 credential이 들어오면 기존 startup
  guard가 실패하며, 테스트 중 외부 네트워크 호출이 발생하지 않는다.

## 범위, 비범위와 제약

범위는 장소·블로그 검색 port, API HUB HTTP client, 설정 binding, 오류 분류,
timeout, 제한된 재시도와 WireMock 계약 fixture다. 검색 결과의 중복 제거와 근거 모델은
PP-014, 점수와 Top 3 선정은 PP-015, provider별 rate limit과 quota 보호는 PP-028이
담당한다. 실제 credential 등록, staging 호출, Naver 원문 응답의 장기 보관과 cache는
포함하지 않는다. Naver 이용약관 검토가 끝나기 전에는 원문 payload를 DB, 로그,
fixture artifact에 저장하지 않는다.

## 판단 기준과 대안

평가 기준은 최신 공식 계약과의 일치, 도메인 독립성, 실패의 명확한 분류, 테스트
결정성, 비밀값 차단이다. 외부 DTO를 application에서 직접 사용하는 방안은 구현량이
적지만 공급자 변경이 도메인까지 전파되어 제외한다. 범용 map으로 응답을 넘기는 방안은
schema 변화에 느슨하지만 컴파일 시 검증과 오류 위치를 잃어 제외한다. 고정 결정은
공급자별 DTO와 mapper를 adapter에 가두고, application에는 최소 검색 조건과 정규화 전
검색 항목만 반환하는 typed port를 제공하는 것이다. 재시도는 연결 실패와 일부 5xx처럼
일시적인 오류에만 제한하고 4xx 인증·요청 오류는 즉시 실패시킨다.

## 문제 해결 기록

1. 공식 API HUB 문서의 현재 base URL, 인증 헤더, Local·Blog parameter, 최대 결과 수와
   오류 형식을 구현 시작일에 다시 확인하고 확인 일자와 차이를 기록한다.
2. 장소·블로그 검색 port의 입력과 adapter 내부 DTO를 분리하고, 로그에 query 전문이나
   인증 헤더가 남지 않도록 client 관측 지점을 설계한다.
3. 정상 응답 mapper와 HTML 제거, 빈 필드, 잘못된 좌표·링크를 다루는 경계 변환을
   단위 테스트부터 구현한다.
4. WireMock으로 상태 코드, 지연, 오류 body별 fixture를 만들고 재시도 횟수와 최종
   application 오류 분류를 계약 테스트로 고정한다.
5. mock profile 안전 검사와 `docs/contracts.md`의 provider 계약을 함께 갱신한 뒤 전체
   검증을 수행한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 adapter 코드, 계약 fixture, 실행 로그는 아직 확보되지
않았다. 아래 항목은 완료 시 남겨야 할 검증 계약이며 실행 결과로 오인하지 않는다.

- mapper와 오류 분류 단위 테스트 결과
- `./gradlew integrationTest`의 Naver 정상·0건·401·403·429·5xx·timeout 계약 결과
- 실제 Naver host로 나가는 요청이 없음을 보여 주는 WireMock request journal과 안전
  정책 테스트 결과
- credential과 원문 payload가 test report·application log에 없다는 사람이 수행한
  표본 검사 기록
- 관련 계약 변경 후 `make check` 성공 로그

## AI 사용과 사람의 검증

AI에는 공식 계약에서 테스트 조합을 추출하고 DTO·mapper·WireMock fixture 초안을
만드는 일을 위임할 수 있다. 사람은 공식 Naver 문서의 최신성, 약관상 저장·표시 제한,
인증 헤더와 재시도 가능 오류를 직접 확인한다. AI가 제안한 필드나 quota 수치는 공식
근거와 대조되지 않으면 채택하지 않으며, 실제 credential을 AI 입력이나 저장소에
제공하지 않는다.

## 남은 위험과 학습

API HUB 정책, quota, response schema가 변경될 수 있고 Local 검색의 작은 page 크기가
후속 후보 수에 영향을 줄 수 있다. 공식 문서나 약관이 바뀌거나 계약 테스트가 실제
staging 응답과 달라질 때 재검토한다. 구현 후 확인된 공급자별 예외와 표시 의무는
PP-028~PP-030 및 Runbook으로 전달한다. 현재는 구현 전이므로 안정성이나 호출 성공을
성과로 주장하지 않는다.
