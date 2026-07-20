# Day 8 React 핵심 학습 — useState의 정체, props는 함수 인수

## 1. 오늘 한 작업

- App.jsx 코드 투어: state 9개의 역할, `handleSave`의 try/catch/finally 흐름을 따라가며 분석했다.
- 결과 카드와 기록 카드를 `SummaryCard` / `RecordCard` 컴포넌트로 분리했다 (Day 7의 `CheckinForm` 분리와 같은 패턴 반복).
- 기록 카드 클릭 → 상세 화면(`RecordDetail`) → 목록 복귀 흐름을 추가했다.
- 화면·데이터 흐름도(`screen-flow.md`)와 데이터 모델 초안(`data-model.md`)을 문서화했다.
- 직접 다시 만들어보는 반복 연습은 아직 안 했다. `docs/practice/`의 빈칸 자료로 진행 예정.

## 2. `const [a, b] = useState()` — 왜 대괄호인가

`useState`는 React 전용 문법이 아니라 그냥 **값 2개가 담긴 배열을 리턴하는 함수**다.

```js
const pair = useState('')   // pair는 [현재값, 바꾸는함수] 배열
const rawText = pair[0]
const setRawText = pair[1]
```

이 3줄을 1줄로 줄이는 자바스크립트 문법이 **배열 구조분해(destructuring)**다.

```js
const [rawText, setRawText] = useState('')
// "리턴된 배열의 0번을 rawText에, 1번을 setRawText에 담아라"
```

`[]`는 배열을 만드는 게 아니라 **리턴된 배열을 까서 꺼내는** 문법이다. `const [a, b] = [10, 20]`은 브라우저 콘솔에서도 된다. props를 받을 때 쓰는 `function CheckinForm({ rawText })`는 같은 원리의 **객체** 구조분해다.

## 3. const인데 값이 바뀌는 이유

`setRawText`는 변수를 고쳐 쓰는 함수가 아니다. 하는 일은 **"React야, 값 바뀌었으니 App() 함수를 처음부터 다시 실행해줘"**다.

- 렌더링 1번 = App() 함수 호출 1번 = 사진 1장.
- 다시 실행되면 `const rawText`도 **새로 태어난다**. 이번엔 useState가 새 값을 돌려준다.
- 한 번의 실행 안에서는 값이 절대 변하지 않으므로 const가 맞다.

## 4. useState의 정체 — 값은 함수 밖 창고에 산다

지역변수인데 값이 유지되는 이유: **실제 값은 React가 컴포넌트별 창고에 따로 보관**하고, useState는 호출될 때마다 창고에서 현재 값을 꺼내다 주는 출납 창구다. 개념적인 짝퉁 구현:

```js
const 창고 = []      // 값들이 실제로 사는 곳 (함수 밖)
let 칸번호 = 0       // 렌더링 시작마다 0으로 리셋

function useState(초기값) {
  const 내칸 = 칸번호++                       // 첫 useState는 0번칸, 둘째는 1번칸...
  if (창고[내칸] === undefined) 창고[내칸] = 초기값
  function set(새값) {
    창고[내칸] = 새값                          // 밖의 저장값을 바꾸고
    다시렌더링예약()                           // 함수 재호출 예약
  }
  return [창고[내칸], set]
}
```

- 창고는 **칸 번호(호출 순서)**로 관리된다. 그래서 useState를 if문/반복문 안에 넣으면 안 된다 — 어떤 렌더링에서 하나가 건너뛰어지면 칸이 밀려서 엉뚱한 변수에 엉뚱한 값이 들어간다.
- C++로 치면 함수 안의 static 변수와 비슷한 발상인데, static 대신 React 런타임이 컴포넌트별로 관리해준다.

## 5. handleSave로 본 try/catch/finally 패턴

```js
setError('')        // 항상: 이전 에러 메시지 청소
setNotice('')       // 항상: 이전 성공 메시지 청소
setIsSaving(true)   // 항상: 버튼 잠금
try {
  // 성공 시: setCheckins, setNotice, setRawText, setSummary, setSummarySource, setScreen
} catch (requestError) {
  setError(...)     // 실패 시에만 실행
} finally {
  setIsSaving(false) // 성공/실패 무관하게 무조건: 버튼 잠금 해제
}
```

