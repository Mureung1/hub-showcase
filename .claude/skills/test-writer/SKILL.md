---
name: test-writer
description: 잔소리봇의 기능·UI·API·DB·Service Worker 변경에 맞는 테스트 수준을 선택하고 안전한 테스트를 작성하는 프로젝트 Skill. Vitest, React Testing Library, Supertest, Playwright, 실제 브라우저 검증을 구분하며 DB 격리, 비동기 경합, 멱등성, Gemini fallback, Focus 복구, Web Push 회귀를 다룰 때 사용한다.
---

# Test Writer

테스트 개수를 늘리는 대신 변경된 제품 계약이 깨질 때 정확히 실패하는
최소한의 검증을 작성한다. 테스트 수준, 격리, 재현 가능성, cleanup을 우선한다.

## 1. 기준과 조사 순서

테스트를 작성하기 전에 다음을 확인한다.

1. 사용자 요구와 완료 조건
2. 변경 코드와 인접한 기존 테스트
3. `package.json`과 실제 test config
4. API·상태·DB 계약
5. `CLAUDE.md`, `AGENTS.md`
6. `docs/checklist.md` 상단 현재 상태

문서가 충돌하면 실제 코드·테스트 설정과 최신 사용자 결정을 우선한다.
기존 테스트가 완료 조건을 충분히 검증하면 중복 테스트를 만들지 않는다.

현재 테스트 파일은 소스 옆의 `*.test.{js,jsx,ts,tsx}`와 `e2e/*.spec.ts`를
함께 사용한다. 특정 확장자나 과거 파일명을 규칙으로 고정하지 않는다.

## 2. 테스트 수준 선택

가장 낮으면서 제품 계약을 충분히 검증할 수 있는 수준을 선택한다.

| 변경 유형 | 기본 검증 |
| --- | --- |
| 순수 함수·상태 변환 | Vitest + 경계·회귀 |
| React 렌더링·상호작용 | React Testing Library |
| Express route·middleware | Vitest + Supertest |
| Prisma·DB 상태 | 격리 DB에서 Supertest 또는 통합 테스트 |
| 핵심 사용자 흐름 | Playwright 검토 |
| Service Worker 로직 | Service Worker Vitest + 실제 환경 필요 여부 |
| PWA·Push·반응형 | 실제 브라우저·기기 검증 |

모든 변경에 모든 수준을 적용하지 않는다. 하위 수준 테스트가 통과해도
브라우저·기기 동작이 완료 조건이면 상위 검증을 생략하지 않는다.

### 2.1 Vitest

대상:

- `src/lib/**`
- `server/src/lib/**`
- 날짜·간격·점수 계산
- 상태 변환과 session validation
- Gemini 응답 검증과 fallback 선택
- mock 가능한 Service Worker 이벤트 로직

원칙:

- happy path, 의미 있는 경계값, 실제 버그 회귀를 구분한다.
- 날짜 함수는 내부에서 현재 시각을 만들지 않고 `now`를 주입한다.
- KST 날짜는 OS timezone이 아니라 UTC timestamp와 KST offset/day ordinal로
  검증한다.
- 입력 순서에 독립적이어야 하는 함수는 정렬되지 않은 입력도 확인한다.
- fake timer를 썼다면 system time, timer, mock을 명시적으로 복구한다.
- 임의 sleep이나 timeout 증가로 비결정성을 숨기지 않는다.
- 테스트를 통과시키려고 제품 계약을 바꾸지 않는다.

루트 Vitest는 `vite.config.js` 기준 `jsdom`이며 다음을 포함한다.

```text
src/**/*.test.{js,jsx,ts,tsx}
public/**/*.test.js
```

서버 Vitest는 `server/vitest.config.ts` 기준 `node` 환경이다.

### 2.2 React Testing Library

대상:

- 렌더링과 조건부 UI
- 접근성 role, label, accessible name
- 입력, 버튼, 모달과 화면 이동 callback
- loading, error, empty 상태
- 중복 제출·중복 완료
- 늦은 비동기 응답과 unmount 이후 상태 업데이트
- Focus·Completion·Nudge 상태

원칙:

