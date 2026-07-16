import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Setup from './pages/Setup';
import StoreInfo from './pages/StoreInfo';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import Review from './pages/Review';
import Archive from './pages/Archive';
import { getLatestStore } from './api/client';

function RootRedirect() {
  // 항상 Setup 페이지로 이동
  useEffect(() => {
    // DB 초기화 후 매번 새롭게 시작
  }, []);

  return <Navigate to="/setup" replace />;
}

function AppWithRouter() {
  const location = useLocation();
  const showSidebar = location.pathname !== '/setup';

  return (
    <div className="min-h-screen flex bg-[#F4F7FE] text-[#151D48]">
      {showSidebar && <Sidebar />}

      <main className="flex-1 p-8">
        <div className="max-w-[1600px] mx-auto">
          <Routes>
            <Route path="/setup" element={<Setup />} />
            <Route path="/storeinfo" element={<StoreInfo />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/review" element={<Review />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/" element={<RootRedirect />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppWithRouter />
    </Router>
  );
}

export default App;
