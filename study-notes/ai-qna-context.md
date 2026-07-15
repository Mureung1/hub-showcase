# AI Q&A 기능 코드 학습 노트 (2026-07-15)

오늘 만든 "AI Q&A 플로팅 패널" 기능 — 사이드바 버튼을 누르면 트리 페이지 등에 반투명 채팅창이 뜨는 기능 — 의 코드를 자바스크립트 문법 기초부터 한 줄씩 뜯어보며 학습한 내용을 순서대로 정리한다. 코드는 직접 CodeSandbox/StackBlitz의 **React (JavaScript)** 템플릿에 타이핑하며 따라감.

## 전체 그림 — 컴포넌트 트리 구조

![QnaPanelContext 컴포넌트 트리 구조](ai-qna-context-tree.svg)

- **실선**: 실제 코드 구조 그대로. `MainLayout`이 렌더링될 때 안에 `QnaPanelProvider`가 있고, 그 안에 `Sidebar`와 `Outlet`(→`TreePage`→`ChapterAssistant`)이 나란히 들어있는 진짜 부모-자식 트리.
- **점선(청록색)**: React Context가 하는 일. `QnaPanelProvider`가 가진 `isOpen` 값이 `Outlet`이나 `TreePage`를 전혀 거치지 않고, `Sidebar`와 저 멀리 있는 `ChapterAssistant`한테 곧바로 전달됨. 둘 다 `useQnaPanel()`을 부르는 순간 그 값을 받음.

**왜 이런 구조가 필요한가**: `Sidebar`와 `ChapterAssistant`는 부모-자식이 아니라 서로 다른 가지(사촌 관계)다. 상태가 바뀌면 "상태를 가진 곳(`QnaPanelProvider`)부터 그 자손 전체로" 리랜더링되는 리액트의 기본 규칙은 그대로이고, Context는 그 자손들 중 누구나(트리 상 아무리 멀어도) 중간 컴포넌트를 거치지 않고 값을 직접 읽을 수 있게 해주는 배송 수단이다.

## 1. `ChatMessage` 타입 (개념만, 실제 파일은 안 만듦)

실제 프로젝트(`src/features/qna/types.ts`, 타입스크립트)에는 이렇게 정의되어 있다.

```ts
export interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}
```

- `interface`는 타입스크립트 전용 문법. "이 모양의 객체는 반드시 이런 속성을 가져야 한다"는 설계도이며, 컴파일 시점에만 존재하고 실행 시에는 완전히 사라짐.
- `role: 'user' | 'ai'` — `|`는 "또는". 값이 정확히 이 두 문자열 중 하나여야 하는 유니언 타입.

**JS 템플릿에서 연습할 때는 이 타입 자체가 필요 없다** — 실행 시 사라지는 문법이라 파일을 안 만들어도 되고, 그냥 나중에 `{ role: 'user', text: '...' }` 같은 평범한 객체를 직접 만들면 됨.

## 2. `QnaPanelContext.jsx` — Context로 상태 공유하기

```jsx
import { createContext, useContext, useState } from 'react'

const QnaPanelContext = createContext(null)

export function QnaPanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = () => setIsOpen((value) => !value)

  return <QnaPanelContext.Provider value={{ isOpen, toggle }}>{children}</QnaPanelContext.Provider>
}

export function useQnaPanel() {
  const ctx = useContext(QnaPanelContext)
  if (!ctx) throw new Error('useQnaPanel must be used within QnaPanelProvider')
  return ctx
}
```

### `import { createContext, useContext, useState } from 'react'`

`react` 라이브러리 안에 미리 만들어져 있는 여러 도구 중, 이 세 개만 이름으로 콕 집어 가져온다는 뜻.

- **`createContext`** — 값을 방송할 "채널" 객체를 만드는 함수
- **`useContext`** — 그 채널에서 값을 꺼내오는 함수
- **`useState`** — 컴포넌트가 상태(시간에 따라 바뀌는 값)를 가질 수 있게 해주는 함수

`use`로 시작하는 함수는 리액트에서 **훅(Hook)**이라 부르는 특별한 종류의 함수.

### `const QnaPanelContext = createContext(null)`

