import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PromotionInterview from "./pages/PromotionInterview";
import PostResult from "./pages/PostResult";
import SchedulePublish from "./pages/SchedulePublish";
import BrandOnboarding from "./pages/BrandOnboarding";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/posts/promotion/new" element={<PromotionInterview />} />
      <Route path="/posts/promotion/result" element={<PostResult />} />
      <Route path="/posts/promotion/schedule" element={<SchedulePublish />} />
      <Route path="/onboarding" element={<BrandOnboarding />} />
    </Routes>
  );
}

export default App;
