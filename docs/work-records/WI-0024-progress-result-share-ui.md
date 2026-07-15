---
id: WI-0024
title: PP-022 추천 진행·결과·상세·공유 UI
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0006-api-worker-outbox-events.md
  - ../adr/ADR-0008-frontend-same-origin-boundary.md
paths:
  - "frontend/src/app/recommendations/[jobId]/**"
  - frontend/src/features/recommendation-progress/**
  - frontend/src/features/recommendation-result/**
  - frontend/src/tests/recommendation-result/**
  - frontend/e2e/recommendation-result.spec.ts
---

# WI-0024 PP-022 추천 진행·결과·상세·공유 UI

> GitHub Issue: [PP-022 #24](https://github.com/gdh0730/hub/issues/24)

## 문제와 근거

추천 job은 비동기로 실행되므로 202 이후 빈 화면을 보이거나 SSE 연결 하나에만 의존하면
사용자가 처리 상태와 실패 여부를 알 수 없다. 결과 화면이 점수만 강조하고 근거·경고를
숨기면 추천 이유를 검토할 수 없고 `LOCAL_ONLY` degraded 결과를 정상 결과로 오해한다.
현재는 진행 route, 새로고침 복구, 결과 3개, 상세 근거, 재시도와 투표방 생성 흐름을
연결한 UI가 없다.

## 목적과 성공 기준

추천 수락 후 진행 상태를 이해할 수 있게 보여 주고 terminal 결과를 근거·제약과 함께
표시하며, 완료된 결과에서만 투표방을 만들 수 있게 한다. 성공 기준은 다음과 같다.

- 진행 화면은 최초 snapshot을 조회한 뒤 SSE를 연결하고 stage 변화와 heartbeat 단절을
  시각·비시각 방식으로 알린다.
- SSE가 끊기면 제한된 backoff로 재연결하고 snapshot 조회로 수렴하며 새로고침 후에도
  같은 job을 복구한다.
- completed 결과는 순서가 고정된 세 후보의 점수, 이유, 주의점, 주소, 카테고리, 근거
  출처와 Naver link를 표시한다.
- degraded 결과는 `LOCAL_ONLY`와 warnings를 숨기지 않고 근거가 제한됐음을 명확히
  전달한다.
- failed·expired·insufficient candidates·rate limit을 구분해 가능한 action만 제공한다.
- 방 생성은 완료된 job에서 한 번만 요청하고 성공 시 share route 또는 link를 제공한다.

## 범위, 비범위와 제약

범위는 progress, result, place detail, degraded·failed·expired 상태, SSE reconnect, 결과
공유와 room-create action, component·E2E·접근성 테스트다. 조회·SSE는 PP-018·PP-019,
room API는 PP-023, 참여자 투표 화면은 PP-026의 계약을 사용한다. 지도, 도보 시간, 지하철
출구, 영업 여부와 근거 없는 사진은 표시하지 않는다. provider 원문 snippet이나 내부
오류·trace를 그대로 노출하지 않는다.

## 판단 기준과 대안

기준은 처리 투명성, 연결 실패 복구, 근거 가시성, degraded 오인 방지, 접근성과 중복
mutation 차단이다. polling만 사용하는 방안은 단순하지만 진행 반응성과 DB 부하가
불리해 제외한다. SSE만 사용하고 snapshot을 생략하는 방안은 새로고침과 이벤트 유실
복구가 안 되어 제외한다. 결과를 한 화면에 모두 펼치는 방안은 모바일 인지 부하가 커서
후보 summary와 접근 가능한 detail 구조를 채택한다. share text만 제공하는 방안 대신
server room 생성 결과를 정본으로 사용한다.

## 문제 해결 기록

1. PP-018·PP-019 상태와 이벤트를 loading, reconnecting, completed, degraded, failed,
   expired UI state로 매핑하고 중복·역순 이벤트 무시 규칙을 정한다.
2. snapshot fetch 후 EventSource 연결, terminal close, backoff와 manual retry를 구현하고
   route navigation·unmount에서 연결을 해제한다.
3. 후보 card와 detail에 근거 reference, 경고, 외부 link 안전 속성을 표시하고 금지된
   정보가 render되지 않도록 fixture를 만든다.
4. room-create mutation을 완료 상태에만 활성화하고 중복 click·network retry에서 동일 방
   결과를 다루도록 구현한다.
5. SSE 단절, 새로고침, degraded, 각 실패, 360px, keyboard와 `aria-live` 진행 안내를
   component·Playwright로 검증한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 진행·결과 UI, SSE 브라우저 동작과 접근성 증거는 아직 없다.
완료 시 필요한 증거는 다음과 같다.

- snapshot→SSE 연결, 역순·중복 event, reconnect와 terminal close component test
- 새로고침과 일시 단절 후 최종 결과로 수렴하는 Playwright trace
- completed·degraded·failed·expired·insufficient·429 상태별 visual·semantic assertion
- 후보 3개 순서, 근거·경고 표시와 도보 시간·출구 등 금지 필드 비표시 테스트
- 이중 share click에서도 방 생성 결과가 중복되지 않는 E2E, keyboard·360px·axe 결과와
  `make check` 성공 로그

## AI 사용과 사람의 검증

AI에는 상태 reducer, SSE race fixture, 결과 card와 접근성 assertion 초안을 위임할 수
있다. 사람은 근거와 경고의 시각적 우선순위, 단절·실패 시 사용자의 다음 action,
EventSource cleanup, 모바일·keyboard 조작과 외부 link 안전성을 직접 검토한다. screenshot
만으로 완료하지 않고 API·SSE trace와 semantic assertion을 함께 확인한다.

## 남은 위험과 학습

proxy buffering, 모바일 네트워크 전환, background tab 제한과 긴 근거 문구가 진행 체감과
layout에 영향을 줄 수 있다. E2E에서 reconnect loop, event 역행, 누락된 경고 또는 높은
이탈이 확인되면 backoff·정보 구조를 재검토한다. 현재는 구현 전이므로 UI 완성도나
실시간성 수치를 주장하지 않는다.
