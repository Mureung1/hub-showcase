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

  const handleSwitchAccount = async () => {
    setIsModalOpen(true);
    await signOut();
  };

  return (
    <div className="relative flex min-w-0 items-center justify-end gap-2.5">
      {isLoading && !user ? (
        <span className="max-w-[140px] truncate text-[0.82rem] font-semibold text-ptop-ink" role="status" aria-live="polite">
          확인 중
          </span>
      ) : user ? (
        <>
          <span className="max-w-[140px] truncate text-[0.82rem] font-semibold text-ptop-ink" title={user.email ?? label}>
            {label}
          </span>
          <button className="cursor-pointer border-0 bg-transparent px-0 py-2 text-[0.82rem] font-extrabold text-ptop-ink transition-colors duration-[var(--motion-fast)] hover:text-ptop-mint-dark" type="button" onClick={() => void handleSwitchAccount()}>
            계정 전환
          </button>
          <button className="min-h-10 cursor-pointer rounded-full border border-ptop-mint-line bg-ptop-mint-soft px-3.5 font-extrabold text-ptop-mint-dark transition duration-[var(--motion-fast)] hover:-translate-y-px" type="button" onClick={() => void signOut()}>
            로그아웃
          </button>
        </>
      ) : (
        <button className="cursor-pointer border-0 bg-transparent px-0 py-2 text-[0.88rem] font-extrabold text-ptop-ink transition-colors duration-[var(--motion-fast)] hover:text-ptop-mint-dark" type="button" onClick={() => setIsModalOpen(true)}>
          로그인
        </button>
      )}
      {error && !isModalOpen && <span className="absolute right-0 top-[calc(100%+10px)] w-max max-w-[min(320px,80vw)] rounded-lg border border-[#eadba7] bg-[#fff9e6] px-3 py-2 text-[0.76rem] leading-[1.45] text-[#765d16]" role="alert">{error}</span>}
      {isModalOpen && (
        <AuthModal
          isLoading={isLoading}
          error={error}
          description="다른 GitHub 계정으로 로그인하고 프로젝트 경험을 정리해보세요."
          onClose={() => setIsModalOpen(false)}
          onSignIn={handleSignIn}
        />
      )}
    </div>
  );
}
