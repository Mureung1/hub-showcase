---
name: testing
description: Articles 서비스의 Vitest 기반 단위 테스트 작성 컨벤션. 서버 순수 함수나 클라이언트 컴포넌트에 새 테스트 파일을 추가하거나 기존 테스트에 케이스를 보강할 때 사용.
---

# Articles 테스트 작성 가이드

기존 예시는 `server/src/services/llmService.test.js`(순수 함수)와
`client/src/components/Badge.test.jsx`(컴포넌트) 두 파일뿐이다. 새 테스트를
쓸 때 임의로 새 스타일을 만들지 말고 이 두 파일의 구조를 그대로 따른다.

## 0. 기본 원칙

- 프레임워크는 Vitest 하나만 쓴다. client/server 모두 별도
  `vitest.config.*` 없이 동작(client는 `vite.config.js`의 `test` 옵션으로
  설정됨).
- 테스트 파일은 대상 파일과 **같은 디렉토리에 colocate**한다. 서버는
  `*.test.js`, 클라이언트 컴포넌트는 `*.test.jsx`.
- 커밋 메시지는 `test: <한글 설명>` (Conventional Commits).

## 1. 서버(순수 함수) 테스트 — `llmService.test.js` 패턴

```js
import { describe, it, expect, vi, afterEach } from "vitest"
import { targetFn } from "./targetFile.js"
```

- 대상 함수마다 최상위 `describe(함수명, ...)`를 하나씩 둔다.
- 그 아래 한글 카테고리 `describe`로 나눈다: `정상 케이스` / `빈 값` /
  `경계값` / `실패하는 경우`, 그리고 함수가 입력을 변형하지 않아야 하면
  `순수성`도 추가한다. 함수 성격에 따라 이 다섯 중 일부만 있어도 된다
  (`buildFuzzyPattern`처럼 카테고리 없이 `it`만 나열하기도 함).
- `it` 제목은 "~하면 ~한다" 형태의 **완전한 한글 문장**으로 기대 동작을
  서술한다. 예: `"paragraphs가 빈 배열이면 null을 반환한다"`.
- 입력 조합이 반복되면 `it.each([...])`로 테이블화한다:
  ```js
  it.each([
    ["Bullish ", "bullish"],
    ["BEARISH", "bearish"],
  ])("marketSentiment이 %s여도 정규화되어 %s로 반환된다", (raw, expected) => {
    ...
  })
  ```
- 헬퍼(픽스처 생성 함수)는 별도 test-utils 파일을 만들지 않고 `describe`
  블록 안에 로컬 함수로 둔다. 예: `makeResponse(body)`, `item(label, score,
  sector)`, `labels(result)`.
- 목이 필요하면 `vi.spyOn(...)`으로 그 자리에서 걸고, 최상위 `describe`
  안에 `afterEach(() => vi.restoreAllMocks())`를 둬서 정리한다.
- 실행: `server/` 디렉토리에서 `npm test` ( = `vitest run`).

## 2. 클라이언트(컴포넌트) 테스트 — `Badge.test.jsx` 패턴

```jsx
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import Target from "./Target"
```

- `@testing-library/jest-dom`의 매처(`toBeInTheDocument` 등)를 그대로 쓴다.
  전역 셋업은 `client/src/setupTests.js`(`@testing-library/jest-dom/vitest`
  import + `afterEach(cleanup)`)가 담당하고 `vite.config.js`의
  `test.setupFiles`로 이미 연결돼 있으므로, 새 컴포넌트 테스트 파일에서
  추가 설정을 할 필요가 없다.
- `describe`/`it` 컨벤션은 서버와 동일(한글 문장형 제목, 카테고리별
  `describe`). 컴포넌트 테스트는 `정상 케이스`/`실패하는 경우`(폴백 렌더링
  등) 위주로 구성되는 경우가 많다.
- 실행: `client/` 디렉토리에서 `npm run test` ( = `vitest run`).

## 3. 새 테스트 작성 체크리스트

1. 대상 함수/컴포넌트 옆에 `*.test.js`(서버) 또는 `*.test.jsx`(클라이언트
   컴포넌트) 파일을 생성한다.
2. Vitest에서 `describe, it, expect`를 import하고, 목이 필요하면 `vi,
   afterEach`도 추가한다.
3. 최상위 `describe`는 대상 함수/컴포넌트 이름으로, 하위 `describe`는
   `정상 케이스`/`빈 값`/`경계값`/`실패하는 경우`(/`순수성`)로 나눈다.
4. `it` 제목은 기대 동작을 완전한 한글 문장으로 쓴다.
5. 입력 조합이 반복되면 `it.each`로 테이블화한다.
6. 목이 필요하면 `vi.spyOn` + `afterEach(() => vi.restoreAllMocks())`로
   정리한다.
7. 컴포넌트 테스트라면 `render`/`screen` + jest-dom 매처를 쓰고, 별도
   셋업은 필요 없다(`setupTests.js`가 이미 연결돼 있음).
8. 서버/클라이언트 모두 `npm test`로 실행해 통과를 확인한 뒤
   `test: <설명>`으로 커밋한다.
