import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RepoConnectPage from "./pages/RepoConnectPage";
import AnalysisReportPage from "./pages/AnalysisReportPage";
import WorkspacePage from "./pages/WorkspacePage";
import CommitReviewPage from "./pages/CommitReviewPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/repo" replace />} />
        <Route path="/repo" element={<RepoConnectPage />} />
        <Route path="/analysis" element={<AnalysisReportPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/commit-review" element={<CommitReviewPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