- `createContext`는 React에 내장된 함수(공장), `QnaPanelContext`는 우리가 그 공장을 한 번 돌려서 얻은 결과물에 붙인 이름. **내장 객체가 아니라 우리가 호출해서 만든 것.**
- `createContext(null)`이 반환하는 건 대략 이런 모양의 평범한 객체:
  ```js
  {
    Provider: (리액트가 만들어준 특수 컴포넌트),
    현재_방송값: null   // 초기값
  }
  ```
- `.Provider`라는 이름은 **항상 고정** — 어떤 컨텍스트를 만들든 리액트가 정해놓은 이름이라 우리가 바꿀 수 없다. (예전엔 `.Consumer`도 있었지만 지금은 `useContext`로 대체됨.)
- `null`은 "이 채널이 아직 아무 `Provider`로도 안 감싸였을 때 받는 기본값"일 뿐.
- **왜 평범한 객체 `{}`로 직접 안 만드나?** 일반 객체는 리액트의 리랜더링 시스템과 연결이 전혀 없다. `createContext`가 만든 특수 객체만 `.Provider`로 값을 방송하면 리액트가 "이 채널을 구독 중인 컴포넌트들"을 자동으로 다시 렌더링해주는 배선이 되어 있음.

### `export function QnaPanelProvider({ children }) {`

- `function 이름(매개변수) { ... }` — 함수 선언의 기본 틀. `이름` 자리에 우리가 원하는 이름을 짓고, `(매개변수)`는 나중에 호출할 때 밖에서 넘겨줄 값을 받는 자리.
- `export` — 이 함수를 다른 파일에서 `import`로 가져다 쓸 수 있게 공개.
- **`({ children })`** — 리액트 컴포넌트는 항상 딱 하나의 매개변수(`props`, "이 컴포넌트한테 전달된 것들을 담은 객체")만 받는다. `{ children }`은 그 객체에서 `children` 속성만 바로 꺼내는 **구조 분해(destructuring)** 문법. 풀어쓰면:
  ```jsx
  function QnaPanelProvider(props) {
    // props.children 대신 그냥 children으로 바로 씀
  }
  ```
- `children`에 실제로 들어오는 값 — `<QnaPanelProvider>여기 안의 내용물 전부</QnaPanelProvider>`처럼 태그 사이에 있는 모든 것이 자동으로 `children`이 됨.

**리액트 컴포넌트가 받는 "객체"는 C++ 클래스 인스턴스가 아니다.** 자바스크립트 객체는 클래스 선언 없이 `{ 키: 값 }` 문법으로 그 자리에서 즉석으로 만드는 key-value 묶음일 뿐 (C++로 억지로 비유하면 타입 선언 없는 `map<string, 아무거나>`에 가까움). `QnaPanelProvider`도 `QnaPanelContext`의 "인스턴스"가 아니라, 그냥 자기 함수 본문 안에서 `QnaPanelContext.Provider`(객체의 필드 접근, `obj.name`과 같은 문법)를 갖다 쓰는 완전히 별개의 함수.

### `const [isOpen, setIsOpen] = useState(false)`

- `useState(false)` — `false`는 자바스크립트 기본 불리언 값(C++의 `bool`과 동일). "처음엔 꺼져있다"는 초기값.
- `useState`는 원소 2개짜리 **배열**을 반환: [지금 값, 그 값을 바꾸는 함수].
- `const [isOpen, setIsOpen] = ...` — 배열용 구조 분해. `{ children }`(객체 구조 분해)과 비슷하지만 배열은 **순서**로 매칭됨. `isOpen`, `setIsOpen`이라는 이름은 리액트가 정한 게 아니라 **우리가 직접 지은 이름** — 리액트는 그냥 "값 하나 + 바꾸는 함수 하나"를 순서대로 반환했을 뿐.

**`setState` 함수가 실제로 하는 일**: "값을 바꾼다"기보다 "새 값으로 통째로 갈아끼운다"에 가깝다. `setText('안녕하세요')`처럼 문자열을 넣으면 이전 값이 뭐였든 무시하고 그냥 새 문자열로 교체. 부르는 방법은 두 가지:
1. **직접 새 값을 준다**: `setText('안녕')` — 이전 값과 무관하게 그냥 교체할 때
2. **"이전 값을 받아 새 값을 계산하는 함수"를 준다**: `setIsOpen((value) => !value)` — 새 값이 이전 값에 의존할 때만 필요 (뒤집기가 대표적인 예)

