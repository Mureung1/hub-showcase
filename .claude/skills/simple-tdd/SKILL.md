---
name: simple-tdd
description: 명확한 입력·출력이 있는 작은 로직이나 실제 버그를 제품 계약 확인 → 실패 테스트 → 최소 구현 → 리팩터링 → 회귀 검증 순서로 안전하게 구현할 때 사용한다. 순수 함수, 날짜·상태·validation·점수·간격·Gemini 응답·fallback·session 검증과 멱등성 보조 로직에 적합하며, 화면·route·DB·PWA 전체 검증을 대신하지 않는다.
---

# Simple TDD

작은 로직을 Red–Green–Refactor로 구현하거나 수정한다. 모든 기능에 TDD를 강제하지
않으며, 현재 제품 계약과 실제 회귀를 가장 작은 적절한 테스트로 보호한다.

## 1. 시작 전 확인
다음을 필요한 범위에서 먼저 읽는다.

- 사용자의 완료 조건과 현재 변경 범위
- 관련 구현과 인접 테스트
- `CLAUDE.md`, `AGENTS.md`
- `.claude/skills/test-writer/SKILL.md`
- `package.json`, `vite.config.js`, `server/vitest.config.ts`

충돌하면 실제 코드·테스트 설정, 사용자의 최신 확정 사항, `CLAUDE.md`,
`test-writer`, 기존 Skill 순으로 판단한다. 과거 파일명, 테스트 개수와 주차 상태를
현재 계약으로 사용하지 않는다.

## 2. 적용 여부 판단
다음 질문에 대부분 “예”이면 사용한다.

- 입력과 기대 출력이 명확한가
- 로직을 UI·DB·외부 네트워크에서 분리할 수 있는가
- 실패 조건을 작은 테스트로 표현할 수 있는가
- 구현 전에 정상·경계·오류 계약을 정의할 수 있는가
- 테스트가 실제 회귀를 막는가

주요 적용 대상:

- 순수 함수와 상태 변환
- 날짜·시간, 점수와 알림 간격 계산
- 입력 validation
- Gemini 응답 검증과 fallback 선택
- Focus session validation
- 멱등성 판단을 돕는 작은 로직
- 실제 버그의 재현 테스트

다음 작업은 이 Skill만으로 완료하지 않는다.

- React 화면 또는 복잡한 사용자 흐름 전체
- Express route와 DB transaction 전체
- Prisma schema·migration
- Playwright E2E
- Service Worker 등록과 실제 Web Push
- 반응형·접근성·에셋 검증

이 경우 `test-writer` 기준으로 RTL, Supertest, Playwright, Service Worker 테스트와
실제 브라우저 검증을 함께 선택한다.

## 3. 계약 먼저 정리

테스트 전에 다음을 짧게 적는다.

- 입력·출력 타입
- 정상 결과
- 경계값
- 오류 또는 fallback 조건
- 시간·timezone 기준
- 중복 입력 처리
- 호출자가 기대하는 공개 계약

요구가 불명확하면 임의 제한이나 fallback을 만들지 않는다. 현재 구현과 문서가
다르면 테스트에 맞춰 제품 코드를 바꾸지 말고 불일치를 보고한다.

## 4. Red

현재 변경을 대표하는 가장 작은 실패 테스트부터 작성한다.

좋은 Red:

- 아직 구현되지 않은 제품 행동 때문에 실패한다.
- import, fixture 또는 mock 설정 오류로 실패하지 않는다.
- 실패 메시지에서 깨진 계약을 이해할 수 있다.
- 한 테스트에 서로 다른 행동을 과도하게 묶지 않는다.

테스트를 실행해 의도한 이유로 실패하는지 확인한다. 실패 원인을 확인하지 않고
Green으로 넘어가지 않는다. 단계가 커서 원인을 분리하기 어렵다면 테스트와 계약을
더 작게 나눈다.

## 5. Green

현재 Red를 통과시키는 최소한의 일반 구현을 작성한다.

- 요청 범위 밖 기능과 방어 로직을 추가하지 않는다.
- 미래 확장을 위한 추상화를 미리 만들지 않는다.
- 관련 없는 코드를 정리하지 않는다.
- 테스트를 위해 제품 계약을 약화하지 않는다.
- broad catch로 오류를 숨기지 않는다.
- 타입 검사를 `any`로 우회하지 않는다.
- 특정 입력만 하드코딩해 우연히 통과시키지 않는다.

새 테스트를 통과시킨 뒤 인접 테스트를 실행해 기존 계약의 회귀를 확인한다.

## 6. Refactor

테스트가 통과한 뒤에만 다음을 검토한다.

- 이름과 타입 명확화
- 작은 중복 제거
- 조건문 단순화
- 책임이 분명한 작은 함수 분리

공개 API, 동작 또는 범위를 바꾸지 않는다. 대규모 구조 개편과 새 라이브러리를
추가하지 않는다. 정리할 것이 없으면 그대로 종료한다. 변경했다면 관련 테스트를
다시 실행한다.

## 7. 테스트 수준 경계

Simple TDD의 기본 대상은 Vitest 수준의 작은 로직이다.

