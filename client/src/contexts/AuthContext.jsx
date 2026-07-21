import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mock_user');
      if (stored && stored !== 'undefined') {
        setCurrentUser(JSON.parse(stored));
      } else {
        const generateId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
        const newUser = { id: generateId(), role: 'helper' };
        localStorage.setItem('mock_user', JSON.stringify(newUser));
        setCurrentUser(newUser);
      }
    } catch (e) {
      console.error("Failed to parse mock_user:", e);
      const generateId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
      const newUser = { id: generateId(), role: 'helper' };
      localStorage.setItem('mock_user', JSON.stringify(newUser));
      setCurrentUser(newUser);
    }
  }, []);

  // 이 함수는 UI 테스트를 위한 임시 치트키입니다.
  const toggleRole = () => {
    if (!currentUser) return;
    const newRole = currentUser.role === 'host' ? 'helper' : 'host';
    const updatedUser = { ...currentUser, role: newRole };
    localStorage.setItem('mock_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ currentUser, toggleRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
