<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 9bc89135cfe0ba223eba85b847744f843398a927
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Portal from './components/Portal';
import TimetableGenerator from './components/TimetableGenerator';
import CreditAnalytics from './components/CreditAnalytics';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on initialization
  useEffect(() => {
    const savedUser = localStorage.getItem('gnu_advisor_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user credentials', e);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('gnu_advisor_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gnu_advisor_user');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0B0F19',
        color: '#F3F4F6',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <div className="spinner" style={{ borderTopColor: '#6366F1' }}></div>
        <p style={{ marginTop: '1rem', color: '#9CA3AF' }}>사용자 세션 확인 중...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/portal" replace /> : <Login onLogin={handleLogin} />} 
        />

        {/* Portal Hub Route */}
        <Route 
          path="/portal" 
          element={user ? <Portal user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
        />

        {/* Timetable Simulation Route */}
        <Route 
          path="/timetable" 
          element={user ? <TimetableGenerator initialStudentType={user.studentType} /> : <Navigate to="/login" replace />} 
        />

        {/* Credit Analytics Route */}
        <Route 
          path="/analytics" 
          element={user ? <CreditAnalytics initialStudentType={user.studentType} /> : <Navigate to="/login" replace />} 
        />

        {/* Fallback Route */}
        <Route 
          path="*" 
          element={<Navigate to={user ? "/portal" : "/login"} replace />} 
        />
      </Routes>
    </BrowserRouter>
<<<<<<< HEAD
=======
=======
import React, { useState } from 'react';

function App() {
  const [status, setStatus] = useState('React + Vite environment initialized.');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0B0F19',
      color: '#F3F4F6',
      fontFamily: 'Outfit, Noto Sans KR, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#6366F1' }}>GNU AI Navigator</h1>
      <p style={{ fontSize: '1.2rem', color: '#9CA3AF' }}>{status}</p>
      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#4B5563' }}>
        Week 2: Full UI components and Express server state synchronization
      </div>
    </div>
>>>>>>> 9f420f9995fc12f6e78b76993db0939742ce02e4
>>>>>>> 9bc89135cfe0ba223eba85b847744f843398a927
  );
}

export default App;
