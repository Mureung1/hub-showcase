"use client";
import { clsx } from "@/lib/clsx";
import type { ReactNode } from "react";

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "rounded-badge border px-3.5 py-1.5 text-[13px] transition-colors",
        active
          ? "border-transparent bg-primary-soft font-semibold text-primary"
          : "border-line bg-surface font-medium text-muted hover:bg-bg",
      )}
    >
      {children}
    </button>
  );
}
