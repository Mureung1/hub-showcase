import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ReportPage from "./pages/ReportPage";
import Miricat from "./components/Miricat";

// App은 이제 "모든 화면에 공통인 틀(헤더) + 라우트 표"만 맡는다.
export default function App() {
  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 24px" }}>
      <div className="brand">
        <span className="brand-badge"><Miricat size={42} /></span>
        <div>
          <h1>미리캣</h1>
          <p className="brand-tag">내 출근길의 보초</p>
        </div>
      </div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/report/:noticeId" element={<ReportPage />} />
      </Routes>
    </div>
  );
}
