import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CalendarView from './components/Calendar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={() => setIsAuthenticated(true)} />
        } />
        <Route path="/dashboard" element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
        } />
        <Route path="/calendar" element={
          isAuthenticated ? <CalendarView /> : <Navigate to="/login" />
        } />
        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
        } />
      </Routes>
    </Router>
  );
}

export default App;
