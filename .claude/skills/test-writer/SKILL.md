---
name: test-writer
description: Use when writing tests for this project (진로 에이전트 서비스) — e.g. "테스트 짜줘", "TDD로 만들어줘", new backend service logic, a React component with its own logic/validation, or verifying a screen/flow works end-to-end before committing. Ensures new tests follow the project's existing vitest+AAA convention (backend), the vitest+Testing Library convention (frontend components), and the ad-hoc Playwright E2E pattern (full-flow) instead of inventing a new setup each time.
---

# Test Writer — 진로 에이전트 서비스

이 스킬은 세 가지 테스트 상황에 적용한다: (1) `backend/`의 순수 함수/서비스 로직에 vitest 단위 테스트를 작성할 때, (2) `src/`의 React 컴포넌트 자체 로직(검증, 조건부 렌더링 등)을 단위 테스트할 때, (3) 화면 흐름이 실제로 동작하는지 브라우저로 E2E 검증할 때.

## 소스 오브 트루스

1. [`backend/src/services/essayAnalysis.test.js`](../../../backend/src/services/essayAnalysis.test.js) — 이 프로젝트에서 실제로 TDD(RED→GREEN→REFACTOR)로 작성된 backend vitest 예시. 케이스 이름, AAA 구조, 단언 스타일의 기준으로 삼는다.
2. [`src/screens/LoginScreen.test.jsx`](../../../src/screens/LoginScreen.test.jsx) — React 컴포넌트 단위 테스트(vitest + `@testing-library/react`)로 TDD한 예시. `fireEvent`로 입력/클릭을 흉내내고, `onLogin` 같은 콜백 prop은 `vi.fn()`으로 목(mock)해서 호출 여부/인자를 단언한다.
3. `backend/package.json`과 루트 `package.json`의 `test` 스크립트(둘 다 `vitest run`) — 테스트 러너는 vitest 하나만 쓴다. jest 등 다른 러너를 새로 추가하지 않는다. **backend와 루트는 서로 다른 vitest 설정을 쓰는 별도 프로젝트다** — 루트 `vite.config.js`의 `test.exclude`에 `backend/**`가 들어있어 서로 안 겹치니, 각자 자기 디렉토리에서 `npm test`를 실행한다.
4. 루트 `vite.config.js`의 `test` 블록(`environment: 'jsdom'`, `globals: true`, `setupFiles: './src/setupTests.js'`) — React 컴포넌트 테스트 환경 설정의 기준. `globals: true`가 없으면 `@testing-library/jest-dom`의 매처 확장이 `expect`를 못 찾아 깨진다.
5. 이 문서의 "Playwright E2E 패턴" 섹션 — T11~T14 검증 때 반복 사용한 브라우저 구동 방식(플레이북). 화면 하나의 로직이 아니라 여러 화면을 가로지르는 흐름(로그인→입력→추천→상세→초안 등)을 검증할 때 이 패턴을 쓴다.

## 핵심 규칙 (요약)

### 백엔드 단위 테스트 (vitest)

- 순수 함수부터 테스트한다. `matching.js`/`essayAnalysis.js`처럼 입력→출력이 결정적인 로직이 우선 대상이다.
- LLM 호출(`claude.js`, `draftGeneration.js`)처럼 비결정적이거나 Supabase 같은 외부 의존이 있는 코드는 억지로 모킹해서 단위 테스트를 만들지 않는다 — 폴백 동작(계약) 검증과 curl 기반 통합 검증이 더 적합하다.
- 테스트는 AAA(Arrange-Act-Assert)로 쓴다: 입력 `profile`/`question` 준비 → 함수 호출 → 정확한 문자열/값으로 단언.
- 파일명은 대상 파일과 나란히 둔다: `xxx.js` 옆에 `xxx.test.js`.
- 엣지케이스(빈 값, 복수 매칭, 폴백 케이스)를 최소 1개 이상 포함한다.
- TDD로 만들 때는 RED(구현 없이 실행해 실패 확인) → GREEN(최소 구현) → REFACTOR(중복 정리, 단 다른 모듈과 억지로 합치지 않음) 순서를 지킨다.

### 프론트엔드 컴포넌트 단위 테스트 (vitest + Testing Library)

- 화면 하나 안에서 완결되는 로직(입력 검증, 조건부 렌더링, 버튼 disabled 여부 등)이 대상이다. 여러 컴포넌트/화면을 가로지르는 흐름은 이 방식이 아니라 Playwright E2E로 검증한다.
- `fireEvent.change`/`fireEvent.click`으로 입력·클릭을 흉내낸다(실제 사용자 입력처럼 더 정교하게 하고 싶을 때만 `@testing-library/user-event` 도입을 고려하되, 지금은 `fireEvent`만으로 충분).
- 콜백 prop(`onLogin`, `onSubmit` 등)은 `vi.fn()`으로 목(mock)해서, "호출 안 됨"/"이 인자로 정확히 호출됨"을 단언한다 — 실제 API 호출까지 이 테스트에서 확인하지 않는다(그건 Playwright E2E나 curl의 몫).
- 텍스트/라벨 기반 셀렉터(`screen.getByLabelText`, `screen.getByRole`, `screen.getByText`)를 쓴다. 클래스명 기반 셀렉터는 최후의 수단.
- 파일명은 대상 컴포넌트와 나란히 둔다: `LoginScreen.jsx` 옆에 `LoginScreen.test.jsx`.
- 루트에서 `npm test` (backend와 별개 명령임에 주의).

