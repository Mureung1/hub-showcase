---
name: write-test
description: 이 저장소에서 순수 함수·모듈에 테스트를 쓰거나 TDD(red→green)로 기능을 만들 때 쓴다. Node 내장 test runner(node:test)를 사용한다. "테스트 작성", "TDD", "이 함수 테스트해줘" 같은 요청에서 트리거.
---

# 이 저장소의 테스트 작성 절차

추가 라이브러리 없이 **Node 24 내장 `node:test`** 를 쓴다. (설치 불필요)

## 언제 쓰나
- 유틸/서비스 같은 **순수 함수·모듈**에 테스트를 추가할 때. (React 컴포넌트 UI 렌더링 테스트는 대상 아님)
- 새 기능을 **TDD**로 만들 때: 테스트 먼저(red) → 구현(green).

## 파일 규칙
- 테스트 파일은 **대상 소스 옆에** `이름.test.js` 로 둔다.
  - 예: `frontend/src/utils/subjectStatus.js` → `frontend/src/utils/subjectStatus.test.js`
- 테스트 이름은 **`함수: 조건 → 기대`** 형식의 한글 문장으로.
  - 예: `"isCompleted: completedAt 값이 있으면 완료(true)"`

## 테스트 파일 뼈대
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { 대상함수 } from "./대상모듈.js";

test("대상함수: 어떤 조건 → 기대 결과", () => {
  assert.equal(대상함수(입력), 기대값);
});
```
- 비교는 `assert.equal`(원시값), `assert.deepEqual`(배열·객체), `assert.throws`(예외)를 쓴다.

## TDD 흐름 (red → green)
1. **RED** — 구현 전에 테스트부터 쓴다. 실행하면 실패해야 정상.
   ```
   cd frontend && node --test src/utils/이름.test.js
   ```
   (모듈이 없으면 import 실패로 fail 1 이 뜬다 — 이게 red.)
2. **GREEN** — 테스트를 통과시키는 **최소한**의 구현을 작성한다.
3. 다시 실행해서 **pass**로 바뀌는지 확인한다.

## 실행 방법
- 전체: `cd frontend && npm test`  (`node --test 'src/**/*.test.js'`)
- 한 파일만: `cd frontend && node --test src/utils/이름.test.js`
- ⚠️ 이 머신은 node 가 PATH 에 없다. 먼저:
  `export PATH="/Users/user/.local/node-v24.17.0-darwin-x64/bin:$PATH"`

## 서버(DB 의존) 로직 테스트 팁
- `server` 쪽 서비스는 SQLite 에 의존한다. 테스트에선 **메모리 DB** 를 써서 파일을 안 건드린다.
  - `node:sqlite` 의 `new DatabaseSync(":memory:")`, 또는 `DB_PATH=":memory:"` 환경변수.
- 가능하면 계산·분리 같은 **순수 로직을 별도 함수로 빼서** DB 없이 테스트한다. (예: `subjectStatus.js`)
