import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import Home from "./pages/Home";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import SpecRegister from "./pages/SpecRegister";
import Analysis from "./pages/Analysis";
import Mission from "./pages/Mission";
import MissionDetail from "./pages/MissionDetail";
import UploadResult from "./pages/UploadResult";
import Feedback from "./pages/Feedback";
import Portfolio from "./pages/Portfolio";
import Footer from "./components/layout/Footer";
import { isAuthenticated } from "./features/auth/authService";
import { routes, setRouterNavigate } from "./router";

function NavigationBridge() {
  const routerNavigate = useNavigate();

  useEffect(() => {
    return setRouterNavigate(routerNavigate);
  }, [routerNavigate]);

  return null;
}

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to={routes.login} replace />;
  }

  return children;
}

function App() {
  return (
    <>
      <NavigationBridge />
      <Routes>
        <Route path={routes.home} element={<Home />} />
        <Route path={routes.signup} element={<Signup />} />
        <Route path={routes.verifyEmail} element={<VerifyEmail />} />
        <Route path={routes.login} element={<Login />} />
        <Route
          path={routes.myPage}
          element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.specs}
          element={
            <ProtectedRoute>
              <SpecRegister />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.analysis}
          element={
            <ProtectedRoute>
              <Analysis />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.mission}
          element={
            <ProtectedRoute>
              <Mission />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mission/:missionId"
          element={
            <ProtectedRoute>
              <MissionDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.upload}
          element={
            <ProtectedRoute>
              <UploadResult />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.feedback}
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          }
        />
        <Route
          path={routes.portfolio}
          element={
            <ProtectedRoute>
              <Portfolio />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={routes.home} replace />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
