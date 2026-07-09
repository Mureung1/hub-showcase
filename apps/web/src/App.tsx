import "./styles/global.css";

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <strong>LocalTwin</strong>
      </header>
      <section className="workspace" aria-label="상권 분석 작업 공간" />
    </main>
  );
}

export default App;
