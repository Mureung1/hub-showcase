// 로그인해야 들어올 수 있는 라우트 래퍼 — 세션 없으면 /login으로.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return null; // 세션 복원 중 — 판단 보류(깜빡임/오리다이렉트 방지)
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
