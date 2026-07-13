import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PromotionInterview from "./pages/PromotionInterview";
import PostResult from "./pages/PostResult";
import SchedulePublish from "./pages/SchedulePublish";
import BrandOnboarding from "./pages/BrandOnboarding";
import NoticeWrite from "./pages/NoticeWrite";
import NoticeResult from "./pages/NoticeResult";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/posts/promotion/new" element={<PromotionInterview />} />
      <Route path="/posts/promotion/result" element={<PostResult />} />
      <Route path="/posts/promotion/schedule" element={<SchedulePublish />} />
      <Route path="/posts/notice/new" element={<NoticeWrite />} />
      <Route path="/posts/notice/result" element={<NoticeResult />} />
      <Route path="/onboarding" element={<BrandOnboarding />} />
    </Routes>
  );
}

export default App;
