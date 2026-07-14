# Day 7 React 핵심 학습

## 1. 오늘 한 작업

어제까지는 입력 화면, 결과 화면, 기록 목록이 모두 `App.jsx` 하나에 들어 있었다. 오늘은 코드를 다시 읽으면서 입력 부분을 `CheckinForm` 컴포넌트로 분리했다.

- `App.jsx`: 화면 전체의 state와 서버 요청을 관리한다.
- `CheckinForm.jsx`: 사용자의 글을 입력받고 정리 버튼을 보여준다.
- 입력값과 이벤트 함수는 부모 `App`에서 자식 `CheckinForm`으로 props를 통해 전달한다.

기능을 새로 추가한 작업은 아니며, 기존 동작을 유지하면서 컴포넌트의 역할을 나눈 리팩터링이다. 컴포넌트를 분리하면 관련 코드를 찾기 쉽고, 입력 화면을 수정할 때 다른 화면의 코드를 건드릴 가능성이 줄어든다.

## 2. 컴포넌트 분리 전과 후

분리 전에는 `App.jsx`가 화면과 동작을 모두 담당했다.

```text
App
├─ state 관리
├─ 서버 요청
├─ 입력 화면
├─ 결과 화면
└─ 기록 목록
```

분리 후에는 입력 화면을 `CheckinForm`이 담당한다.

```text
App
├─ state 관리
├─ 서버 요청
├─ CheckinForm에 props 전달
├─ 결과 화면
└─ 기록 목록

CheckinForm
└─ 글 입력, 글자 수, 정리 버튼 표시
```

아직 결과 화면과 기록 목록은 `App.jsx`에 남아 있다. 처음부터 모든 코드를 잘게 나누기보다, 역할을 이해한 부분부터 단계적으로 분리하는 방식으로 진행했다.

## 3. state란 무엇인가

state는 화면에서 변할 수 있는 값을 React 컴포넌트가 기억하는 방법이다. state가 변경되면 React는 변경된 값에 맞춰 화면을 다시 렌더링한다.

```jsx
const [rawText, setRawText] = useState('')
```

- `rawText`: 현재 사용자가 입력한 글
- `setRawText`: `rawText`를 변경하는 함수
- `useState('')`: 처음에는 빈 문자열로 시작한다는 뜻

현재 `App`에는 다음과 같은 state가 있다.

| state | 역할 |
| --- | --- |
| `rawText` | 사용자가 작성한 원문 |
| `summary` | 감정, 원인, 작은 행동 정리 결과 |
| `summarySource` | 실제 AI 결과인지 mock 결과인지 구분 |
| `checkins` | 저장된 체크아웃 기록 목록 |
| `screen` | 입력 화면과 결과 화면 중 무엇을 보여줄지 결정 |
| `isOrganizing` | AI 정리 요청이 진행 중인지 표시 |
| `isSaving` | Supabase 저장 요청이 진행 중인지 표시 |
| `isLoadingRecords` | 기록 목록을 불러오는 중인지 표시 |
| `error` | 오류 메시지 |
| `notice` | 저장 완료 메시지 |

`rawText`는 입력 화면에서만 보이는 것 같지만, AI 정리 요청과 Supabase 저장 요청에서도 사용된다. 따라서 `CheckinForm` 내부가 아니라 여러 작업을 관리하는 부모 `App`에 두었다.

## 4. 입력창과 state의 연결

`CheckinForm`의 입력창은 다음과 같이 동작한다.

```jsx
<textarea
  value={rawText}
  onChange={(event) => onTextChange(event.target.value)}
/>
```

1. `value={rawText}`로 state의 값을 입력창에 표시한다.
2. 사용자가 글자를 입력하면 `onChange`가 실행된다.
3. `event.target.value`에서 현재 입력값을 가져온다.
4. 부모에게 전달받은 `onTextChange`를 실행한다.
5. 부모의 `setRawText`가 호출되어 state가 변경된다.
6. state가 변경되면 React가 입력창을 다시 렌더링한다.

이처럼 입력값을 React state로 관리하는 입력 요소를 제어 컴포넌트라고 한다.

```text
사용자 입력
→ onChange
→ setRawText
→ rawText 변경
→ 화면 다시 렌더링
```

## 5. props란 무엇인가

props는 부모 컴포넌트가 자식 컴포넌트에 값이나 함수를 전달하는 방법이다.

부모 `App`은 다음과 같이 값을 전달한다.

```jsx
<CheckinForm
  rawText={rawText}
  onTextChange={setRawText}
  onSubmit={handleOrganize}
  isOrganizing={isOrganizing}
/>
```

자식 `CheckinForm`은 전달받은 props를 사용한다.

| prop | 전달되는 값 | 사용 목적 |
| --- | --- | --- |
| `rawText` | 현재 입력 state | 입력 내용과 글자 수 표시 |
| `onTextChange` | `setRawText` 함수 | 사용자가 입력한 값으로 state 변경 |
| `onSubmit` | `handleOrganize` 함수 | 정리 버튼을 누르면 서버 요청 시작 |
| `isOrganizing` | 요청 진행 상태 | 버튼 비활성화 및 문구 변경 |

React에서 props는 기본적으로 부모에서 자식 방향으로 전달된다. 자식이 부모의 값을 직접 바꾸는 대신, 부모가 전달한 함수를 호출해 변경을 요청한다.

## 6. 조건에 따라 달라지는 화면

React에서는 state 값을 사용해 서로 다른 화면을 렌더링할 수 있다.

