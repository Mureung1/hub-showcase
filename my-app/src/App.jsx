import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PromotionInterview from "./pages/PromotionInterview";
import PostResult from "./pages/PostResult";
import SchedulePublish from "./pages/SchedulePublish";
import BrandOnboarding from "./pages/BrandOnboarding";
import NoticeWrite from "./pages/NoticeWrite";
import NoticeResult from "./pages/NoticeResult";
import { isOnboardingComplete } from "./lib/onboarding";

function RequireOnboarding({ children }) {
  return isOnboardingComplete() ? children : <Navigate to="/onboarding" replace />;
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireOnboarding>
            <Dashboard />
          </RequireOnboarding>
        }
      />
      <Route path="/posts/promotion/new" element={<PromotionInterview />} />
      <Route path="/posts/promotion/result/:id" element={<PostResult />} />
      <Route path="/posts/promotion/schedule/:id" element={<SchedulePublish />} />
      <Route path="/posts/notice/new" element={<NoticeWrite />} />
      <Route path="/posts/notice/result/:id" element={<NoticeResult />} />
      <Route path="/onboarding" element={<BrandOnboarding />} />
    </Routes>
  );
}

export default App;
