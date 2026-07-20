# 연습 3회차 — RecordDetail을 App.jsx에 연결하기

답지: `client/src/App.jsx` (오늘 커밋된 완성본)

RecordDetail 화면 자체는 이미 `client/src/pages/RecordDetail.jsx`에 있다고 치고,
App.jsx에서 **state 추가 → 클릭 시 화면 전환 → 목록으로 돌아오기**를 연결하는 부분만 연습합니다.
아래 빈칸을 종이나 에디터에서 채워본 뒤 답지와 비교하세요.

## 1. import와 state 추가

```jsx
import RecordDetail from /* TODO: ___ */
// 힌트: pages 폴더에 있다

function App() {
  const [screen, setScreen] = useState('input')
  // 힌트: 클릭한 기록 하나를 담아둘 state, 처음엔 아무것도 선택 안 됨(null)
  const [selectedCheckin, setSelectedCheckin] = /* TODO: ___ */
```

## 2. 화면 전환 함수 두 개

```jsx
function openDetail(checkin) {
  // 힌트: 클릭한 기록을 state에 담고, screen을 'detail'로 바꾼다 (2줄)
  /* TODO: ___ */
  /* TODO: ___ */
}

function backToList() {
  // 힌트: 선택을 비우고(null), screen을 'input'으로 되돌린다 (2줄)
  /* TODO: ___ */
  /* TODO: ___ */
}
```

## 3. 조건부 렌더링에 detail 화면 추가

```jsx
{/* 힌트: screen이 'detail'이고 selectedCheckin이 있을 때만 보여준다 */}
{/* TODO: ___ */ && selectedCheckin && (
  <RecordDetail checkin={selectedCheckin} onBack={/* TODO: ___ */} />
)}
```

## 4. RecordCard에 클릭 핸들러 내려주기

```jsx
{checkins.map((checkin) => (
  // 힌트: 카드가 클릭되면 openDetail이 실행되도록 props로 내려준다
  <RecordCard key={checkin.id} checkin={checkin} onSelect={/* TODO: ___ */} />
))}
```

## 스스로 점검

- [ ] 기록 카드를 클릭하면 상세 화면이 뜬다
- [ ] 상세 화면에 날짜, 원문, 3개 항목이 보인다
- [ ] "목록으로"를 누르면 입력 화면 + 기록 목록으로 돌아온다
- [ ] 돌아온 뒤 다른 카드를 클릭해도 잘 동작한다
