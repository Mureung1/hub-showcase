---
id: WI-0008
title: PP-006 프런트 UX 접근성 프로토타입 정리
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
  - docs/ux/user-flows.md
  - docs/ux/screen-states.md
  - docs/ux/accessibility.md
  - docs/contracts.md
---

# WI-0008 PP-006 프런트 UX 접근성 프로토타입 정리

> GitHub Issue: [PP-006 #8](https://github.com/gdh0730/hub/issues/8)

## 문제와 근거

저장소의 HTML 프로토타입과 ProjectIntro 컴포넌트는 제품 방향을 시각화하지만 build,
route, 실제 API 연결과 접근성 검증이 없는 참고 자료다. 일부 화면은 아직 지원하지
않는 도보 시간과 출구 정보를 표시하고, 진행·오류·근거 축소·만료·SSE 재연결 상태를
실제 계약과 연결하지 않는다. 이를 그대로 제품 UI로 간주하면 허위 정보와 키보드·
스크린리더 사용 불가 상태가 생길 수 있다.

## 목적과 성공 기준

목적은 PP-001 여정과 PP-002 계약을 구현 가능한 route, 화면 상태와 접근성 기준으로
변환하는 것이다.

- 홈, 조건 검토, 추천 진행, 결과, 장소 상세, 투표방과 최종 결과 route의 진입 조건과
  데이터 요구를 정의한다.
- 각 화면에 initial, loading, empty, degraded, recoverable error, terminal error,
  expired와 reconnecting 상태가 있으며 가능한 사용자 행동이 명시된다.
- 추천 진행과 투표 갱신은 aria-live를 사용하되 반복 알림으로 사용자를 방해하지
  않는 우선순위를 가진다.
- 360px 모바일과 데스크톱에서 정보 순서와 조작 대상이 유지되고 키보드만으로 전체
  여정을 완료할 수 있다.
- WCAG 2.2 AA 기준의 label, focus, 명암, 오류 연결과 상태 전달 acceptance를
  Playwright·axe 및 수동 검사 항목으로 연결한다.

## 범위, 비범위와 제약

범위는 정보 구조, route, 상태표, 문구 원칙, responsive 동작, 키보드·스크린리더
흐름과 프로토타입 채택·제거 목록이다. Next.js project 생성, React 컴포넌트,
스타일 구현과 브라우저 E2E는 PP-020부터 PP-022 및 PP-026에서 수행한다.

route는 /, /recommendations/new/[draftId], /recommendations/[jobId]/progress,
/recommendations/[jobId], /recommendations/[jobId]/places/[placeId],
/rooms/[shareToken], /rooms/[shareToken]/result로 고정한다. 관리자 route, 지도,
길찾기, 도보 시간과 지하철 출구 정보는 포함하지 않는다.

## 판단 기준과 대안

기준은 사용자 통제권, 실제 계약과의 일치, 접근성, 오류 복구, 모바일 우선 정보
우선순위와 허위 표현 방지다.

- 자연어 입력 뒤 진행 화면으로 바로 이동하는 흐름은 짧지만 조건 오류를 막지 못해
  조건 검토 화면을 독립 route로 둔다.
- 진행률을 임의 백분율로 보여주는 방식은 정확한 근거가 없어 단계명과 확인된 상태만
  표시한다.
- 색상만으로 LIKE와 DISLIKE를 구분하는 방식은 제외하고 text, icon, pressed 상태와
  접근 가능한 이름을 함께 사용한다.
- SSE가 끊기면 즉시 실패 화면으로 바꾸는 대신 재연결 상태를 알리고 snapshot 조회로
  복구한다.

same-origin 경계를 기본으로 하며 프런트가 session이나 capability 원문을
JavaScript 저장소에 보관하지 않는다. 외부 근거가 부족한 결과는 일반 성공처럼
숨기지 않고 경고와 evidence level을 표시한다.

## 문제 해결 기록

1. PP-001 여정과 PP-002 operation을 route와 사용자 action으로 매핑한다.
2. 각 route의 서버 상태, loading·empty·error·expired 전이를 screen matrix로 만든다.
3. 기존 프로토타입 요소를 유지, 수정, 제거로 분류하고 계약 근거를 연결한다.
4. heading, landmark, focus 이동, aria-live와 오류 요약의 키보드 흐름을 명세한다.
5. 360px과 데스크톱 wireframe에서 정보 손실과 조작 충돌을 검토한다.
6. PP-020~PP-022와 PP-026의 component·E2E acceptance로 변환 가능한지 확인한다.

## 구현 결과와 검증 증거

현재 status는 planned이며 UX 상태표, 접근성 검토와 브라우저 증거는 확보되지 않았다.
완료 시 route·screen matrix, 프로토타입 채택표, 키보드 순서, 접근성 acceptance와
npm run docs:check 결과를 남긴다. wireframe 검토는 실제 브라우저 접근성이나
responsive 구현 완료의 증거로 대체하지 않는다.

## AI 사용과 사람의 검증

AI는 상태 누락 탐색, 문구 초안, WCAG acceptance 목록과 프로토타입 비교를 지원할
수 있다. 사람은 정보 우선순위, 오류 문구, 시각·키보드 흐름과 사용자에게 보이는
사실성을 검토한다. AI가 지원되지 않는 데이터나 임의 진행률을 UI에 추가한 결과는
거절한다.

## 남은 위험과 학습

문서화된 흐름도 실제 모바일 기기, 보조기술과 사용자 테스트를 대신하지 않는다.
브라우저 구현에서 focus 손실, 과도한 live announcement, 낮은 명암이나 긴 한국어
문구 문제가 확인되면 screen spec과 컴포넌트를 함께 수정한다. route 변경은 공유
링크 호환성과 기존 room 접근에 영향을 주므로 PP-002 계약 검토를 다시 거친다.
