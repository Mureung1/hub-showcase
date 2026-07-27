# 05. React 핵심 원리 — 미리캣 코드로 신입 면접 대비

> 한 줄 요약: **React = "상태가 바뀌면 함수를 다시 불러 화면을 새로 계산한다."** 컴포넌트는 함수, JSX는 그 리턴값, setState는 "다시 계산해!" 신호, 가상 DOM diff는 그 결과를 실제 화면에 최소 비용으로 반영하는 장치.

## 1. 컴포넌트 = 그냥 함수 (props → JSX)
- `Field({ label, value, onChange })` — 입력(props)을 받아 화면 조각(JSX)을 리턴하는 순수함수에 가깝다.
- JSX는 HTML이 아니라 **함수 호출의 설탕**: `<Field label="출발지"/>` = `createElement(Field, {label:"출발지"})`. 그래서 JS 표현식(`{...}`, 삼항, `map`)이 그대로 들어간다.

## 2. 렌더링 = 함수 재호출, 트리거는 state 변경
- `setOrigin("대전")`이 하는 일: ① 다음 렌더에 쓸 값 저장 ② **이 컴포넌트 함수를 다시 호출해달라고 예약**.
- 일반 변수로 하면 안 되는 이유: 값은 바뀌어도 **재호출 신호가 없어서** 화면이 그대로다. (면접 단골)
- 재호출되면 함수 안 코드가 전부 다시 실행됨 — `candidates` 배열도 매번 새로 만들어진다.

## 3. 가상 DOM과 key
- 리턴된 JSX = 가벼운 설계도(객체 트리). React는 이전 설계도와 **비교(diff)** 해서 달라진 부분만 진짜 DOM에 반영 (재조정, reconciliation).
- 리스트에서 `key`(예: `candidates.map(... key={candidate.id})`)는 diff 때 "이건 아까 그 항목"을 알아보는 신분증. **index를 key로 쓰면** 삽입/삭제 시 신분이 밀려 상태가 엉뚱한 항목에 붙는다. (면접 단골)

## 4. 데이터는 아래로, 신호는 위로 (단방향)
- 내려가기: `HomePage`의 `routes` → `<SavedRoutes routes={routes}>` props.
- 올라가기: 자식은 부모 상태를 직접 못 바꾼다 → 부모가 준 **콜백**을 부른다. `RouteRegister`가 저장 성공 시 `onSaved?.()` → 부모의 `loadRoutes` 실행.
- **상태 끌어올리기**: 두 형제(SavedRoutes, NoticesPanel)가 같은 `routes`를 봐야 하면 → 가장 가까운 공통 부모(HomePage)가 소유.

## 5. 제어 컴포넌트 (controlled component)
- `<input value={origin} onChange={...setOrigin(e.target.value)}>` — 입력값의 주인이 DOM이 아니라 **React state**. 타이핑 → onChange → setState → 리렌더 → 새 value 표시의 순환.
- 왜: 검증·가공·제출을 state 하나로 통제. `value`만 주고 `onChange`를 안 주면 입력 불가 경고. (면접 단골)

## 6. useEffect = "렌더 바깥 세계와의 동기화"
- 렌더 함수는 화면 계산만. fetch·타이머·구독 같은 **부수효과**는 useEffect로 분리 — LangGraph에서 reporter_node(부작용)를 따로 두는 감각과 같다.
- 의존성 배열: `[]` = 마운트 때 1회(HomePage의 `loadRoutes`), `[a]` = a 바뀔 때마다, 없음 = 매 렌더(대개 사고).
- cleanup(리턴 함수) = 다음 실행/언마운트 전 정리(타이머 해제 등). **StrictMode는 개발 모드에서 effect를 두 번 돌려** cleanup 안 한 코드를 들춰낸다. (면접 단골)

## 7. 불변성
- `setRoutes(data.routes)`처럼 **새 객체/배열로 교체**해야 한다. `routes.push(...)`는 같은 참조라 React가 "안 바뀌었네" 하고 넘어감. diff가 참조 비교 기반이라서다. (면접 단골)

## 미리캣 코드 ↔ 개념 대응표
| 개념 | 미리캣의 실물 |
|---|---|
| 함수 컴포넌트/props | `Field.jsx` 전체 |
| useState 여러 개 | `RouteRegister.jsx` 6행 |
| 제어 컴포넌트 | `RouteRegister` 35~37행 + `Field` |
| 리스트 렌더 + key | `RouteRegister` 41행, `NoticesPanel` alerts.map |
| 조건부 렌더 | `RouteRegister` 44~46행 (`&&`, 삼항) |
| 콜백으로 위로 알리기 | `onSaved?.()` 27행 |
| 상태 끌어올리기 | `HomePage`의 `routes` |
| useEffect + `[]` | `HomePage`, `NoticesPanel`의 `load()` |
| 파생값은 state로 안 둠 | `NoticesPanel`의 `alerts`/`clears` (렌더 중 계산) |
| 라우팅 | 노트 04 |

## 미결 퀴즈
- `RouteRegister`의 `candidates`는 렌더마다 새로 만들어진다. 문제가 안 되는 이유는? 만약 이걸 `useState`로 옮긴다면 얻는 것과 잃는 것은?
- `NoticesPanel`의 `alerts`/`clears`를 useState에 넣지 않고 렌더 중에 계산하는 이유는? (힌트: "같은 사실의 두 저장소")
