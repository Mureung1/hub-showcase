---
id: WI-0010
title: PP-008 익명 세션 Capability CSRF Problem Details
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0005-anonymous-session-room-capability.md
  - ../adr/ADR-0008-frontend-same-origin-boundary.md
paths:
  - backend/build.gradle
  - backend/src/main/java/com/placepick/identity/**
  - backend/src/main/java/com/placepick/security/**
  - backend/src/main/java/com/placepick/web/problem/**
  - backend/src/test/java/com/placepick/identity/**
  - backend/src/integrationTest/java/com/placepick/security/**
  - backend/src/main/resources/application*.yml
  - docs/contracts.md
---

# WI-0010 PP-008 익명 세션 Capability CSRF Problem Details

## 문제와 근거

로그인 없이 추천과 투표를 제공하려면 사용자를 식별하되 client가 임의 sessionId나
voterId를 위조하지 못해야 한다. 공개 share token만으로 주최자 변경 권한까지 주면
링크를 받은 누구나 최종 장소를 바꿀 수 있다. cookie 인증을 사용하면서 CSRF를
검증하지 않거나 CORS wildcard와 credential을 함께 허용하면 외부 origin이 사용자의
권한으로 상태를 변경할 수 있다.

## 목적과 성공 기준

목적은 서버 발급 익명 identity, 공개 조회와 주최자 권한의 분리, 상태 변경 CSRF
방어와 일관된 Problem Details를 구현하는 것이다.

- POST /api/v1/anonymous-sessions는 256-bit 이상 CSPRNG token을 발급하고 원문은
  HttpOnly session cookie로만 전달하며 DB에는 SHA-256 hash와 만료만 저장한다.
- 응답 body의 CSRF token은 session에 연결된 hash로 검증하고 모든 상태 변경 요청은
  X-CSRF-Token header를 요구한다. 세션 생성 operation만 예외다.
- session cookie는 SameSite=Lax, Path=/이고 production에서 Secure를 강제한다.
- organizer capability는 share token과 분리된 256-bit token이며 room API path에
  제한된 HttpOnly cookie와 hash 저장을 사용한다.
- session 없음·만료, CSRF 실패, organizer 권한 실패를 각각 401, 410, 403으로
  일관되게 반환한다.
- 예외와 validation 실패가 PP-002의 Problem Details schema와 traceId를 따르고
  token·cookie·민감 header를 로그에 남기지 않는다.

## 범위, 비범위와 제약

범위는 Spring Security 구성, token 생성·hash·constant-time 비교, 익명 session
생성·조회, CSRF filter, organizer capability 검증 abstraction, 공통 exception
mapping과 로그 redaction이다. room capability 실제 발급은 PP-023, provider별 rate
limit은 PP-028에서 구현한다.

local browser origin은 localhost의 3000 포트만 명시적으로 허용하고 credential과
wildcard origin을 조합하지 않는다. production은 same-origin을 기본으로 한다.
token을 localStorage, sessionStorage, URL query, 분석 event나 오류 detail에
노출하지 않는다.

## 판단 기준과 대안

기준은 익명 진입 편의, 위조 저항, 최소 권한, 브라우저 기본 보호, token 유출 영향과
테스트 가능성이다.

- request body의 voterId는 위조가 쉬워 제외한다.
- share token을 organizer secret으로 겸용하면 공유 즉시 권한이 확장되므로 공개
  식별과 변경 capability를 분리한다.
- JavaScript가 읽을 수 있는 bearer token은 구현이 단순하지만 XSS 영향이 커져
  HttpOnly cookie를 선택한다.
- SameSite만으로 CSRF를 방어하는 방식은 예외와 browser 동작에 의존하므로 server가
  연결된 CSRF token을 함께 검증한다.

원문 token은 응답 직후 다시 조회할 수 없으며 분실 시 새 session 또는 새 room 생성이
필요하다. organizer cookie의 같은 값 재발급은 하지 않고 capability rotation은
별도 보안 변경으로 다룬다.

## 문제 해결 기록

1. PP-002 operation마다 session, 공개 share token, organizer capability 요구를
   authorization matrix로 만든다.
2. token entropy, cookie attribute, hash 저장과 만료 검증을 구현한다.
3. Spring Security filter 순서에서 session resolve, CSRF와 authorization을 분리한다.
4. validation·domain·authorization·만료 예외를 stable errorCode에 매핑한다.
5. 변조, 다른 session, 다른 room capability, 만료와 CORS 요청을 통합 테스트한다.
6. 로그 capture로 token, cookie, CSRF와 capability 원문이 남지 않음을 검증한다.

## 구현 결과와 검증 증거

현재 status는 planned이며 security filter, token 저장과 공격 시나리오 테스트는
아직 없다. 완료 증거에는 entropy·hash 단위 테스트, cookie attribute, CSRF·CORS,
401·403·410, 다른 session·room 격리, 로그 redaction 통합 테스트와
./gradlew check 결과가 필요하다. 브라우저 cookie가 발급된 것만으로 권한 경계가
검증됐다고 판단하지 않는다.

## AI 사용과 사람의 검증

AI는 위협 시나리오 열거, filter·Problem Details 초안과 음성 테스트 생성을 지원할
수 있다. 사람은 token 수명·cookie path·Secure 조건, CORS allowlist, error 노출과
로그를 검토한다. 인증 우회, wildcard credential, 고정 token, 약한 난수나 원문 저장을
포함한 제안은 거절한다.

## 남은 위험과 학습

HttpOnly cookie는 XSS를 통한 직접 token 읽기를 줄이지만 사용자의 권한으로 요청을
발생시키는 XSS 자체를 막지 못한다. PP-030에서 CSP와 출력 encoding을 함께 검증한다.
다중 기기 주최자 권한 이전이나 capability 복구가 제품 요구가 되면 로그인 도입과
별도 recovery protocol을 비교하고 ADR을 재검토한다.