- 사용자가 보는 역할·이름·행동을 우선 검증한다.
- CSS class, DOM 자식 순서, 내부 함수 호출을 주된 성공 근거로 삼지 않는다.
- 스타일 계약 자체가 요구사항일 때만 class·data attribute를 보조 근거로 쓴다.
- snapshot을 기본값으로 사용하지 않는다.
- mock이 검증 대상의 핵심 동작을 우회하지 않는지 확인한다.
- `act` 경고, pending promise, timer와 mock을 남기지 않는다.
- 성공만 아니라 실패 후 입력 보존, 재시도, disabled 복구도 관련 시나리오라면
  확인한다.

### 2.3 Supertest

대상:

- Express 입력 validation
- HTTP status와 response body
- `{ data: ... }`
- `{ error: { code, message } }`
- 실제 route와 middleware
- DB 저장·조회 결과
- transaction, rollback, idempotency와 Prisma 제약

원칙:

- 순수 함수의 모든 테스트를 route에서 반복하지 않는다.
- route 입력 검증, 상태 전환, 외부 계약에 영향을 주는 경계는 통합 수준에서도
  검증한다.
- 내부 함수 호출보다 HTTP 계약과 최종 DB 결과를 본다.
- provider와 Push처럼 외부 네트워크를 실제로 호출하면 안 되는 부분은 경계에서
  최소 mock하고, 별도 lib 테스트에서 해당 로직을 검증한다.
- 실패 응답에 provider payload, stack, 비밀값이 노출되지 않는지 확인한다.

### 2.4 Playwright

현재 자동화 범위:

- Landing smoke
- Register 제목·D-day 빈 값 검증
- API로 Task 생성
- Home에서 직접 Focus 시작
- Completion
- History 확인

현재 E2E 백로그:

- Register 새로고침
- Focus `sessionStorage` 복구
- API 실패 UI와 재시도

원칙:

- E2E 파일이 있다는 이유로 백로그까지 검증됐다고 설명하지 않는다.
- fixture가 API로 실제 데이터를 생성·삭제한다는 점을 고려한다.
- 독립된 테스트 DB가 확인되지 않으면 E2E를 실행하거나 완료로 간주하지 않는다.
- 생성 API의 HTTP status와 body를 확인한 뒤 fixture 값을 신뢰한다.
- 이번 실행에서 만든 고유 ID를 우선해 cleanup한다.
- prefix 일괄 삭제는 다른 실행이나 사용자 데이터와 충돌하지 않는다는 근거가
  있을 때만 안전망으로 쓴다.
- DOM selector보다 role과 accessible name을 우선한다.
- 네트워크 경합을 임의 sleep으로 해결하지 않는다.

다음 산출물은 소스가 아니며 커밋하지 않는다.

```text
test-results/
playwright-report/
output/
trace, screenshot, video
```

### 2.5 Service Worker와 실제 환경

`public/service-worker.test.js`는 Service Worker 스크립트를 jsdom에서 불러
이벤트 로직을 검증한다. 현재 테스트 범위와 새 요구를 직접 확인하고 필요한
push, notification click, fallback, cache 회귀만 추가한다.

mock 또는 jsdom은 실제 Service Worker 등록, 브라우저 권한, PushSubscription,
OS 알림 전달을 증명하지 않는다. 다음은 별도 실제 환경 증거가 필요하다.

- Desktop Chrome·Edge Web Push
- iPhone 홈 화면 PWA Push
- manifest와 Service Worker 배포
- Preview·Production origin 차이
- 반응형과 실제 브라우저 UI

Android Chrome 실기기 Push는 현재 미검증 상태다. 테스트가 존재한다는 이유로
검증 완료라고 쓰지 않는다.

## 3. DB 안전

DB를 읽거나 쓰는 테스트 전에 테스트 전용 DB인지 확인한다.

- `DATABASE_URL` 값이나 비밀정보를 출력·문서화하지 않는다.
- 환경변수가 없으면 DB suite는 skip될 수 있다.
- URL이 있지만 테스트 전용 식별자를 확인할 수 없으면 즉시 중단한다.
- 개발 DB와 Production DB에 테스트 데이터를 생성·수정·삭제하지 않는다.
- 데이터가 적다는 이유로 예외를 허용하지 않는다.

현재 Supertest 안전 구조:

- `server/vitest.config.ts`는 `server/.env.test`만 읽는다.
- 파일이 없으면 `DATABASE_URL`과 `DIRECT_URL`을 빈 값으로 주입해 Prisma가
  개발 `.env`를 자동 로드하지 못하게 한다.
