---
id: WI-0028
title: PP-026 참여자 투표와 주최자 최종 확정 프런트엔드
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
  - frontend/app/rooms/**
  - frontend/components/rooms/**
  - frontend/lib/api/rooms/**
  - frontend/lib/realtime/**
  - frontend/tests/rooms/**
  - frontend/tests/e2e/room*.spec.ts
  - docs/contracts.md
---

# WI-0028 PP-026 참여자 투표와 주최자 최종 확정 프런트엔드

## 문제와 근거

PP-026은 공유 링크를 받은 참여자가 회원 가입 없이 후보를 비교하고 LIKE/DISLIKE를
표현하며, 주최자가 집계 결과를 보고 최종 장소를 확정하는 사용자 여정을 완성한다. 현재
저장소에는 운영 프런트엔드가 없고 기존 HTML·React 시안은 고정 데이터로 동작하는 참고
자료이므로 실제 세션, API 오류, SSE 재연결과 동시 사용자 상태를 보장하지 않는다.

참여자와 주최자 화면을 권한 구분 없이 만들면 공개 share token만 가진 참여자에게 확정
버튼이 노출되거나, UI의 낙관적 집계가 서버 정본과 달라질 수 있다. 이 Work Record는 해당
문제를 구현하기 위한 계획이며 화면과 브라우저 E2E는 아직 만들어지지 않았다.

## 목적과 성공 기준

목적은 모바일 우선의 접근 가능한 UI에서 참여자 투표와 주최자 확정을 명확히 구분하고,
서버 snapshot과 SSE를 통해 모든 브라우저가 같은 방 상태로 수렴하게 하는 것이다.

성공 기준은 다음과 같다.

- `/rooms/[shareToken]`에서 후보, 현재 집계, 내 투표, 방 만료와 확정 여부를 표시한다.
- 각 후보에 LIKE, DISLIKE, 선택 취소가 키보드와 터치로 가능하고 처리 중 중복 입력을
  방지하면서 성공·실패 결과를 보조 기술에 알린다.
- 주최자 capability가 유효한 세션에만 최종 확정 제어를 제공하되 서버 권한 검증을
  대체하지 않는다.
- SSE가 끊기면 명시적인 재연결 상태를 표시하고, 재연결 snapshot으로 낙관적 상태를
  교정한다.
- 최종 확정 event를 받으면 입력을 잠그고 `/rooms/[shareToken]/result`로 일관되게
  전환한다.
- 360px viewport, 데스크톱, 키보드 전용, screen reader와 두 개의 독립 browser context
  E2E에서 핵심 여정이 통과한다.

## 범위, 비범위와 제약

범위는 방 조회, 후보 카드, 내 투표 상태, 집계, SSE 연결 상태, 주최자 확정 확인 dialog,
만료·권한·충돌 오류, 최종 결과 화면과 관련 component·hook·브라우저 테스트다. API는
PP-023~PP-025의 계약을 사용하고 same-origin 경계는 ADR-0008을 따른다.

채팅, 사용자 닉네임, 소셜 로그인, 지도·길찾기, 관리자 화면, 결과 변경 기능은 포함하지
않는다. 브라우저 저장소에 organizer capability나 세션 cookie 원문을 저장하거나 JavaScript로
읽지 않는다. 집계의 최종 정본은 서버이며 UI가 서버 밖에서 표 수를 추론하지 않는다.

## 판단 기준과 대안

판단 기준은 권한 오해 방지, 접근성, 다중 사용자 정합성, 연결 실패 복구, 테스트 가능성이다.

- 모든 변경 뒤 전체 페이지를 새로고침하는 방식은 단순하지만 투표 흐름과 실시간성을
  훼손해 제외한다.
- 완전한 낙관적 집계는 빠르지만 동시 변경과 실패 때 잘못된 표 수를 잠시 노출한다.
  내 버튼 상태만 pending으로 표시하고 집계는 서버 응답과 SSE snapshot으로 갱신한다.
- 주최자 여부를 URL query로 전달하는 방식은 capability를 노출하므로 제외한다.
- 색만으로 LIKE/DISLIKE를 표현하는 방식은 접근성이 부족하므로 text, icon, pressed 상태를
  함께 사용한다.

선택은 server-authoritative snapshot, 제한된 pending UI, HttpOnly capability, SSE 자동
재연결과 사용자에게 보이는 연결 상태다. 확정 전에는 후보명과 변경 불가 정책을 확인
dialog에서 다시 보여 우발적 결정을 줄인다.

## 문제 해결 기록

1. 참여자와 주최자의 권한·행동·terminal 상태를 별도 사용자 흐름으로 나눴다.
2. 방 진입, 투표 미선택, LIKE, DISLIKE, 요청 중, 연결 끊김, 만료, 확정 상태표를 정의했다.
3. UI와 서버 집계가 충돌할 때 서버 snapshot을 우선한다는 복구 규칙을 고정했다.
4. route component에는 조합만 두고 API client, SSE hook, 후보·투표 component를 분리한다.
5. 단일 browser component 테스트 후 두 browser context E2E로 실시간 상호작용을 검증한다.
6. 기존 프로토타입에서는 시각 언어만 참고하고 가짜 집계·지원하지 않는 위치 정보를
   운영 코드에 복사하지 않는다.

위 단계는 실행 순서를 명확히 한 것이며 실제 UI 구현이나 사용성 검증을 완료했다는
의미가 아니다.

## 구현 결과와 검증 증거

PP-026은 아직 구현·검증되지 않았다. 완료 시 다음 증거를 남긴다.

- room route의 loading, empty, active, reconnecting, expired, finalized, forbidden 상태별
  component 테스트와 접근성 결과
- LIKE에서 DISLIKE로 변경하고 선택을 삭제했을 때 API method와 화면 상태가 정확한지
  확인하는 테스트
- 서로 다른 두 browser context에서 참여자 투표가 주최자 화면에 반영되고, 확정 뒤 두
  화면이 같은 결과로 이동하는 Playwright trace
- 잘못된 capability, 409 확정 충돌, 410 만료, 네트워크 중단과 SSE 재연결 시나리오
- 360px과 데스크톱 screenshot, 키보드 focus 순서, 이름·역할·상태와 `aria-live` 검사
- 브라우저 저장소와 client log에 cookie, capability, 개인정보가 없는지 확인한 결과
- 프런트 테스트, 브라우저 E2E와 `make check` 성공 기록

자동 검사와 사람의 핵심 화면 검토가 모두 끝나기 전에는 status를 완료로 변경하지 않는다.

## AI 사용과 사람의 검증

AI에는 UI 상태표, component 경계, mock 응답, 접근성 assertion과 Playwright 시나리오 초안을
위임할 수 있다. 기존 시안에서 추출한 표현은 실제 계약과 접근성 기준에 맞는 경우만
채택하며, 지원되지 않는 데이터나 가짜 성공 흐름은 거절한다.

사람은 모바일에서 버튼 의미와 확정 위험이 명확한지, keyboard와 screen reader로 전체
여정을 수행할 수 있는지, 두 실제 브라우저가 서버 상태로 수렴하는지 확인한다. 주최자
제어의 숨김이 보안 수단으로 오해되지 않도록 서버 403 검증도 함께 검토한다.

## 남은 위험과 학습

모바일 네트워크에서 SSE가 반복적으로 끊기면 자동 재연결이 사용자의 투표 확신을 낮출 수
있다. 재연결 빈도와 실패 시간을 metric으로 확인해 polling fallback 필요성을 재검토한다.
브라우저의 cookie 제한과 프록시 설정이 달라지면 익명 세션이 분리될 수 있으므로 운영
패키징 E2E에서 same-origin 동작을 다시 검증한다.

이 작업의 학습 기준은 화면의 즉각성보다 사용자가 자신의 투표와 최종 결정을 오해하지
않는 것이다. 모든 낙관적 표현은 서버 정본으로 교정 가능해야 한다.
