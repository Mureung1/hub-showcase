import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "../../components/BrandLogo";
import { GitHubMark } from "../../components/GitHubMark";

type AuthModalProps = {
  isLoading: boolean;
  error: string;
  description?: string;
  onClose: () => void;
  onSignIn: () => void;
};

export function AuthModal({
  isLoading,
  error,
  description = "GitHub 계정으로 로그인하고 프로젝트 경험을 정리해보세요.",
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
      className="fixed inset-0 z-30 grid place-items-center bg-[rgb(21_24_23/22%)] p-6 backdrop-blur-xl"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="relative grid w-[min(100%,var(--modal-width))] gap-[18px] rounded-[18px] border border-ptop-line bg-ptop-paper px-[30px] pb-7 pt-[42px] text-center shadow-ptop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="absolute right-[18px] top-4 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[1.5rem] leading-none text-ptop-muted transition duration-[var(--motion-fast)] hover:bg-ptop-gray-soft hover:text-ptop-ink"
          type="button"
          aria-label="로그인 모달 닫기"
          onClick={onClose}
        >
          ×
        </button>
        <BrandLogo variant="modal" />

        <p className="text-[0.94rem] leading-[1.55] text-ptop-muted">{description}</p>
        <button
          className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border border-[#25292e] bg-[#25292e] px-[18px] text-[0.96rem] font-extrabold text-ptop-paper transition duration-[var(--motion-fast)] hover:-translate-y-px hover:bg-[#1f2328] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
          type="button"
          disabled={isLoading}
          onClick={onSignIn}
        >
          <GitHubMark />
          {isLoading ? "로그인 준비 중" : "GitHub로 계속하기"}
        </button>
        {error && (
          <p className="rounded-lg border border-[#eadba7] bg-[#fff9e6] px-3 py-2.5 text-[0.82rem] text-[#765d16]" role="alert">
            {error}
          </p>
        )}
          <div className="mt-1 border-t border-ptop-line pt-5 text-[0.79rem] leading-[1.5] text-ptop-muted">
          <span>
            로그인하면 작성한 회고와 프로젝트 기록을 계정에 연결할 수 있습니다.
          </span>
        </div>
      </section>
    </div>,
    document.body,
  );
}
