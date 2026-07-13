---
id: WI-0022
title: PP-020 Next.js 프런트엔드 기반
type: work-record
status: planned
date: 2026-07-13
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../adr/ADR-0004-service-boundary.md
  - ../adr/ADR-0008-frontend-same-origin-boundary.md
paths:
  - frontend/**
  - .devcontainer/**
  - compose*.yml
  - README.md
  - docs/development-environment.md
---

# WI-0022 PP-020 Next.js 프런트엔드 기반

> GitHub Issue: [PP-020 #22](https://github.com/gdh0730/hub/issues/22)

## 문제와 근거

현재 저장소의 `package.json`은 문서 검증 도구 전용이며 운영 프런트 application은 없다.
기존 HTML과 `ProjectIntro.jsx`는 사용자 흐름을 설명하는 참고 prototype으로, package 경계,
API client, 자동 테스트와 build artifact가 연결되어 있지 않다. 이를 그대로 확장하면 문서
도구 의존성과 제품 의존성이 섞이고, cookie·CSRF·SSE origin 정책이 페이지마다 달라질 수
있다. 재현 가능한 exact version과 CI/build 경계도 아직 정의되지 않았다.

## 목적과 성공 기준

독립 `frontend` application에 Next.js App Router, patched React 19.2, TypeScript와 Tailwind
CSS 4.3 기반을 exact version과 lockfile로 구성하고 이후 화면 Task가 동일한 API·테스트·
접근성 규칙을 사용하게 한다. 성공 기준은 다음과 같다.

- 문서 도구 root package와 제품 frontend package가 분리되고 clean install과 production
  build가 Node 24 환경에서 재현된다.
- TypeScript strict mode, lint, unit/component test와 Playwright 실행 경계를 제공한다.
- 개발은 frontend 3000과 backend 8080을 사용하되 browser 요청은 same-origin proxy를 통해
  API와 SSE로 전달한다.
- API client는 credentials, CSRF header, Problem Details와 request correlation을 한 곳에서
  처리하고 secret이나 provider key를 browser bundle에 넣지 않는다.
- 기본 layout, error boundary, loading boundary와 접근성 검사 기반을 제공한다.
- 기존 prototype 파일은 변경·이동하지 않고 참고 자료로만 남긴다.

## 범위, 비범위와 제약

범위는 frontend package, route skeleton, styling token, API client 기반, test runner,
Playwright 설정, same-origin rewrite/proxy와 Dev Container·README 실행 문서의 최소 확장이다.
홈·조건 편집은 PP-021, 진행·결과는 PP-022, 투표방은 PP-026이 구현한다. 디자인 완성,
비즈니스 mock 화면, admin route, 지도·길찾기와 실제 provider credential은 포함하지 않는다.
preview release나 dynamic dependency를 사용하지 않고 lockfile을 커밋한다.

## 판단 기준과 대안

판단 기준은 repository 경계, exact build 재현성, server/client secret 분리, cookie·SSE 호환,
접근성·E2E 자동화다. root package에 Next를 합치는 방안은 설정이 적지만 문서 검증과 제품
lockfile·script가 충돌해 제외한다. browser에서 backend 8080을 직접 호출하는 방안은
CORS·cookie·CSRF 환경 차이를 늘려 제외한다. SPA-only 도구는 가능하지만 server proxy와
향후 route 경계를 별도 구성해야 하므로 현재 결정에서는 채택하지 않는다. 고정 결정은
독립 Next application과 same-origin boundary다.

## 문제 해결 기록

1. 구현 시작 시 공식 release·보안 공지를 확인해 Next 16.2, React 19.2의 보안 패치 버전과
   Tailwind 4.3 exact version을 확정하고 lockfile에 고정한다.
2. `frontend` package와 App Router skeleton, strict TypeScript, CSS token과 server/client
   component 경계를 구성한다.
3. same-origin API·SSE proxy, 공통 fetch wrapper, cookie·CSRF 전달과 Problem Details parser를
   구현하되 browser bundle 환경 변수 allowlist를 검증한다.
4. unit/component, Playwright, lint·typecheck·build script를 만들고 360px·desktop 기본 layout과
   keyboard smoke를 자동화한다.
5. Dev Container와 CI에서 host Node 설치 없이 clean install·test·build가 실행되도록 표준
   명령과 문서를 갱신한다.

## 구현 결과와 검증 증거

현재 상태는 `planned`이며 frontend package, lockfile, UI와 build 결과는 아직 없다. 완료
시에는 다음 증거가 필요하다.

- Node 24 clean install, exact dependency tree, lint·typecheck·unit test·production build 결과
- same-origin proxy를 통해 API와 `text/event-stream` 응답을 전달하는 통합 smoke
- browser bundle에 server secret과 provider credential이 없다는 build artifact 검사
- 360px·desktop render, keyboard navigation과 자동 접근성 smoke 결과
- 기존 prototype diff가 없고 root 문서 검증이 계속 통과한다는 `git diff` 및 `make check`
  결과

## AI 사용과 사람의 검증

AI에는 package scaffold, test configuration과 접근성 smoke 초안을 위임할 수 있다. 사람은
공식 보안 공지와 exact version, server/client component 경계, rewrite가 임의 host로 열리지
않는지, bundle secret 비노출과 prototype 보존을 검토한다. 생성된 UI가 있다는 이유만으로
제품 화면이 완료됐다고 간주하지 않고 각 후속 Task의 acceptance test로 판정한다.

## 남은 위험과 학습

프레임워크 보안 패치, Node 호환성, SSE proxy buffering과 개발·운영 rewrite 차이가 남는다.
공식 보안 권고, build 실패, cookie·SSE E2E 불일치가 발생하면 exact version과 same-origin
구성을 재검토한다. 현재는 scaffold도 생성되지 않았으므로 프런트 build나 접근성 성공을
성과로 주장하지 않는다.
