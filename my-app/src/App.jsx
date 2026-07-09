import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PromotionInterview from "./pages/PromotionInterview";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/posts/promotion/new" element={<PromotionInterview />} />
    </Routes>
  );
}

export default App;
