import { clsx } from "@/lib/clsx";
import type { ReactNode } from "react";

export type BadgeTone = "primary" | "success" | "warning" | "danger" | "info" | "muted";

const TONES: Record<BadgeTone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  muted: "bg-[#F1F2F6] text-muted",
};

/** 디자인.md 5.4 — 배지. 색상만으로 구분하지 않도록 항상 텍스트를 함께 둔다. */
export function Badge({
  tone = "muted",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-badge px-2.5 py-1 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
