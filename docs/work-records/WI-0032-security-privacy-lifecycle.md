---
id: WI-0032
title: PP-030 보안과 개인정보 및 데이터 수명주기 강화
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0007-provider-and-live-boundary.md
  - ../adr/ADR-0008-frontend-same-origin-boundary.md
paths:
  - backend/src/main/java/com/placepick/security/**
  - backend/src/main/java/com/placepick/lifecycle/**
  - backend/src/main/resources/db/migration/**
  - backend/src/test/java/com/placepick/security/**
  - backend/src/integrationTest/java/com/placepick/security/**
  - frontend/lib/security/**
  - frontend/middleware.ts
  - docs/security/**
  - docs/contracts.md
  - docs/runbooks/data-lifecycle*.md
---

# WI-0032 PP-030 보안과 개인정보 및 데이터 수명주기 강화

> GitHub Issue: [PP-030 #32](https://github.com/gdh0730/hub/issues/32)

## 문제와 근거

PP-030은 익명 세션, 공유 링크, 자연어 조건, 외부 provider와 실시간 연결이 만드는 공격
표면과 데이터 수명주기를 서비스 전체 관점에서 닫는다. 기능별 검증만으로는 CSRF, XSS,
SSRF, capability 유출, 과도한 로그, 만료 데이터 잔존과 같은 경계 간 위험을 놓칠 수 있다.
특히 비로그인 서비스는 사용자가 탈퇴 버튼으로 데이터를 정리할 수 없으므로 자동 만료와
최소 수집이 핵심 통제다.

현재 환경에는 비밀 검사와 mock 외부 모드가 있지만 완성된 business route의 threat model,
cookie·CORS·CSP 정책, 전체 로그 redaction, 정리 job과 삭제 검증은 없다. 이 문서는 보안
검토의 계획 기록이며 취약점이 없거나 개인정보 규정을 충족한다는 완료 선언이 아니다.

## 목적과 성공 기준

목적은 자산·신뢰 경계·위협을 명시하고 예방, 탐지, 복구 통제를 자동 테스트와 운영 절차로
연결하여 데이터가 필요한 기간과 위치에만 존재하도록 만드는 것이다.

성공 기준은 다음과 같다.

- 익명 session, organizer capability, share token, 자연어 조건, provider key, 추천 결과와
  분석 event를 자산으로 식별한 threat model과 데이터 흐름도를 유지한다.
- state-changing route가 CSRF를 검증하고 cookie는 환경별 `HttpOnly`, `SameSite=Lax`,
  운영 `Secure`, 제한된 Path·Max-Age를 적용한다.
- production은 same-origin만 허용하고 CORS, trusted proxy, Host와 redirect 입력을 명시적으로
  제한한다.
- 외부 URL은 코드에 정의된 HTTPS allowlist만 사용하며 사용자 입력으로 host·scheme·port를
  변경할 수 없다.
- 프런트는 사용자·provider text를 escape하고 위험한 HTML 삽입을 사용하지 않으며 보안
  header와 CSP가 필요한 asset·SSE 연결만 허용한다.
- PP-003의 TTL에 따라 session, draft, job, room, event와 관련 파생 데이터를 원자적·반복
  가능하게 정리하고 삭제 결과를 metric과 감사 가능한 count로 남긴다.
- log, trace, metric, error와 test artifact에서 secret, cookie, capability, 자연어 원문과
  불필요한 provider payload를 제거한다.

## 범위, 비범위와 제약

범위는 threat model, 인증 없는 권한 경계, CSRF·CORS·CSP·security header, SSRF·XSS 방지,
입력·출력 크기 제한, log redaction, secret 취급, 데이터 분류·TTL·cleanup, 보안 회귀 테스트와
운영 Runbook이다. 기존 PP-008의 세션 기반과 PP-027 분석 최소화, PP-029 provider 경계를
교차 검증한다.

회원 인증, 법률 자문, 전사 보안 인증, DDoS 방어 서비스, 제3자 penetration test 계약은
포함하지 않는다. 보안 자동 테스트는 전문 검토를 대체하지 않으며 실제 secret이나 운영
endpoint를 fixture에 넣지 않는다.

## 판단 기준과 대안

판단 기준은 공격 가능성·영향, 데이터 최소화, 기본 거부, 자동 회귀 가능성, 운영 복구다.

- 공개 link만으로 모든 작업을 허용하는 방식은 권한 상승 위험 때문에 share와 organizer
  capability를 분리한다.
- token 원문 DB 저장은 유출 영향을 키우므로 고엔트로피 원문은 한 번만 전달하고 서버에는
  강한 hash와 만료 정보만 저장한다.
- wildcard CORS는 cookie 인증과 결합할 수 없고 공격면이 넓어 same-origin을 선택한다.
- 사용자 URL을 provider client에 전달하는 일반 proxy는 SSRF 위험이 있어 endpoint를
  configuration allowlist와 adapter 고정 경로로 제한한다.
- 모든 데이터를 영구 보존하는 방식 대신 목적별 TTL과 batch cleanup을 사용한다.

정리 job은 삭제 순서와 foreign key를 명시하고 같은 구간을 재실행해도 안전하게 만든다.
대량 삭제가 DB를 장시간 잠그지 않도록 제한 batch와 관측 metric을 사용한다.

## 문제 해결 기록

1. route, cookie, DB, Redis, provider와 GitHub secret을 포함한 데이터 흐름과 신뢰 경계를
   작성한다.
2. 자산별 기밀성·무결성·가용성 영향과 abuse case를 우선순위화한다.
3. 기존 PP별 통제를 매핑하고 소유자가 없는 위협에 구현·테스트·Runbook을 할당한다.
4. security configuration과 입력 경계를 단위·통합 테스트로 고정한다.
5. TTL 경계와 삭제 순서를 고정 clock 및 Testcontainers PostgreSQL·Redis로 검증한다.
6. 악성 text·URL·header·token fixture로 응답, log, 저장소의 유출 여부를 검사한다.
7. 사람의 threat model 검토와 브라우저 보안 header 점검 후 잔여 위험을 기록한다.

이 절차는 계획이며 실제 보안 검토와 cleanup 실행 결과는 아직 확보되지 않았다.

## 구현 결과와 검증 증거

PP-030 구현·검증은 아직 수행되지 않았다. 완료에는 다음 증거가 필요하다.

- 각 자산, 공격자, 신뢰 경계, 위협, 통제, 잔여 위험이 연결된 threat model review 기록
- CSRF 누락·불일치, 변조 token, 다른 방 capability, 허용되지 않은 Origin·Host·redirect를
  거부하는 통합 테스트
- loopback, link-local, 내부 DNS, 비HTTPS와 allowlist 밖 provider URL을 거부하는 SSRF 테스트
- script, event handler, 위험한 URL을 포함한 provider text가 실행되지 않는 frontend 테스트
- 운영 security header·cookie 속성과 개발 환경 차이를 검사하는 browser E2E
- TTL 직전·경계·직후 및 재실행에서 올바른 row·Redis key만 삭제하는 lifecycle 테스트
- log, JUnit report, Playwright trace, GitHub artifact에 민감값이 없는 gitleaks·redaction 결과
- `make integration`, `make eval`, `make check` 성공과 사람이 승인한 잔여 위험 목록

자동 검사 통과만으로 법적 준수나 무취약 상태를 주장하지 않는다.

## AI 사용과 사람의 검증

AI에는 threat inventory, abuse fixture, 보안 header·cookie assertion, lifecycle 경계 테스트와
redaction pattern 후보를 위임할 수 있다. AI가 제시한 취약점이나 완화책은 실제 data flow와
재현 테스트로 확인된 경우만 채택한다.

사람은 데이터 수집 근거·보존 기간, 약관과 개인정보 경계, capability entropy·hash, CSP와
외부 host, 잔여 위험 수용을 승인한다. 브라우저·DB·Redis·artifact를 직접 점검하고 실제 key가
어떤 진단 과정에도 노출되지 않았는지 확인한다.

## 남은 위험과 학습

브라우저 정책, provider 응답과 dependency 취약점은 지속적으로 변한다. 새 route, 외부 host,
데이터 field나 프런트 script가 추가되면 threat model과 CSP를 같은 변경에서 재검토한다.
익명 데이터도 조합하면 사용자를 추정할 수 있으므로 수집 목적 확대 시 재동의·익명화 기준을
다시 평가한다.

핵심 학습 기준은 보안을 마지막 검사로 보지 않고 데이터 생성부터 삭제까지 각 정본과
권한 경계에 검증 가능한 불변식을 두는 것이다.
