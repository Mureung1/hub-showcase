// App.jsx가 시작될 때 getUser()로 Local Storage에 저장된 사용자를 읽어.
// 이제 App.jsx를 URL별 화면으로 나누는 코드로 바꾸자.

import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import AnalysisResultPage from "./pages/AnalysisResult/AnalysisResultPage";
import CalendarPage from "./pages/Calendar/CalendarPage";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import { getUser } from "./utils/auth";
import "./App.css";
import RegisterPage from "./pages/Register/RegisterPage";
import { useState } from "react";

function App() {
  const [user, setUser] = useState(getUser());

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLogin={setUser} />
          )
        }
      />

      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage />
          )
        }
      />

      <Route element={<ProtectedRoute user={user} />}>
        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          }
        />
        <Route
          path="/analysis"
          element={
            <MainLayout>
              <AnalysisResultPage />
            </MainLayout>
          }
        />
        <Route
          path="/calendar"
          element={
            <MainLayout>
              <CalendarPage />
            </MainLayout>
          }
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={user ? "/dashboard" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;
