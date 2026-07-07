import { useState } from "react";
import Stepper from "./components/Stepper.jsx";

// 앱 전체 흐름을 관리하는 오케스트레이터.
// 단계: upload → design → generate → result
// (기능은 커밋 단위로 하나씩 채워진다)
export default function App() {
  const [step] = useState("upload");

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          CV → 포트폴리오 생성기 <span className="tag">prototype</span>
        </h1>
        <p className="sub">
          이력서를 올리고 디자인을 고르면, 포트폴리오 사이트를 만들어 드립니다.
        </p>
      </header>

      <Stepper current={step} />

      <main className="stage">
        <div className="placeholder">
          <p className="placeholder-emoji">🛠️</p>
          <p>스캐폴딩 완료 — 단계별 기능이 순서대로 추가됩니다.</p>
        </div>
      </main>
    </div>
  );
}