### 프론트엔드 E2E (Playwright)

- `playwright-core`(스크래치패드에 설치) + 로컬 Chrome 실행 파일(`C:\Program Files\Google\Chrome\Application\chrome.exe`)로 실제 브라우저를 띄운다. `chromium-cli`는 이 환경에 없다.
- 백엔드(`cd backend && npm run dev`)와 프론트(`npm run dev`)를 먼저 둘 다 띄운다.
- 스크립트는 항상 스크래치패드/temp 디렉토리에 임시로 작성하고, 검증이 끝나면 삭제한다 — 레포에 커밋하지 않는다.
- `page.on('console', ...)`으로 `error` 타입 로그를, `page.on('pageerror', ...)`으로 런타임 예외를 모아서 마지막에 출력한다. 의도적으로 발생시킨 네트워크 실패(`page.route(...).abort()`)로 인한 콘솔 에러는 예외로 취급하고 설명을 남긴다.
- 화면 흐름은 실제 셀렉터(텍스트, 클래스명)로 클릭/입력하며 단계별로 진행하고, 주요 지점마다 스크린샷을 남긴다.
- 실패를 재현해야 하는 케이스(에러 메시지, 빈 상태, 경쟁 상태 등)는 `page.route`로 요청을 가로채서 강제로 응답을 조작한다 — 실제 백엔드를 억지로 고장내지 않는다.
- 검증이 끝나면 실행 중인 서버 프로세스를 정리한다(포트 점유 여부를 `Get-NetTCPConnection`으로 확인 후 `Stop-Process`).

## 예시 1: 백엔드 vitest (essayAnalysis.test.js 발췌)

```js
it("경험사례형 문항(협업/사례 키워드) → 우선순위 상위 2개(경험·자격증) 언급", () => {
  const profile = {
    major: "컴퓨터공학과",
    certificates: ["정보처리기사"],
    experience: "교내 창업 동아리 활동, 백엔드 개발 프로젝트 참여",
  };

  expect(analyzeEssayQuestion("협업 경험 중 어려움을 극복한 사례를 작성해주세요.", profile)).toBe(
    "이 문항은 경험 사례를 묻고 있어요. 회원님의 경험(교내 창업 동아리 활동, 백엔드 개발 프로젝트 참여) · 자격증(정보처리기사) 내용을 구체적인 사례와 함께 풀어보면 좋아요.",
  );
});
```

## 예시 2: 프론트엔드 컴포넌트 (LoginScreen.test.jsx 발췌)

```jsx
it('아이디/비밀번호가 둘 다 비어있으면 제출해도 onLogin이 호출되지 않고 에러가 표시된다', () => {
  const onLogin = vi.fn();
  render(<LoginScreen onLogin={onLogin} isLoggingIn={false} loginError="" />);

  fireEvent.click(screen.getByRole('button', { name: /로그인/ }));

  expect(onLogin).not.toHaveBeenCalled();
  expect(screen.getByText('아이디와 비밀번호를 모두 입력해주세요.')).toBeInTheDocument();
});
```

## 사용 방법

1. 테스트 대상이 무엇인지 먼저 분류한다: (a) 순수 함수 → 백엔드 vitest 단위 테스트, (b) 컴포넌트 하나의 자체 로직 → 프론트엔드 컴포넌트 단위 테스트, (c) 여러 화면을 가로지르는 흐름/LLM 연동 → Playwright E2E나 curl 검증.
2. 백엔드 vitest: `essayAnalysis.test.js`의 케이스 구조를 그대로 따라 쓰고, `cd backend && npm test`로 RED→GREEN을 직접 확인한다.
3. 프론트엔드 컴포넌트: `LoginScreen.test.jsx`의 구조(콜백은 `vi.fn()`으로 목, `fireEvent`로 조작, 라벨/역할 기반 셀렉터)를 따라 쓰고, 루트에서 `npm test`로 RED→GREEN을 확인한다.
4. Playwright: 위 "프론트엔드 E2E" 규칙대로 스크래치패드에 임시 스크립트를 작성해 실행하고, 끝나면 스크립트와 서버 프로세스를 정리한다.
5. 리팩터링 후에도 관련 테스트(`npm test` 또는 동일 E2E 스크립트)를 재실행해 여전히 통과하는지 확인한다.