- route test는 URL의 `test` 식별자를 확인한다.
- URL이 없으면 `describe.skipIf`로 skip한다.
- URL은 있지만 test 식별자가 없으면 파일 로드 단계에서 중단한다.
- 테스트 데이터는 suite별 고유 prefix를 사용하고 teardown으로 정리한다.

새 route test에서도 실제 가드를 재사용하거나 동일한 fail-closed 동작을
유지한다. 가드 없이 DB test를 추가하지 않는다.

Playwright에는 위 Supertest 가드가 자동 적용되지 않는다. E2E를 작성하거나
실행하기 전에 서버가 독립된 테스트 DB를 사용한다는 사실을 별도로 확인한다.
확인할 수 없으면 fail-closed로 중단하고 `BLOCKED`로 보고한다.

Cleanup 원칙:

- 이번 테스트가 만든 고유 ID·prefix만 삭제한다.
- 가능하면 정상 API 또는 해당 suite의 teardown을 사용한다.
- 병렬 suite와 동일 prefix 충돌을 피한다.
- cleanup 실패를 숨기지 않고 남은 데이터 위험을 보고한다.
- Prisma schema의 현재 relation과 FK를 확인한 후 삭제 범위를 결정한다.
- `Feedback` 등 관계 모델을 확인하지 않은 generic 삭제 순서를 복사하지 않는다.
- schema나 migration이 바뀌면 fixture와 teardown도 다시 검토한다.

## 4. 고위험 시나리오

관련 코드를 변경할 때만 필요한 시나리오를 선택한다.

### 중복·멱등성

- done 요청 중복과 done event 중복 저장
- stopped 요청 중복
- 피드백 중복 제출
- Push 중복 발송
- 첫 요청 이후 버튼·세션 상태

### 비동기 경합

- 늦은 Gemini 응답이 확정된 fallback을 덮는 경우
- 늦은 응답이 Nudge 메시지나 Focus session을 뒤집는 경우
- Task 삭제와 `notification_sent` event 경합
- 컴포넌트 unmount 뒤 상태 업데이트
- polling·timer와 사용자 행동의 동시 발생

### Gemini와 fallback

- 정상 structured response
- API 오류, timeout, 빈 응답, 형식 오류, 품질 검사 실패
- `source: "rule_based"` 반환
- `configuration_missing`을 정상 fallback으로 숨기지 않는 계약
- 외부 payload와 민감 정보가 응답·로그에 노출되지 않는지

### 데이터·보안

- 클라이언트가 보낸 `memoryEvidence` 위조
- 서버가 실제 과거 완료 근거를 다시 검증하는지
- API 입력 타입·범위와 문자열의 암묵적 숫자 변환
- 인증이 없는 현재 구조에서 테스트 데이터 범위 혼합
- 환경변수·VAPID·Gemini key 노출

### 날짜·시간

- 명시적 `now` 주입
- UTC ISO datetime
- Asia/Seoul 자정 전후
- 입력 순서·중복 날짜
- 연속 완료일 계산
- OS timezone 독립성
- demo와 production 알림 간격
- 59/60초 또는 599/600초처럼 정책이 정한 경계

### Focus

- direct와 intervention 시작
- `entryMode`, `entryLevel`, `journeyLevel`
- `sessionStorage` 저장, 유효성, 최대 수명
- 새로고침 복구
- 완료·멈추기 이후 세션 정리
- stopped 최소 집중 시간 미만·이상
- 중복 완료 방지와 Completion 전환

### Push와 Service Worker

- Notification permission과 PushSubscription 상태 분리
- permission granted지만 subscription이 없는 재구독
- 만료된 404/410 구독 삭제
- 여러 구독 중 일부 발송 실패
- Push payload와 표시 내용
- notification click과 오프라인 fallback
- cache 변경 시 기존 navigation·asset 동작

## 5. 테스트 작성 절차

