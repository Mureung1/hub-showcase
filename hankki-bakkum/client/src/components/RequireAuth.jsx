import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;              // 로그인 확인 중엔 잠깐 빈 화면
  if (!user) return <Navigate to="/login" replace />;
  return children;
}