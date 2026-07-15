import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProjectIntro from "./components/ProjectIntro";
import RegisterPage from "./components/RegisterPage";
import HomePage from "./components/HomePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/landing" element={<ProjectIntro />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