1. 사용자 요구와 완료 조건을 확인한다.
2. 변경 코드, 인접 테스트와 설정을 먼저 읽는다.
3. 깨질 수 있는 제품 계약과 실패 시나리오를 적는다.
4. 가장 낮은 적절한 테스트 수준을 선택하고 이유를 설명한다.
5. 기존 테스트가 같은 계약을 충분히 검증하는지 확인한다.
6. DB 접근이면 격리 상태를 먼저 확인한다.
7. 승인된 범위 안에서 테스트를 최소 변경으로 작성한다.
8. 테스트가 의도한 이유로 실패하는지 확인한다.
9. 구현 후 관련 테스트와 필요한 상위 수준 검증을 실행한다.
10. timer, mock, DOM, fixture와 DB 데이터를 정리한다.
11. 실행 명령, 결과, skip, 미실행 항목과 이유를 보고한다.
12. 실제 브라우저·기기가 필요한 항목은 자동 테스트와 분리해 남긴다.

사용자가 테스트 작성만 요청하면 제품 코드를 자동 수정하지 않는다. 현재
제품 계약과 기대 테스트가 다르면 코드를 테스트에 맞추지 말고 불일치를
보고한다.

## 6. 실행 명령

명령은 실행 전 현재 `package.json`에서 다시 확인한다.

```bash
npm test                         # 프런트 lib·RTL·Service Worker Vitest
npm run test:server              # 서버 Vitest·Supertest
npm run test:all                 # 프런트와 서버 테스트
npm run test:e2e                 # Playwright, 테스트 DB 확인 후에만
npm run typecheck                # 루트 src TypeScript 검사
npm run typecheck --workspace server
npm run lint
npm run build
npm run build:server
```

주의:

- `npm run test:server`가 exit code 0이어도 DB suite가 skip됐을 수 있다.
- `npm run typecheck`는 현재 `tsconfig.json`의 `src` 범위만 검사한다.
- 실제 브라우저 검증을 명령 통과로 대체하지 않는다.

## 7. 품질 기준

좋은 테스트:

- 실패하면 어떤 제품 계약이 깨졌는지 알 수 있다.
- 정상·경계·회귀 중 목적이 테스트 이름에 드러난다.
- 실행 순서와 OS timezone에 독립적이다.
- fixture가 결정적이고 다른 실행과 구분된다.
- mock 범위가 최소이며 핵심 동작을 우회하지 않는다.
- 사용자 행동, API 계약과 최종 데이터 상태를 검증한다.
- timer, mock, 데이터와 브라우저 상태를 정리한다.

피할 패턴:

- 테스트 개수 채우기
- 과도한 snapshot
- 내부 함수 호출 횟수만 검증
- 불필요한 전체 module mock
- broad catch로 실패 숨기기
- `test.skip`으로 회귀 무기한 은폐
- timeout 증가나 임의 sleep으로 flaky 덮기
- 개발 DB의 기존 데이터 의존
- 관련 없는 기존 테스트 삭제·대규모 재작성
- 테스트를 통과시키기 위한 제품 계약 변경

## 8. 완료 보고

```markdown
### 변경한 테스트
- 파일
- 검증 시나리오
- 선택한 테스트 수준과 이유

### 실행 결과
- 명령
- exit code
- 통과·실패
- skip된 suite와 이유

### DB 안전
- 격리 확인 여부
- 생성한 데이터 범위
- cleanup 결과
- 실행하지 않았다면 이유

### 미실행 검증
- 항목
- 이유
- 완료 판단에 미치는 영향

### 남은 위험
- 실제 브라우저·기기
- Preview·Production
- race condition
- DB·migration
- flaky 가능성
```

실행하지 않은 테스트를 통과했다고 쓰지 않는다. 비밀 URL 값은 출력하지 않는다.

## 9. 금지 사항

- 사용자의 요청 없는 제품 코드 수정
- 테스트를 통과시키기 위한 제품 계약 변경
- 격리 확인 없는 DB 쓰기 테스트
- 개발·Production DB 테스트 데이터 생성·삭제
- skip된 DB suite를 통합 테스트 성공으로 보고
- mock만으로 PWA·Push 완료 처리
- 기존 테스트 무단 삭제·대규모 재작성
- 테스트 개수 목표 설정
- 고정된 과거 파일명·주차별 사례를 프로젝트 규칙으로 사용
- trace, screenshot, report와 임시 산출물 커밋
- 비밀 환경변수나 외부 provider payload 출력
- 요청 범위 밖 리팩터링과 새 테스트 라이브러리 도입

테스트가 실제 환경에서 필요한 증거를 제공하지 못하면 그 한계를 명시한다.
자동 테스트와 수동 브라우저 검증은 서로 대체하지 않는다.
