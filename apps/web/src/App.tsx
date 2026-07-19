import { Navigate, Route, Routes } from "react-router";
import WorkspacePage from "./WorkspacePage";
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
import { VerifyEmailPage } from "./features/auth/VerifyEmailPage";
import { RequireAuth } from "./features/auth/RequireAuth";

/**
 * 앱 라우팅 (SPEC-AUTH-001 2장).
 * 비로그인 상태로 `/` 진입 시 RequireAuth가 `/login`으로 보낸다.
 */
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <WorkspacePage />
          </RequireAuth>
        }
      />
      {/* 알 수 없는 경로는 로그인으로 (결정 1-3) */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
