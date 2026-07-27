import { AuthButton } from "../features/auth/AuthButton";
import { BrandLogo } from "./BrandLogo";
import { useEffect, useState } from "react";

type SiteHeaderProps = {
  variant?: "default" | "overlay";
  onHome: () => void;
  onOpenWorkspace: () => void;
  onOpenAnalysis: () => void;
};

export function SiteHeader({
  variant = "default",
  onHome,
  onOpenWorkspace,
  onOpenAnalysis,
}: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (variant !== "overlay") {
      setIsScrolled(false);
      return;
    }

    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 20);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollState);
    };
  }, [variant]);

  const headerClassName = [
    "z-20 w-full border-b border-ptop-mint/50 bg-white/95 backdrop-blur-[16px]",
    variant === "overlay"
      ? "fixed left-0 top-0 shadow-[0_1px_14px_rgb(21_24_23/0.08)]"
      : "sticky top-0",
    isScrolled && variant === "overlay"
      ? "bg-white/[0.98] shadow-[0_4px_18px_rgb(21_24_23/0.1)] backdrop-blur-[20px]"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName}>
      <div className="ptop-container grid min-h-[var(--header-height)] grid-cols-[auto_1fr_auto] items-center gap-7 max-[560px]:gap-3">
        <a
          className="inline-flex min-h-[42px] w-fit items-center rounded-lg transition-transform duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:-translate-y-px"
          href="#top"
          aria-label="PtoP 첫 화면으로 이동"
          onClick={(event) => {
            event.preventDefault();
            onHome();
          }}
        >
          <BrandLogo variant="nav" />
        </a>
        <nav
          className="flex justify-center gap-6 max-[560px]:hidden"
          aria-label="주요 메뉴"
        >
          <a
            href="#service"
            onClick={(event) => {
              event.preventDefault();
              onHome();
            }}
          >
            서비스 소개
          </a>
          <a
            href="#workspace"
            onClick={(event) => {
              event.preventDefault();
              onOpenWorkspace();
            }}
          >
            작업실
          </a>
          <button
            className="font-inherit text-left transition-colors hover:text-ptop-mint-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ptop-mint-dark"
            type="button"
            onClick={onOpenAnalysis}
          >
            프로젝트 분석
          </button>
        </nav>
        <AuthButton />
      </div>
    </header>
  );
}