```jsx
{screen === 'input' ? (
  <CheckinForm />
) : (
  <section className="result-panel">...</section>
)}
```

- `screen`이 `input`이면 입력 화면을 보여준다.
- AI 정리 요청에 성공한 후 `setScreen('result')`를 실행하면 결과 화면을 보여준다.
- 다시 정리하기를 누르면 `setScreen('input')`으로 돌아간다.

별도의 HTML 페이지로 이동하는 것이 아니라, state에 따라 같은 React 화면 안에서 보여주는 컴포넌트가 달라지는 방식이다.

## 7. fetch API와 서버 통신

fetch API는 브라우저에서 서버로 HTTP 요청을 보내는 기능이다. 이 프로젝트에서는 `requestJson` 함수 안에서 fetch를 공통으로 사용한다.

```jsx
async function requestJson(url, options) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.error?.message || '요청을 처리하지 못했습니다.')
  }

  return body
}
```

- `fetch(url, options)`: 지정한 주소로 요청을 보낸다.
- `await`: 서버 응답이 올 때까지 기다린다.
- `response.json()`: JSON 응답을 JavaScript 값으로 변환한다.
- `response.ok`: HTTP 요청이 성공했는지 확인한다.
- `throw new Error(...)`: 실패하면 오류 처리 코드로 넘긴다.

현재 화면에서 사용하는 API는 세 가지다.

| 요청 | 역할 |
| --- | --- |
| `GET /api/checkins` | 저장된 기록 조회 |
| `POST /api/checkins/preview` | 작성한 글을 AI 또는 mock으로 정리 |
| `POST /api/checkins` | 확인·수정한 결과를 Supabase에 저장 |

AI 정리 요청에서는 다음과 같이 `rawText`를 JSON으로 변환해 서버에 보낸다.

```jsx
const result = await requestJson('/api/checkins/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rawText }),
})
```

응답을 받으면 `setSummary`로 결과 state를 변경하고, `setScreen('result')`로 결과 화면을 렌더링한다.

## 8. 로딩과 오류 처리

서버 요청은 즉시 끝나지 않을 수 있으므로 요청 상태를 별도 state로 관리한다.

```text
요청 전: isOrganizing = true
요청 성공 또는 실패
요청 종료: isOrganizing = false
```

`try`에서는 서버 요청을 실행하고, `catch`에서는 오류 메시지를 저장하며, `finally`에서는 성공 여부와 관계없이 로딩 상태를 종료한다.

`isOrganizing`이 `true`이면 버튼을 비활성화하고 `정리하는 중…`을 표시한다. 이를 통해 사용자가 같은 요청을 여러 번 보내는 일을 줄이고 현재 상태를 알 수 있게 한다.

## 9. useEffect로 처음 기록 불러오기

```jsx
useEffect(() => {
  loadCheckins()
}, [])
```

`useEffect`는 화면 렌더링 외의 작업을 실행할 때 사용한다. 빈 배열 `[]`을 전달했기 때문에 `App`이 처음 화면에 나타난 뒤 기록 목록을 한 번 불러온다.

따라서 사용자가 새로고침해도 Supabase에 저장된 기존 기록을 다시 받아 화면에 표시할 수 있다.

## 10. 전체 데이터 흐름

```text
사용자가 CheckinForm에 글 입력
→ onTextChange 호출
→ App의 rawText state 변경
→ 정리 버튼 클릭
→ onSubmit으로 handleOrganize 실행
→ fetch로 Express에 rawText 전송
→ Express가 AI 또는 mock 정리 결과 반환
→ summary state에 응답 저장
→ screen state를 result로 변경
→ 결과 화면 렌더링
→ 사용자가 결과 확인 또는 수정
→ 저장 버튼 클릭
→ Express를 통해 Supabase에 저장
→ checkins state에 새 기록 추가
→ 최근 체크아웃 목록 다시 렌더링
```

## 11. 내가 설명할 수 있는 부분

`rawText`는 입력 화면뿐 아니라 AI 정리 요청과 저장 요청에서도 사용하므로 부모 `App`에서 state로 관리했다. 자식 `CheckinForm`에는 화면에 필요한 값과 함수만 props로 전달했다.

입력 폼을 별도 컴포넌트로 분리해 `App`은 전체 상태와 서버 요청을 관리하고, `CheckinForm`은 입력 UI를 담당하도록 역할을 나눴다. 이로 인해 입력 화면을 수정할 위치가 명확해지고 코드를 읽기 쉬워졌다.

## 12. 아직 더 공부할 부분

- `useEffect`의 의존성 배열에 값이 들어갈 때 실행 시점이 어떻게 달라지는지
- `async/await`가 Promise를 처리하는 방식
- 여러 컴포넌트가 같은 state를 사용할 때 상태를 어디에 두어야 하는지
- 결과 화면과 기록 목록을 어떤 기준으로 추가 분리하면 좋은지

## 13. 오늘의 핵심 정리

```text
state: 컴포넌트가 기억하는 변경 가능한 값
props: 부모가 자식에게 전달하는 값 또는 함수
fetch: 브라우저에서 서버로 HTTP 요청을 보내는 기능
rendering: state에 따라 React가 화면을 그리는 과정
component: 화면과 동작을 역할별로 묶은 단위
```

오늘 작업은 새로운 기능 추가보다, 기존 코드를 직접 읽고 컴포넌트를 분리하면서 React의 데이터 흐름을 이해하는 데 목적이 있다.
