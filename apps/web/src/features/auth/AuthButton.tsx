import { useState } from "react";
import { AuthModal } from "./AuthModal";
import { useAuth } from "./useAuth";

export function AuthButton() {
  const { user, isLoading, error, signInWithGitHub, signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const githubLogin = user?.user_metadata?.user_name ?? user?.user_metadata?.preferred_username;
  const label = githubLogin ? `@${githubLogin}` : user?.email ?? "로그인됨";

  const handleSignIn = () => {
    void signInWithGitHub();
  };

  return (
    <div className="auth-action">
      {isLoading && !user ? (
        <span className="auth-status" role="status" aria-live="polite">
          확인 중
          </span>
      ) : user ? (
        <>
          <span className="auth-user" title={user.email ?? label}>
            {label}
          </span>
          <button className="text-button" type="button" onClick={() => void signOut()}>
            로그아웃
          </button>
        </>
      ) : (
        <button className="login-link" type="button" onClick={() => setIsModalOpen(true)}>
          로그인
        </button>
      )}
      {error && !isModalOpen && <span className="auth-error" role="alert">{error}</span>}
      {isModalOpen && (
        <AuthModal
          isLoading={isLoading}
          error={error}
          onClose={() => setIsModalOpen(false)}
          onSignIn={handleSignIn}
        />
      )}
    </div>
  );
}
