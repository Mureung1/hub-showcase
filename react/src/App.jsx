import { BrowserRouter, Route, Routes } from "react-router-dom";
import ConflictsPage from "./pages/ConflictsPage";
import DashboardPage from "./pages/DashboardPage";
import EditStorePage from "./pages/EditStorePage";
import HistoryPage from "./pages/HistoryPage";
import NotFoundPage from "./pages/NotFoundPage";
import PlatformsPage from "./pages/PlatformsPage";
import PreviewPage from "./pages/PreviewPage";
import SyncResultPage from "./pages/SyncResultPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/store/edit" element={<EditStorePage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/sync-result" element={<SyncResultPage />} />
        <Route path="/platforms" element={<PlatformsPage />} />
        <Route path="/conflicts" element={<ConflictsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
