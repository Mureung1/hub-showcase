# AGENTS.md

## 적용 범위와 프로젝트 기준

이 규칙은 저장소 전체에 적용한다. 상세한 프로젝트 구조와 실행 방법은 `CLAUDE.md`를 따르고, `codex/` 안에서는 `codex/AGENTS.md`의 더 엄격한 규칙도 함께 적용한다.

프로젝트는 React + Vite 프런트엔드, Express 백엔드, Supabase Postgres + Prisma DB로 구성되며 Gemini API, Web Push, Service Worker를 사용한다. 작업할 때는 현재 구조와 기존 구현 패턴을 우선 유지한다.

## Agent와 Skill 선택

- 큰 기능을 Issue 단위로 분해할 때는 `feature-slice`를 사용한다.
- 구현이 완료 조건을 충족하는지 검증할 때는 `feature-verify`를 사용한다.
- diff, commit, PR의 코드 위험을 검토할 때는 `code-review`를 사용한다.
- 작은 로직을 Red–Green–Refactor로 구현할 때는 `simple-tdd`를 사용한다.
- 적절한 테스트 수준을 선택하고 테스트를 작성할 때는 `test-writer`를 사용한다.
- UI, Shared Journey, 캐릭터와 에셋을 다룰 때는 `nagging-bot-design`을 사용한다.

작업에 필요한 Agent와 Skill만 선택하며 모든 도구를 기계적으로 사용하지 않는다.
`feature-slice`, `feature-verify`, `code-review`는 읽기 전용이며 코드, 문서, GitHub
Issue를 직접 수정하지 않는다. 상세 규칙은 각 Agent와 Skill 문서를 따른다.

## 작업 범위

- 한 번에 하나의 이슈 범위만 수정한다.
- 요청하거나 승인받은 범위 밖의 리팩터링, 기능 추가, 문구 변경을 하지 않는다.
- 새 파일이나 구조를 만들기보다 기존 파일 구조와 패턴을 우선 사용한다.
- 새 라이브러리는 기존 의존성으로 해결할 수 없고 꼭 필요한 경우에만 추가한다.
- 프로그램 제공 Pull Request 템플릿과 workflow는 별도 요청이 있을 때만 수정한다.
- Agent·Skill 문서 변경과 실제 제품 코드 변경을 구분해 범위를 판단한다.

## 데이터베이스 안전

- 개발 DB를 직접 수정하지 않는다.
- 개발 DB와 Production DB에 테스트 데이터를 생성, 수정, 삭제하지 않는다.
- 애플리케이션 데이터 변경은 정상 API 경로를 사용한다.
- 스키마 변경은 Prisma migration으로 관리한다.
- DB 또는 E2E 테스트의 격리가 확인되지 않으면 fail-closed로 실행을 중단하고 사용자에게 먼저 알린다.
- 기존 데이터 보정이나 직접 SQL 변경을 임의로 수행하지 않는다.
- DB URL, 비밀 환경변수와 외부 provider payload를 출력하거나 문서·로그에 남기지 않는다.

## 고위험 영역

다음 영역은 작은 변경도 회귀 위험이 크므로 최소 범위로 수정하고 관련 테스트를 반드시 검토한다.

- 중복 완료 요청과 서버의 멱등 처리
- 늦게 도착한 비동기 응답이 최신 상태를 덮는 응답 역전
- Web Push 구독, 중복 발송, Service Worker 동작

## 테스트 기준

- 구현 완료와 검증 완료를 같은 의미로 사용하지 않는다.
- 테스트가 존재하거나 일부 명령이 통과했다는 사실만으로 전체 기능을 검증 완료로 판단하지 않는다.
- 순수 함수와 상태 변환은 Vitest로 검증한다.
- UI 렌더링과 사용자 상호작용은 React Testing Library로 검증한다.
- API 요청, 검증, 응답, 멱등 처리는 supertest로 검증한다.
- 핵심 사용자 흐름은 Playwright 검토 대상에 포함한다.
- 테스트 실행 전 DB 접근 여부를 확인하고, 격리가 확인되지 않은 DB 테스트는 실행하지 않는다.
- 자동 테스트와 mock은 실제 브라우저, PWA, Web Push 검증을 대신하지 않는다.

## 현재 운영 위험

다음 항목은 현재 구현 완료 기능이 아니라 백로그 또는 미검증 상태다.

- 서버 scheduler·Cron과 Task별 `nextNudgeAt` 영속화가 구현되지 않았다.
- Focus 중 전체 Task의 서버 알림 일시중지가 구현되지 않았다.
- `stopped` 요청의 서버 멱등성 보강이 필요하다.
- Playwright에는 테스트 DB를 강제하는 fail-closed 가드가 부족하다.
- 일부 API 실패 UI와 Register 새로고침·Focus 복구 E2E가 완료되지 않았다.
- Android Chrome Web Push 실기기 검증이 남아 있다.
- 인증 없는 단일 사용자 구조이며 저장된 전체 Push 구독에 브로드캐스트한다.

## 완료 보고

작업 완료 시 다음을 구분하여 보고한다.

- 변경한 파일과 완료 조건 충족 여부
- 실행한 테스트와 결과
- 실행하지 않은 테스트와 그 이유
- 남아 있는 위험과 사용자가 수동으로 확인할 항목
- 사용자 요청 없이 commit, push, branch 변경, reset을 수행하지 않는다.

현재 배포 흐름은 `work → Vercel Preview → 검증 → main → Production`이다.
Preview 검증은 Production 검증을 대신하지 않는다. 실제 브라우저·PWA·Push 확인이
필요하지만 실행하지 못한 항목은 미검증으로 명확히 보고한다.
