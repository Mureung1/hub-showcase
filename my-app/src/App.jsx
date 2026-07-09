import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PromotionInterview from "./pages/PromotionInterview";
import PostResult from "./pages/PostResult";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/posts/promotion/new" element={<PromotionInterview />} />
      <Route path="/posts/promotion/result" element={<PostResult />} />
    </Routes>
  );
}

export default App;
