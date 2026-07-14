"use client";
import { useEffect } from "react";
import type { ReactNode } from "react";

/** 디자인.md 5.7 — 모달. ESC/배경 클릭으로 닫힌다. */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,43,0.35)] p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[440px] rounded-card bg-surface p-6 shadow-modal"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-strong">{title}</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="grid h-7 w-7 place-items-center rounded-lg text-lg text-muted hover:bg-bg"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