- `catch`는 try 안에서 에러가 터졌을 때만 실행된다. 성공 경로에서는 안 탄다.
- `finally`가 없으면 버튼이 영원히 "저장하는 중…"으로 잠긴다.
- **"시작할 때 청소+잠금, 끝날 때 해제"** — 서버 요청 함수의 공통 패턴. `handleOrganize`에도 똑같이 있다.

`setCheckins((current) => [saved, ...current])`의 `...current`는 기존 배열 내용물을 쏟아붓는 스프레드 문법이다. 기존 배열을 고치지 않고 **새 배열을 만들어야** React가 변경을 알아채고 다시 그린다.

## 6. props = 함수 인수 (비유가 아니라 사실)

JSX는 컴파일되면 함수 호출이 된다.

```jsx
<CheckinForm rawText={rawText} onTextChange={setRawText} />
// ↓ 변환 결과
CheckinForm({ rawText: rawText, onTextChange: setRawText })
```

- props는 전역변수가 아니다. `rawText`는 **App 함수의 지역변수**고, 지역이기 때문에 다른 함수(CheckinForm)가 쓰려면 인수로 넘겨야 한다. C++에서 지역변수를 다른 함수에 인자로 넘기는 것과 같다.
- 자식의 state를 부모는 절대 못 읽는다 (callee의 지역변수를 caller가 못 보는 것과 같다).

## 7. state 끌어올리기 — state를 어디에 둘 것인가

`rawText`를 CheckinForm이 아니라 App에 둔 이유: 저장할 때 App의 `handleSave`가 `rawText`를 서버로 보내야 하는데, CheckinForm의 지역 state였다면 App이 꺼낼 방법이 없다.

> **규칙: 그 값이 필요한 컴포넌트들의 공통 조상이 state를 소유한다.**
> 값은 아래로(props), 변경 요청은 위로(콜백 호출) — 일방통행.

적용 예: `selectedCheckin`은 **정하는 쪽**(RecordCard 클릭)과 **보여주는 쪽**(RecordDetail)이 형제 관계다. 형제끼리는 서로의 지역변수를 못 보므로 공통 부모인 App이 소유하고, RecordCard에는 콜백(`onSelect`)을, RecordDetail에는 값(`checkin`)을 내려준다.

## 8. 컴포넌트 = JSX를 리턴하는 함수

- App.jsx는 **파일**이고, 그 안의 `function App()`(33~208줄)이 **컴포넌트**다. 같은 파일의 `requestJson`은 JSX를 리턴하지 않으므로 컴포넌트가 아니다.
- JSX도 문법 설탕이다. Vite가 변환해준다:

```jsx
return <h1 className="brand">하루 체크아웃</h1>
// ↓ 변환 결과
return createElement('h1', { className: 'brand' }, '하루 체크아웃')
// ↓ 이 함수가 리턴하는 것은 그냥 객체(설계도)
{ type: 'h1', props: { className: 'brand', children: '하루 체크아웃' } }
```

전체 그림: ① 컴포넌트 함수가 호출되면 화면 **설계도(객체 트리)**를 리턴 → ② React가 이전 설계도와 비교해 달라진 부분만 진짜 DOM에 반영 → ③ state가 바뀌면 함수를 다시 호출해서 ①부터 반복.

## 9. 아직 더 공부할 부분

- `docs/practice/` 빈칸 자료로 SummaryCard·RecordCard를 직접 다시 만들기 (반복 미션의 남은 절반)
- `data-model.md` 논의 포인트 4개 결정하고 schema.sql 확정
- useEffect 의존성 배열, async/await와 Promise (Day 7에서 이월)

## 10. 오늘의 핵심 정리

```text
컴포넌트: JSX(화면 설계도)를 리턴하는 함수. <App />은 App() 호출이다.
state: 컴포넌트 함수의 지역변수. 단, 값의 원본은 React의 창고에 살아서
       재호출돼도 유지되고, set으로 바꾸면 함수가 재실행돼 화면이 갱신된다.
props: 부모가 자식 함수를 호출할 때 넘기는 인수. 자식은 읽기만 하고,
       바꾸고 싶으면 부모가 준 콜백을 호출해 위로 요청한다.
```
