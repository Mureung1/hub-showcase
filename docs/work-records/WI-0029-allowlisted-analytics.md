---
id: WI-0029
title: PP-027 허용 목록 기반 최소 제품 이벤트 수집
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0008-frontend-same-origin-boundary.md
paths:
  - backend/src/main/java/com/placepick/analytics/**
  - backend/src/main/resources/db/migration/**
  - backend/src/test/java/com/placepick/analytics/**
  - backend/src/integrationTest/java/com/placepick/analytics/**
  - frontend/lib/analytics/**
  - frontend/tests/analytics/**
  - docs/contracts.md
  - docs/runbooks/analytics-data*.md
---

# WI-0029 PP-027 허용 목록 기반 최소 제품 이벤트 수집

> GitHub Issue: [PP-027 #29](https://github.com/gdh0730/hub/issues/29)

## 문제와 근거

PP-027은 추천 결과 조회와 공유방 사용 흐름이 실제로 이어지는지 측정할 최소 이벤트를
수집한다. 임의 event 이름과 자유 형식 payload를 받으면 자연어 조건, URL, token이나 다른
개인정보가 분석 테이블과 로그에 유입될 수 있다. 반대로 제품 행동을 전혀 관측하지 않으면
어느 단계가 실패하거나 이탈하는지 근거 없이 추측하게 된다.

현재 저장소에는 `POST /api/v1/events`의 허용 event, schema, 크기 제한, 보존·삭제 규칙과
검증 코드가 없다. 추천 생성·투표·확정처럼 서버가 이미 아는 사실을 client가 다시 보고하면
중복·조작도 발생한다. 이 문서는 최소 수집 경계를 고정하는 계획이며 분석 기능이 구현됐다는
증거가 아니다.

## 목적과 성공 기준

목적은 사용자 원문과 비밀을 수집하지 않으면서 UI에서만 관찰 가능한 핵심 행동을 제한된
schema로 기록하고, 서버 도메인 event와 구분해 신뢰 가능한 제품 지표의 기반을 만드는 것이다.

성공 기준은 다음과 같다.

- `POST /api/v1/events`는 버전이 명시된 allowlist event만 받고 알 수 없는 이름과 필드는
  400의 안정적인 오류 코드로 거부한다.
- client allowlist는 `recommendation_result_viewed`, `room_share_link_copied`,
  `room_viewed`, `final_result_viewed`처럼 화면에서만 알 수 있는 관찰 event로 제한한다.
- draft 생성, job 완료, 투표 변경, 최종 확정은 서버 도메인 event에서 산출하고 client
  제출을 허용하지 않는다.
- 서버가 익명 세션을 cookie에서 식별하며 request body는 session ID, 자연어 입력, API key,
  cookie, 전체 URL과 자유 형식 text를 받지 않는다.
- payload 크기, context key, timestamp 허용 오차, 요청 빈도와 보존·삭제 정책을 자동으로
  검증한다.
- 로그와 metric은 event 수와 거부 이유만 노출하고 payload 원문을 출력하지 않는다.

## 범위, 비범위와 제약

범위는 client event schema와 endpoint, allowlist validation, 중복 event ID 처리, 최소 저장
모델, server-side domain event 매핑, 보존 정리 job, 프런트 전송 adapter와 계약 테스트다.
보존 기간은 PP-003에서 확정한 데이터 수명 정책을 그대로 적용한다.

사용자 프로파일링, 광고 추적, 제3자 분석 SDK, 원문 검색 조건 수집, 브라우저 fingerprint,
IP 원문 저장, 관리자 dashboard는 포함하지 않는다. 분석 event는 비즈니스 transaction의
성공 근거가 아니며, 수집 실패가 추천·투표 사용자 흐름을 실패시키지 않아야 한다.

## 판단 기준과 대안

판단 기준은 데이터 최소화, schema 통제, 중복 방지, 운영 비용과 제품 판단 가능성이다.

- 자유 형식 event endpoint는 확장하기 쉽지만 민감정보와 지표 불일치를 막기 어려워
  제외한다.
- 외부 analytics SaaS는 빠르게 시작할 수 있지만 데이터 전달·동의·비용 경계를 추가하므로
  현재 범위에서 제외한다.
- 모든 domain action을 client가 제출하면 조작과 중복이 생긴다. 서버가 아는 사실은 서버
  event만 사용한다.
- 전송 실패를 사용자에게 blocking 오류로 표시하면 핵심 기능을 해치므로 제한된 비동기
  전송과 조용한 실패를 선택하되 실패 metric은 남긴다.

각 client event는 UUID event ID, schema version, event type, client 발생 시각과 event별
허용 context만 가진다. 서버 수신 시각을 별도로 기록하고 `(session, eventId)` unique 제약으로
재전송을 멱등 처리한다.

## 문제 해결 기록

1. 사용자 여정에서 서버만 아는 행동과 브라우저만 아는 화면 행동을 분리했다.
2. 포트폴리오 측정에 필요한 최소 질문과 직접 연결되지 않는 event를 수집 대상에서 뺐다.
3. event별 context key와 값 형식을 닫힌 schema로 만들고 추가 필드는 거부하도록 정했다.
4. 세션은 body가 아니라 인증된 익명 cookie에서 추론하고 IP는 rate limit 처리 후 저장하지
   않는 경계를 설정했다.
5. repository와 정리 job을 구현한 뒤 음성 fixture로 민감정보·초과 payload·미등록 event
   거부를 확인한다.
6. 클라이언트 adapter는 핵심 UI와 독립적으로 실패하고 서버 metric으로 손실을 관측한다.

이 단계는 구현 순서를 기록한 것이며 event 수집이나 지표 산출을 실제로 수행하지 않았다.

## 구현 결과와 검증 증거

PP-027 구현과 검증은 아직 시작되지 않았다. 완료 증거는 다음으로 제한한다.

- 각 allowlist event의 정상 schema와 알 수 없는 event·field·과도한 크기·오래된 timestamp를
  거부하는 계약 테스트
- 자연어 조건, `Authorization`, cookie 이름, API key 형태, raw URL, 임의 text key가
  저장되지 않는 음성 테스트
- 같은 event ID 재전송이 한 행으로 수렴하는 PostgreSQL 통합 테스트
- 서버 도메인 event와 client 제출 event가 중복 집계되지 않는 집계 테스트
- 보존 기간이 지난 raw event만 정리되고 기준 시각 경계가 정확한 clock 기반 테스트
- 분석 저장소 장애가 추천·투표 응답을 실패시키지 않으며 손실 metric이 증가하는 시나리오
- 프런트 요청 body와 서버 log를 검사해 식별자·민감정보 원문이 없음을 확인한 결과
- `make integration`, `make eval`, `make check`의 성공 기록

측정값은 실제 데이터가 쌓인 뒤에만 보고하며 예상 전환율을 성과로 기재하지 않는다.

## AI 사용과 사람의 검증

AI에는 event inventory 비교, JSON Schema와 음성 fixture, 민감 key 탐지 후보, 중복·보존
경계 테스트 초안을 위임할 수 있다. AI가 제안한 event는 목적과 직접 연결되고 개인정보
최소화 검토를 통과한 경우만 allowlist에 채택한다.

사람은 각 event가 필요한 제품 질문, 수집 근거, 허용 context와 보존 기간을 검토한다.
브라우저 network와 DB sample을 직접 확인해 자연어·token·cookie·전체 URL이 없음을
검증하고, 실제 분석 사용 전에 개인정보·약관 책임자의 승인을 확인한다.

## 남은 위험과 학습

익명 세션도 여러 event를 결합하면 행동 추적성이 생길 수 있다. 분석 목적이 바뀌거나
장기 보존이 필요해지면 수집 근거와 동의 경계를 다시 검토한다. 브라우저 종료나 차단으로
client event가 유실될 수 있으므로 절대 사용자 수가 아니라 제한된 행동 신호로 해석한다.

핵심 학습 기준은 많은 데이터를 모으는 것이 아니라 의사결정 질문과 직접 연결된 최소
event만 검증 가능한 schema로 수집하는 것이다.
