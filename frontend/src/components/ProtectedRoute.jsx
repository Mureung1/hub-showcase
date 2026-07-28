import { Navigate, useLocation } from "react-router";
import { useAuth } from "../auth/authContext";

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#17241f] px-6 text-[#fbf7ec]">
        <p role="status">로그인 상태를 확인하고 있습니다.</p>
      </main>
    )
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;

    return <Navigate to="/" replace state={{ returnTo }} />
  }

  return children;
}

export default ProtectedRoute;