import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "../../components/BrandLogo";
import { GitHubMark } from "../../components/GitHubMark";

type AuthModalProps = {
  isLoading: boolean;
  error: string;
  onClose: () => void;
  onSignIn: () => void;
};

export function AuthModal({
  isLoading,
  error,
  onClose,
  onSignIn,
}: AuthModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="modal-close-button"
          type="button"
          aria-label="로그인 모달 닫기"
          onClick={onClose}
        >
          ×
        </button>
        <BrandLogo variant="modal" />

        <p>GitHub 계정으로 로그인하고 프로젝트 경험을 정리해보세요.</p>
        <button
          className="github-login-button"
          type="button"
          disabled={isLoading}
          onClick={onSignIn}
        >
          <GitHubMark />
          {isLoading ? "로그인 준비 중" : "GitHub로 계속하기"}
        </button>
        {error && (
          <p className="auth-modal-error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-modal-note">
          <span>
            로그인하면 작성한 회고와 프로젝트 기록을 계정에 연결할 수 있습니다.
          </span>
        </div>
      </section>
    </div>,
    document.body,
  );
}
