import "./App.css";

function App() {
  return (
    <main className="app">
      <section className="hero">
        <p className="eyebrow">Multi-AI Decision Agent</p>

        <h1>Decision Board AI</h1>

        <p className="subtitle">
          하나의 AI 답변만 신뢰하기 어려운 사용자를 위해, 여러 AI의 답변을
          문단 단위로 비교하고 의사결정까지 기록하는 AI 협업 보드입니다.
        </p>

        <div className="process">
          <article className="process-card">
            <span>01</span>
            <h2>여러 AI에게 동시에 질문</h2>
            <p>
              같은 질문을 여러 AI 모델에게 던지고, 답변을 동일한 문단 구조로
              정렬합니다.
            </p>
          </article>

          <article className="process-card">
            <span>02</span>
            <h2>Manager AI가 답변 비교</h2>
            <p>
              공통 내용, 충돌 내용, 단독 언급 사항을 문단 단위로 나누어 카드로
              정리합니다.
            </p>
          </article>

          <article className="process-card">
            <span>03</span>
            <h2>Decision Log로 판단 기록</h2>
            <p>
              사용자는 채택, 검증, 폐기 판단을 남기고 이후 질문의 컨텍스트로
              재사용할 수 있습니다.
            </p>
          </article>
        </div>

        <section className="preview">
          <div className="board">
            <h2>Manager AI Comparison</h2>

            <div className="insight-card common">
              <strong>공통 내용</strong>
              <p>여러 AI가 공통으로 언급한 내용입니다. 우선 채택 후보가 됩니다.</p>
            </div>

            <div className="insight-card conflict">
              <strong>충돌 내용</strong>
              <p>AI 답변끼리 서로 다르게 말한 내용입니다. 추가 판단이 필요합니다.</p>
            </div>

            <div className="insight-card verify">
              <strong>검증 필요</strong>
              <p>한 AI만 언급했거나 근거 확인이 필요한 내용입니다.</p>
            </div>
          </div>

          <aside className="log">
            <h2>Decision Log</h2>

            <ul>
              <li>
                <span className="tag accept">채택</span>
                공통 내용은 DECISIONS.md에 기록
              </li>
              <li>
                <span className="tag check">검증</span>
                충돌 내용은 VERIFY.md에 기록
              </li>
              <li>
                <span className="tag reject">폐기</span>
                근거 부족 답변은 REJECTED.md에 기록
              </li>
            </ul>

            <button>Markdown Bundle 다운로드</button>
          </aside>
        </section>
      </section>
    </main>
  );
}

export default App;