### `const toggle = () => setIsOpen((value) => !value)`

- **화살표 함수(arrow function)**: `() => 무언가`는 함수를 짧게 쓰는 문법. `function toggle() { return setIsOpen(...) }`와 완전히 같음. C++ 람다(`auto f = [](){...};`)와 비슷한 개념 — 만들어서 변수에 담아두면 그 자리에서 실행되지 않고 저장만 됨.
- `(value) => !value` — `value`라는 매개변수(현재 상태값이 들어올 자리)를 받아 그걸 뒤집은(`!value`) 값을 반환하는 함수. `setIsOpen`에 **값이 아니라 이 함수 자체**를 넘김.
- **리액트가 실행하는 방식**: `setIsOpen`이 함수를 받으면, "지금 저장된 현재 값"을 그 함수의 매개변수 자리에 직접 넣어서 실행한다. 예: 현재 `isOpen`이 `false`일 때 → `value` 자리에 `false`가 들어감 → `!false` = `true` → 새 `isOpen`은 `true`가 됨.

### 클릭이 `toggle()` 실행으로 이어지는 과정

```jsx
<button onClick={toggle}>...</button>
```

- `onClick={toggle}` (괄호 없음) — 지금 실행하는 게 아니라 **함수 자체(참조)**를 리액트에게 건네줘서 "나중에 클릭되면 이 함수를 실행해달라"고 예약해두는 것. `onClick={toggle()}`이라고 쓰면 렌더링되는 순간 즉시 실행되어버리므로 틀림.
- C++로 비유하면 구조체 필드에 함수 포인터를 등록해두는 것과 같음: `struct Button { void (*onClick)(); }; b.onClick = toggle;` — 필드 이름(`onClick`)과 실제 가리키는 함수의 이름(`toggle`)은 서로 무관.
- 사용자가 실제로 버튼을 클릭하면, 리액트가 브라우저의 클릭 이벤트를 감지하고 그제서야 등록해둔 `toggle()`을 (괄호 붙여) 호출.

### `return <QnaPanelContext.Provider value={{ isOpen, toggle }}>{children}</QnaPanelContext.Provider>`

**이건 HTML이 아니라 JSX** — 자바스크립트 함수 호출을 HTML처럼 보기 좋게 쓴 문법이며, 빌드 도구가 아래처럼 평범한 함수 호출로 자동 변환해준다.

```js
return React.createElement(
  QnaPanelContext.Provider,       // 어떤 컴포넌트를 렌더링할지
  { value: { isOpen, toggle } },  // props 객체
  children                        // 안에 들어갈 내용물
)
```

- 소문자로 시작하는 태그(`<div>`, `<button>`)는 진짜 HTML 요소, 대문자/점으로 시작하는 것(`<QnaPanelContext.Provider>`)은 우리 코드에 있는 컴포넌트나 값을 가리킴.
- `value={{ isOpen, toggle }}` — 바깥 `{ }`는 "여기부터 자바스크립트 값"이라는 JSX 문법, 안쪽 `{ isOpen, toggle }`는 **객체 리터럴 축약 문법**으로 `{ isOpen: isOpen, toggle: toggle }`와 완전히 같음. 즉 `value`에 담기는 객체는 정확히 `isOpen`, `toggle` 두 필드를 가짐 — 이 필드 이름들이 나중에 받는 쪽에서 그대로 구조 분해될 이름과 일치해야 함:
  ```jsx
  const { isOpen, toggle } = useQnaPanel()
  ```
- `{children}` — 태그 사이의 이 중괄호는 매개변수로 받은 `children` 변수의 값을 그대로 그 자리에 끼워넣으라는 뜻.
- 함수가 최종적으로 돌려주는 건 HTML 텍스트가 아니라 "화면에 뭘 그려야 하는지 설명하는 자바스크립트 객체"이고, 리액트가 이를 받아 실제 브라우저 화면(DOM)에 반영한다.

## 다음에 이어서 볼 것

- `MainLayout.tsx`에서 `QnaPanelProvider`로 전체를 감싸는 실제 코드
- `Sidebar.tsx`/`ChapterAssistant.tsx`에서 `useQnaPanel()`로 값을 꺼내 쓰는 코드
- `useState`로 메시지 목록(`ChatMessage[]`)을 관리하는 `ChapterAssistant`의 나머지 로직
