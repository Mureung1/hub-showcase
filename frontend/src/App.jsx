import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import Review from './pages/Review';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex bg-[#F4F7FE] text-[#151D48]">
        <Sidebar />

        <main className="flex-1 p-8">
          <div className="max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/setup" element={<Setup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/generate" element={<Generate />} />
              <Route path="/review" element={<Review />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