| 대상 | 기본 검증 |
| --- | --- |
| 순수 함수·상태 변환 | Vitest |
| React 사용자 상호작용 | React Testing Library |
| Express API 계약 | Supertest |
| DB transaction·멱등성 | 격리 DB 통합 테스트 |
| 핵심 사용자 흐름 | Playwright |
| PWA·Push | Service Worker 테스트 + 실제 환경 |

React 계산을 lib로 분리할 수 있더라도 화면 연결은 RTL로 별도 확인한다. route 입력,
transaction과 최종 DB 상태를 순수 함수 테스트만으로 완료 처리하지 않는다. DB 테스트는
격리가 확인되지 않으면 실행하지 않는다.

## 8. 프로젝트 핵심 시나리오

관련 변경에 필요한 항목만 선택한다.

### 날짜·시간

`now`를 주입하고 UTC ISO, Asia/Seoul 자정, 입력 순서·중복과 OS timezone 독립성을
확인한다. 59/60초, 599/600초와 demo/production처럼 실제 정책 경계를 고정하며
테스트에서 현재 시각에 의존하지 않는다.

### Gemini와 fallback

정상 structured response, 빈 값·malformed·품질 실패, timeout·provider 오류,
`rule_based`, `configuration_missing`과 늦은 응답 경합을 검증한다. 실제 Gemini API는
호출하지 않고 provider 경계만 최소 mock한다.

### Focus session

schema·최대 수명, `entryMode`·`entryLevel`·`journeyLevel`, `microTask`·
`generationSource`·`memoryEvidence`, 손상·미래 시각과 제거 조건을 검증한다.
sessionStorage 연결과 새로고침 복구에는 RTL 또는 Playwright가 추가로 필요하다.

### 멱등성과 상태 전환

동일 입력 반복, done·stopped 전환, 이미 완료된 Task, 중복 event 방지와 실패 후
재시도를 검증한다. 순수 함수는 판단만 다루며 병렬 요청, transaction과 DB event 수는
Supertest로 확인한다.

### 입력 validation

필수값·타입·범위, 빈 문자열·`null`·`undefined`, `NaN`·무한대·숫자 문자열과 허용하지
않은 enum을 확인한다. 문자열을 숫자로 암묵 변환하는 새 계약을 만들지 않는다.

## 9. 작업 절차

1. 요구사항과 완료 조건을 확인한다.
2. 관련 구현·테스트와 설정을 읽는다.
3. Simple TDD 적용 여부와 필요한 상위 테스트를 판단한다.
4. 입력·출력·경계·오류 계약을 정리한다.
5. 가장 작은 실패 시나리오를 테스트로 작성한다.
6. 테스트를 실행해 의도한 Red를 확인한다.
7. 최소 구현으로 Green을 만든다.
8. 필요한 경계·회귀 케이스를 작은 사이클로 추가한다.
9. 테스트가 통과한 뒤 필요한 만큼만 리팩터링한다.
10. 관련 회귀와 필요한 상위 검증을 실행한다.
11. 실제 결과와 미검증 영역을 보고한다.

사용자가 별도 승인을 요구하지 않았다면 각 작은 단계마다 불필요하게 멈추지 않는다.
한 번에 많은 테스트를 작성하지 않고 작은 사이클을 반복한다.

버그는 실제 조건 재현 → 수정 전 실패 테스트 → 최소 원인 수정 → 인접 회귀 실행 순으로
다룬다. 재현할 수 없는 버그를 추측으로 수정하지 않는다. 테스트는 계약 중심이고
결정적이어야 하며, 실제 시간·네트워크·개발 DB, 과도한 snapshot·mock, 임의 sleep,
내부 호출 횟수와 구현을 복사한 기대값에 의존하지 않는다. 실패를 skip하거나 timeout
증가로 숨기지 않는다.

## 10. 실행과 보고

명령은 실행 전 `package.json`에서 다시 확인한다.

```bash
npm test -- path/to/file.test.ts
npm run test:server -- path/to/file.test.ts
npm test
npm run test:server
npm run typecheck
npm run lint
```

완료 후 다음 형식으로 보고한다.

```markdown
### 적용 범위
- 대상 로직과 Simple TDD가 적합한 이유
### Red
- 실패 테스트와 수정 전 실패 이유
### Green
- 최소 구현과 통과 결과
### Refactor
- 정리 내용과 동작 변경 여부
### 실행 결과
- 명령, exit code, 통과·실패·skip
### 추가 검증
- 필요한 RTL·Supertest·Playwright·브라우저 검증
- 미실행 이유와 남은 위험
```

테스트를 실행하지 않았다면 Red·Green 완료나 테스트 통과를 보고하지 않는다.

## 11. 금지 사항

- 사용자 요청 없는 파일 수정과 범위 밖 리팩터링
- 테스트를 통과시키기 위한 계약 변경
- Red 실패 확인 없이 Green 완료 보고
- 실행하지 않은 테스트를 통과했다고 보고
- 격리 확인 없는 DB 통합 테스트
- 실제 Gemini·Push provider 호출
- 개발·Production DB 사용
- mock만으로 PWA·Push 완료 처리
- 관련 없는 테스트 삭제·skip
- 테스트 개수 목표와 새 테스트 라이브러리
- branch 생성·전환, add, commit, push, merge, rebase, reset
