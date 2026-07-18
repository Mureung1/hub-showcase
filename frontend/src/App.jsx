import { Routes, Route, Navigate } from 'react-router-dom';
import SearchHome from './pages/SearchHome.jsx';
import SearchResults from './pages/SearchResults.jsx';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<SearchHome />} />
        <Route path="/results" element={<SearchResults />} />
        {/* TODO: 주차장 상세 화면 — 백엔드 상세 API 준비 후 추가
            <Route path="/parking-lots/:id" element={<ParkingLotDetail />} /> */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
