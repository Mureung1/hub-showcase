import "./App.css";

function App() {
  return (
    <main className="app-container">
      <h1>시험 우선순위 계산기</h1>

      <p>React 화면이 정상적으로 실행되었습니다.</p>

      <label htmlFor="subjectName">과목명</label>

      <input
        id="subjectName"
        type="text"
        placeholder="예: 한방병리학"
      />

      <button type="button">과목 추가</button>
    </main>
  );
}

export default App;