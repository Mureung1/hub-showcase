# TODOS

## Product

### 글귀 기반 브라우저 재방문 알림

**What:** 사용자가 동의한 브라우저에 저장된 글귀를 활용한 재방문 알림을 Firebase Cloud Messaging으로 전송한다.

**Why:** 현재 글귀 배너는 사용자가 앱을 연 뒤의 독서 재개만 돕기 때문에, 알림을 별도 실험으로 추가해야 재방문 효과를 검증할 수 있다.

**Context:** Google 로그인과 FCM은 독립된 기능이다. 로그인 토큰을 알림 전송에 사용하지 않고, 브라우저별 알림 권한·Service Worker·FCM 등록 토큰의 생성, 갱신, 해지를 별도로 관리한다. Phase 1에서는 자발적 방문 이후의 글귀→독서 재개만 검증한다.

**Effort:** M
**Priority:** P3
**Depends on:** Phase 1 반복 행동 게이트 통과

## Completed
