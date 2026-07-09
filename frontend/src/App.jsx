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
  );
}

export default App;
