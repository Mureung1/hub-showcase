import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ReportPage from "./pages/ReportPage";
import Miricat from "./components/Miricat";

// 없는 주소로 왔을 때 (라우트 표의 어느 줄에도 안 맞으면 "*"가 받는다)
function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <Miricat size={72} />
      <p style={{ marginTop: 14, fontWeight: 600 }}>미리캣이 이 주소에서는 아무것도 못 찾았어요.</p>
      <Link to="/" style={{ color: "#3E7CB1", fontSize: 14 }}>← 홈으로 돌아가기</Link>
    </div>
  );
}

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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
