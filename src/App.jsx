import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProjectIntro from "./components/ProjectIntro";
import RegisterPage from "./components/RegisterPage";
import HomePage from "./components/HomePage";

// useLocation은 Router 하위에서만 쓸 수 있어 BrowserRouter 안의 별도 컴포넌트로 분리했다.
// 랜딩은 wireframe.md 확정 사항대로 로고만 있는 자체 헤더를 쓰므로 공통 Navbar를 숨긴다.
function AppLayout() {
  const location = useLocation();
  const isLanding = location.pathname === "/landing";

  return (
    <>
      {!isLanding && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/landing" element={<ProjectIntro />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
